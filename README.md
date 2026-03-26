# 📉 BTC Trading Analysis & Live PnL Dashboard

歡迎來到我的比特幣交易分析專案！這個專案結合了 **即時行情分析報告** 與 **真實帳戶盈虧儀表板**，旨在提供 100% 透明且可驗證的交易策略紀錄。

---

## 🚀 核心功能與特色

### 1. 每日盈虧追蹤 (PnL Tracker)
每一頁報告底部均顯示可折疊的**每日盈虧表格**，包含：
- **單日淨利**與**累積盈虧**，即時反映每筆已平倉交易結果
- 正值綠色、負值紅色，一目了然
- 資料來源：`trade_detail/trades/*.yaml`，所有數字可直接查驗

### 2. AI 輔助日內分析報告 (Daily Reports)
每一份報告由 **BTC Day Trader AI Agent** 基於即時市場資料生成，每 15 分鐘一個 cycle，包含：
- **價格行為結構**：Sweep + MSB（市場結構突破）識別、FVG（Fair Value Gap）定位
- **衍生品數據**：資金費率（Funding Rate）、未平倉量（Open Interest）、Order Book 掛單分析
- **完整決策紀錄**：Action / Grade / Entry / SL / TP1 / TP2 / Contracts，全程透明可驗證
- **中英雙語支援 (Bilingual Support)**：繁體中文與英文即時切換

### 3. 交易明細頁面 (Trade Log)
每一筆實際入場的交易均以 YAML 格式獨立記錄，並在部落格呈現：
- **摘要列**（預設）：方向、等級、狀態、時間、盈虧金額
- **展開後**：進場價 / 止損 / 止盈 / 張數 / 風險金額 / 訂單 ID / 入場邏輯（Thesis）/ Trailing SL 調整記錄
- 頁面頂部顯示總筆數、已平倉數、勝率、總盈虧的 Summary Bar

---

## 📊 當前交易狀態（2026-03-26 更新）

| 項目 | 狀態 |
|------|------|
| **分析報告數量** | 117 份（2026-03-13 至今） |
| **實際交易筆數** | 14 筆（全部已平倉） |
| **當前持倉** | FLAT（無持倉） |
| **初始資金** | $1,000 USDT（2026-03-26 充值重設） |
| **月目標（翻倍）** | $1,000 → $2,000（30 天 100%） |
| **月目標（訂閱費）** | 每月淨利 ≥ $200（覆蓋 Claude Max 訂閱）|

---

## 🛠️ 專案技術架構

| 層級 | 技術 |
|------|------|
| **Frontend (Blog)** | Vite + React + Recharts + i18next |
| **交易所** | OKX Perpetual Swap（BTC-USDT-SWAP）|
| **分析引擎** | BTC Day Trader AI Agent（Claude + MCP 工具鏈）|
| **資料格式** | Markdown 分析報告 + YAML 交易日誌 |

### 📁 目錄結構

```
results/
├── README.md
├── day/                          # AI 分析報告（ZH）
│   ├── YYYYMMDDHHmm_btc-day-trader.md
│   └── en/                       # AI 分析報告（EN）
│       └── YYYYMMDDHHmm_btc-day-trader.md
├── trade_detail/
│   ├── trades/                   # 每筆交易獨立 YAML（git diff 可追蹤每個欄位變化）
│   │   ├── 202603261933_SHORT.yaml
│   │   └── ...
│   └── show_trades.py            # 本地查看彙整表
└── blog/                         # Vite + React 前端
    ├── src/
    │   ├── App.jsx               # 主版面：sidebar + 文章
    │   ├── TradeList.jsx         # 交易明細頁（可折疊每筆詳情）
    │   ├── PnlTable.jsx          # 每頁底部每日盈虧折疊表
    │   └── Dashboard.jsx         # PnL 圖表組件
    └── dist/                     # 靜態建置輸出（部署用）
```

---

## 💎 交易所推薦連結

如果您覺得這些分析對您有幫助，歡迎使用推薦連結註冊，享手續費折扣：

| 交易所 | 連結 |
| :--- | :--- |
| **OKX** | [點此註冊](https://okx.com/join/17546814) |
| **幣安 (Binance)** | [點此註冊](https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WX65DDWK) |
| **Crypto.com** | [點此註冊](https://crypto.com/app/7m67z2z3y9) |
| **派網 (Pionex)** | [點此註冊](https://www.pionex.com/zh-TW/signUp?r=qsm5OlXA) |
| **BingX** | [點此註冊](https://bingxdao.com/invite/KFSSRQ/) |
| **Max (MaiCoin)** | [點此註冊](https://m-max.maicoin.com/signup?r=10ba16db) |

---

## ☕ 贊助支持 (Donation)

如果這些分析對您的交易有所幫助，歡迎透過以下地址請我喝杯咖啡：

- **EVM Address (ETH / BSC / Polygon / Arbitrum)**：
  `0x63557719a40812ee964c9399d3883117d5af6ce4`

---

本站秉持「數據說話」的原則。所有分析皆基於即時市場資料與明確的 Price Action 規則，每一筆交易決策均公開記錄，絕無事後修改。
