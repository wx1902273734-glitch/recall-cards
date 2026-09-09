import {readFile,writeFile} from 'node:fs/promises';
const assets = {};
for (const file of ['index.html','styles.css','app.js','content.js','cloud.js','vendor/marked.js','vendor/purify.js']) {
  assets['/'+file] = {body:await readFile(file,'utf8'), type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8'};
}
await writeFile('generated-assets.js','export const assets = '+JSON.stringify(assets)+';');
