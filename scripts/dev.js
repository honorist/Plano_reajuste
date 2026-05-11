// @ts-check
/**
 * Servidor de desenvolvimento estático: faz build de produção uma vez
 * e serve `dist/` em http://localhost:5173 para testar o app no navegador.
 *
 * Para hot reload, rode `npm run build` quando alterar `src/` e recarregue
 * o navegador (Ctrl+R).
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PORT = 5173;

console.log("Rodando build inicial...\n");
await new Promise((resolveBuild, reject) => {
  const proc = spawn(process.execPath, [resolve(__dirname, "build.js")], {
    stdio: "inherit",
  });
  proc.on("exit", (code) => {
    if (code === 0) resolveBuild(undefined);
    else reject(new Error(`Build saiu com código ${code}`));
  });
});

const dist = resolve(root, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const url = (req.url || "/").split("?")[0];
    let filePath = resolve(dist, "." + (url === "/" ? "/index.html" : url));
    if (!filePath.startsWith(dist)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) filePath = resolve(filePath, "index.html");
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\nDev server: http://localhost:${PORT}`);
  console.log("Servindo de", dist);
  console.log("Edite src/ e rode `npm run build` + recarregue (Ctrl+R)\n");
});
