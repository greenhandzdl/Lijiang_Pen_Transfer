# 漓江·移笔游目 / Lijiang · Walk Into the Painting

> 一幅可以进入的漓江青绿山水长卷。以山水漫游与壮族服饰人物为核心的交互叙事 Web 作品。

**技术栈：** PixiJS 8 + TypeScript + Vite + React（仅用于 UI）。部署目标为 GitHub Pages。

- [交互 Demo](https://greenhandzdl.github.io/Lijiang_Pen_Transfer/)（GitHub Pages 配置完成后可访问）
- [需求文档](docs/PRODUCT.md) · [架构设计](docs/ARCHITECTURE.md) · [迭代路线](docs/ROADMAP.md)
- [AI Agent 开发守则](AGENTS.md) · [素材规范](docs/ASSETS.md) · [测试与发布](docs/QUALITY.md)

## 本地启动

需要 Node.js 22 或更新版本：

```bash
npm ci
npm run dev
# http://localhost:5173/Lijiang_Pen_Transfer/
npm run typecheck
npm run build
```

## Demo 范围

- 首页参考上传的《界面背景图》与《界面》视觉语言，提供「入画启程 / 山水漫游」双入口。
- PixiJS 画卷：横向拖拽、滚轮 / 双指缩放、位置导航、画卷跟随。
- 角色演示：行走、停留、对山歌动作切换；不将单张关键姿态冒充完整逐帧行走。
- 四处艺术化游览节点：象鼻山、日月双塔、阳桥、玻璃桥；内置昼 / 暮 / 夜色调和简化水纹。
- React HUD：状态、景点介绍、键盘及触控提示，响应式布局。
- 无账号、无后端，部署在 GitHub Pages。

**范围说明：** 初版是技术垂直切片，而非历史地理精确复原。现有单张画作被作为美术参考 / 预览底图，分层景深、脚底高度、独立遮挡和连续角色动画将继续补齐。

## 目录约定

```text
.github/workflows/  CI & Pages
docs/               产品、架构、设计决策、质量、素材
public/art/         发布用经过压缩的图片（严禁上传无授权音频）
src/app/            React 首页 / HUD
src/engine/         PixiJS 场景、输入、镜头与角色
src/content/        景点、故事与配置
src/styles/         UI 样式
AGENTS.md           所有 AI Agent 必读
```

## 文档优先级

`AGENTS.md` → `docs/PRODUCT.md` → `docs/ARCHITECTURE.md` → `docs/ASSETS.md` → 具体模块代码。

## 版权

代码采用仓库现有的 [MIT License](LICENSE)。用户上传或原创美术、人物素材及后续音乐等**单独受素材授权约束**，详见 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。参考项目 `xianxie6/qingming-riverside` 仅供技术设计研究，不复制其受限源码与素材。
