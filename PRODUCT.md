# PRODUCT.md

## Product

**GitWeb** — GitHub 热门项目与优质工具的探索目录。帮助开发者发现 GitHub 上值得使用的项目：按领域分类（大类→小类）浏览，实时数据来自 GitHub Search API。

## Audience & scene

中文开发者 / 技术爱好者，在桌面浏览器中主动探索：想找某个领域的热门或好用的开源工具。使用场景是"浏览 + 筛选 + 快速跳转"，属于 **Operate** 模式：可扫读性、一致性、信息密度优先。

## Core jobs

1. 按领域大类（AI/ML、前端、后端、数据库、DevOps、开发工具…）浏览热门项目
2. 每个大类细分小类（以 GitHub topic 为键），一键切换
3. 搜索任意关键词
4. 每个项目显示：名称、简介、star 数、语言、topic 标签、更新时间，可点击跳转 GitHub

## Constraints

- 数据实时来自 GitHub 公共 API（未认证限流：search 10 次/分钟），需按需加载 + 缓存 + 明确的限流提示
- 纯前端站点，无后端
- 界面语言：中文（项目简介保留英文原文）
