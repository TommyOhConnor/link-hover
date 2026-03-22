import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portStart = Number(process.env.PORT) || 5173;
const maxAttempts = 30;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = path.join(__dirname, safe === "/" ? "index.html" : safe);
  if (!file.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    fs.readFile(file, (readErr, data) => {
      if (readErr) {
        res.writeHead(500);
        res.end("Error");
        return;
      }
      const ext = path.extname(file);
      res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
      res.end(data);
    });
  });
});

function listen(port, attempt) {
  if (attempt >= maxAttempts) {
    console.error(
      `Could not bind to 127.0.0.1 after ${maxAttempts} tries (from port ${portStart}). Close other apps using those ports or set PORT.`,
    );
    process.exit(1);
  }

  server.removeAllListeners("error");
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      listen(port + 1, attempt + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    server.removeAllListeners("error");
    if (port !== portStart) {
      console.log(`Port ${portStart} was busy; using ${port} instead.`);
    }
    console.log(`http://127.0.0.1:${port}`);
  });
}

listen(portStart, 0);
