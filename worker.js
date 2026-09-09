import { assets } from './generated-assets.js';

const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
function validCards(cards) {
  return Array.isArray(cards) && cards.length <= 10000 && new Set(cards.map(c => c?.id)).size === cards.length && cards.every(c =>
    c && typeof c.id === 'string' && typeof c.deck === 'string' && c.deck.trim() && typeof c.question === 'string' && typeof c.answer === 'string' &&
    Array.isArray(c.tags) && c.tags.every(t => typeof t === 'string') && Number.isFinite(c.due) && Number.isFinite(c.interval) && c.interval >= 0 && Number.isFinite(c.reviews) && c.reviews >= 0);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cards') {
      try {
        if (request.method === 'GET') {
          const row = await env.DB.prepare('SELECT revision, cards FROM card_store WHERE id = 1').first();
          return json(row ? {revision:row.revision, cards:JSON.parse(row.cards)} : {revision:0,cards:[]});
        }
        if (request.method !== 'PUT') return json({error:'Method not allowed'},405);
        if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({error:'Origin rejected'},403);
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Expected JSON'},415);
        const text = await request.text();
        if (new TextEncoder().encode(text).length > 8 * 1024 * 1024) return json({error:'卡片内容超过 8MB，请分批整理'},413);
        let data; try { data = JSON.parse(text); } catch { return json({error:'Invalid JSON'},400); }
        if (!Number.isSafeInteger(data.revision) || data.revision < 0 || !validCards(data.cards)) return json({error:'Invalid cards'},400);
        const payload = JSON.stringify(data.cards);
        const result = data.revision === 0
          ? await env.DB.prepare('INSERT OR IGNORE INTO card_store (id, revision, cards) VALUES (1, 1, ?)').bind(payload).run()
          : await env.DB.prepare('UPDATE card_store SET cards = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(payload,data.revision).run();
        if (!result.meta.changes) return json({error:'另一窗口已更新数据，请先导出当前卡片再刷新'},409);
        return json({revision:data.revision+1});
      } catch { return json({error:'云端存储暂时不可用'},503); }
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
    const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
    if (!asset) return new Response('Not found',{status:404});
    return new Response(request.method === 'HEAD' ? null : asset.body, {headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
  }
};
