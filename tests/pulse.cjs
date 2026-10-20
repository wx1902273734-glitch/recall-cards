const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const originals = [
  {id:'first', deck:'Agent', question:'# 第一张问题', answer:'## 答案标题\n\n```html\n<div>HTML 内容</div>\n```', tags:['学习'], due:0, interval:2, reviews:3, pinned:true},
  {id:'second', deck:'Agent', question:'第二张问题', answer:'第二张答案', tags:[], due:Date.now() + 86400000, interval:3, reviews:1},
  {id:'third', deck:'前端', question:'前端问题', answer:'前端答案', tags:[], due:0, interval:0, reviews:0},
];
const dom = new JSDOM(fs.readFileSync(path.join(root, 'pulse.html'), 'utf8'), {url:'https://recall.test/pulse.html', runScripts:'outside-only'});
const w = dom.window;
const $ = selector => w.document.querySelector(selector);
const wait = () => new Promise(resolve => setTimeout(resolve, 15));
w.scrollTo = () => {};
w.HTMLElement.prototype.scrollIntoView = () => {};
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
w.ResizeObserver = class {observe(){} disconnect(){}};
w.confirm = () => true;
w.localStorage.setItem('recall-cards-v1', JSON.stringify(originals));
w.localStorage.setItem('recall-cloud-base-v1', JSON.stringify({revision:4, cards:originals}));
let remote = {revision:4, cards:structuredClone(originals)};
let writes = 0;
w.fetch = async (_url, options = {}) => {
  if (options.method === 'PUT') {
    const data = JSON.parse(options.body);
    assert.equal(data.revision, remote.revision);
    remote = {revision:remote.revision + 1, cards:data.cards};
    writes++;
    return {ok:true, status:200, json:async()=>({revision:remote.revision})};
  }
  return {ok:true, status:200, json:async()=>structuredClone(remote)};
};
for (const file of ['vendor/marked.js', 'vendor/purify.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
w.eval(['content.js', 'app.js', 'cloud.js', 'pulse.js'].map(file => fs.readFileSync(path.join(root,file),'utf8')).join('\n'));

async function run() {
  await wait();
  assert.equal($('#overviewView').classList.contains('active'), true, 'initial cloud pull preserves overview');
  assert.equal($('#pulseTotal').textContent, '3');
  assert.equal($('#pulseDue').textContent, '2');
  assert.equal($('#pulseDeckCount').textContent, '2');
  assert.equal($('#cloudStatus').textContent, '已同步');
  assert.equal(writes, 0, 'opening the new UI does not rewrite cards');
  assert.equal(w.localStorage.getItem('recall-cards-v1'), JSON.stringify(originals));

  $('.overview-deck').click();
  assert.equal($('#libraryView').classList.contains('active'), true);
  assert.equal($('#deckFilter').value, 'Agent');
  $('#newCardBtn').click();
  assert.equal($('#deckInput').value, 'Agent');
  $('[data-close-dialog]').click();
  assert.equal($('#editorDialog').open, false);
  assert.match($('#importDestination').textContent, /Agent/);
  $('#importBtn').click();
  await w.importFiles([{name:'real-format.jsonl', text:async()=>'{"question":"导入问题","answer":"导入答案","deck":"文件原牌组"}'}]);
  await wait();
  assert.equal(remote.cards[0].deck, 'Agent', 'import follows selected deck');
  assert.equal($('#pulseTotal').textContent, '4');

  $('.library-card[data-id="first"]').click();
  assert.equal($('#reviewView').classList.contains('active'), true);
  assert.equal($('#editorDialog').open, false);
  assert.equal($('#outlinePanel').hidden, true);
  $('#revealBtn').click();
  assert.equal($('#answerFace').hidden, false);
  assert.ok($('#answerContent iframe'));
  assert.equal($('#answerContent iframe').getAttribute('sandbox'), 'allow-same-origin');
  $('#outlineToggle').click();
  assert.equal($('#outlinePanel').hidden, false);
  assert.match($('#headingOutline').textContent, /答案标题/);
  $('#nextCard').click();
  assert.match($('#questionContent').textContent, /导入问题/);
  $('#nextCard').click();
  assert.match($('#questionContent').textContent, /第二张问题/);
  $('#previousCard').click();
  $('#previousCard').click();
  assert.match($('#questionContent').textContent, /第一张问题/);

  $('[data-view="overview"]').click();
  const before = w.localStorage.getItem('recall-cards-v1');
  $('#startPulseReview').click();
  assert.equal($('#reviewView').classList.contains('active'), true);
  assert.equal(w.localStorage.getItem('recall-cards-v1'), before, 'navigation does not reschedule cards');
  $('#sidebarToggle').click();
  assert.equal($('#mainSidebar').inert, false);
  $('#closeSidebar').click();
  assert.equal($('#mainSidebar').inert, true);
  assert.equal(w.localStorage.getItem('recall-pulse-sidebar-collapsed'), 'true');
  assert.equal(w.localStorage.getItem('recall-sidebar-collapsed'), 'false', 'new sidebar preference does not change classic preference');

  $('[data-view="library"]').click();
  $('#searchInput').value = '不存在的内容';
  $('#searchInput').dispatchEvent(new w.Event('input'));
  assert.ok($('.empty-state'));
  assert.match($('#pulseLibraryCount').textContent, /0 张/);
  assert.equal(w.document.querySelectorAll('[id]').length, new Set([...w.document.querySelectorAll('[id]')].map(el=>el.id)).size, 'no duplicate IDs');
  w.close();
  console.log('PASS: Pulse cloud integration, real counts, review/HTML, deck import, independent sidebar, empty search, shared data');

  const listeners = {};
  const cached = new Map();
  const waits = [];
  let online = true;
  const scope = {
    URL, Uint8Array,
    self: {addEventListener:(name, handler)=>listeners[name]=handler},
    caches: {open:async()=>({put:async(request,response)=>cached.set(typeof request==='string'?request:new URL(request.url).pathname,response)}), match:async(request)=>cached.get(typeof request==='string'?request:new URL(request.url).pathname)},
    fetch:async(request)=>{ if(!online) throw new Error('offline'); return {ok:true, path:new URL(request.url).pathname, clone(){return {...this};}}; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'), scope);
  async function navigate(route) {
    let response;
    listeners.fetch({request:{url:`https://recall.test${route}`,mode:'navigate',method:'GET'},respondWith:promise=>response=promise,waitUntil:promise=>waits.push(promise)});
    const result = await response;
    await Promise.all(waits.splice(0));
    return result;
  }
  await navigate('/');
  await navigate('/pulse.html');
  online = false;
  assert.equal((await navigate('/')).path, '/', 'classic keeps its own offline page');
  assert.equal((await navigate('/pulse.html')).path, '/pulse.html', 'Pulse keeps its own offline page');
  console.log('PASS: classic and Pulse offline navigation caches stay separate');
}
run().catch(error=>{console.error(error);w.close();process.exitCode=1;});
