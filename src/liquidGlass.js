/*!
 * Liquid Glass — refraction hook (React port of the Angular directive).
 *
 * The refraction field is a port of the fragment shader in liquid-glass-js
 * (https://github.com/dashersw/liquid-glass-js) — Copyright (c) 2025 Armagan
 * Amcalar, MIT. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of that software to deal in it without restriction,
 * provided this notice travels with it; it is provided "as is", without
 * warranty of any kind. Keep this header on any copy or port.
 *
 * Pair with the `.liquid-glass` class from liquid-glass.css:
 *   const glass = useLiquidGlass(); <div className="liquid-glass" ref={glass}>
 */
import { useEffect, useRef } from 'react'

/** Mirrors the shader uniforms of liquid-glass-js; hand-tuned preset. */
const GLASS_PRESET = {
  edgeIntensity: 0.015,
  rimIntensity: 0.028,
  baseIntensity: 0.05,
  edgeDistance: 0.5,
  rimDistance: 1.7,
  baseDistance: 0.2,
  cornerBoost: 0.06,
  rippleEffect: 0.26,
  blurRadius: 2,
  warp: false,
}

/** The rim lives in a 1-2px band; 2x map keeps the edge lens crisp. */
const SUPERSAMPLE = 2
/** Bound bake cost / data-URL size for big surfaces (mostly neutral anyway). */
const MAX_MAP_EDGE = 1400
/** feGaussianBlur stdDeviation per unit of blurRadius. */
const BLUR_STD_PER_RADIUS = 0.35

/** SVG-referenced backdrop filters render in Chromium only; Safari parses
 *  `backdrop-filter: url(#…)` and paints nothing, so gate on engine. */
function isSupported() {
  const brands = navigator.userAgentData?.brands
  if (brands) {
    return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand))
  }
  return /Chrome\//.test(navigator.userAgent)
}

// ── 共享滤镜池：同尺寸元素（同 key）复用同一个滤镜节点 ──
const filters = new Map() // key -> { id, node, refs }
let defsSvg = null
let nextId = 0

function ensureDefs() {
  if (!defsSvg || !defsSvg.isConnected) {
    const svgNs = 'http://www.w3.org/2000/svg'
    defsSvg = document.createElementNS(svgNs, 'svg')
    defsSvg.setAttribute('width', '0')
    defsSvg.setAttribute('height', '0')
    defsSvg.style.position = 'fixed'
    defsSvg.setAttribute('aria-hidden', 'true')
    defsSvg.appendChild(document.createElementNS(svgNs, 'defs'))
    document.body.appendChild(defsSvg)
  }
  return defsSvg
}

function acquireFilter(key, w, h, radius, pageW, pageH, cfg) {
  let entry = filters.get(key)
  // 仅当缓存节点仍在文档中才复用——共享 defs 被移除后 url(#id) 会静默失效
  if (entry && entry.node.isConnected) {
    entry.refs++
    return entry
  }
  if (entry) filters.delete(key)
  const { mapUrl, scale } = buildDisplacementMap(w, h, radius, pageW, pageH, cfg)
  const id = `liquid-glass-${nextId++}`
  const svgNs = 'http://www.w3.org/2000/svg'
  const filter = document.createElementNS(svgNs, 'filter')
  filter.setAttribute('id', id)
  // 边缘像素采样最远 scale/2 + 模糊扩散；区域不够会在角落裁剪成透明
  const marginPx = scale / 2 + 3 * cfg.blurRadius * BLUR_STD_PER_RADIUS
  const mx = (marginPx / w) * 100
  const my = (marginPx / h) * 100
  filter.setAttribute('x', `${-mx}%`)
  filter.setAttribute('y', `${-my}%`)
  filter.setAttribute('width', `${100 + 2 * mx}%`)
  filter.setAttribute('height', `${100 + 2 * my}%`)
  filter.setAttribute('color-interpolation-filters', 'sRGB')

  const feImage = document.createElementNS(svgNs, 'feImage')
  feImage.setAttribute('href', mapUrl)
  feImage.setAttribute('x', '0')
  feImage.setAttribute('y', '0')
  feImage.setAttribute('width', String(w))
  feImage.setAttribute('height', String(h))
  feImage.setAttribute('preserveAspectRatio', 'none')
  feImage.setAttribute('result', 'map')

  const feDisplacement = document.createElementNS(svgNs, 'feDisplacementMap')
  feDisplacement.setAttribute('in', 'SourceGraphic')
  feDisplacement.setAttribute('in2', 'map')
  feDisplacement.setAttribute('scale', String(scale))
  feDisplacement.setAttribute('xChannelSelector', 'R')
  feDisplacement.setAttribute('yChannelSelector', 'G')
  feDisplacement.setAttribute('result', 'displaced')

  const feBlur = document.createElementNS(svgNs, 'feGaussianBlur')
  feBlur.setAttribute('in', 'displaced')
  feBlur.setAttribute('stdDeviation', String(cfg.blurRadius * BLUR_STD_PER_RADIUS))

  filter.append(feImage, feDisplacement, feBlur)
  ensureDefs().querySelector('defs').appendChild(filter)
  entry = { id, node: filter, refs: 1 }
  filters.set(key, entry)
  return entry
}

