import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, LANGUAGES, LANGUAGE_COLORS } from './categories.js'
import { searchRepos, formatStars, formatTime, subscribeRateLimit } from './github.js'
import Discuss from './Discuss.jsx'
import catSvg from './cat.svg'

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  )
}

/* 美短猫 logo（用户提供 SVG） */
function CatLogo({ size = 26 }) {
  return <img src={catSvg} alt="" width={size} height={size} style={{ display: 'block' }} />
}

function LanguageDot({ lang }) {
  if (!lang) return null
  return (
    <span className="lang">
      <span className="lang-dot" style={{ background: LANGUAGE_COLORS[lang] || '#878ca0' }} />
      {lang}
    </span>
  )
}

function RateLimitBadge() {
  const [state, setState] = useState({ remain: 10, resetIn: 0 })
  useEffect(() => subscribeRateLimit(setState), [])
  const low = state.remain <= 2
  return (
    <span className={`rate ${low ? 'rate-low' : ''}`} title="GitHub 搜索 API 每分钟限 10 次请求（未认证）">
      <span className="rate-dot" />
      API 余量 {state.remain}/10{low && state.resetIn > 0 ? ` · ${state.resetIn}s 后恢复` : ''}
    </span>
  )
}

function RepoCard({ repo, rank, index }) {
  return (
    <a
      className="card"
      href={repo.url}
      target="_blank"
      rel="noreferrer"
      style={{ '--stagger-delay': `${Math.min(index, 11) * 45}ms` }}
    >
      <div className="card-top">
        <img className="card-avatar" src={repo.avatar} alt="" loading="lazy" width="28" height="28" />
        <span className="card-name">{repo.fullName}</span>
        {rank <= 3 && <span className="card-rank">#{rank}</span>}
      </div>
      <p className="card-desc">{repo.description || '（无描述）'}</p>
      {repo.topics.length > 0 && (
        <div className="card-topics">
          {repo.topics.slice(0, 3).map((t) => <span className="topic" key={t}>{t}</span>)}
        </div>
      )}
      <div className="card-meta">
        <span className="stars"><StarIcon />{formatStars(repo.stars)}</span>
        <LanguageDot lang={repo.language} />
        <span className="updated">{formatTime(repo.updatedAt)}</span>
      </div>
    </a>
  )
}

/* Hero 右侧的静态预览卡：硬编码当前真实热门示例（标注为示例快照） */
const HERO_PREVIEW = [
  { rank: 1, name: 'morluto/rea', stars: '409k' },
  { rank: 2, name: 'affaan-m/ECC', stars: '293k' },
  { rank: 3, name: 'NousResearch/hermes-agent', stars: '259k' },
  { rank: 4, name: 'firecrawl/firecrawl', stars: '197k' },
  { rank: 5, name: 'ollama/ollama', stars: '185k' },
]

const SORTS = [
  { id: 'stars', name: 'Star 最多' },
  { id: 'updated', name: '最近活跃' },
]

const BENTO = [
  {
    icon: '🗂️',
    title: '领域分类导航',
    desc: '九大技术领域 × 细分小类，以 GitHub topic 为键策展，一键切换直达目标领域。',
    wide: true,
    chips: ['AI / ML', '前端', '后端', '数据库', 'DevOps'],
  },
  {
    icon: '🔎',
    title: '全文搜索',
    desc: '任意关键词直搜 GitHub 仓库，支持语言与排序筛选。',
  },
  {
    icon: '💬',
    title: '社区热议',
    desc: '聚合 HN、微博、B站、36氪等 7 个源的热门讨论，图文卡片呈现。',
  },
  {
    icon: '⚡',
    title: '实时缓存',
    desc: '数据每 8–10 分钟自动刷新，本地缓存兜底，限流时无缝降级。',
  },
  {
    icon: '🌗',
    title: '明暗双主题',
    desc: '跟随系统偏好，一键切换，防闪屏。',
  },
]

export default function App() {
  const [catId, setCatId] = useState(CATEGORIES[0].id)
  const [subId, setSubId] = useState(CATEGORIES[0].subs[0].id)
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState('')
  const [sort, setSort] = useState('stars')
  const [view, setView] = useState(() => (window.location.hash === '#discuss' ? 'discuss' : 'repos'))
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gitweb:theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gitweb:theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    const onHash = () => setView(window.location.hash === '#discuss' ? 'discuss' : 'repos')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function switchView(v) {
    setView(v)
    window.location.hash = v === 'discuss' ? '#discuss' : ''
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
  }

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stale, setStale] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const abortRef = useRef(null)

  const category = useMemo(() => CATEGORIES.find((c) => c.id === catId), [catId])
  const sub = useMemo(() => category.subs.find((s) => s.id === subId) || category.subs[0], [category, subId])

  const searchMode = query.trim().length > 0

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const q = searchMode
      ? query.trim()
      : (sub.topics.split(',').map((t) => `topic:${t}`).join(' '))

    setLoading(true)
    setError(null)
    searchRepos({ query: q, lang, sort, signal: ctrl.signal })
      .then(({ items, stale }) => {
        setItems(items)
        setStale(stale)
        setLoading(false)
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setError(e.message)
        setItems([])
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [searchMode, query, sub.id, lang, sort, refreshTick])

  function pickCategory(c) {
    setCatId(c.id)
    setSubId(c.subs[0].id)
    setQuery('')
    setView('repos')
  }

  return (
    <>
      {/* Sticky 磨砂导航 */}
      <header className="navbar">
        <a className="nav-brand" href="#explore" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <span className="nav-logo"><CatLogo /></span>
          <span className="nav-name">GitWeb</span>
        </a>
        <nav className="nav-links" aria-label="主导航">
          <button className={`nav-link ${view === 'repos' ? 'active' : ''}`} onClick={() => switchView('repos')}>热门项目</button>
          <button className={`nav-link ${view === 'discuss' ? 'active' : ''}`} onClick={() => switchView('discuss')}>社区热议</button>
          <a className="nav-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <div className="nav-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
            aria-label={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <a className="btn-cta" href="#explore" onClick={(e) => { e.preventDefault(); switchView('repos') }}>开始探索</a>
        </div>
      </header>

      {/* Hero：左文案 + 右 3D 预览卡 */}
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">GITHUB TRENDING, CURATED</p>
          <h1>
            发现值得使用的
            <br />
            <span className="grad-text">开源项目</span>
          </h1>
          <p className="hero-sub">
            按领域策展的 GitHub 热门项目目录，聚合七个社区的热议声音——
            从 AI 到 DevOps，找到下一个改变你工作流的那颗星。
          </p>
          <div className="hero-actions">
            <a className="btn-primary" href="#explore" onClick={(e) => { e.preventDefault(); switchView('repos') }}>开始探索</a>
            <a className="btn-ghost" href="#explore" onClick={(e) => { e.preventDefault(); switchView('discuss') }}>看看大家在聊什么</a>
          </div>
        </div>
        <div className="hero-preview" aria-hidden="true">
          <div className="preview-stack">
            <span className="preview-badge">今日 Trending</span>
            <p className="preview-title">GitHub · Trending Repos</p>
            {HERO_PREVIEW.map((r) => (
              <div className="preview-row" key={r.rank}>
                <span className="preview-rank">#{r.rank}</span>
                <span className="preview-name">{r.name}</span>
                <span className="preview-stars">★ {r.stars}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento 便当网格 */}
      <section className="bento" aria-label="核心功能">
        {BENTO.map((b) => (
          <div className={`bento-card ${b.wide ? 'bento-wide' : ''}`} key={b.title}>
            <div className="bento-icon" aria-hidden="true">{b.icon}</div>
            <h3>{b.title}</h3>
            <p>{b.desc}</p>
            {b.chips && (
              <div className="bento-chiprow">
                {b.chips.map((c) => <span className="bento-chip" key={c}>{c}</span>)}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* 探索区：实际功能 */}
      <main className="explore" id="explore">
        <div className="explore-head">
          <h2>{view === 'repos' ? (searchMode ? `搜索“${query.trim()}”` : category.name) : '热议 · 社区热帖'}</h2>
          <span className="explore-note">
            {view === 'repos'
              ? (searchMode ? '搜索结果' : `${sub.name} · Curated by GitHub Topics`)
              : '来自国内外技术社区的当前热门讨论'}
          </span>
        </div>

        {view === 'repos' && (
          <div className="toolbar">
            <input
              className="search"
              type="search"
              placeholder="搜索任意仓库，如：todo app、proxy…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索 GitHub 仓库"
            />
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="语言筛选">
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l || '全部语言'}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="排序">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <RateLimitBadge />
          </div>
        )}

        {view === 'repos' && !searchMode && (
          <div className="subs" role="tablist" aria-label="小类">
            {category.subs.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={s.id === sub.id}
                className={`sub ${s.id === sub.id ? 'sub-active' : ''}`}
                onClick={() => setSubId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {stale && (
          <div className="banner">请求已达限流，当前显示的是缓存数据，稍后自动恢复。</div>
        )}

        {view === 'repos' ? (
          loading ? (
            <div className="loading" aria-live="polite">
              {Array.from({ length: 8 }, (_, i) => <div className="skeleton-row" key={i} />)}
            </div>
          ) : error ? (
            <div className="empty">
              <p className="empty-title">{error === 'RATE_LIMITED' ? '已达到 GitHub 每分钟请求上限' : '加载失败，请检查网络后重试'}</p>
              <p className="empty-hint">
                {error === 'RATE_LIMITED'
                  ? '未认证的搜索 API 每分钟仅 10 次请求，请等待约 1 分钟，或浏览其他已缓存的小类。'
                  : '点击重试将重新发起请求。'}
              </p>
              <button className="retry" onClick={() => setRefreshTick((t) => t + 1)}>重试</button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty">
              <p className="empty-title">没有找到匹配的项目</p>
              <p className="empty-hint">试试更换小类、语言或放宽搜索关键词。</p>
            </div>
          ) : (
            <div className="card-grid">
              {items.map((r, i) => <RepoCard repo={r} rank={i + 1} index={i} key={r.id} />)}
            </div>
          )
        ) : (
          <Discuss />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-brand">
          <CatLogo size={18} /> GitWeb
        </span>
        <span>数据来自 GitHub Search API 与各社区公开接口 · 每 8–10 分钟缓存刷新</span>
        <span className="footer-links">
          <a className="footer-icon" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
          </a>
          <a className="footer-icon" href="https://news.ycombinator.com" target="_blank" rel="noreferrer" aria-label="Hacker News">
            <span style={{ fontSize: 13, fontWeight: 700 }}>Y</span>
          </a>
          <button className="footer-icon" onClick={toggleTheme} aria-label="切换主题" style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'inherit' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </span>
      </footer>
    </>
  )
}
