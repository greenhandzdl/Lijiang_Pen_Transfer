# AGENTS.md — 漓江·移笔游目

本文件适用于 Codex、Claude Code、Cursor 和其他在仓库中工作的编码 Agent。修改前阅读 README、docs/ARCHITECTURE.md、docs/ASSETS.md。

## 项目目标
打造高清中国画风的可交互长卷；**所有时间段的背景均为独立完成的绘画资产，核心任务是展示其原始画质。** 代码和 FPS 优化不应牺牲高质量原稿。

## 硬性技术约束
- PixiJS 8 + TypeScript (strict) + Vite + React；React 只负责 DOM UI，Pixi 负责世界、相机、人物、纹理、ticker。
- 固定世界画幅 **2172×724**（3:1）。绝不把画卷非等比拉伸，更不把 **2172px 原图缩成 1120px 或 680px 模糊预览**再当最终展示。
- 场景文件映射：`scene-day.webp` 白昼、`scene-dusk.webp` 夕照、`scene-night.webp` 夜景。需要切换完整贴图而不是 `tint` 模拟。
- 展示文件统一 WebP lossless，无尺寸缩放；人物仅裁剪全透明边框，保留所有有效像素。原稿路径见 docs/ASSETS.md。
- 所有资源使用 `import.meta.env.BASE_URL`；GitHub Pages 子路径 `/Lijiang_Pen_Transfer/` 下必须可加载。
- 禁止在 React 的 render 或 State 更新中以 60FPS 驱动 Pixi 对象。
- 遵守 `prefers-reduced-motion`、键盘/触控的交互需要和错误提示。
- 保持可以按一个 `npm install && npm run build` 构建的静态前端，不引入后端。

## 美术与体验规则
- 角色的原稿姿态 `01-正面`、`02-侧面`、`03-背面`、`04-行走`、`05-对山歌` 均由用户提供；04 和 05 分别只有一张关键姿态，不能宣称是完整动画。
- 角色脚底锚点必须为 (0.5,1)，逻辑坐标在 native-world；不要将页面像素、canvas 像素和世界坐标混淆。
- 世界 Y 的岸线/桥面高度是临时美术标注，真实桥栏遮挡需要后续独立 PNG/alpha mask。
- 不编造山歌歌词、不使用没有授权的录音/字体/音乐。城市节庆海报参考图**不是**主风景图。
- 无需将原始全量 PNG 一同重复打包至运行网站；公共展示源必须高画质且足够忠实。

## 工作顺序
1. 审查需要修改的文件并更新相关文档。
2. 保持最小变更，避免单个 React 组件塞入引擎逻辑。
3. 执行 `npm run typecheck && npm run build`；若能实际浏览器测试，附截图记录；不能测试请如实声明。
4. 检查站点子路径、所有时辰的资源 HTTP 返回、人物正反站姿、拖动和缩放以及触控控件。
5. 尽量用 GitHub Actions 验证真正部署地址；只看到 Jekyll 的绿色工作流不代表 Vite 产物已发布。

## 版本管理安全
- 不要擅自 force push、rebase 主分支、覆盖用户资源或改写已有原始版权文件。
- `git push -f` 不自动清理 GitHub 仓库中旧对象，也不是图片压缩策略；仓库过大时先考虑独立素材仓库、Git LFS、GitHub Releases 或 CDN。
- 每次 PR 说明变更、测试结果、截图/视觉差异及遗留问题。

## 下一里程碑
获得独立前景遮挡图、图层化岸线、角色逐帧动画和授权山歌声音，把高质量展示扩展为完整的可游览叙事。

## 分时互动专项（必须遵守）

- 交互设计文件 `docs/INTERACTION_PLAN.md`，具体数据 `src/content/encounters.ts`。
- `morning/noon` 共用白昼原幅，`dusk/night` 各用独立原幅；不要重复下载相同 URL 的图片以假充新画作。
- 渔人/鸬鹚/鱼市的占位版本必须明确标注“脚本演示 / 待美术”；夜间无人机是概念预览，不能宣传为现实存在的无人机秀。
- 没有授权歌曲时，夜间节拍效果只能标注“静音节奏预览”；真实歌曲→AnalyserNode→倒影联动是后续功能。
- React 处理对话、按钮、选择；Pixi 处理图层、热点、水纹、视觉效果。夜间效果不修改原画像素。

## 新增轻量场景素材与原创音频（2026-11-12）

- 背景/用户角色 **必须保持** 原幅无损，与新增小型 NPC 的透明 WebP 有损压缩**分开管理**：参见 `docs/ASSETS.md`。
- 新插画 `npc-fisher / npc-cormorant / npc-market / npc-nightboat` 是交互图层，用原画世界坐标展示，不要以它们替换整幅高清画。
- 原创器乐 `night-river-original.mp3` 不是山歌录音。绝不将它标注为传统歌曲/非遗原声；用户点击才播放，离开夜景要停。
- 真正音乐频谱由 `NightMusic.sampleEnergy` 提供给 Pixi `NightEffects`；不得把每帧音频能量写进 React State。
- 新增资源大小、alpha、音频文件头在 `npm run verify:assets` 及 Pages `curl` smoke test 验证；新增资源需要标注体积预算。


## 视觉层级规则（2026-11-12）

- 首页 16:9 必须使用 `home-background.webp`，不可将 3:1 场景图裁切填满首页。
- 2172×724 长卷是主角；新 NPC/船体只作为次要场景细节，默认世界宽度不超过 125px。触控 hitArea 可扩大，但不扩大可见 Sprite。
- 默认场景 HUD 要克制：轻量地点签、时辰、横向故事入口、底部路线和控制；剧情详情只在用户点击后显示一张上下文卡片。
- 不用生成式图片代替 UI 实装；交互 mockup 仅供视觉方向参考。