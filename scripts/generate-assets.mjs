import {readFile,writeFile} from 'node:fs/promises';
const assets = {};
const files = ['index.html','pulse.html','pulse.css','pulse.js','pulse.webmanifest','styles.css','app.js','content.js','cloud.js','pwa.js','sw.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','vendor/marked.js','vendor/purify.js'];
const contentType = file => file.endsWith('.html') ? 'text/html; charset=utf-8'
  : file.endsWith('.css') ? 'text/css; charset=utf-8'
  : file.endsWith('.webmanifest') ? 'application/manifest+json; charset=utf-8'
  : file.endsWith('.svg') ? 'image/svg+xml'
  : file.endsWith('.png') ? 'image/png'
  : 'application/javascript; charset=utf-8';
for (const file of files) {
  const binary = file.endsWith('.png');
  const value = await readFile(file);
  assets['/'+file] = {body:binary ? value.toString('base64') : value.toString('utf8'), type:contentType(file), ...(binary ? {base64:true} : {})};
}
await writeFile('generated-assets.js','export const assets = '+JSON.stringify(assets)+';');
