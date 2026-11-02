import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { defineConfig } from 'vite';
import { recordings } from './src/recordings.ts';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const nativeSounds = new Set<string>(
  Object.values(recordings).map((recording) => recording.iosSound),
);
const compressQuran = (data: Uint8Array) => gzipSync(data, { level: 9 });

export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? false : publicDir,
  plugins: [
    {
      name: 'offline-assets',
      configureServer(server) {
        server.middlewares.use('/quran.json.gz', (_request, response, next) => {
          readFile(join(publicDir, 'quran.json'))
            .then((data) => {
              // This is a gzip file, not HTTP Content-Encoding; the reader decompresses it.
              response.setHeader('Content-Type', 'application/gzip');
              response.end(compressQuran(data));
            })
            .catch(next);
        });
      },
      async generateBundle() {
        for (const path of await readdir(publicDir, { recursive: true })) {
          const fileName = path.replaceAll('\\', '/');
          if (nativeSounds.has(fileName) || !(await stat(join(publicDir, path))).isFile()) continue;
          const data = await readFile(join(publicDir, path));
          if (fileName === 'quran.json') {
            this.emitFile({
              type: 'asset',
              fileName: 'quran.json.gz',
              source: compressQuran(data),
            });
          } else {
            const source =
              fileName === 'quran-sources.json'
                ? JSON.stringify(JSON.parse(data.toString('utf8')))
                : data;
            this.emitFile({ type: 'asset', fileName, source });
          }
        }
      },
    },
  ],
}));
