# 技术架构 v0.1

## 栈
- Vite 7 + React 19 + TypeScript 5（strict）
- PixiJS 8 `Application` / `Container` / `Sprite` / `Graphics` / `Assets`
- CSS：响应式 UI；React 不参与帧循环
- 原生浏览器持久化可选：localStorage（以后做收藏）

## 数据流
```text
React App ── props/callbacks ──> ScrollStage (mount/unmount)
  │                                 │
  │                          new ScrollEngine
  │                                 │
  ├─ mode / time / place            ├─ Pixi Application
  ├─ buttons / dialogs              ├─ world + foreground / hero
  └─ status display                 ├─ camera (world transforms)
                                    ├─ ticker (dt)
                                    └─ pointer / wheel / keyboard
```

## 模块边界
- `src/app/App.tsx`：页面状态与 UI，负责生命周期，Pixi 引擎只挂载一次。
- `src/app/ScrollStage.tsx`：容器，创建/销毁 ScrollEngine，桥接属性更新。
- `src/engine/ScrollEngine.ts`： Pixi 应用初始化、画卷/角色、相机、事件、缩放、输入、清理。
- `src/content/places.ts`：场景节点独立数据、文案和类型。
- `src/styles/app.css`：页面视觉和布局。

## 坐标与分层
演示场景为原图高宽比展开为横向舞台；图片左右交叠延伸，以构成比原图更长的世界。归一化为世界坐标，Camera 通过 `world.scale` 和 `world.position` 变换。人物脚底落在岸线附近的稳定世界 Y 坐标。

真实分层方案：背景 → 江水 → 远岸 → 人物 → 桥前景遮挡 → 近岸植被 → 天气/调色 → DOM HUD。

## 运行策略
- 首次初始化异步 `await app.init`；mount 卸载时清理监听器、ticker、app.destroy。
- 输入：方向键、按钮和 PointerEvents；不把 Pixi Canvas 的 pointer 阻挡用于 HUD。
- `deltaMS` 以毫秒计；运动速度乘 `dt = min(deltaMS, 50)/1000`。
- 相机滚动受边界限制；缩放围绕视口中心，手势使用 pinch 距离变化。
- 资源加载失败后保留用户可见的错误说明，而非静默空白。
- 触屏滚动由触摸画布控制；React 控件不向画布冒泡。
- 页面隐藏或用户选择静态模式时降低或停止动画。

## 提升路线
1. 将景点定义升级为 `WorldRegion`，分区加载独立透明图。
2. 替换单张姿势为 TextureAtlas + AnimatedSprite；接入脚底与遮挡掩模。
3. 将事件演出拆为显式状态机；音频与字幕共用事件时钟。
4. 使用可视区域裁剪、缓存AsTexture / 渐进贴图、多质量档位。
