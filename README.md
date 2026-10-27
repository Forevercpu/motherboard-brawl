# 主板乱斗 · Motherboard Brawl

基于 Vue 3、TypeScript 和 Three.js 的 3D 主板对战原型。当前为单机试玩，所有模型由几何体生成；正式美术资源和联机功能尚未实现。

## 启动

需要 Node.js 20.19+ 或 22.12+，以及 pnpm。

```bash
pnpm install
pnpm dev
```

浏览器打开终端显示的本地地址，建议使用电脑和鼠标。按 WASD 移动，鼠标瞄准，左键射击，空格释放技能，Esc 暂停。先选择角色，再击败电脑对手。

```bash
pnpm build
```

构建结果位于 `frontend/dist`，可部署到静态网站服务器。`backend` 为后端预留目录，本版本无需后端。

## 目录

- `frontend`：游戏前端
- `backend`：后端预留

项目使用原创简化几何体作为临时角色，品牌相关表述仅为原型设想，正式发布前应核实相关权利。
