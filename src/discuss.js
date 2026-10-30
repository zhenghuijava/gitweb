// 热议板块：聚合国内外技术社区热帖
// 每个源独立加载、独立失败，互不阻塞；8 分钟缓存

export const SOURCES = [
  { id: 'hn', name: 'Hacker News', short: 'HN', color: '#ff6600', region: '国外' },
  { id: 'devto', name: 'DEV.to', short: 'DEV', color: '#3b49df', region: '国外' },
  { id: 'stackexchange', name: 'Stack Overflow', short: 'SO', color: '#f48024', region: '国外' },
  { id: 'weibo', name: '微博热搜', short: '微博', color: '#e6162d', region: '国内' },
  { id: 'bilibili', name: 'B站热门', short: 'B站', color: '#fb7299', region: '国内' },
  { id: '36kr', name: '36氪', short: '36氪', color: '#0f80ff', region: '国内' },
  { id: 'sspai', name: '少数派', short: '少数派', color: '#d71a21', region: '国内' },
]

// codelife（tophub 镜像）聚合接口，开放 CORS，已验证可用
const CODELIFE = 'https://api.codelife.cc/api/top/list?lang=cn&id='
const CODELIFE_IDS = {
  weibo: 'KqndgxeLl9',
  bilibili: '74KvxwokxM',
  '36kr': 'Q1Vd5Ko85R',
  sspai: 'Y2KeDGQdNP',
}

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
    image: a.cover_image || a.social_image || (a.user && a.user.profile_image) || null,
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

// --- codelife 聚合源（微博/B站/36氪/少数派，开放 CORS）---
async function fetchCodelife(sourceId, signal) {
  const d = await fetchJSON(CODELIFE + CODELIFE_IDS[sourceId], signal)
  if (d.code !== 200 || !Array.isArray(d.data)) throw new Error(`CODELIFE_${d.code}`)
  return d.data.slice(0, 15).map((it, i) => ({
    id: `${sourceId}-${i}-${it.link || it.title}`,
    title: it.title || '',
    url: it.link || '#',
    discuss: it.link || '#',
    points: parseHotValue(it.hotValue),
    comments: 0,
    time: Date.now(), // 聚合源无时间戳，显示为"刚刚"不合适，用 0 标记
    noTime: true,
    source: sourceId,
  }))
}

function parseHotValue(v) {
  if (typeof v !== 'string') return 0
  const m = v.match(/^([\d.]+)\s*(万|w)?/i)
  if (!m) return 0
  const n = parseFloat(m[1])
  return m[2] ? Math.round(n * 10000) : Math.round(n)
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
  'stackexchange': (s) => fetchStackExchange(s),
  'weibo': (s) => fetchCodelife('weibo', s),
  'bilibili': (s) => fetchCodelife('bilibili', s),
  '36kr': (s) => fetchCodelife('36kr', s),
  'sspai': (s) => fetchCodelife('sspai', s),
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
