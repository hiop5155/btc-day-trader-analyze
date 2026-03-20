import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 嘗試載入根目錄的 .env 或是 B_py 裡的 .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../B_py/.env') });
// 如果找不到，也可以讀取當前目錄的
dotenv.config();

const app = express();
app.use(cors());

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://fapi.binance.com';
// 若您知道起始投入本金，可在 .env 設置 INITIAL_CAPITAL（單位 USDT）
// 例如：INITIAL_CAPITAL=500
// 若未設置，則由程式自動反推（精度較低）
const INITIAL_CAPITAL_ENV = process.env.INITIAL_CAPITAL ? parseFloat(process.env.INITIAL_CAPITAL) : null;

function getSignature(queryString) {
  return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

async function fetchIncomeHistory(startTimeMs) {
  let incomes = [];
  let currentStart = startTimeMs;
  let limit = 1000;

  while (true) {
    const timestamp = Date.now();
    const params = new URLSearchParams({
      startTime: currentStart,
      limit,
      recvWindow: 10000,
      timestamp
    });

    const signature = getSignature(params.toString());
    params.append('signature', signature);

    try {
      const { data } = await axios.get(`${BASE_URL}/fapi/v1/income?${params.toString()}`, {
        headers: { 'X-MBX-APIKEY': API_KEY }
      });

      if (!data || data.length === 0) break;

      incomes.push(...data);

      if (data.length < limit) break;

      const lastTime = data[data.length - 1].time;
      if (lastTime === currentStart) {
        currentStart = lastTime + 1;
      } else {
        currentStart = lastTime;
      }

      // 添加小延遲避免 API rate limit
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error("fetchIncomeHistory Error:", err.response?.data || err.message);
      break;
    }
  }
  return incomes;
}

async function fetchAccountBalance() {
  const timestamp = Date.now();
  const params = new URLSearchParams({ timestamp });
  const signature = getSignature(params.toString());
  params.append('signature', signature);

  try {
    const { data } = await axios.get(`${BASE_URL}/fapi/v2/account?${params.toString()}`, {
      headers: { 'X-MBX-APIKEY': API_KEY }
    });
    return parseFloat(data.totalWalletBalance);
  } catch (err) {
    console.error("fetchAccountBalance Error:", err.response?.data || err.message);
    return 0;
  }
}

function processData(incomes, currentBalance) {
  const dailyStats = {};

  // 分組：交易、轉帳
  const tradingTypes = ["REALIZED_PNL", "FUNDING_FEE", "COMMISSION"];
  const transferTypes = ["TRANSFER", "INTERNAL_TRANSFER"];

  let totalTradingPnL = 0;
  let totalTransfersSinceStart = 0;

  for (const item of incomes) {
    const itype = item.incomeType;
    const income = parseFloat(item.income);
    const asset = item.asset;
    if (asset !== "USDT") continue;

    const ts = item.time;
    const d = new Date(ts + 8 * 3600 * 1000);
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = {
        date: dateStr,
        realized_pnl: 0.0,
        funding_fee: 0.0,
        commission: 0.0,
        net_profit: 0.0,
        net_transfer: 0.0
      };
    }

    if (tradingTypes.includes(itype)) {
      // 只有嚴格的交易結果算在盈虧圖表內
      totalTradingPnL += income;
      dailyStats[dateStr].net_profit += income;

      if (itype === "REALIZED_PNL") dailyStats[dateStr].realized_pnl += income;
      else if (itype === "FUNDING_FEE") dailyStats[dateStr].funding_fee += income;
      else if (itype === "COMMISSION") dailyStats[dateStr].commission += income;
    } else {
      // 其他任何不認識的金流（例如網格的轉出/轉入、清算等）全部當成轉帳處理！
      // 這樣不僅不會污染單日淨利圖表，還能完美兜平起初的本金餘額！
      totalTransfersSinceStart += income;
      dailyStats[dateStr].net_transfer += income;
    }
  }

  // 推算初始餘額 (2026-03-09 開盤前)
  // 優先使用 INITIAL_CAPITAL 環境變數（最準確）
  // 否則反推：currentBalance - 所有已實現盈虧 - 所有淨轉帳
  // 若反推結果 <= 0（說明帳戶虧損後規模縮小），至少用 1.0 防止除零
  let initialBalanceAtStart;
  if (INITIAL_CAPITAL_ENV && INITIAL_CAPITAL_ENV > 0) {
    initialBalanceAtStart = INITIAL_CAPITAL_ENV;
  } else {
    const derived = currentBalance - totalTradingPnL - totalTransfersSinceStart;
    initialBalanceAtStart = derived > 0 ? derived : 1.0;
  }

  const sortedDates = Object.keys(dailyStats).sort();
  let cumulativePnL = 0.0;
  let cumulativeTransfer = 0.0;
  let maxInvestedBaseSoFar = 1.0;
  const results = [];

  for (const d of sortedDates) {
    const stat = dailyStats[d];

    cumulativePnL += stat.net_profit;
    cumulativeTransfer += stat.net_transfer;

    // 該日結束時總資產
    const walletBalanceAtDayEnd = initialBalanceAtStart + cumulativePnL + cumulativeTransfer;
    // 該日累積總投入
    let investedBase = initialBalanceAtStart + cumulativeTransfer;

    // 分母 = 初始本金 + 此時間點前的累積淨轉帳
    // 使用「歷史最大投入資本」概念避免分批入金初期分母過小
    // 同時確保分母至少等於 initialBalanceAtStart（本金最小保護）
    if (investedBase > maxInvestedBaseSoFar) {
      maxInvestedBaseSoFar = investedBase;
    }
    const safeDenominator = Math.max(maxInvestedBaseSoFar, initialBalanceAtStart, 1.0);

    stat.cumulative_profit = Number(cumulativePnL.toFixed(2));
    stat.wallet_balance = Number(walletBalanceAtDayEnd.toFixed(2));
    stat.invested_base = Number(investedBase.toFixed(2));
    stat.cumulative_transfer = Number(cumulativeTransfer.toFixed(2));
    stat.pnl_percentage = Number(((cumulativePnL / safeDenominator) * 100).toFixed(2));

    // 清理小數位
    stat.realized_pnl = Number(stat.realized_pnl.toFixed(2));
    stat.funding_fee = Number(stat.funding_fee.toFixed(2));
    stat.commission = Number(stat.commission.toFixed(2));
    stat.net_profit = Number(stat.net_profit.toFixed(2));
    stat.net_transfer = Number(stat.net_transfer.toFixed(2));

    results.push(stat);
  }

  return {
    dailyData: results,
    totalProfit: Number(totalTradingPnL.toFixed(2)),
    totalRoi: Number(((totalTradingPnL / Math.max(initialBalanceAtStart, 1.0)) * 100).toFixed(2)),
    currentBalance: Number(currentBalance.toFixed(2)),
    initialBalanceAtStart: Number(initialBalanceAtStart.toFixed(2))
  };
}

// 記憶體快取，避免每次前端重整都去撈 Binance
let cachedPnL = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 5 分鐘

app.get('/api/pnl', async (req, res) => {
  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "Missing Binance API Keys in Server" });
  }

  const now = Date.now();
  if (cachedPnL && (now - lastFetchTime) < CACHE_TTL) {
    return res.json(cachedPnL);
  }

  // 2026-03-09 00:00:00 UTC+8 = 2026-03-08 16:00:00 UTC
  const startTimeMs = new Date(Date.UTC(2026, 2, 8, 16, 0, 0)).getTime();

  try {
    const [incomes, currentBalance] = await Promise.all([
      fetchIncomeHistory(startTimeMs),
      fetchAccountBalance()
    ]);

    const results = processData(incomes, currentBalance);

    cachedPnL = results;
    lastFetchTime = now;

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Binance data" });
  }
});

// Port Nginx 設定的 5005 (避開原本的 5001)
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server API listening on port ${PORT}`);
});
