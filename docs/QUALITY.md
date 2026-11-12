# 开发、测试与部署

## 本地命令
```bash
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

## 验收范围
- `typecheck`： TypeScript 严格模式，无类型错误。
- `build`： Vite 构建无报错、无缺失资源。
- `Pages`： 站点可从 `/Lijiang_Pen_Transfer/` 子路径访问，资源全部 200；刷新后不会找不到资源。
- `Desktop`： 1440×900 / 1280×720，导航、入口、方向键、滚轮缩放、交互和返回首页。
- `Mobile`： 390×844 / 375×667，按钮至少 44px 目标、横向拖动和双指缩放。
- `Accessibility`：键盘可聚焦、角色操作有辅助说明、尊重 reduced-motion，颜色/文字可读。
- `Resilience`：资源加载失败、卸载重建、频繁进入退出、浏览器后台恢复不黑屏。
- `Performance`：常见中端手机目标 ≥30 FPS，桌面 50–60 FPS；优先观察真实机型而不是虚构数字。

## GitHub Pages
Workflow 使用 `actions/checkout`、`actions/setup-node`、`actions/configure-pages`、`actions/upload-pages-artifact`、`actions/deploy-pages`。默认 `main` 推送后触发；仓库 Settings → Pages → Build and deployment → Source 需要选择 **GitHub Actions**。启用 Pages 前，工作流可能失败或仅构建完成，不能视为网站已经上线。

## Release checklist
1. 保留原始图、校对 `docs/ASSETS.md` 的版权状态。
2. `npm ci && npm run typecheck && npm run build` 通过。
3. 检查 `dist/` 不含无关素材、源文件或大图母版。
4. 电脑和实体手机实际检查，UI 不遮住角色/热点。
5. 校对部署 URL 和 GitHub Actions 日志。
