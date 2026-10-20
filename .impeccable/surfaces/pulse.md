# Pulse 界面

Target: pulse.html; related: pulse.css, pulse.js. Mode: Operate. Build: code-led.

## Direction contract

THESIS: 让回响卡成为和 QuotaPulse 同一视觉家族的日常工具；概览直接展示真实的到期任务，进入复习或牌组。

OWN-WORLD: 黑白灰、系统无衬线、细边界、16px 白色内容面板、22px 浅灰外壳、9px 小控件。中间分段导航、等宽数字、轻量底部同步状态。仅外壳允许透明模糊。

STORY: 先看需要复习多少张，再一键进入队列；或选择牌组管理卡片。新建、导入、编辑、导出、目录与跨端同步持续可用。数据与原版共用。

FIRST VIEWPORT: 1160px 以内的居中应用，品牌在左、概览/复习/卡片分段导航居中；标题与日期同一行。宽摘要区左侧到期数量及复习按钮、右侧卡片和牌组数量；下方两列为牌组与下一张到期卡片。手机下移分段导航并将两列改为一列，保留可见导入入口。

FORM: 用户指定 QuotaPulse，直接以实际源码和窗口为视觉依据。seed: none (unavailable). Signature interaction: 点击复习后内容面板承接为卡面，显示答案后展开真实 Markdown/HTML 内容；150–200ms 状态过渡，减少动态效果时禁用。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Boundaries

- 原版 index.html/styles.css/app.js/cloud.js 保留。
- 新入口 /pulse.html；与原版同域、同卡片本机键和 API。
- 不生成虚构学习历史，不新增分析埋点。
- Git 备份分支 codex/recall-before-quotapulse-20261020 指向 35ace4a。
