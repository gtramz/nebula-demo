import { resolve } from 'node:path';
import { createNebulaServer } from './app.js';

const port = Number(process.env.PORT ?? 4174), host = process.env.HOST ?? '127.0.0.1';
const origin = process.env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`;
if (process.env.NEBULA_PRESENTATION === '1' && host !== '127.0.0.1') throw new Error('Presentation mode is local-only.');
if (host !== '127.0.0.1' && !origin.startsWith('https://')) throw new Error('Non-loopback hosting requires PUBLIC_ORIGIN with HTTPS and a TLS reverse proxy.');
const server = await createNebulaServer({
  dataDir: resolve(process.env.NEBULA_DATA_DIR ?? '.data/server'),
  publicDir: resolve('artifacts/nebula/dist/public'), origin,
  presentation: process.env.NEBULA_PRESENTATION === '1',
});
server.listen(port, host, () => console.log(`Nebula server: ${origin} (persistent data on disk)`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { server.close(); server.closeIdleConnections(); });
