# 交互画卷技术架构 v0.2

## 固定技术栈

PixiJS 8 + TypeScript 严格模式 + Vite + React 19 + CSS。GitHub Pages 静态发布；无需服务端。**React 仅负责界面，Pixi ticker 更新世界坐标、素材透明度和人物帧，不通过 React 每帧触发渲染。**

## 数据流

```text
App.tsx [主页/导航/时辰/交互/字幕]
    ↓ props / callbacks
ScrollStage.tsx [创建/销毁，转交事件，Engine 生命周期]
    ↓
ScrollEngine.ts [Pixi Application + 世界坐标 + 相机 + 角色 + 水纹 + 触屏事件]
    ├── 3 × Sprite 原生画卷 2172×724 (alpha crossfade)
    ├── 4 × Marker (clickable Graphics)
    ├── 1 × Sprite 角色 (5 pose textures; 位置在折线路径)
    └── Ripple Graphics (独立水面波纹特效)
```

## 关键原则

- Vite `base: '/Lijiang_Pen_Transfer/'`；运行资源通过 `import.meta.env.BASE_URL` 拼接。
- 世界固定 `WORLD_WIDTH=2172`, `WORLD_HEIGHT=724`，保持原图比例，不随屏幕拉伸。视口使用相机 scale + position 裁切。
- 主页使用 `<img>` + CSS object-fit:cover 作为宣传封面；进入场景后 Pixi 保持原图宽高比。
- 背景切换**直接替换独立昼/夕/夜绘制**，通过 alpha 交叠过渡，不用 Tint 冒充独立画卷。
- Hero sprite `anchor=(0.5,1)` 脚底锚点；人物仅是关键姿态。后续使用正式 Atlas 的逐帧动画取代。
- 角色站在人工测定的临时步道曲线上，当前不实现严谨遮挡和地形碰撞。
- 静态资源为全分辨率 lossless WebP；显示加载状态，不在仓库提交任何低质量预览版。
- Pixi 实例创建一次，React StrictMode 下允许组件销毁/重建；input 监听按生命周期清理。
- `prefers-reduced-motion` 关掉人物弹跳和淡入的平滑运动。
- 不在运行时调用后台 API，不加载未授权外部文字、字体、录音。

## 优先拆分模块

1. 分场景绘画原稿（山体、远景、岸线、桥栏、倒影、前景）并增加世界高度与遮挡图。
2. 独立步行动画 Atlas 和专用事件状态机，避免关键姿态单张模拟连续脚步。
3. 把时辰三套的角色/建筑事件内容配置化，实现对山歌事件字幕、授权音频与退出/跳过。
4. 首屏改为 day 快速呈现，夕照/夜景和不使用的 pose 后台加载，提高弱网体验；仍保持原始分辨率。

## 四体验时段与事件分层（扩展）

体验时段：`morning/noon/dusk/night`，原始背景三幅：`day/day/dusk/night`。分别使用 `artworkForTime()` 数据函数，不重复创建贴图；剧情列表位于 `src/content/encounters.ts`，提供静态位置、选择与行为。Pixi Graphics 热区触发 `onEncounter(id)` → React 对话，不应把 JSX 拼入 Pixi ticker。

夜间镜头/灯光/无人机/倒影节拍由独立数值参数控制；当前没有合法可用音频，`setAudioEnergy` 是预留 API，节拍模拟必须被明确称作「静音节奏预览」。制作正式版本需要独立 night-effects 模块和 Web Audio AnalyserNode。详见 `docs/INTERACTION_PLAN.md`。

**已完成演示接口**：`src/engine/NightEffects.ts` 是独立的轻量矢量光效图层，支持 `{view, lights, rhythm, drones}` 与未来真实音频能量输入 `setAudioEnergy(0..1)`；`src/app/ScrollStage.tsx` 桥接状态，`App.tsx` 提供可访问选项。夜间纹理始终用原幅 `scene-night.webp`，特效不会修改图片文件。

## 实际新增素材与音频链路（Demo 0.4）

`src/content/encounters.ts` 的每个热点包含 `spriteFile / spriteWidth / worldX / worldY`。引擎加载原有无损背景和人物后即可进入场景；四张次要透明插画随后通过 `Promise.all(... Assets.load)` 异步加载，单张出错只保留可用热区，不产生黑屏。

夜间独立音频控制器 `src/engine/NightMusic.ts` 在 React 用户真实点击后才创建 `AudioContext → MediaElementSource → AnalyserNode → destination`；`ScrollEngine.tick` 读取 `sampleEnergy()`，不通过 React 60FPS 更新状态。`NightEffects` 在 music=true 时取消程序化节拍、改用真实 FFT 值。停播/退出夜景清零能量，默认静音并尊重减少动画偏好。
