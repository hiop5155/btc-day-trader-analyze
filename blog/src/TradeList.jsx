import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const tradeModules = import.meta.glob('../../trade_detail/trades/*.yaml', { eager: true })

function buildTrades() {
  return Object.values(tradeModules)
    .map(mod => mod.default ?? mod)
    .filter(t => t && t.datetime_utc8)
    .sort((a, b) => String(b.datetime_utc8).localeCompare(String(a.datetime_utc8)))
}

function formatDt(dt) {
  const s = String(dt)
  if (s.length < 12) return s
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`
}

function StatusBadge({ status, pnl }) {
  const color =
    status === 'OPEN' ? '#3b82f6' :
    status === 'CANCELLED' ? '#6b7280' :
    pnl > 0 ? '#10b981' : pnl < 0 ? '#ef4444' : '#6b7280'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: '0.75rem',
      fontWeight: 700, background: color + '1a', color, border: `1px solid ${color}33`
    }}>
      {status}
    </span>
  )
}

function GradeBadge({ grade }) {
  const color = grade === 'A+' ? '#f59e0b' : grade === 'A' ? '#10b981' : '#6b7280'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: '0.75rem',
      fontWeight: 700, background: color + '1a', color, border: `1px solid ${color}33`
    }}>
      {grade}
    </span>
  )
}

function DirectionBadge({ direction }) {
  const isLong = direction === 'LONG'
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 5, fontSize: '0.78rem', fontWeight: 700,
      background: isLong ? '#10b98120' : '#ef444420',
      color: isLong ? '#10b981' : '#ef4444',
      border: `1px solid ${isLong ? '#10b98133' : '#ef444433'}`
    }}>
      {isLong ? '▲ LONG' : '▼ SHORT'}
    </span>
  )
}

function DetailRow({ label, value, valueStyle }) {
  if (value == null || value === '') return null
  return (
    <tr>
      <td style={{ color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', paddingRight: 16, paddingTop: 6, paddingBottom: 6, verticalAlign: 'top', fontSize: '0.82rem' }}>{label}</td>
      <td style={{ color: 'var(--text-body)', fontSize: '0.85rem', paddingTop: 6, paddingBottom: 6, ...valueStyle }}>{String(value)}</td>
    </tr>
  )
}

function TradeCard({ trade }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const pnl = trade.close?.pnl_usd
  const status = trade.close?.status
  const pnlColor = pnl > 0 ? '#10b981' : pnl < 0 ? '#ef4444' : 'var(--text-muted)'
  const pnlText = pnl != null
    ? `${pnl > 0 ? '+' : ''}${Number(pnl).toFixed(2)} USDT`
    : '—'

  return (
    <div className="trade-card">
      {/* Collapsed row */}
      <button className="trade-card-header" onClick={() => setOpen(o => !o)}>
        <div className="trade-card-left">
          <DirectionBadge direction={trade.direction} />
          <GradeBadge grade={trade.grade} />
          <StatusBadge status={status} pnl={pnl} />
          <span className="trade-card-dt">{formatDt(trade.datetime_utc8)}</span>
        </div>
        <div className="trade-card-right">
          <span style={{ fontWeight: 700, color: pnlColor, fontSize: '0.9rem' }}>{pnlText}</span>
          <span className="trade-card-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="trade-card-body">
          <div className="trade-detail-grid">
            {/* Open section */}
            <div className="trade-detail-section">
              <div className="trade-detail-section-title">{t('trades.open_section')}</div>
              <table className="trade-detail-table">
                <tbody>
                  <DetailRow label={t('trades.entry')} value={trade.open?.entry} />
                  <DetailRow label={t('trades.sl')} value={trade.open?.sl} />
                  <DetailRow label={t('trades.tp1')} value={trade.open?.tp1} />
                  {trade.open?.tp2 && <DetailRow label={t('trades.tp2')} value={trade.open.tp2} />}
                  <DetailRow label={t('trades.contracts')} value={trade.open?.contracts} />
                  <DetailRow label={t('trades.notional')} value={trade.open?.notional_usd != null ? `$${trade.open.notional_usd}` : null} />
                  <DetailRow label={t('trades.risk_usd')} value={trade.open?.risk_usd != null ? `$${trade.open.risk_usd}` : null} />
                  <DetailRow label={t('trades.risk_pct')} value={trade.open?.risk_pct != null ? `${trade.open.risk_pct}%` : null} />
                  {trade.open?.fill_time_utc8 && <DetailRow label={t('trades.fill_time')} value={formatDt(trade.open.fill_time_utc8)} />}
                  {trade.open?.order_id && <DetailRow label={t('trades.order_id')} value={trade.open.order_id} valueStyle={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }} />}
                </tbody>
              </table>
            </div>

            {/* Close section */}
            <div className="trade-detail-section">
              <div className="trade-detail-section-title">{t('trades.close_section')}</div>
              <table className="trade-detail-table">
                <tbody>
                  <DetailRow label={t('trades.status')} value={status} />
                  <DetailRow label={t('trades.close_price')} value={trade.close?.close_price} />
                  <DetailRow
                    label={t('trades.pnl_usd')}
                    value={pnl != null ? `${pnl > 0 ? '+' : ''}${Number(pnl).toFixed(2)} USDT` : null}
                    valueStyle={{ color: pnlColor, fontWeight: 700 }}
                  />
                  <DetailRow
                    label={t('trades.pnl_pct')}
                    value={trade.close?.pnl_pct != null ? `${trade.close.pnl_pct > 0 ? '+' : ''}${trade.close.pnl_pct}%` : null}
                    valueStyle={{ color: pnlColor, fontWeight: 700 }}
                  />
                  <DetailRow label={t('trades.exit_reason')} value={trade.close?.exit_reason} />
                  {trade.close?.close_time_utc8 && <DetailRow label={t('trades.close_time')} value={formatDt(trade.close.close_time_utc8)} />}
                </tbody>
              </table>
            </div>
          </div>

          {/* Thesis */}
          {trade.thesis && (
            <div className="trade-thesis">
              <div className="trade-detail-section-title">{t('trades.thesis')}</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{trade.thesis.trim()}</p>
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <div className="trade-thesis" style={{ background: 'rgba(245,158,11,0.07)', borderColor: '#f59e0b44' }}>
              <div className="trade-detail-section-title" style={{ color: '#f59e0b' }}>{t('trades.notes')}</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{trade.notes.trim()}</p>
            </div>
          )}

          {/* Adjustments */}
          {trade.adjustments?.length > 0 && (
            <div className="trade-thesis">
              <div className="trade-detail-section-title">{t('trades.adjustments')}</div>
              {trade.adjustments.map((adj, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-body)', marginBottom: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{formatDt(adj.datetime_utc8)}</span>
                  <span style={{ fontWeight: 600 }}>{adj.type}</span>
                  <span>{adj.from} → {adj.to}</span>
                  {adj.note && <span style={{ color: 'var(--text-muted)' }}>({adj.note})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TradeList() {
  const { t } = useTranslation()
  const trades = useMemo(() => buildTrades(), [])

  const totalClosed = trades.filter(t => t.close?.status === 'CLOSED')
  const totalPnl = totalClosed.reduce((sum, t) => sum + (t.close?.pnl_usd ?? 0), 0)
  const wins = totalClosed.filter(t => (t.close?.pnl_usd ?? 0) > 0).length
  const winRate = totalClosed.length > 0 ? (wins / totalClosed.length * 100).toFixed(0) : 0

  return (
    <div>
      {/* Summary bar */}
      <div className="trade-list-summary">
        <div className="trade-summary-item">
          <span className="trade-summary-label">{t('trades.total_trades')}</span>
          <span className="trade-summary-value">{trades.length}</span>
        </div>
        <div className="trade-summary-item">
          <span className="trade-summary-label">{t('trades.closed')}</span>
          <span className="trade-summary-value">{totalClosed.length}</span>
        </div>
        <div className="trade-summary-item">
          <span className="trade-summary-label">{t('trades.win_rate')}</span>
          <span className="trade-summary-value">{winRate}%</span>
        </div>
        <div className="trade-summary-item">
          <span className="trade-summary-label">{t('trades.total_pnl')}</span>
          <span className="trade-summary-value" style={{ color: totalPnl >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} USDT
          </span>
        </div>
      </div>

      {/* Trade cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        {trades.map((trade, i) => (
          <TradeCard key={trade.id ?? i} trade={trade} />
        ))}
      </div>
    </div>
  )
}
