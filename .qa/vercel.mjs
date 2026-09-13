import assert from 'node:assert/strict';
import cardsHandler from '../api/cards.js';
import healthHandler from '../api/health.js';

function responseRecorder() {
  return {statusCode:200, headers:{}, status(code){this.statusCode=code;return this;}, setHeader(key,value){this.headers[key]=value;}, send(body){this.body=body;return this;}, json(value){this.body=JSON.stringify(value);return this;}};
}

const originalFetch = globalThis.fetch;
let forwarded;
globalThis.fetch = async (url, options = {}) => {
  forwarded = {url, options};
  return new Response(JSON.stringify(url.endsWith('/health') ? {ok:true} : {revision:2,cards:[]}), {status:200,headers:{'Content-Type':'application/json'}});
};
const getResponse = responseRecorder();
await cardsHandler({method:'GET',headers:{authorization:'Bearer test'}}, getResponse);
assert.equal(getResponse.statusCode,200); assert.equal(forwarded.options.headers.Authorization,'Bearer test');
const putResponse = responseRecorder();
await cardsHandler({method:'PUT',headers:{authorization:'Bearer test'},body:{revision:2,cards:[]}}, putResponse);
assert.equal(forwarded.options.body,JSON.stringify({revision:2,cards:[]}));
const healthResponse = responseRecorder(); await healthHandler({},healthResponse); assert.equal(healthResponse.statusCode,200);
globalThis.fetch = originalFetch;
console.log('PASS: same-origin Vercel proxy forwards auth and card payloads');
