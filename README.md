# 回响卡

支持跨设备同步和安装到桌面/手机主屏幕的轻量记忆卡应用。内容支持 Markdown，`html` 代码块会在沙箱中直接预览。

## 已有能力

- 点击卡片直接复习，支持上一张、下一张和独立编辑按钮
- 牌组跟随式新建/导入、卡片与牌组置顶、分牌组 JSON 导出
- JSON、JSONL、Markdown、TXT 与文件夹导入；导入前显示数量、牌组及重复项
- D1 持久化、个人访问密钥、离线本地副本、断网自动补传、跨设备冲突副本
- PWA 安装、离线打开、手机与桌面响应式布局

## JSONL 规范

每行是一张卡片，`question` 和 `answer` 必填；`deck`、`tags` 和复习字段可选。豆包导出的问答 JSONL 可直接使用：

```json
{"question":"什么是主动回忆？","answer":"不看材料，先从记忆中提取答案。","deck":"学习方法","tags":["记忆"]}
```

在某个牌组中点击导入时，所有卡片进入该牌组；在「所有卡片」中导入时保留文件里的 `deck`，没有牌组的进入「随手记」。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://127.0.0.1:5173/`。本地后端数据保存在 `.local-data/cards.json`，无需单独启动服务。

如果确实要连接另一台开发机，可在浏览器控制台设置 API 地址后刷新：

```js
localStorage.setItem('recall-api-base', 'https://你的后端地址')
```

生产页面必须使用 HTTPS 后端；默认留空即使用同域 `/api/cards`。

## Cloudflare 首次发布

项目使用一个 Worker 同时提供页面和 API，D1 保存卡片。首次发布只需：

```bash
npx wrangler login
npx wrangler d1 create recall-cards --update-config
npm run db:migrate
npx wrangler secret put APP_TOKEN
npm run deploy
```

`APP_TOKEN` 是你自己设定的个人访问密钥，不要提交到 Git。发布后在每台设备首次打开时输入同一个密钥，即可同步卡片。

如果当前网络无法直接访问 `workers.dev`，可以把页面和同域 API 代理发布到 Vercel；数据仍保存在上面的 D1：

```bash
npx vercel login
npx vercel --prod
```

GitHub Actions 已包含手动发布工作流。首次发布成功后，在 GitHub 仓库设置 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 两个 Actions Secret，即可从 Actions 页面点一次完成测试、迁移和发布；确认流程稳定后再打开按 `main` 推送自动发布。

## 数据安全

- 浏览器会保留本地卡片和未上传快照；离线编辑恢复网络后自动补传。
- 两台设备同时修改同一卡片时，保留本机版本，并新增带「同步冲突」标签的云端副本。
- 后端限制为 10000 张、单次完整卡片集合 8MB。重要数据仍建议定期按牌组导出 JSON。

## 快捷键

- `Space`：显示答案
- `1` / `2` / `3` / `4`：忘了 / 模糊 / 记得 / 熟练
- `←` / `→`：上一张 / 下一张

## 检查

```bash
npm test
npm run build
```
