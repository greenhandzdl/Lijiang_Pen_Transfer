# 开发、验收和部署

## 本地

```bash
npm install
npm run typecheck
npm run build
npm run preview
```

## 发布检查

- Vite 配置：`base: '/Lijiang_Pen_Transfer/'`；`public/art/` 拷贝到构建根目录，不能写死为网站根路径 `/art/`。
- GitHub Pages：`Settings → Pages → Build and deployment → Source = GitHub Actions`。
- 主分支 workflow `pages.yml`：TypeScript 检查、Vite build、上传 dist、Deploy Pages、通过 `curl` 检查真实部署 HTML/JS/图片。
- `curl` **不能代替截图或像素级验收**，必须查看桌面、手机画卷是否完整、是否被 UI 遮挡。
- 如在 CI 外 curl 出现 DNS 错误（`Could not resolve host`），那只说明调用环境网络不可达，不能直接断言站点 404。

## 必验场景

1. 1280x720 / 1440x900 / 390x844 展示比例不变（原图 3:1）。
2. 首页清昼、夕照、入夜三幅景观是真正不同的图；进入场景后同样可以切换且保留镜头位置。
3. Pixi Canvas 中三张背景尺寸相同且全分辨率；人物不会夸张拉伸，脚底在人工岸线曲线上。
4. 拖拽、双指与滚轮缩放、按住左右方向、四处导航、驻足/唱歌关键帧有效。
5. React 控件在低宽度、竖屏、窗口大小变化时可点按；错误/加载提示明确。
6. 浏览器后台切换、组件卸载/返回首页、重新进入不触发不受控的 ticker 或泄露事件监听。
7. 所有图像传输为 WebP lossless，尺寸仍为 2172×724 / 裁边后的原生角色分辨率；验证网络面板没有请求到旧的 `lijiang-scene.webp` 或模糊资源。

## 下一阶段

部署 Playwright screenshot 回归测试和 Lighthouse；本版尚未提供截图金标准和手机真实机型性能结论，不能编造这些测试结果。

## 新增场景资源的自动化验证

`npm run verify:assets` 在旧版无损高清画幅和五角色姿态上继续强制核对尺寸、VP8L 和最小体积；另外检查四张新增透明 NPC 精灵的尺寸/最大体积与 MP3 文件头和体积预算。Pages 发布后 `curl` 也对新增四个 WebP 路径和 `audio/night-river-original.mp3` 做实际在线下载验证。完整视觉、声画同步和移动设备实机听感仍需浏览器与真人验收。


## 2026-11-12 视觉层级回归

- 首页专用图必须校验 1672×941；不可把 2172×724 的 3:1 长卷直接 `object-fit: cover` 用于 16:9 首页。
- 新增 NPC 贴图显示宽度控制在 55–125 个世界像素，热点触控范围可大于可见图像但不能放大人物本身。
- 场景 UI 只允许轻量顶部状态、地点签、故事入口、单个上下文卡片与底部路线/控制区；默认状态不得同时显示多个厚重卡片。
