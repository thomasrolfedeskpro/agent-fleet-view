import { createReadStream, existsSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const FIXTURES = resolve(import.meta.dirname, '../../fixtures');

/** Serves the repo's golden fixtures at /fixtures, so they have one home on disk. */
function fixtures(): Plugin {
  return {
    name: 'fleet-fixtures',
    configureServer(server) {
      server.middlewares.use('/fixtures', (req, res, next) => {
        const rel = normalize(req.url ?? '').replace(/^(\.\.[/\\])+/, '');
        const file = join(FIXTURES, rel);
        if (!file.startsWith(FIXTURES) || !existsSync(file)) return next();
        res.setHeader('Content-Type', 'application/json');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fixtures()],
  server: { port: 5173, strictPort: true },
});
