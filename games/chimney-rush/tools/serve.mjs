// Tiny static file server used by the test and asset scripts (no dependencies).
// Usage: node tools/serve.mjs [dir] [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml"
};

export function serve(root, port = 0) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] || ".";
  const port = Number(process.argv[3] || 8080);
  serve(dir, port).then(({ port: p }) => console.log(`Serving ${path.resolve(dir)} at http://127.0.0.1:${p}/`));
}
