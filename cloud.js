const CLOUD_PENDING_KEY = 'recall-cloud-pending-v1';
const CLOUD_BASE_KEY = 'recall-cloud-base-v1';
const CLOUD_TOKEN_KEY = 'recall-access-token-v1';
const CLOUD_API_KEY = 'recall-api-base';
const cloudEnabled = ['http:', 'https:'].includes(location.protocol);
const API_BASE = (localStorage.getItem(CLOUD_API_KEY) || '').trim().replace(/\/$/, '');
let cloudRevision = 0;
let cloudReady = false;
let cloudSending = false;
let cloudPulling = false;
let cloudPending = localStorage.getItem(CLOUD_PENDING_KEY);

function cloudStatus(text) { document.querySelector('#cloudStatus').textContent = text; }

function cloudHeaders(headers = {}) {
  const token = localStorage.getItem(CLOUD_TOKEN_KEY);
  return {...headers, ...(token ? {Authorization: `Bearer ${token}`} : {})};
}

function cloudRequest(path, options = {}) {
  if (location.protocol === 'https:' && API_BASE.startsWith('http:')) return Promise.reject(new Error('线上应用必须使用 HTTPS 后端'));
  return fetch(`${API_BASE}${path}`, {...options, headers:cloudHeaders(options.headers)});
}

function readCloudBase() {
  try {
    const value = JSON.parse(localStorage.getItem(CLOUD_BASE_KEY));
    return value && Number.isSafeInteger(value.revision) && Array.isArray(value.cards) ? value : {revision:0,cards:[]};
  } catch { return {revision:0,cards:[]}; }
}

function writeCloudBase(revision, snapshot) {
  localStorage.setItem(CLOUD_BASE_KEY, JSON.stringify({revision, cards:snapshot}));
}

function sameCard(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

// Unchanged sides accept remote edits; simultaneous edits preserve both versions.
function mergeSnapshots(baseCards, localCards, remoteCards) {
  const base = new Map(baseCards.map(card => [card.id, card]));
  const local = new Map(localCards.map(card => [card.id, card]));
  const remote = new Map(remoteCards.map(card => [card.id, card]));
  const result = [];
  let conflicts = 0;
  for (const id of new Set([...base.keys(), ...local.keys(), ...remote.keys()])) {
    const before = base.get(id);
    const here = local.get(id);
    const there = remote.get(id);
    if (sameCard(here, there)) { if (here) result.push(here); continue; }
    if (sameCard(here, before)) { if (there) result.push(there); continue; }
    if (sameCard(there, before)) { if (here) result.push(here); continue; }
    if (!here) { if (there) result.push(there); continue; }
    if (!there) { result.push(here); continue; }
    result.push(here);
    result.push({...there, id:crypto.randomUUID(), question:`${there.question}（同步冲突副本）`, tags:[...new Set([...(there.tags || []), '同步冲突'])]});
    conflicts++;
  }
  return {cards:result, conflicts};
}

function refreshCloudCards(nextCards) {
  cards = nextCards;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  refreshSidebar();
  if (document.querySelector('#libraryView').classList.contains('active')) renderLibrary();
  else startReview();
}

function showAccessDialog(message = '请输入部署时设置的个人访问密钥。') {
  const dialog = document.querySelector('#accessDialog');
  document.querySelector('#accessMessage').textContent = message;
  if (!dialog.open) dialog.showModal();
  setTimeout(() => document.querySelector('#accessTokenInput').focus(), 0);
}

function handleUnauthorized() {
  cloudReady = false;
  cloudStatus('需要登录');
  showAccessDialog(localStorage.getItem(CLOUD_TOKEN_KEY) ? '访问密钥不正确，请重新输入。' : undefined);
}

function scheduleCloudSave(snapshot) {
  if (!cloudEnabled) return;
  cloudPending = JSON.stringify(snapshot);
  localStorage.setItem(CLOUD_PENDING_KEY, cloudPending);
  cloudStatus(navigator.onLine ? '待同步' : '离线 · 待同步');
  if (cloudReady && navigator.onLine) flushCloud();
}

async function fetchRemote() {
  const response = await cloudRequest('/api/cards', {cache:'no-store'});
  if (response.status === 401) { handleUnauthorized(); throw new Error('需要登录'); }
  if (!response.ok) throw new Error('连接失败，点击重试');
  const data = await response.json();
  if (!Array.isArray(data.cards) || !Number.isSafeInteger(data.revision)) throw new Error('云端数据格式异常');
  return data;
}

async function flushCloud() {
  if (cloudSending || !cloudPending || !cloudReady || !navigator.onLine) return;
  cloudSending = true;
  try {
    let attempts = 0;
    while (cloudPending && attempts++ < 4) {
      const pending = cloudPending;
      cloudStatus('正在同步…');
      const response = await cloudRequest('/api/cards', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({revision:cloudRevision,cards:JSON.parse(pending)})});
      if (response.status === 401) { handleUnauthorized(); throw new Error('需要登录'); }
      if (response.status === 409) {
        const remote = await fetchRemote();
        const base = readCloudBase();
        const merged = mergeSnapshots(base.cards, JSON.parse(pending), remote.cards);
        cloudRevision = remote.revision;
        writeCloudBase(remote.revision, remote.cards);
        cloudPending = JSON.stringify(merged.cards);
        localStorage.setItem(CLOUD_PENDING_KEY, cloudPending);
        refreshCloudCards(merged.cards);
        if (merged.conflicts) showToast(`发现 ${merged.conflicts} 处同时修改，已保留冲突副本`);
        continue;
      }
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '未同步，点击重试');
      cloudRevision = (await response.json()).revision;
      writeCloudBase(cloudRevision, JSON.parse(pending));
      if (cloudPending === pending) {
        cloudPending = null;
        localStorage.removeItem(CLOUD_PENDING_KEY);
      }
    }
    cloudStatus(cloudPending ? '待同步，点击重试' : '已同步');
  } catch(error) {
    if (error.message !== '需要登录') cloudStatus(navigator.onLine ? error.message : '离线 · 待同步');
  } finally { cloudSending = false; }
}

