import { defineConfig } from 'vite';
import { sites } from '@openai/sites-vite-plugin';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const localStorePath = resolve('.local-data/cards.json');

function validCards(cards) {
  return Array.isArray(cards) && cards.length <= 10000 && new Set(cards.map(card => card?.id)).size === cards.length && cards.every(card =>
    card && typeof card.id === 'string' && typeof card.deck === 'string' && card.deck.trim() &&
    typeof card.question === 'string' && typeof card.answer === 'string' && Array.isArray(card.tags) &&
    card.tags.every(tag => typeof tag === 'string') && Number.isFinite(card.due) &&
    Number.isFinite(card.interval) && card.interval >= 0 && Number.isFinite(card.reviews) && card.reviews >= 0);
}

async function readLocalStore() {
  try {
    const value = JSON.parse(await readFile(localStorePath, 'utf8'));
    return Number.isSafeInteger(value.revision) && Array.isArray(value.cards) ? value : { revision: 0, cards: [] };
  } catch (error) {
    if (error.code === 'ENOENT') return { revision: 0, cards: [] };
    throw error;
  }
}

function localPersistence() {
  return {
    name: 'recall-local-persistence',
    configureServer(server) {
      server.middlewares.use('/api/cards', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        try {
          const current = await readLocalStore();
          if (request.method === 'GET') return response.end(JSON.stringify(current));
          if (request.method !== 'PUT') { response.statusCode = 405; return response.end(JSON.stringify({ error: 'Method not allowed' })); }
          let raw = '';
          for await (const chunk of request) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 8 * 1024 * 1024) { response.statusCode = 413; return response.end(JSON.stringify({ error: 'Payload too large' })); }
          }
          const data = JSON.parse(raw);
          if (!Number.isSafeInteger(data.revision) || data.revision !== current.revision || !validCards(data.cards)) {
            response.statusCode = data.revision !== current.revision ? 409 : 400;
            return response.end(JSON.stringify({ error: 'Invalid or stale cards' }));
          }
          const next = { revision: current.revision + 1, cards: data.cards };
          await mkdir(dirname(localStorePath), { recursive: true });
          await writeFile(localStorePath, JSON.stringify(next, null, 2), 'utf8');
          response.end(JSON.stringify({ revision: next.revision }));
        } catch {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'Local storage unavailable' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [localPersistence(), sites()],
  server: {
    host: '0.0.0.0',
  },
  build: { target:'es2022', lib: {entry:'worker.js',formats:['es'],fileName:()=>'server/index.js'}, minify:false },
});
