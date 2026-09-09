const STORAGE_KEY = "recall-cards-v1";

const starterCards = [
  {
    id: crypto.randomUUID(), deck: "前端基础", tags: ["HTML", "语义化"],
    question: "为什么应该优先使用语义化 HTML？",
    answer: "语义化标签同时帮助：\n\n- **无障碍工具**理解页面结构\n- **搜索引擎**判断内容含义\n- 开发者更快地阅读与维护代码\n\n```html\n<article>\n  <h2>记忆如何形成</h2>\n  <p>提取练习比重复阅读更有效。</p>\n</article>\n```",
    due: Date.now(), interval: 0, reviews: 0
  },
  {
    id: crypto.randomUUID(), deck: "学习方法", tags: ["记忆", "复习"],
    question: "什么是主动回忆（Active Recall）？",
    answer: "主动回忆是在**不看材料**的情况下，主动从记忆中提取答案。\n\n> 关键动作不是“再读一遍”，而是先尝试回答，再核对反馈。",
    due: Date.now(), interval: 0, reviews: 0
  },
  {
    id: crypto.randomUUID(), deck: "JavaScript", tags: ["异步"],
    question: "`Promise.all()` 在什么情况下会失败？",
    answer: "当任意一个输入 Promise 被拒绝时，`Promise.all()` 会立即返回拒绝状态，并采用第一个拒绝原因。\n\n```js\nawait Promise.all([fetchUser(), fetchPosts()]);\n```",
    due: Date.now() + 86400000, interval: 1, reviews: 1
  }
];

let cards = loadCards();
let queue = [];
let queueIndex = 0;
let completed = 0;
let currentDeck = "all";
let editingId = null;
let menuDeck = null;
let reviewMode = 'due';
let ratedIds = new Set();
let importDeck = 'all';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || starterCards; }
  catch { return starterCards; }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  refreshSidebar();
  if (typeof scheduleCloudSave === 'function') scheduleCloudSave(cards);
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);
}

function inlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(source = "") {
  const blocks = [];
  let safe = escapeHtml(source).replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const key = `@@BLOCK${blocks.length}@@`;
    blocks.push(`<pre data-lang="${lang || "text"}"><code>${code.trim()}</code></pre>`);
    return key;
  });
  const lines = safe.split("\n");
  let html = "", inList = false, inTable = false;
  lines.forEach((line, index) => {
    if (/^@@BLOCK\d+@@$/.test(line.trim())) { if (inList) { html += "</ul>"; inList = false; } html += line.trim(); return; }
    if (/^#{1,3}\s/.test(line)) { const n = line.match(/^#+/)[0].length; html += `<h${n}>${inlineMarkdown(line.slice(n + 1))}</h${n}>`; return; }
    if (/^&gt;\s?/.test(line)) { html += `<blockquote>${inlineMarkdown(line.replace(/^&gt;\s?/, ""))}</blockquote>`; return; }
    if (/^[-*]\s+/.test(line)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`; return; }
    if (inList) { html += "</ul>"; inList = false; }
    const next = lines[index + 1] || "";
    if (line.includes("|") && /^\s*\|?\s*:?-+/.test(next)) { inTable = true; html += "<table><thead><tr>" + line.split("|").filter(Boolean).map(c => `<th>${inlineMarkdown(c.trim())}</th>`).join("") + "</tr></thead><tbody>"; return; }
    if (/^\s*\|?\s*:?-+/.test(line) && line.includes("|")) return;
    if (inTable && line.includes("|")) { html += "<tr>" + line.split("|").filter(Boolean).map(c => `<td>${inlineMarkdown(c.trim())}</td>`).join("") + "</tr>"; return; }
    if (inTable) { html += "</tbody></table>"; inTable = false; }
    if (line.trim()) html += `<p>${inlineMarkdown(line)}</p>`;
  });
  if (inList) html += "</ul>";
  if (inTable) html += "</tbody></table>";
  return blocks.reduce((out, block, index) => out.replace(`@@BLOCK${index}@@`, block), html);
}

function extractHtml(source = "") {
  const matches = [...source.matchAll(/```html\n([\s\S]*?)```/gi)];
  return matches.length ? matches.map(match => match[1]).join("\n") : `<div style="font:14px system-ui;padding:24px;color:#667085">答案中还没有 <code>html</code> 代码块。</div>`;
}

function refreshSidebar() {
  if (currentDeck !== 'all' && !cards.some(card => card.deck === currentDeck)) currentDeck = 'all';
  const groups = cards.reduce((acc, card) => {
    if (!acc[card.deck]) acc[card.deck] = { count: 0, pinned: false };
    acc[card.deck].count++;
    acc[card.deck].pinned ||= Boolean(card.deckPinned);
    return acc;
  }, Object.create(null));
  $('[data-deck="all"]').classList.toggle("selected", currentDeck === "all");
  $("#allCount").textContent = cards.length;
  $('#streakDays').textContent = `${cards.reduce((sum, card) => sum + (Number(card.reviews) || 0), 0)} 次`;
  $("#dueCount").textContent = cards.filter(c => c.due <= Date.now()).length;
  const entries = Object.entries(groups).sort(([a, left], [b, right]) => Number(right.pinned) - Number(left.pinned) || Math.max(0, ...cards.filter(c => c.deck === b).map(c => c.deckPinnedAt || 0)) - Math.max(0, ...cards.filter(c => c.deck === a).map(c => c.deckPinnedAt || 0)));
  $("#deckList").innerHTML = entries.map(([deck, info]) => `<div class="deck-row"><button class="deck-item ${currentDeck === deck ? "selected" : ""}" data-deck="${escapeHtml(deck)}"><span class="deck-dot"></span><span class="deck-name">${escapeHtml(deck)}</span><span>${info.count}</span></button><button class="deck-manage" data-manage-deck="${escapeHtml(deck)}" title="管理牌组">···</button></div>`).join("");
  $("#deckFilter").innerHTML = '<option value="all">所有牌组</option>' + entries.map(([deck]) => `<option value="${escapeHtml(deck)}">${escapeHtml(deck)}</option>`).join("");
  $("#deckFilter").value = currentDeck;
  $$('[data-deck]').forEach(button => button.onclick = () => {
    currentDeck = button.dataset.deck;
    $$("[data-deck]").forEach(item => item.classList.toggle("selected", item.dataset.deck === currentDeck));
    $("#deckFilter").value = currentDeck;
    showView('library');
  });
  $$("[data-manage-deck]").forEach(button => button.onclick = event => {
    event.stopPropagation();
    menuDeck = button.dataset.manageDeck;
    const pinned = cards.some(c => c.deck === menuDeck && c.deckPinned);
    $('[data-deck-action="pin"] span').textContent = pinned ? '取消置顶牌组' : '置顶牌组';
    const menu = $("#deckMenu");
    menu.hidden = false;
    menu.style.top = `${button.getBoundingClientRect().bottom + 6}px`;
    menu.style.left = `${button.getBoundingClientRect().right - 164}px`;
  });
}
function manageDeck(deck) {
  const action = deck;
  if (action === "rename") {
    inlineRenameDeck(menuDeck);
  } else if (action === "delete" && confirm(`确定删除牌组“${menuDeck}”？其中卡片也会被删除，此操作无法撤销。`)) {
    cards = cards.filter(card => card.deck !== menuDeck); currentDeck = "all"; saveCards(); startReview();
  } else if (action === "pin") {
    const pinned = cards.filter(card => card.deck === menuDeck).some(card => card.deckPinned);
    cards.forEach(card => { if (card.deck === menuDeck) { card.deckPinned = !pinned; card.deckPinnedAt = pinned ? 0 : Date.now(); } });
    saveCards(); refreshSidebar();
    showToast(pinned ? '已取消牌组置顶' : '牌组已置顶');
  }
  $("#deckMenu").hidden = true;
}
function inlineRenameDeck(deck) {
  const nameNode = [...document.querySelectorAll(".deck-name")].find(node => node.textContent === deck);
  if (!nameNode || nameNode.querySelector("input")) return;
  const input = document.createElement("input");
  input.className = "deck-rename-input";
  input.value = deck;
  input.setAttribute("aria-label", "重命名牌组");
  nameNode.replaceChildren(input);
  input.select();
  input.onclick = event => event.stopPropagation();
  let finished = false;
  const finish = save => {
    if (finished) return;
    finished = true;
    const name = input.value.trim();
    if (save && name && name !== deck) {
      cards.forEach(card => { if (card.deck === deck) card.deck = name; });
      if (currentDeck === deck) currentDeck = name;
      saveCards();
    } else refreshSidebar();
  };
  input.onkeydown = event => {
    event.stopPropagation();
    if (event.key === "Enter") { event.preventDefault(); finish(true); }
    if (event.key === "Escape") finish(false);
  };
  input.onblur = () => finish(true);
}

function startReview() {
  reviewMode = 'due'; ratedIds = new Set(); setOutline(false);
  queue = cards.filter(card => card.due <= Date.now() && (currentDeck === "all" || card.deck === currentDeck)).sort(comparePinned);
  queueIndex = 0; completed = 0;
  showView("review");
  renderReview();
}

function renderReview() {
  const card = queue[queueIndex];
  $('#previousCard').disabled = queueIndex <= 0;
  $('#nextCard').disabled = queueIndex >= queue.length - 1;
  $('#editCurrentCard').disabled = !card;
  $("#progressBar").style.width = `${queue.length ? (completed / queue.length) * 100 : 100}%`;
  $("#progressText").textContent = queue.length ? `${completed} / ${queue.length} 已评分 · ${reviewMode === 'browse' ? '自由复习' : '到期复习'}` : "暂无到期卡片";
  $("#answerFace").hidden = true; $("#answerDivider").classList.remove("visible");
  $("#ratingPanel").hidden = true; $("#revealBtn").hidden = false;
  if (!card) {
    $("#cardDeck").textContent = "完成"; $("#cardIndex").textContent = "✓";
    $("#questionContent").innerHTML = "<h2>今天的卡片已经清空</h2><p>现在停下来，比继续添加任务更有利于记住。</p>";
    $("#revealBtn").hidden = true; $('#answerContent').replaceChildren(); renderOutline(); return;
  }
  $("#cardDeck").textContent = card.deck;
  $("#cardIndex").textContent = `${queueIndex + 1} / ${queue.length}`;
  renderRichContent($("#questionContent"), card.question);
  renderRichContent($("#answerContent"), card.answer);
  const intervals = ratingIntervals(card);
  $$('[data-rating]').forEach(button => {
    const days = intervals[button.dataset.rating];
    button.querySelector('span').textContent = days < 1 ? '10 分钟' : `${days} 天`;
    button.disabled = ratedIds.has(card.id);
  });
  renderOutline();
}

function revealAnswer() {
  if (!queue[queueIndex] || !$("#answerFace").hidden) return;
  $("#answerFace").hidden = false; $("#answerDivider").classList.add("visible");
  $("#ratingPanel").hidden = false; $("#revealBtn").hidden = true;
  renderOutline();
}

function rateCard(rating) {
  const card = queue[queueIndex]; if (!card || ratedIds.has(card.id) || $('#answerFace').hidden) return;
  const days = ratingIntervals(card)[rating];
  card.interval = days; card.due = Date.now() + days * 86400000; card.reviews = (card.reviews || 0) + 1;
  saveCards(); ratedIds.add(card.id); completed = ratedIds.size;
  const next = queue.findIndex((item, index) => index > queueIndex && !ratedIds.has(item.id));
  const remaining = queue.findIndex(item => !ratedIds.has(item.id));
  queueIndex = next >= 0 ? next : remaining >= 0 ? remaining : queue.length;
  renderReview(); window.scrollTo({top: 0});
}

function showView(name) {
  setOutline(false);
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `${name}View`));
  $$(".nav-item").forEach(v => v.classList.toggle("active", v.dataset.view === name));
  if (name === "library") {
    $("#viewEyebrow").textContent = "知识库 · 本地保存"; $("#viewTitle").textContent = currentDeck === 'all' ? "全部卡片" : currentDeck; renderLibrary();
  } else { $("#viewEyebrow").textContent = "今日 · 回忆队列"; $("#viewTitle").textContent = "先想，再看答案"; }
}

function renderLibrary() {
  const filtered = filteredCards();
  $("#cardList").innerHTML = filtered.length ? filtered.map(card => `<article class="library-card" data-id="${card.id}"><label class="select-card"><input type="checkbox" data-select-card="${card.id}" aria-label="选择卡片"></label><div><h3>${escapeHtml(card.question.split("\n")[0])}</h3><p>${escapeHtml(card.deck)}</p><div class="tags">${card.tags.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div></div><div class="library-meta">${card.reviews || 0} 次复习<br><button class="text-button" data-pin="${card.id}">${card.pinned ? "取消置顶" : "置顶"}</button></div></article>`).join("") : '<div class="empty-state"><strong>没有找到卡片</strong>换个关键词，或者新建一张。</div>';
  $$(".library-card").forEach(el => {
    el.tabIndex = 0;
    el.onclick = event => { if (!event.target.closest("input,button,label")) openCardReview(el.dataset.id); };
    el.onkeydown = event => { if (event.target === el && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openCardReview(el.dataset.id); } };
    const edit = document.createElement('button'); edit.className = 'button ghost card-edit'; edit.textContent = '编辑';
    edit.onclick = event => { event.stopPropagation(); openEditor(el.dataset.id); };
    el.querySelector('.library-meta').prepend(edit);
  });
  updateBulkActions();
  $$("[data-select-card]").forEach(input => input.onchange = updateBulkActions);
  $$("[data-pin]").forEach(button => {
    const card = cards.find(c => c.id === button.dataset.pin);
    button.setAttribute('aria-pressed', String(Boolean(card.pinned)));
    button.closest('.library-card').classList.toggle('is-pinned', Boolean(card.pinned));
    button.onclick = event => { event.stopPropagation(); card.pinned = !card.pinned; card.pinnedAt = card.pinned ? Date.now() : 0; saveCards(); renderLibrary(); showToast(card.pinned ? '卡片已置顶' : '已取消卡片置顶'); };
  });
}
function updateBulkActions() { $("#deleteSelectedBtn").hidden = !$$("[data-select-card]:checked").length; }

function comparePinned(a, b) {
  return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.pinned ? (b.pinnedAt || 0) - (a.pinnedAt || 0) : 0);
}

function filteredCards() {
  const query = $('#searchInput').value.trim().toLowerCase();
  return cards.filter(card => (currentDeck === 'all' || card.deck === currentDeck) && [card.question, card.answer, card.tags.join(' ')].join(' ').toLowerCase().includes(query))
    .sort(comparePinned);
}

function openCardReview(id) {
  reviewMode = 'browse'; ratedIds = new Set(); completed = 0;
  queue = filteredCards(); queueIndex = queue.findIndex(card => card.id === id);
  if (queueIndex < 0) return;
  showView('review'); renderReview(); window.scrollTo({top: 0});
}

function moveCard(step) {
  const next = queueIndex + step;
  if (next < 0 || next >= queue.length) return;
  queueIndex = next; renderReview(); window.scrollTo({top: 0});
}

function ratingIntervals(card) {
  return {again: 10 / 1440, hard: 1, good: Math.max(3, Math.round(card.interval * 2 || 3)), easy: Math.max(7, Math.round(card.interval * 3 || 7))};
}

function setOutline(open) {
  $('#outlinePanel').hidden = !open;
  $('#outlineToggle').setAttribute('aria-expanded', String(open));
}

function renderOutline() {
  const list = $('#cardOutline'); list.replaceChildren();
  queue.forEach((card, index) => {
    const button = document.createElement('button');
    button.textContent = `${index + 1}. ${card.question.split('\n')[0]}`;
    button.classList.toggle('current', index === queueIndex);
    if (index === queueIndex) button.setAttribute('aria-current', 'true');
    button.onclick = () => { queueIndex = index; renderReview(); setOutline(false); window.scrollTo({top: 0}); };
    list.append(button);
  });
  const headings = $('#headingOutline'); headings.replaceChildren();
  const selector = '#questionContent :is(h1,h2,h3,h4,h5,h6)' + ($('#answerFace').hidden ? '' : ', #answerContent :is(h1,h2,h3,h4,h5,h6)');
  $$(selector).forEach(heading => {
    const button = document.createElement('button'); button.textContent = heading.textContent;
    button.style.paddingLeft = `${12 + (Number(heading.tagName.slice(1)) - 1) * 10}px`;
    button.onclick = () => { heading.scrollIntoView({block: 'start'}); setOutline(false); };
    headings.append(button);
  });
  if (!headings.children.length) headings.textContent = $('#answerFace').hidden ? '显示答案后可查看内容目录' : '当前卡片没有标题';
}

function toggleSidebar(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  $('#sidebarToggle').setAttribute('aria-expanded', String(!collapsed));
  $('#sidebarToggle').setAttribute('aria-label', collapsed ? '展开侧边栏' : '收起侧边栏');
  $('#sidebarToggle').title = collapsed ? '展开侧边栏' : '收起侧边栏';
  localStorage.setItem('recall-sidebar-collapsed', String(collapsed));
  $('#deckMenu').hidden = true;
}

function openEditor(id = null) {
  editingId = id; const card = cards.find(c => c.id === id);
  $("#dialogTitle").textContent = card ? "编辑卡片" : "新建卡片";
  $("#deckInput").value = card?.deck || (currentDeck !== "all" ? currentDeck : "随手记");
  $("#questionInput").value = card?.question || ""; $("#answerInput").value = card?.answer || "";
  $("#tagsInput").value = card?.tags.join(", ") || ""; $("#deleteBtn").hidden = !card;
  updatePreview(); $("#editorDialog").showModal();
}

function updatePreview() {
  const question = $("#questionInput").value; const answer = $("#answerInput").value;
  const preview = $("#livePreview");
  preview.replaceChildren();
  for (const [label, source] of [["问题", question], ["答案", answer]]) {
    if (!source) continue;
    const heading = document.createElement('p');
    heading.className = 'face-label'; heading.textContent = label;
    const content = document.createElement('div');
    preview.append(heading, content);
    renderRichContent(content, source);
  }
  if (!question && !answer) preview.textContent = '输入内容后会在这里预览。';
  $("#htmlPreview").srcdoc = previewDocument(collectHtml(question + '\n\n' + answer));
}

function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800); }

$("#revealBtn").onclick = revealAnswer;
$("#flashcard").onclick = event => { if (!event.target.closest("button,a,summary,details,input,iframe") && !window.getSelection().toString()) revealAnswer(); };
$$('[data-rating]').forEach(button => button.onclick = () => rateCard(button.dataset.rating));
$$('[data-view]').forEach(button => button.onclick = () => button.dataset.view === 'review' ? startReview() : showView('library'));
$("#newCardBtn").onclick = () => openEditor();
$("#searchInput").oninput = renderLibrary;
$("#deckFilter").onchange = () => { currentDeck = $('#deckFilter').value; refreshSidebar(); showView('library'); };
$('#previousCard').onclick = () => moveCard(-1);
$('#nextCard').onclick = () => moveCard(1);
$('#backToLibrary').onclick = () => showView('library');
$('#editCurrentCard').onclick = () => { if (queue[queueIndex]) openEditor(queue[queueIndex].id); };
$('#outlineToggle').onclick = () => setOutline($('#outlinePanel').hidden);
$('#closeOutline').onclick = () => setOutline(false);
$('#sidebarToggle').onclick = () => toggleSidebar(!document.body.classList.contains('sidebar-collapsed'));
document.addEventListener('click', event => { if (!event.target.closest('#outlinePanel,#outlineToggle')) setOutline(false); });
[$("#questionInput"), $("#answerInput")].forEach(input => input.addEventListener("input", updatePreview));
$$('[data-preview]').forEach(button => button.onclick = () => { $$('[data-preview]').forEach(b => b.classList.toggle("active", b === button)); const html = button.dataset.preview === "html"; $("#livePreview").hidden = html; $("#htmlPreviewWrap").hidden = !html; });
$$('[data-close-dialog]').forEach(button => button.onclick = () => $("#editorDialog").close());

$("#editorForm").onsubmit = event => {
  event.preventDefault();
  if (!$('#deckInput').value.trim() || !$('#questionInput').value.trim() || !$('#answerInput').value.trim()) { showToast('牌组、问题和答案不能为空'); return; }
  const card = { id: editingId || crypto.randomUUID(), deck: $("#deckInput").value.trim(), question: $("#questionInput").value.trim(), answer: $("#answerInput").value.trim(), tags: $("#tagsInput").value.split(/[,，]/).map(s => s.trim()).filter(Boolean), due: cards.find(c => c.id === editingId)?.due || Date.now(), interval: cards.find(c => c.id === editingId)?.interval || 0, reviews: cards.find(c => c.id === editingId)?.reviews || 0 };
  if (editingId) cards = cards.map(c => c.id === editingId ? {...c, ...card} : c); else cards.unshift(card);
  queue = queue.map(c => cards.find(saved => saved.id === c.id)).filter(Boolean);
  saveCards(); $("#editorDialog").close();
  if ($('#libraryView').classList.contains('active')) renderLibrary();
  else if (editingId) renderReview(); else { currentDeck = card.deck; refreshSidebar(); showView('library'); }
  showToast(editingId ? "卡片已更新" : "卡片已加入牌组");
};

$("#deleteBtn").onclick = () => { if (!editingId || !confirm("删除这张卡片？此操作无法撤销。")) return; cards = cards.filter(c => c.id !== editingId); saveCards(); $("#editorDialog").close(); showView("library"); showToast("卡片已删除"); };
$("#deleteSelectedBtn").onclick = () => { const ids = $$("[data-select-card]:checked").map(input => input.dataset.selectCard); if (ids.length && confirm(`确定删除选中的 ${ids.length} 张卡片？`)) { cards = cards.filter(card => !ids.includes(card.id)); saveCards(); renderLibrary(); showToast(`已删除 ${ids.length} 张卡片`); } };
$$("[data-deck-action]").forEach(button => button.onclick = () => manageDeck(button.dataset.deckAction));
document.addEventListener("click", event => { if (!event.target.closest("#deckMenu,[data-manage-deck]")) $("#deckMenu").hidden = true; });

function deckExport(deck) {
  return { format: "recall-cards", version: 1, deck, exportedAt: new Date().toISOString(), cards: cards.filter(card => card.deck === deck).sort(comparePinned) };
}
function downloadDeck(deck) {
  const payload = deckExport(deck);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `${deck.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')}-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("#exportBtn").onclick = () => {
  if (currentDeck !== 'all') { downloadDeck(currentDeck); return; }
  const list = $('#exportDeckList'); list.replaceChildren();
  for (const deck of new Set(cards.map(card => card.deck))) {
    const button = document.createElement('button'); button.className = 'button ghost';
    button.textContent = `↓ ${deck}（${cards.filter(card => card.deck === deck).length} 张）.json`;
    button.onclick = () => downloadDeck(deck); list.append(button);
  }
  if (!cards.length) list.textContent = '暂无可导出的牌组';
  $('#exportDialog').showModal();
};
$('#closeExport').onclick = () => $('#exportDialog').close();
$("#importBtn").onclick = () => { importDeck = currentDeck; $("#importInput").click(); };
async function importFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  const destination = importDeck;
  try {
    const supported = files.filter(file => /\.(json|md|markdown|txt)$/i.test(file.name));
    if (!supported.length) throw new Error();
    const batches = await Promise.all(supported.map(async file => {
      if (/\.json$/i.test(file.name)) {
        const data = JSON.parse(await file.text());
        const rows = Array.isArray(data) ? data : data.cards;
        if (!Array.isArray(rows) || rows.some(row => !row || typeof row.question !== 'string' || typeof row.answer !== 'string')) throw new Error();
        return rows.map(row => ({...row, id: crypto.randomUUID(),
          deck: destination !== 'all' ? destination : (typeof row.deck === 'string' && row.deck.trim() ? row.deck : '随手记'),
          tags: Array.isArray(row.tags) ? row.tags.filter(tag => typeof tag === 'string') : [],
          due: Number.isFinite(row.due) ? row.due : Date.now(), interval: Number.isFinite(row.interval) && row.interval >= 0 ? row.interval : 0,
          reviews: Number.isFinite(row.reviews) && row.reviews >= 0 ? row.reviews : 0 }));
      }
      return [{id: crypto.randomUUID(), deck: destination !== 'all' ? destination : '随手记', tags: ['文件导入'], question: file.name.replace(/\.(md|markdown|txt)$/i, ''), answer: await file.text(), due: Date.now(), interval: 0, reviews: 0}];
    }));
    const imported = batches.flat();
    cards = [...imported, ...cards]; currentDeck = destination; saveCards(); showView('library');
    showToast(`已追加导入 ${imported.length} 张卡片${destination !== 'all' ? '到「' + destination + '」' : ''}`);
  } catch { showToast("无法读取这些文件"); }
}
$("#importInput").onchange = event => { importFiles(event.target.files); event.target.value = ""; };
$("#importFolderInput").onchange = event => { importFiles(event.target.files); event.target.value = ""; };
$("#importFolderBtn").onclick = () => { importDeck = currentDeck; $("#importFolderInput").click(); };

document.addEventListener("keydown", event => {
  if (event.key === 'Escape') setOutline(false);
  if (event.target.closest('input,textarea,select,button,summary,[contenteditable="true"]') || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if ($("#editorDialog").open || !$("#reviewView").classList.contains("active")) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveCard(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveCard(1); }
  if (event.code === "Space") { event.preventDefault(); revealAnswer(); }
  if (!["1","2","3","4"].includes(event.key) || $("#ratingPanel").hidden) return;
  rateCard(["again","hard","good","easy"][Number(event.key) - 1]);
});

toggleSidebar(localStorage.getItem('recall-sidebar-collapsed') === 'true');
refreshSidebar(); startReview();
