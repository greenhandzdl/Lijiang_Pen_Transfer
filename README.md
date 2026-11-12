# 漓江 · 移笔游目 / Lijiang · Walk Into the Painting

> 青绿山水，移步入画。以漓江为卷，以人物为引，在一幅可以漫游的风景中走过四景。

**PixiJS 8 + TypeScript + Vite + React UI** · GitHub Pages · 高画质无损 WebP 素材

**在线 Demo：** https://greenhandzdl.github.io/Lijiang_Pen_Transfer/

## 演示的内容

- **四个游览时段，三张独立原画**：清晨和正午共享白昼，夕照使用夕照原画，入夜使用独立夜景。每幅均为 **2172 × 724 像素**，不缩图，不用 Tint 假装有第四幅画。
- **高画质**：背景和人物运行图都使用 `WebP lossless`，无分辨率缩放。人物只裁透明留白，原始像素完整保留。总计约 **10MB**，因此首次加载可能需要数秒。
- **四景游历**：象鼻山、日月双塔、阳桥、玻璃桥；PixiJS 支持横向拖动、双指/滚轮缩放、步行操作、点击观景标记、点水泛波。
- **五种人物姿态**：正面、侧面、背面、行走、对山歌。当前是关键姿态展示，不假称有完整逐帧行走动画。
- **双入口**：「入画启程」偏人物随行；「山水漫游」偏自由定位。React DOM 保持 UI 交互和可访问性。
- **分时互动骨架（Demo 0.3）**：清晨点击渔人问象鼻山方向和竹筏启程；正午点击鸬鹚捕鱼触发涟漪、在鱼摊模拟问价与买鱼；夜晚可选择岸边/模拟船上视角，逐段开启灯光叠加、静音节奏倒影、对山歌姿态和无人机光点概念效果。点画面标记或右侧时辰故事按钮即可体验。

这是一版**展示优先的技术垂直切片**。渔人/鸬鹚/鱼市目前是交互脚本及轻量反馈，未提供独立 NPC 立绘；船上视角是镜头预览；倒影使用明确标注的**无音频节奏预览**，不冒充已完成的音乐同步；无人机仅是虚拟光点概念效果，不代表真实演出。场景仍是扁平化长卷，桥栏遮挡、动画中间帧和正式文化声音需在未来素材分层后实现。画卷节点为艺术排布，不代表准确地理路线。

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
