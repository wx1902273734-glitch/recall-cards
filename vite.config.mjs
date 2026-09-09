import { defineConfig } from 'vite';
import { sites } from '@openai/sites-vite-plugin';

export default defineConfig({
  plugins: [sites()],
  build: { target:'es2022', lib: {entry:'worker.js',formats:['es'],fileName:()=>'server/index.js'}, minify:false },
});