/** 烘焙位移图：R/G 编码 x/y 采样偏移，公式 1:1 转写自 container.js */
function buildDisplacementMap(w, h, radius, pageW, pageH, cfg) {
  const ss = Math.max(0.25, Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(w, h)))
  const bw = Math.max(1, Math.round(w * ss))
  const bh = Math.max(1, Math.round(h * ss))
  const r = radius * ss
  const minDim = Math.min(w, h)
  const dx = new Float32Array(bw * bh)
  const dy = new Float32Array(bw * bh)
  let maxAbs = 0

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const cx = (px + 0.5) / bw
      const cy = (py + 0.5) / bh

      // 到圆角矩形边缘的有符号距离（超采样 px → CSS px）
      const tx = Math.abs(px + 0.5 - bw / 2) - (bw / 2 - r)
      const ty = Math.abs(py + 0.5 - bh / 2) - (bh / 2 - r)
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0))
      const inside = Math.min(Math.max(tx, ty), 0)
      const distPx = Math.max(-(outside + inside - r), 0) / ss

      const edgeFall = Math.exp(-distPx * cfg.edgeDistance)
      const rimFall = Math.exp(-distPx * cfg.rimDistance)
      const baseFall = 1 - Math.exp(-distPx * cfg.baseDistance)
      const baseComponent = cfg.warp ? baseFall * cfg.baseIntensity : 0
      const total = baseComponent + edgeFall * cfg.edgeIntensity + rimFall * cfg.rimIntensity

      // texcoord 空间的圆角矩形法线
      let nx = cx - 0.5
      let ny = cy - 0.5
      const len = Math.hypot(nx, ny)
      if (len > 0) {
        nx /= len
        ny /= len
      }

      const cornerNorm = Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDim
      const corner = Math.exp(-cornerNorm * 0.3) * cfg.cornerBoost
      const ripple = Math.sin((distPx / minDim) * 25) * cfg.rippleEffect * rimFall

      const fx = (nx * (total + corner) - ny * ripple) * pageW
      const fy = (ny * (total + corner) + nx * ripple) * pageH

      const i = py * bw + px
      dx[i] = fx
      dy[i] = fy
      maxAbs = Math.max(maxAbs, Math.abs(fx), Math.abs(fy))
    }
  }

  const scale = Math.max(maxAbs * 2, 1e-4)
  // 预减解码偏置：128/255 ≠ 0.5，否则面板内部会整体漂移 scale/510 px
  const bias = scale * (128 / 255 - 0.5)
  const canvas = document.createElement('canvas')
  canvas.width = bw
  canvas.height = bh
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(bw, bh)
  const data = image.data
  for (let i = 0; i < bw * bh; i++) {
    data[i * 4] = clampByte(255 * (0.5 + (dx[i] - bias) / scale))
    data[i * 4 + 1] = clampByte(255 * (0.5 + (dy[i] - bias) / scale))
    data[i * 4 + 2] = 128
    data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return { mapUrl: canvas.toDataURL('image/png'), scale }
}

function resolveRadius(computed, w, h) {
  const value = parseFloat(computed) || 0
  return computed.trim().endsWith('%') ? (value / 100) * Math.min(w, h) : value
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

/**
 * React hook：给元素附加真实边缘折射（Chromium）。其他引擎下不做任何事，
 * 样式表的 blur(3px) saturate(125%) 兜底仍然生效。
 */
export function useLiquidGlass() {
  const ref = useRef(null)

  useEffect(() => {
    const host = ref.current
    if (!host || !isSupported()) return

    let resizeObserver = null
    let resizeDebounce
    let rebuildHandle = 0
    let currentKey = null

    function releaseCurrentFilter() {
      if (!currentKey) return
      const key = currentKey
      currentKey = null
      const entry = filters.get(key)
      if (entry && --entry.refs <= 0) {
        filters.delete(key)
        entry.node.remove()
      }
    }

    function rebuild() {
      const w = Math.round(host.offsetWidth)
      const h = Math.round(host.offsetHeight)
      if (w < 2 || h < 2) return
      const radius = Math.min(
        resolveRadius(getComputedStyle(host).borderTopLeftRadius, w, h),
        Math.min(w, h) / 2,
      )
      // 位移以视口为比例，窗口 resize 会改变所有实例的 pageW/pageH
      const pageW = window.innerWidth
      const pageH = window.innerHeight
      const key = [w, h, radius, pageW, pageH, JSON.stringify(GLASS_PRESET)].join('|')
      if (key === currentKey) return
      releaseCurrentFilter()
      const entry = acquireFilter(key, w, h, radius, pageW, pageH, GLASS_PRESET)
      currentKey = key
      host.style.backdropFilter = `url(#${entry.id})`
    }

    // 合并 resize 突发到每帧一次
    function scheduleRebuild() {
      cancelAnimationFrame(rebuildHandle)
      rebuildHandle = requestAnimationFrame(rebuild)
    }

    const onWindowResize = () => {
      clearTimeout(resizeDebounce)
      resizeDebounce = setTimeout(scheduleRebuild, 180)
    }

    resizeObserver = new ResizeObserver(scheduleRebuild)
    resizeObserver.observe(host)
    window.addEventListener('resize', onWindowResize, { passive: true })
    scheduleRebuild()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', onWindowResize)
      clearTimeout(resizeDebounce)
      cancelAnimationFrame(rebuildHandle)
      releaseCurrentFilter()
    }
  }, [])

  return ref
}
