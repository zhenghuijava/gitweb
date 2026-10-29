// GitHub Search API 封装：按需加载 + sessionStorage 缓存 + 限流提示
const CACHE_PREFIX = 'gitweb:cache:'
const CACHE_TTL = 10 * 60 * 1000 // 10 分钟

function cacheKey(query, sort, lang) {
  return `${CACHE_PREFIX}${query}|${sort}|${lang}`
}

export function readCache(query, sort, lang) {
  try {
    const raw = sessionStorage.getItem(cacheKey(query, sort, lang))
    if (!raw) return null
    const { t, data } = JSON.parse(raw)
    if (Date.now() - t > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function writeCache(query, sort, lang, data) {
  try {
    sessionStorage.setItem(cacheKey(query, sort, lang), JSON.stringify({ t: Date.now(), data }))
  } catch {
    // 存储满时静默失败
  }
}

// 全局限流状态（search API 未认证 10 req/min）
let windowStart = Date.now()
let requestCount = 0
const listeners = new Set()

export function subscribeRateLimit(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyRateLimit() {
  const remain = Math.max(0, 10 - requestCount)
  const resetIn = Math.max(0, 60 - Math.floor((Date.now() - windowStart) / 1000))
  listeners.forEach((fn) => fn({ remain, resetIn }))
}

setInterval(() => {
  if (Date.now() - windowStart >= 60_000) {
    windowStart = Date.now()
    requestCount = 0
    notifyRateLimit()
  }
}, 1000).unref?.()

/**
 * 搜索仓库。query 例: 'topic:llm stars:>500'
 * @returns {Promise<{items: Array, stale: boolean}>} stale=true 表示命中限流回退到过期缓存
 */
export async function searchRepos({ query, lang = '', sort = 'stars', signal }) {
  let q = query
  if (lang) q += ` language:"${lang}"`
  q += ' stars:>300'

  // 命中缓存直接返回（不过限流额度）
  const cached = readCache(q, sort, '')
  if (cached) return { items: cached, stale: false }

  if (requestCount >= 10) {
    // 限流中：尝试过期缓存兜底
    try {
      const raw = sessionStorage.getItem(cacheKey(q, sort, ''))
      if (raw) {
        const { data } = JSON.parse(raw)
        return { items: data, stale: true }
      }
    } catch { /* ignore */ }
    const err = new Error('RATE_LIMITED')
    throw err
  }

  requestCount++
  notifyRateLimit()

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=25`
  const res = await fetch(url, { signal, headers: { Accept: 'application/vnd.github+json' } })

  if (res.status === 403 || res.status === 429) {
    // GitHub 侧限流：同样尝试过期缓存
    try {
      const raw = sessionStorage.getItem(cacheKey(q, sort, ''))
      if (raw) {
        const { data } = JSON.parse(raw)
        return { items: data, stale: true }
      }
    } catch { /* ignore */ }
    throw new Error('RATE_LIMITED')
  }
  if (!res.ok) throw new Error(`GITHUB_ERROR_${res.status}`)

  const json = await res.json()
  const items = (json.items || []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login || '',
    avatar: r.owner?.avatar_url || '',
    description: r.description || '',
    stars: r.stargazers_count,
    language: r.language || '',
    topics: r.topics || [],
    updatedAt: r.pushed_at || r.updated_at,
    url: r.html_url,
  }))
  writeCache(q, sort, '', items)
  return { items, stale: false }
}

export function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export function formatTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`
  return `${Math.floor(months / 12)} 年前`
}
