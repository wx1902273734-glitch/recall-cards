// The private Site owns one card collection; local files remain usable offline.
let cloudRevision = 0;
let cloudReady = false;
let cloudPending = null;
let cloudSending = false;
let cloudConflict = false;
// Production uses Sites/D1; localhost uses the Vite persistence middleware.
const localBackend = ['127.0.0.1', 'localhost'].includes(location.hostname);
const cloudEnabled = location.protocol === 'https:' || localBackend;
const savedStatus = localBackend ? '已保存到本机后端' : '已保存到云端';
const connectedStatus = localBackend ? '已连接本机后端' : '已连接云端';

function cloudStatus(text) { document.querySelector('#cloudStatus').textContent = text; }
function scheduleCloudSave(snapshot) {
  if (!cloudEnabled || !cloudReady) return;
  cloudPending = JSON.stringify(snapshot);
  cloudStatus('待同步');
  flushCloud();
}
async function flushCloud() {
  if (cloudSending || !cloudPending || cloudConflict) return;
  cloudSending = true;
  try {
    while (cloudPending) {
      const pending = cloudPending;
      cloudStatus('正在保存…');
      const response = await fetch('/api/cards',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:cloudRevision,cards:JSON.parse(pending)})});
      if (response.status === 409) { cloudConflict = true; throw new Error('数据冲突：请导出当前卡片后刷新'); }
      if (!response.ok) throw new Error('未同步，点击重试');
      cloudRevision = (await response.json()).revision;
      if (cloudPending === pending) cloudPending = null;
    }
    cloudStatus(savedStatus);
  } catch(error) { cloudStatus(error.message); }
  finally { cloudSending = false; }
}
async function connectCloud() {
  if (!cloudEnabled) { cloudStatus('本地保存'); return; }
  document.querySelector('.app-shell').inert = true;
  cloudStatus('正在连接云端…');
  try {
    const response = await fetch('/api/cards');
    if (!response.ok) throw new Error('连接失败，点击重试');
    const data = await response.json();
    if (!Array.isArray(data.cards) || !Number.isSafeInteger(data.revision)) throw new Error('云端数据格式异常');
    cloudRevision = data.revision;
    // Preserve browser drafts as a recovery copy; never upload them implicitly.
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous) localStorage.setItem('recall-before-cloud', previous);
    cards = data.revision === 0 ? starterCards : data.cards;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    cloudReady = true;
    refreshSidebar(); startReview();
    document.querySelector('.app-shell').inert = false;
    if (data.revision === 0) scheduleCloudSave(cards); else cloudStatus(connectedStatus);
  } catch(error) { cloudStatus(error.message); }
}
window.addEventListener('online', () => cloudReady ? flushCloud() : connectCloud());
window.addEventListener('beforeunload', event => { if (cloudPending) { event.preventDefault(); event.returnValue = ''; } });
document.querySelector('#cloudStatus').onclick = () => cloudReady ? flushCloud() : connectCloud();
connectCloud();
