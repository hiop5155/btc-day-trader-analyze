import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function PnlDashboard() {
  const { t } = useTranslation();
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('all'); // '7', '30', '90', 'all'

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const apiUrl = isDev ? 'http://localhost:5005/api/pnl' : '/api-pnl/pnl';

    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (json.error) throw new Error(json.error);
        setRawData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="pnl-loader">{t('common.loading_pnl', '讀取帳戶回測資料中...')}</div>;
  if (error) return <div className="pnl-error">{t('common.error_pnl', '無法載入圖表')} ({error})</div>;
  if (!rawData || !rawData.dailyData || rawData.dailyData.length === 0) return <div className="pnl-empty">{t('common.no_pnl_data', '尚未有 PnL 資料')}</div>;

  // 處理時間區間選擇與數字重算
  const getFilteredData = () => {
    const allDays = rawData.dailyData;
    if (range === 'all') return {
      displayData: allDays,
      profit: rawData.totalProfit,
      roi: rawData.totalRoi
    };

    const daysCount = parseInt(range);
    const subset = allDays.slice(-daysCount);
    if (subset.length === 0) return { displayData: [], profit: 0, roi: 0 };

    const lastDay = subset[subset.length - 1];
    const firstDay = subset[0];
    const dayBeforeIndex = allDays.indexOf(firstDay) - 1;

    let prevPnL = 0;
    let prevBalance = 0;
    let prevTransfer = 0;

    if (dayBeforeIndex >= 0) {
      const dayBefore = allDays[dayBeforeIndex];
      prevPnL = dayBefore.cumulative_profit || 0;
      prevBalance = dayBefore.wallet_balance || 0;
      prevTransfer = dayBefore.cumulative_transfer || 0;
    } else {
      prevPnL = 0;
      prevTransfer = 0;
      prevBalance = (firstDay.wallet_balance || 0) - (firstDay.net_profit || 0) - (firstDay.net_transfer || 0);
    }

    const rangeProfit = (lastDay.cumulative_profit || 0) - prevPnL;

    // 歷史最高投入基礎，確保不會因為起初金額太小導致爆衝
    let maxBaseInPeriod = Math.max(prevBalance, 20.0);

    // 調整 Chart 顯示：這段時間內的累積成長
    const chartData = subset.map(d => {
      const pnlInPeriod = (d.cumulative_profit || 0) - prevPnL;
      const transferInPeriod = (d.cumulative_transfer || 0) - prevTransfer;

      // 該日為止的區間可用資本 = 進入此區間前的餘額 + 在此區間內新增的轉帳總額
      const baseForDay = prevBalance + transferInPeriod;
      if (baseForDay > maxBaseInPeriod) {
        maxBaseInPeriod = baseForDay;
      }

      return {
        ...d,
        range_cumulative_profit: pnlInPeriod,
        range_pnl_percentage: (pnlInPeriod / Math.max(maxBaseInPeriod, 20.0)) * 100
      };
    });

    const totalTransferInPeriod = (lastDay.cumulative_transfer || 0) - prevTransfer;
    const finalBase = Math.max(prevBalance + totalTransferInPeriod, 20.0);
    const rangeRoi = (rangeProfit / Math.max(finalBase, 20.0)) * 100;

    return {
      displayData: chartData,
      profit: Number(rangeProfit.toFixed(2)),
      roi: Number(rangeRoi.toFixed(2))
    };
  };

  const { displayData, profit, roi } = getFilteredData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-main)' }}>{label}</p>
          {payload.map((entry, index) => {
            const isPercent = entry.dataKey.includes('percentage');
            return (
              <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '0.9rem' }}>
                {entry.name}: <span style={{ fontWeight: '600' }}>
                  {entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)}{isPercent ? '%' : ' USDT'}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const RangeButton = ({ value, label }) => (
    <button
      onClick={() => setRange(value)}
      style={{
        padding: '6px 14px',
        fontSize: '0.8rem',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: range === value ? 'var(--primary)' : 'var(--bg)',
        color: range === value ? '#fff' : 'var(--text-muted)',
        cursor: 'pointer',
        fontWeight: range === value ? '600' : '400',
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="pnl-dashboard">
      <div className="pnl-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--md-h-color)' }}>{t('common.account_backtest')}</h2>
          <div className="range-selector" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <RangeButton value="7" label={t('dashboard.range_7d')} />
            <RangeButton value="30" label={t('dashboard.range_30d')} />
            <RangeButton value="90" label={t('dashboard.range_90d')} />
            <RangeButton value="all" label={t('dashboard.range_all')} />
          </div>
        </div>
        <div style={{ padding: '8px 16px', background: profit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{range === 'all' ? t('dashboard.cumulative_profit') : t('dashboard.range_profit')}</span>
          <div style={{ color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {profit > 0 ? '+' : ''}{profit.toFixed(2)} USDT
          </div>
        </div>
      </div>

      <div style={{ height: '300px', marginBottom: '50px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t('dashboard.chart_cumulative_profit', '累積盈虧 (Cumulative Net PnL USDT)')}
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickMargin={10} minTickGap={30} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `$${val}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              name={t('dashboard.profit', '淨盈虧')}
              dataKey={range === 'all' ? 'cumulative_profit' : 'range_cumulative_profit'}
              stroke="var(--primary)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPnL)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: '240px', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{t('dashboard.chart_daily_profit')}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickMargin={10} minTickGap={30} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => `$${val}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--active-bg)' }} />
            <Bar name={t('dashboard.profit')} dataKey="net_profit" radius={[4, 4, 0, 0]}>
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.net_profit >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '60px', padding: '16px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '30px', marginRight: '4px' }}>{t('common.exchanges')}</span>
            <a href="https://m-max.maicoin.com/signup?r=10ba16db" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_max')}</a>
            <a href="https://www.pionex.com/zh-TW/signUp?r=qsm5OlXA" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_pionex')}</a>
            <a href="https://bingxdao.com/invite/KFSSRQ/" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_bingx')}</a>
            <a href="https://okx.com/join/17546814" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_okx')}</a>
            <a href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WX65DDWK&utm_source=default" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_binance')}</a>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('common.donation')} <code style={{ color: 'var(--primary)', background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>0x63557719a40812ee964c9399d3883117d5af6ce4</code>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{range === 'all' ? t('dashboard.cumulative_profit') : t('dashboard.range_profit')}：</span>
          <span style={{ fontWeight: '700', color: profit >= 0 ? '#10b981' : '#ef4444', marginLeft: '6px' }}>
            {profit > 0 ? '+' : ''}{profit.toFixed(2)} USDT
          </span>
        </div>
      </div>
    </div>
  );
}
