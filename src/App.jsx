import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, LANGUAGES, LANGUAGE_COLORS } from './categories.js'
import { searchRepos, formatStars, formatTime, subscribeRateLimit } from './github.js'
import Discuss from './Discuss.jsx'

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  )
}

function LanguageDot({ lang }) {
  if (!lang) return null
  return (
    <span className="lang">
      <span className="lang-dot" style={{ background: LANGUAGE_COLORS[lang] || '#8b949e' }} />
      {lang}
    </span>
  )
}

function RateLimitBadge() {
  const [state, setState] = useState({ remain: 10, resetIn: 0 })
  useEffect(() => subscribeRateLimit(setState), [])
  const low = state.remain <= 2
  return (
    <span
      className={`rate ${low ? 'rate-low' : ''}`}
      title={`GitHub 搜索 API 每分钟限 10 次请求（未认证）`}
    >
      <span className="rate-dot" />
      API 余量 {state.remain}/10{low && state.resetIn > 0 ? ` · ${state.resetIn}s 后恢复` : ''}
    </span>
  )
}

function RepoRow({ repo, rank }) {
  return (
    <a className="row" href={repo.url} target="_blank" rel="noreferrer">
      <span className="row-rank">{rank}</span>
      <div className="row-main">
        <div className="row-head">
          <span className="row-name">{repo.fullName}</span>
          {repo.topics.slice(0, 3).map((t) => (
            <span className="topic" key={t}>{t}</span>
          ))}
        </div>
        <p className="row-desc">{repo.description || '（无描述）'}</p>
      </div>
      <div className="row-meta">
        <span className="stars"><StarIcon />{formatStars(repo.stars)}</span>
        <LanguageDot lang={repo.language} />
        <span className="updated">{formatTime(repo.updatedAt)}</span>
      </div>
    </a>
  )
}

const SORTS = [
  { id: 'stars', name: 'Star 最多' },
  { id: 'updated', name: '最近活跃' },
]

export default function App() {
  const [catId, setCatId] = useState(CATEGORIES[0].id)
  const [subId, setSubId] = useState(CATEGORIES[0].subs[0].id)
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState('')
  const [sort, setSort] = useState('stars')
  const [view, setView] = useState(() => (window.location.hash === '#discuss' ? 'discuss' : 'repos')) // repos | discuss

  // hash 路由：#discuss ↔ view，支持分享与前进后退
  useEffect(() => {
    const onHash = () => setView(window.location.hash === '#discuss' ? 'discuss' : 'repos')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function switchView(v) {
    setView(v)
    window.location.hash = v === 'discuss' ? '#discuss' : ''
  }
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stale, setStale] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const abortRef = useRef(null)

  const category = useMemo(() => CATEGORIES.find((c) => c.id === catId), [catId])
  const sub = useMemo(() => category.subs.find((s) => s.id === subId) || category.subs[0], [category, subId])

  // 搜索模式：query 非空时忽略分类
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
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">GW</span>
          <span className="brand-name">GitWeb</span>
        </div>
        <nav className="cats" aria-label="主导航">
          <div className="nav-group-label">探索</div>
          <button
            className={`cat ${view === 'repos' ? 'cat-active' : ''}`}
            onClick={() => switchView('repos')}
          >
            <span className="cat-icon" aria-hidden="true">📦</span>
            热门项目
          </button>
          <button
            className={`cat ${view === 'discuss' ? 'cat-active' : ''}`}
            onClick={() => switchView('discuss')}
          >
            <span className="cat-icon" aria-hidden="true">💬</span>
            社区热议
          </button>
        </nav>
        <nav className="cats cats-scroll" aria-label="领域分类">
          <div className="nav-group-label">领域分类</div>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`cat ${c.id === catId && view === 'repos' && !searchMode ? 'cat-active' : ''}`}
              onClick={() => { pickCategory(c); setQuery(''); setView('repos') }}
            >
              <span className="cat-icon" aria-hidden="true">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </nav>
        <footer className="sidebar-foot">
          数据来自 GitHub Search API<br />每 10 分钟缓存刷新
        </footer>
      </aside>

      <div className="main">
        <header className="toolbar">
          {view === 'repos' ? (
            <>
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
            </>
          ) : (
            <div className="toolbar-hint">聚合当前热门讨论，数据每 8 分钟更新</div>
          )}
          <RateLimitBadge />
        </header>

        {view === 'discuss' ? (
          <Discuss />
        ) : (
        <div className="content">
          <div className="cat-head">
            <h1>{searchMode ? `搜索“${query.trim()}”` : category.name}</h1>
            {!searchMode && (
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
          </div>

          {stale && (
            <div className="banner">请求已达限流，当前显示的是缓存数据，稍后自动恢复。</div>
          )}

          {loading ? (
            <div className="loading" aria-live="polite">
              {Array.from({ length: 8 }, (_, i) => (
                <div className="skeleton-row" key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="empty">
              <p className="empty-title">
                {error === 'RATE_LIMITED'
                  ? '已达到 GitHub 每分钟请求上限'
                  : '加载失败，请检查网络后重试'}
              </p>
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
            <ol className="list">
              {items.map((r, i) => (
                <li key={r.id}><RepoRow repo={r} rank={i + 1} /></li>
              ))}
            </ol>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
