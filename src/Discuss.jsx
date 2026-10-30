import { forwardRef, useEffect, useState } from 'react'
import { SOURCES, fetchSource, timeAgo, formatCount } from './discuss.js'

function ItemRow({ item, index }) {
  const src = SOURCES.find((s) => s.id === item.source)
  const isVideo = item.source === 'bilibili'
  return (
    <div className="talk-row" style={{ '--stagger-delay': `${Math.min(index, 11) * 40}ms` }}>
      <span className="talk-badge" style={{ '--src-color': src?.color }}>{src?.short}</span>
      <a className="talk-title" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
      <div className="talk-meta">
        <span className="talk-stat">{isVideo ? '▶' : '▲'} {formatCount(item.points)}</span>
        {item.comments > 0 && <span className="talk-stat">💬 {formatCount(item.comments)}</span>}
        {!item.noTime && <span className="talk-time">{timeAgo(item.time)}</span>}
      </div>
    </div>
  )
}

function SourceChip({ src, active, onClick, state }) {
  const failed = state?.error
  return (
    <button
      className={`sub ${active ? 'sub-active' : ''}`}
      onClick={onClick}
      title={failed ? `该源加载失败：${state.error}` : src.name}
      style={failed && !active ? { opacity: 0.45, textDecoration: 'line-through' } : undefined}
    >
      {src.name}{failed ? ' ✕' : ''}
    </button>
  )
}

const Discuss = forwardRef(function Discuss(props, ref) {
  const [active, setActive] = useState('all')
  const [data, setData] = useState({}) // sourceId -> {items} | {error} | {loading}
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setData({})
    SOURCES.forEach((s) => {
      setData((d) => ({ ...d, [s.id]: { loading: true } }))
      fetchSource(s.id, ctrl.signal)
        .then((items) => setData((d) => ({ ...d, [s.id]: { items } })))
        .catch((e) => {
          if (e.name === 'AbortError') return
          setData((d) => ({ ...d, [s.id]: { error: e.message } }))
        })
    })
    return () => ctrl.abort()
  }, [tick])

  const shown = active === 'all'
    ? SOURCES.flatMap((s) => data[s.id]?.items || []).sort((a, b) => b.points - a.points).slice(0, 30)
    : (data[active]?.items || [])

  const anyLoading = SOURCES.some((s) => data[s.id]?.loading)
  const okCount = SOURCES.filter((s) => data[s.id]?.items?.length).length
  const failCount = SOURCES.filter((s) => data[s.id]?.error).length

  return (
    <div className="content" ref={ref}>
      <div className="cat-head">
        <h1>热议 · 社区热帖</h1>
        <p className="talk-sub">
          来自国内外技术社区的当前热门讨论
          {okCount > 0 && <span className="talk-status ok"> · {okCount} 个源在线</span>}
          {failCount > 0 && <span className="talk-status fail"> · {failCount} 个源不可达（可能受网络环境限制）</span>}
        </p>
        <div className="subs">
          <button
            className={`sub ${active === 'all' ? 'sub-active' : ''}`}
            onClick={() => setActive('all')}
          >全部热度</button>
          {SOURCES.map((s) => (
            <SourceChip
              key={s.id}
              src={s}
              active={active === s.id}
              state={data[s.id]}
              onClick={() => setActive(s.id)}
            />
          ))}
          <button className="sub" onClick={() => setTick((t) => t + 1)} title="重新拉取所有源">↻ 刷新</button>
        </div>
      </div>

      {anyLoading && shown.length === 0 && (
        <div className="loading">
          {Array.from({ length: 6 }, (_, i) => <div className="skeleton-row" key={i} style={{ height: 56 }} />)}
        </div>
      )}

      {shown.length > 0 && (
        <ol className="talk-list">
          {shown.map((it, i) => (
            <li key={it.id} style={{ display: 'contents' }}><ItemRow item={it} index={i} /></li>
          ))}
        </ol>
      )}

      {!anyLoading && shown.length === 0 && (
        <div className="empty">
          <p className="empty-title">
            {active === 'all' ? '暂无可用数据源' : `「${SOURCES.find((s) => s.id === active)?.name}」暂不可达`}
          </p>
          <p className="empty-hint">
            {active === 'all'
              ? '所有源都加载失败，请检查网络后点击刷新重试。'
              : '该源可能受网络环境或跨域限制，可切换到其他源，或点击刷新重试。'}
          </p>
          <button className="retry" onClick={() => setTick((t) => t + 1)}>刷新重试</button>
        </div>
      )}

      <div className="talk-foot">
        数据每 8 分钟缓存更新 · 国内源（B站）与开放 CORS 的国外源（HN、DEV.to、Lobsters、Stack Overflow）直连；
        Reddit、V2EX 在部分网络环境下可能不可达，失败时会自动标记。
      </div>
    </div>
  )
})

export default Discuss
