# DESIGN.md — GitWeb 视觉系统（v6 Apple 风）

## 世界
**Apple 产品页语言**：浅灰底白卡片、大圆角、系统 sans 大标题、克制的蓝色强调。干净、熟悉、大气来自字号与留白，而非装饰。

## 令牌（src/styles.css）

| 角色 | Light | Dark |
|---|---|---|
| 页面底 `--bg` | `#f5f5f7` | `#000000` |
| 卡片 `--card` | `#ffffff` | `#1d1d1f` |
| 主文字 `--fg` | `#1d1d1f` | `#f5f5f7` |
| 次级/弱化 | `#6e6e73` / `#86868b` | `#a1a1a6` / `#6e6e73` |
| 线 `--line` | `#d2d2d7` | `#2d2d30` |
| 强调 `--accent` | `#0071e3` Apple 蓝 | `#2997ff` |
| star 金 `--gold` | `#b25000`（AA on white）| `#ff9f0a` |

字体：`-apple-system, SF Pro Text, Segoe UI, PingFang SC` 系统栈。标题 -0.022em 紧字距（48px h1）。圆角体系：卡片 18px、控件 12px、药丸 999px。

## 布局契约（性能关键）
- **页面自然滚动（body 滚动）**——禁止内容区 `overflow-y` 内嵌滚动容器
- 侧栏 `position: sticky; top: 0; height: 100vh`
- 工具栏吸顶 + 毛玻璃：`backdrop-filter: saturate(180%) blur(20px)`，**全站唯一**的 backdrop-filter（一层固定元素，性能安全）
- 内容区 `max-width: 1200px`，卡片网格 `auto-fill minmax(320px, 1fr)` gap 20px

## 组件语言
- **卡片**：白底 18px 圆角，静态微阴影；hover `scale(1.015)` + 阴影抬升，220ms Apple 缓动；排名 #1–3 蓝色药丸徽章
- **小类 tab**：药丸，选中 = 黑底白字（light）/ 白字黑底反转（dark）
- **侧栏**：选中项蓝底白字圆角 10px；分类编号 tabular-nums
- **search**：12px 圆角，focus 蓝边 + 4px 蓝色光环
- **retry**：Apple 蓝药丸按钮

## 动效
- `card-in` 入场 stagger（16px 上移 + scale 0.98，45ms 间隔，上限 12）
- hover 全部 transform/opacity/color 过渡 140–220ms
- `prefers-reduced-motion`：入场与 hover 位移关闭

## 禁止
- 内容区 `overflow-y: auto`（v5 滚动失效根源）
- 玻璃拟态扩散、SVG 位移滤镜、滚动视差 JS（v3/v4 卡顿根源）
- 卡片上的 backdrop-filter
