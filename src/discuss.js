// 热议板块：聚合国内外技术社区热帖
// 每个源独立加载、独立失败，互不阻塞；8 分钟缓存

export const SOURCES = [
  { id: 'hn', name: 'Hacker News', short: 'HN', color: '#ff6600', region: '国外' },
  { id: 'devto', name: 'DEV.to', short: 'DEV', color: '#3b49df', region: '国外' },
  { id: 'lobsters', name: 'Lobsters', short: 'LOB', color: '#ac130d', region: '国外' },
  { id: 'stackexchange', name: 'Stack Overflow', short: 'SO', color: '#f48024', region: '国外' },
  { id: 'reddit-prog', name: 'r/programming', short: 'R/P', color: '#ff4500', region: '国外' },
  { id: 'reddit-tech', name: 'r/technology', short: 'R/T', color: '#ff4500', region: '国外' },
  { id: 'bilibili', name: 'B站热门', short: 'BIL', color: '#fb7299', region: '国内' },
  { id: 'v2ex', name: 'V2EX', short: 'V2', color: '#778087', region: '国内' },
]

const CACHE_PREFIX = 'gitweb:talk:'
const CACHE_TTL = 8 * 60 * 1000

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { t, data } = JSON.parse(raw)
    if (Date.now() - t > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeCache(key, data) {
  try { sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), data })) } catch { /* full */ }
}

async function fetchJSON(url, signal, opts = {}) {
  const res = await fetch(url, { signal, ...opts })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// --- Hacker News（官方 API，直连，CORS 开放）---
async function fetchHN(signal) {
  const ids = await fetchJSON('https://hacker-news.firebaseio.com/v0/topstories.json', signal)
  const items = await Promise.all(
    ids.slice(0, 15).map((id) =>
      fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, signal).catch(() => null)
    )
  )
  return items.filter(Boolean).map((it) => ({
    id: `hn-${it.id}`,
    title: it.title,
    url: it.url || `https://news.ycombinator.com/item?id=${it.id}`,
    discuss: `https://news.ycombinator.com/item?id=${it.id}`,
    points: it.score ?? 0,
    comments: it.descendants ?? 0,
    time: it.time * 1000,
    source: 'hn',
  }))
}

// --- DEV.to（CORS 开放）---
async function fetchDevTo(signal) {
  const items = await fetchJSON('https://dev.to/api/articles?per_page=15&top=1', signal)
  return items.map((a) => ({
    id: `dv-${a.id}`,
    title: a.title,
    url: a.url,
    discuss: a.url + '#comments',
    points: a.positive_reactions_count ?? 0,
    comments: a.comments_count ?? 0,
    time: new Date(a.published_at).getTime(),
    source: 'devto',
  }))
}

// --- Lobsters（CORS 开放）---
async function fetchLobsters(signal) {
  const items = await fetchJSON('https://lobste.rs/hottest.json', signal)
  return items.slice(0, 15).map((a) => ({
    id: `lb-${a.short_id}`,
    title: a.title,
    url: a.short_id_url,
    discuss: a.comments_url,
    points: a.score ?? 0,
    comments: a.comment_count ?? 0,
    time: new Date(a.created_at).getTime(),
    source: 'lobsters',
  }))
}

// --- Stack Overflow 热门问题（CORS 开放）---
async function fetchStackExchange(signal) {
  const d = await fetchJSON(
    'https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&site=stackoverflow&pagesize=15',
    signal
  )
  return (d.items || []).map((q) => ({
    id: `se-${q.question_id}`,
    title: q.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
    url: q.link,
    discuss: q.link,
    points: q.score ?? 0,
    comments: (q.answer_count ?? 0) + (q.comment_count ?? 0),
    time: new Date(q.creation_date * 1000).getTime(),
    source: 'stackexchange',
  }))
}

// --- Reddit（部分网络环境不可达，失败即静默标记）---
async function fetchReddit(sub, signal) {
  const data = await fetchJSON(`https://www.reddit.com/r/${sub}/hot.json?limit=15&raw_json=1`, signal)
  return (data?.data?.children || [])
    .map((c) => c.data)
    .filter((d) => !d.stickied)
    .slice(0, 15)
    .map((d) => ({
      id: `rd-${d.id}`,
      title: d.title,
      url: `https://www.reddit.com${d.permalink}`,
      discuss: `https://www.reddit.com${d.permalink}`,
      points: d.score ?? 0,
      comments: d.num_comments ?? 0,
      time: d.created_utc * 1000,
      source: sub === 'programming' ? 'reddit-prog' : 'reddit-tech',
    }))
}

// --- B站综合热门（国内直连，CORS 开放）---
async function fetchBilibili(signal) {
  const d = await fetchJSON('https://api.bilibili.com/x/web-interface/popular?ps=20', signal, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (d.code !== 0) throw new Error(`BILIBILI_${d.code}`)
  return (d.data?.list || []).slice(0, 15).map((v) => ({
    id: `bl-${v.aid}`,
    title: v.title,
    url: `https://www.bilibili.com/video/av${v.aid}`,
    discuss: `https://www.bilibili.com/video/av${v.aid}`,
    points: v.stat?.view ?? 0,
    comments: (v.stat?.danmaku ?? 0),
    time: v.pubdate ? v.pubdate * 1000 : Date.now(),
    source: 'bilibili',
  }))
}

// --- V2EX 官方 API（CORS 不开放，浏览器直连大概率失败，保留并允许失败）---
async function fetchV2EX(signal) {
  const data = await fetchJSON('https://www.v2ex.com/api/topics/hot.json', signal)
  return (Array.isArray(data) ? data : []).slice(0, 15).map((t) => ({
    id: `v2-${t.id}`,
    title: t.title,
    url: t.url,
    discuss: t.url,
    points: t.replies ?? 0,
    comments: t.replies ?? 0,
    time: new Date(t.last_modified * 1000).getTime(),
    source: 'v2ex',
  }))
}

const FETCHERS = {
  'hn': (s) => fetchHN(s),
  'devto': (s) => fetchDevTo(s),
  'lobsters': (s) => fetchLobsters(s),
  'stackexchange': (s) => fetchStackExchange(s),
  'reddit-prog': (s) => fetchReddit('programming', s),
  'reddit-tech': (s) => fetchReddit('technology', s),
  'bilibili': (s) => fetchBilibili(s),
  'v2ex': (s) => fetchV2EX(s),
}

export async function fetchSource(sourceId, signal) {
  const cached = readCache(sourceId)
  if (cached) return cached
  const items = await FETCHERS[sourceId](signal)
  writeCache(sourceId, items)
  return items
}

export function timeAgo(ts) {
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

export function formatCount(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n ?? 0)
}
