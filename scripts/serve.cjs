const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".md": "text/plain; charset=utf-8" };

function createServer(options = {}) {
  return http.createServer((req, res) => {
    try {
      let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
      if (options.scope && name === "qa-observer") {
        res.writeHead(200, { "Content-Type": "text/html" }).end("<!doctype html><title>QA observer outside PWA scope</title>");
        return;
      }
      if (options.scope) {
        if (!name.startsWith(options.scope)) { res.writeHead(404).end(); return; }
        name = name.slice(options.scope.length);
      }
      if (!name || name.endsWith("/")) name += "index.html";
      const absolute = path.resolve(root, name);
      if (!absolute.startsWith(root + path.sep) || name.split(/[\\/]/).some((part) => part.startsWith("."))) { res.writeHead(403).end(); return; }
      const data = options.baseline?.()
        ? execFileSync("git", ["show", `043381f:${name}`], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] })
        : fs.readFileSync(absolute);
      res.writeHead(200, { "Content-Type": types[path.extname(name)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(data);
    } catch { res.writeHead(404).end("Not found"); }
  });
}
if (require.main === module) {
  const server = createServer();
  const port = Number(process.env.PORT || 8026);
  server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/index.html`));
}
module.exports = { createServer };
