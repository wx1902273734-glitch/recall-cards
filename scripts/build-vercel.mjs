import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const outputDirectory = 'vercel-dist';
const files = [
  'index.html',
  'pulse.html',
  'pulse.css',
  'pulse.js',
  'pulse.webmanifest',
  'styles.css',
  'app.js',
  'content.js',
  'cloud.js',
  'pwa.js',
  'sw.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/anki-app.svg',
  'icons/anki-app-180.png',
  'icons/anki-app-192.png',
  'icons/anki-app-512.png',
  'icons/anki-wordmark.svg',
  'vendor/marked.js',
  'vendor/purify.js',
];

await mkdir(outputDirectory, { recursive: true });
for (const file of files) {
  const destination = join(outputDirectory, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(file, destination, { recursive: true });
}
