# 漓江 · 移笔游目 / Lijiang · Walk Into the Painting

> 青绿山水，移步入画。以漓江为卷，以人物为引，在一幅可以漫游的风景中走过四景。

**PixiJS 8 + TypeScript + Vite + React UI** · GitHub Pages · 高画质无损 WebP 素材

**在线 Demo：** https://greenhandzdl.github.io/Lijiang_Pen_Transfer/

## 演示的内容

- **四个游览时段，三张独立原画**：清晨和正午共享白昼，夕照使用夕照原画，入夜使用独立夜景。每幅均为 **2172 × 724 像素**，不缩图，不用 Tint 假装有第四幅画。
- **原幅高清优先**：三幅 2172×724 场景背景与五张原角色图均为 `WebP lossless`，不降采样。首页单独使用 1672×941 的原始 16:9 首页画作（像素级无损 WebP），避免把 3:1 长卷裁成首页背景。新增四张 NPC / 游船透明 WebP 只作为小比例场景细节显示，不抢主画面。
- **四景游历**：象鼻山、日月双塔、阳桥、玻璃桥；PixiJS 支持横向拖动、双指/滚轮缩放、按住行走、点击观景标记、点水泛波。场景 UI 采用轻量地点签、发现式热点和单一上下文卡片；底部可随时切换漫游/导览。
- **五种人物姿态**：正面、侧面、背面、行走、对山歌。当前是关键姿态展示，不假称有完整逐帧行走动画。
- **双入口**：「入画启程」偏人物随行；「山水漫游」偏自由定位。React DOM 保持 UI 交互和可访问性。
- **分时插画互动（Demo 0.4）**：清晨有可点击的渔人/竹筏插画与问路；正午新增鸬鹚捕鱼插画、鱼摊摊主及剧情买鱼；夜晚新增灯笼游船插画、岸边/船上镜头、逐段灯光、对山歌姿态与无人机概念光点。人物和渔具还未具备完整逐帧动画。
- **原创音乐 + 倒影**：夜间点击「播放原创器乐」后播放专门合成的约 23 秒器乐循环，通过 Web Audio FFT 实时驱动水面光纹；可暂停，默认静音。此曲并非已有山歌或真实民歌录音。另有不需音频的静音节拍预览。

这是一版**展示优先的技术垂直切片**。渔人/鸬鹚/鱼市/游船已有独立透明插画，但还没有真正的分帧动作、正确桥栏遮挡和船内行走；倒影现已支持播放原创器乐后随**真实音频频谱**变化，同时保留静音节拍预览；无人机仍是虚拟光点概念效果，不代表真实演出。场景仍是扁平化长卷，桥栏遮挡、动画中间帧和正式文化声音需在未来素材分层后实现。画卷节点为艺术排布，不代表准确地理路线。

## 开发命令

需要 Node.js 22：

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

访问 `http://localhost:5173/Lijiang_Pen_Transfer/`。静态资源 URL 必须经 `import.meta.env.BASE_URL` 生成。`main` 分支 push 后 GitHub Actions 自动部署 Pages，并使用 `curl` 验证生产 HTML、JS 和背景图片。

## 仓库指引

- [AGENTS.md](AGENTS.md)：所有编码 Agent 先读
- [产品需求](docs/PRODUCT.md) | [架构](docs/ARCHITECTURE.md) | [资源规范与出处](docs/ASSETS.md) | [路线图](docs/ROADMAP.md) | [四时段交互专项计划](docs/INTERACTION_PLAN.md)
- [发布/测试](docs/QUALITY.md) | [架构决策记录](docs/DECISIONS/0001-pixijs-stack.md) | [素材版权](ASSETS-LICENSE.md)

## 授权

程序与明确标示的文档沿用原仓库的 [MIT License](LICENSE)；美术与音乐分别遵守素材版权声明，不因程序 MIT 自动获得商业再授权。未使用参考项目 `xianxie6/qingming-riverside` 的受限源代码或艺术文件。
