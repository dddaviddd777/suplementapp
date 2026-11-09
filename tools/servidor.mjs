// Servidor local per provar l'app: `node tools/servidor.mjs` i obre http://localhost:5173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARREL = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const TIPUS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

createServer(async (req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const fitxer = normalize(join(ARREL, ruta));
  if (!fitxer.startsWith(normalize(ARREL))) { res.writeHead(403).end(); return; }
  try {
    const dades = await readFile(fitxer);
    res.writeHead(200, { 'Content-Type': TIPUS[extname(fitxer)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(dades);
  } catch {
    res.writeHead(404).end('No trobat');
  }
}).listen(PORT, () => console.log(`SuplementAPP a http://localhost:${PORT}`));
