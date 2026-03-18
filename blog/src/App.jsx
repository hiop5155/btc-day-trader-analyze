import { useState, useEffect } from 'react'
import PnlDashboard from './Dashboard'
import './App.css'

const mdModules = import.meta.glob('@md/*.md', { eager: true })

// Build sorted list (newest first)
const mdEntries = Object.entries(mdModules)
  .map(([filePath, mod]) => {
    const filename = filePath.split('/').pop()
    const name = filename.replace('.md', '')
    return { filename, name, html: mod.html, type: 'markdown' }
  })
  .sort((a, b) => b.name.localeCompare(a.name))

const aboutEntry = {
  filename: 'about-me',
  name: 'about-me',
  title: '關於網站運作',
  type: 'about',
  html: `
    <div class="about-content">
      <p>歡迎來到我的 <strong>BTC 交易分析與帳戶回測儀表板</strong>。這個網站旨在提供透明且可檢驗的交易紀錄，讓追隨者能清楚了解每一筆策略背後的邏輯與實際執行成果。</p>
      
      <div style="margin: 24px 0; padding: 20px; background: var(--primary-muted); border-radius: 12px; border-left: 4px solid var(--primary);">
        <h4 style="margin-top:0; color:var(--primary); font-size: 1.1rem;">網站核心功能：</h4>
        <ul style="margin-bottom:0;">
          <li><strong>即時分析報告</strong>：左側清單展示了針對 BTC 行情所做的技術分析與持倉建議。</li>
          <li><strong>帳戶回測儀表板</strong>：串接幣安 API 實時顯示當前帳戶的盈虧狀況 (PnL)，包含 7天、30天、3個月與全時段的回測數據。</li>
          <li><strong>透明績效追蹤</strong>：每一筆手續費、資助費與轉帳紀錄皆已正確對帳，確保 ROI (投報率) 計算的真實性與準確度。</li>
        </ul>
      </div>

      <p>如果你對我的交易策略感興趣，歡迎透過下方的推薦連結註冊交易所，不僅可以獲得專屬的手續費折扣，也是對我最好的支持！</p>
    </div>
  `
};

const entries = [aboutEntry, ...mdEntries];

function formatLabel(entry) {
  if (entry.type === 'about') return entry.title;
  const name = entry.name;
  const match = name.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})_(.+)$/)
  if (match) {
    const [, year, month, day, hh, mm, tag] = match
    const label = tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return `${year}-${month}-${day} ${hh}:${mm} · ${label}`
  }
  return name
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function App() {
  const [selected, setSelected] = useState(entries[0] || null)
  const [isPnlOpen, setIsPnlOpen] = useState(true)
  const [isListOpen, setIsListOpen] = useState(true)

  // Dark mode: default is light ('light'), persisted in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('btc-blog-theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('btc-blog-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">📈</span>
          <div className="header-text">
            <h1>BTC Trading Analysis</h1>
            <p className="subtitle">{entries.length} 份分析紀錄</p>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? '切換深色模式' : '切換淺色模式'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
        <nav className="file-list">
          <button
            className="section-label-toggle"
            onClick={() => setIsListOpen(!isListOpen)}
          >
            <span>分析報告清單</span>
            <span className="chevron" style={{ transform: isListOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>

          <div className={`collapsible-list ${isListOpen ? 'is-open' : ''}`}>
            {entries.map((entry) => (
              <button
                key={entry.filename}
                className={`file-item ${selected?.filename === entry.filename ? 'active' : ''} ${entry.type === 'about' ? 'about-item' : ''}`}
                onClick={() => setSelected(entry)}
              >
                <span className="file-icon">{entry.type === 'about' ? 'ℹ️' : '📄'}</span>
                <span className="file-label">{formatLabel(entry)}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <main className="content">
        {/* Collapsible PnL Dashboard */}
        <div className={`pnl-section ${isPnlOpen ? 'is-open' : ''}`}>
          <button
            className="pnl-toggle-bar"
            onClick={() => setIsPnlOpen(!isPnlOpen)}
          >
            <span className="pnl-toggle-icon">📊</span>
            <span className="pnl-toggle-text">帳戶回測儀表板</span>
            <span className="chevron">{isPnlOpen ? '▲' : '▼'} 收合/展開</span>
          </button>
          <div className="pnl-collapsible-content">
            <PnlDashboard />
          </div>
        </div>

        {selected && (
          <article className="card">
            <h2 className="article-title">{formatLabel(selected)}</h2>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: selected.html }}
            />
            {/* 推薦連結區塊 */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 'bold' }}>各大交易所推薦註冊連結 (享專屬手續費折扣 / 體驗金)：</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a href="https://m-max.maicoin.com/signup?r=10ba16db" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>Max</a>
                <a href="https://www.pionex.com/zh-TW/signUp?r=qsm5OlXA" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>派網</a>
                <a href="https://bingxdao.com/invite/KFSSRQ/" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>BingX</a>
                <a href="https://okx.com/join/17546814" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>OKx</a>
                <a href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WX65DDWK&utm_source=default" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', textDecoration: 'none', transition: 'all 0.2s' }}>幣安</a>
              </div>
              <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ☕ 贊助支持 (EVM): <code style={{ color: 'var(--primary)', marginLeft: '4px', background: 'var(--md-code-bg)', padding: '2px 6px', borderRadius: '4px' }}>0x63557719a40812ee964c9399d3883117d5af6ce4</code>
              </div>
            </div>
          </article>
        )}

        {!selected && (
          <div className="empty">選擇一份分析報告</div>
        )}
      </main>
    </div>
  )
}

export default App
