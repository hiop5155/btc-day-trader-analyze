import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { rawTrades, toDateStr, getDt, isClosed } from './trades';

function buildDailyData() {
  const daily = {};
  for (const t of rawTrades) {
    const pnl = t?.close?.pnl_usd;
    const date = toDateStr(getDt(t));
    if (isClosed(t) && pnl != null && date) {
      daily[date] = (daily[date] ?? 0) + pnl;
    }
  }
  const sorted = Object.keys(daily).sort();
  let cum = 0;
  return sorted.map(date => {
    const net = Math.round(daily[date] * 100) / 100;
    cum = Math.round((cum + net) * 100) / 100;
    return { date, net_profit: net, cumulative_profit: cum };
  });
}

export default function PnlDashboard() {
  const { t } = useTranslation();
  const [range, setRange] = useState('all'); // '7', '30', '90', 'all'

  const dailyData = useMemo(() => buildDailyData(), []);
  const totalProfit = dailyData.length > 0 ? dailyData[dailyData.length - 1].cumulative_profit : 0;

  if (dailyData.length === 0) return <div className="pnl-empty">{t('common.no_pnl_data', '尚未有 PnL 資料')}</div>;

  const { displayData, profit } = useMemo(() => {
    if (range === 'all') return { displayData: dailyData, profit: totalProfit };

    const daysCount = parseInt(range);
    const subset = dailyData.slice(-daysCount);
    if (subset.length === 0) return { displayData: [], profit: 0 };

    const firstIdx = dailyData.indexOf(subset[0]);
    const prevPnL = firstIdx > 0 ? (dailyData[firstIdx - 1].cumulative_profit || 0) : 0;
    const rangeProfit = (subset[subset.length - 1].cumulative_profit || 0) - prevPnL;

    return {
      displayData: subset.map(d => ({ ...d, range_cumulative_profit: (d.cumulative_profit || 0) - prevPnL })),
      profit: Number(rangeProfit.toFixed(2)),
    };
  }, [range, dailyData, totalProfit]);

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
          <a href="https://t.me/btc_money_tracker" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '7px 14px', background: 'rgba(39,174,239,0.1)', border: '1px solid rgba(39,174,239,0.3)', borderRadius: '8px', textDecoration: 'none', color: '#27aeef', fontSize: '0.82rem', fontWeight: 600 }}>
            ✈️ {t('dashboard.telegram_channel')}
          </a>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '30px', marginRight: '4px' }}>{t('common.exchanges')}</span>
            <a href="https://m-max.maicoin.com/signup?r=10ba16db" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_max')}</a>
            <a href="https://www.pionex.com/zh-TW/signUp?r=qsm5OlXA" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_pionex')}</a>
            <a href="https://bingxdao.com/invite/KFSSRQ/" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_bingx')}</a>
            <a href="https://okx.com/join/17546814" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_okx')}</a>
            <a href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WX65DDWK&utm_source=default" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_binance')}</a>
            <a href="https://crypto.com/app/7m67z2z3y9" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>{t('dashboard.exchange_cryptocom')}</a>
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