async function connectCloud() {
  if (!cloudEnabled) { cloudStatus('本地保存'); return; }
  cloudStatus(navigator.onLine ? '正在连接…' : '离线 · 本地可用');
  if (!navigator.onLine) return;
  try {
    const hadStoredLocal = localStorage.getItem(STORAGE_KEY) !== null;
    const remote = await fetchRemote();
    cloudRevision = remote.revision;
    cloudReady = true;
    const base = readCloudBase();
    const localSnapshot = cloudPending ? JSON.parse(cloudPending) : cards;
    if (remote.revision === 0) {
      writeCloudBase(0, []);
      scheduleCloudSave(localSnapshot);
      return;
    }
    if (!hadStoredLocal && !cloudPending) {
      refreshCloudCards(remote.cards);
      writeCloudBase(remote.revision, remote.cards);
      cloudStatus('已同步');
      return;
    }
    const merged = mergeSnapshots(base.cards, localSnapshot, remote.cards);
    refreshCloudCards(merged.cards);
    writeCloudBase(remote.revision, remote.cards);
    if (sameCard(merged.cards, remote.cards)) {
      cloudPending = null;
      localStorage.removeItem(CLOUD_PENDING_KEY);
      cloudStatus('已同步');
    } else scheduleCloudSave(merged.cards);
    if (merged.conflicts) showToast(`发现 ${merged.conflicts} 处同时修改，已保留冲突副本`);
  } catch(error) {
    if (error.message !== '需要登录') cloudStatus(error.message || '离线 · 本地可用');
  }
}

async function pullCloud() {
  if (!cloudReady || cloudPulling || cloudSending || !navigator.onLine) return;
  cloudPulling = true;
  try {
    const remote = await fetchRemote();
    if (remote.revision === cloudRevision) return;
    const localSnapshot = cloudPending ? JSON.parse(cloudPending) : cards;
    const base = readCloudBase();
    const merged = mergeSnapshots(base.cards, localSnapshot, remote.cards);
    cloudRevision = remote.revision;
    writeCloudBase(remote.revision, remote.cards);
    refreshCloudCards(merged.cards);
    if (sameCard(merged.cards, remote.cards)) {
      cloudPending = null;
      localStorage.removeItem(CLOUD_PENDING_KEY);
      cloudStatus('已同步');
    } else scheduleCloudSave(merged.cards);
    if (merged.conflicts) showToast(`发现 ${merged.conflicts} 处同时修改，已保留冲突副本`);
  } catch(error) {
    if (error.message !== '需要登录') cloudStatus('同步暂时中断，数据已保存在本机');
  } finally { cloudPulling = false; }
}

document.querySelector('#accessForm').onsubmit = event => {
  event.preventDefault();
  const token = document.querySelector('#accessTokenInput').value.trim();
  if (!token) return;
  localStorage.setItem(CLOUD_TOKEN_KEY, token);
  document.querySelector('#accessDialog').close();
  connectCloud();
};
document.querySelector('#clearAccessToken').onclick = () => {
  localStorage.removeItem(CLOUD_TOKEN_KEY);
  document.querySelector('#accessTokenInput').value = '';
  showAccessDialog('已清除本机密钥，请输入新的访问密钥。');
};
window.addEventListener('online', () => cloudReady ? flushCloud() : connectCloud());
window.addEventListener('offline', () => cloudStatus(cloudPending ? '离线 · 待同步' : '离线 · 本地可用'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) pullCloud(); });
window.addEventListener('beforeunload', event => { if (cloudPending) { event.preventDefault(); event.returnValue = ''; } });
document.querySelector('#cloudStatus').onclick = () => cloudReady ? (cloudPending ? flushCloud() : pullCloud()) : connectCloud();
setInterval(pullCloud, 30000);
connectCloud();
