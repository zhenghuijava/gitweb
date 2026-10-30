# DESIGN.md — GitWeb 视觉系统（v5 美术馆展馆）

## 世界
**美术馆展馆**：GitHub 项目是展品，界面是展墙。克制、尺度感、编号铭牌——拒绝卡片流的圆角阴影语言。

## 令牌（src/styles.css）

| 角色 | Light | Dark |
|---|---|---|
| 墙面 `--wall` | `#ece9e3` 暖石灰 | `#161512` 深画廊 |
| 墙裙 `--wall-deep` | `#e3dfd6` | `#1d1c18` |
| 铭牌 `--plaque` | `#f7f5f0` | `#201e19` |
| 线 `--line` / 强线 | `#c9c4b8` / `#8f887a` | `#37342c` / `#55503f` |
| 墨色 `--fg` | `#26241f` | `#e8e4d8`（展灯暖白）|
| 强调 `--accent` | `#9a3b26` 展签朱砂 | `#d0684f` |
| 金 `--gold`（star 数）| `#8a6d1f` | `#c9a54a` |

字体：标题/编号/star 数用衬线栈 `Georgia, 'Times New Roman', 'Songti SC', 'SimSun'`；正文用系统 sans 中文栈。主题由 `<html data-theme>` 驱动，index.html 内联脚本在首帧前设置（防闪屏）。

## 结构语言
- **零圆角、零 box-shadow 卡片**：分隔靠 1px 细线与留白；唯一软阴影 `--shadow-soft` 目前未被使用（保留给未来模态）。
- **铭牌条目 `.plaque`**：74px 编号列 + 名称 + 右侧小型大写字母元数据；简介与 topic 在第二行。hover = 左侧朱砂竖线（聚光）+ 编号变红 + 名称下划线。
- **No.xxx 编号**：serif tabular-nums；前三甲 `.plaque-top` 编号朱砂色 + 2px 下划线。
- **展厅导览（侧栏）**：分类带两位数编号，选中态左缘 2px 朱砂竖线。
- **小类 tab `.sub`**：文字 + 右侧竖线分隔，选中变朱砂，无药丸背景。
- **搜索 `.search`**：无框底线输入（底线在 focus 时变朱砂）。
- 展灯光斑 `.wall-glow`：两团静态径向渐变（朱砂 + 金，各 5% 透明度），无动画。

## 动效
- `plaque-in` 入场 stagger（8px 上移 + 40ms 间隔，上限 7 个）。
- 全部 hover 为颜色/透明度过渡 130–150ms。
- `prefers-reduced-motion` 下入场动画与平滑滚动关闭。
- **性能契约**：内容区禁止 `backdrop-filter` 与滚动驱动的 JS 视差（v4 的滚动卡顿根源）；动效只允许 transform/opacity/color。

## 禁止
- 圆角阴影卡片、玻璃拟态、渐变强调色回归
- 内容区滚动监听 JS
