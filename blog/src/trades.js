// Shared trade data — loaded once, used by Dashboard, PnlTable, TradeList
const tradeModules = import.meta.glob('../../trade_detail/trades/*.yaml', { eager: true });

export const rawTrades = Object.values(tradeModules).map(mod => mod.default ?? mod);

// Normalize datetime string to "YYYY-MM-DD" regardless of format
// Handles: "202604060021", "2026-04-06 00:21", "20260406", etc.
export function toDateStr(raw) {
  const s = String(raw).replace(/[-:\s]/g, '');
  if (s.length < 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// Get the datetime field (utc0 preferred, utc8 fallback)
export function getDt(t) {
  return t?.datetime_utc0 ?? t?.datetime_utc8 ?? '';
}

// Check if trade is closed (not open, not cancelled with 0 pnl)
export function isClosed(t) {
  const status = t?.close?.status;
  return status && status !== 'OPEN';
}
