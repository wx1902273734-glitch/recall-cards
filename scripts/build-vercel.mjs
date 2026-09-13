import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const outputDirectory = 'vercel-dist';
const files = [
  'index.html',
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
  'vendor/marked.js',
  'vendor/purify.js',
];

await mkdir(outputDirectory, { recursive: true });
for (const file of files) {
  const destination = join(outputDirectory, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(file, destination, { recursive: true });
}
