import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { rawTrades, toDateStr, getDt, isClosed } from './trades'

function buildDailyData() {
  const daily = {}
  for (const t of rawTrades) {
    const pnl = t?.close?.pnl_usd
    const date = toDateStr(getDt(t))
    if (isClosed(t) && pnl != null && date) {
      daily[date] = (daily[date] ?? 0) + pnl
    }
  }
  const sorted = Object.keys(daily).sort()
  let cum = 0
  return sorted.map(date => {
    const net = Math.round(daily[date] * 100) / 100
    cum = Math.round((cum + net) * 100) / 100
    return { date, net_profit: net, cumulative_profit: cum }
  })
}

export default function PnlTable() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dailyData = useMemo(() => buildDailyData(), [])

  if (dailyData.length === 0) return null

  const totalProfit = dailyData[dailyData.length - 1].cumulative_profit
  const totalColor = totalProfit >= 0 ? '#10b981' : '#ef4444'

  return (
    <div className="pnl-table-widget">
      <button className="pnl-table-toggle" onClick={() => setOpen(o => !o)}>
        <span className="pnl-table-toggle-label">
          📊 {t('common.daily_pnl_table')}
          <span style={{ color: totalColor, fontWeight: 700, marginLeft: 8 }}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USDT
          </span>
        </span>
        <span className="pnl-table-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {open && (
        <div className="pnl-table-body">
          <table className="pnl-table">
            <thead>
              <tr>
                <th>{t('common.date')}</th>
                <th>{t('common.daily_net_pnl')}</th>
                <th>{t('common.cumulative_pnl')}</th>
              </tr>
            </thead>
            <tbody>
              {[...dailyData].reverse().map(row => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td style={{ color: row.net_profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {row.net_profit >= 0 ? '+' : ''}{row.net_profit.toFixed(2)}
                  </td>
                  <td style={{ color: row.cumulative_profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {row.cumulative_profit >= 0 ? '+' : ''}{row.cumulative_profit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
