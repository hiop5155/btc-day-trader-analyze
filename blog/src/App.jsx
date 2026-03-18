import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

const getAboutEntry = (t) => ({
  filename: 'about-me',
  name: 'about-me',
  title: t('about.title'),
  type: 'about',
  html: `
    <div class="about-content">
      <p>${t('about.p1')}</p>
      
      <div style="margin: 24px 0; padding: 20px; background: var(--primary-muted); border-radius: 12px; border-left: 4px solid var(--primary);">
        <h4 style="margin-top:0; color:var(--primary); font-size: 1.1rem;">${t('about.core_features')}</h4>
        <ul style="margin-bottom:0;">
          <li>${t('about.feat1')}</li>
          <li>${t('about.feat2')}</li>
          <li>${t('about.feat3')}</li>
        </ul>
      </div>

      <p>${t('about.p2')}</p>
    </div>
  `
});

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

function LangIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function App() {
  const { t, i18n } = useTranslation()
  const aboutEntry = getAboutEntry(t)
  const entries = [aboutEntry, ...mdEntries]

  const [selected, setSelected] = useState(entries[0])
  const [isPnlOpen, setIsPnlOpen] = useState(true)
  const [isListOpen, setIsListOpen] = useState(true)

  // Sync selected 'About Me' when language changes
  useEffect(() => {
    if (selected.filename === 'about-me') {
      setSelected(aboutEntry)
    }
  }, [i18n.language])

  // Dark mode: default is light ('light'), persisted in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('btc-blog-theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('btc-blog-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  const toggleLang = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">📈</span>
          <div className="header-text">
            <h1>BTC Trading Analysis</h1>
            <p className="subtitle">{t('common.reports_count', { count: mdEntries.length })}</p>
          </div>
          <div className="header-actions">
            <button
              className="action-btn lang-toggle"
              onClick={toggleLang}
              title={i18n.language.startsWith('zh') ? 'Switch to English' : '切換至中文'}
            >
              <LangIcon />
              <span className="lang-text">{i18n.language.startsWith('zh') ? 'EN' : '中'}</span>
            </button>
            <button
              className="action-btn theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? t('common.theme_dark') : t('common.theme_light')}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </div>
        <nav className="file-list">
          <button
            className="section-label-toggle"
            onClick={() => setIsListOpen(!isListOpen)}
          >
            <span>{t('common.reports_list')}</span>
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
            <span className="pnl-toggle-text">{t('common.pnl_dashboard')}</span>
            <span className="chevron">{isPnlOpen ? '▲' : '▼'} {isPnlOpen ? t('common.collapse') : t('common.expand')}</span>
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
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 'bold' }}>{t('dashboard.referral_title')}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a href="https://m-max.maicoin.com/signup?r=10ba16db" target="_blank" rel="noopener noreferrer" className="referral-btn">Max</a>
                <a href="https://www.pionex.com/zh-TW/signUp?r=qsm5OlXA" target="_blank" rel="noopener noreferrer" className="referral-btn">派網</a>
                <a href="https://bingxdao.com/invite/KFSSRQ/" target="_blank" rel="noopener noreferrer" className="referral-btn">BingX</a>
                <a href="https://okx.com/join/17546814" target="_blank" rel="noopener noreferrer" className="referral-btn">OKx</a>
                <a href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WX65DDWK&utm_source=default" target="_blank" rel="noopener noreferrer" className="referral-btn">幣安</a>
              </div>
              <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('common.donation')} <code style={{ color: 'var(--primary)', marginLeft: '4px', background: 'var(--md-code-bg)', padding: '2px 6px', borderRadius: '4px' }}>0x6355...6ce4</code>
              </div>
            </div>
          </article>
        )}

        {!selected && (
          <div className="empty">{t('common.select_report')}</div>
        )}
      </main>
    </div>
  )
}

export default App
