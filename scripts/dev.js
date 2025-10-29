const http = require("http");
const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");
const build = require("./build");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PORT = process.env.PORT || 8080;
const WATCH_PATHS = [
  path.join(ROOT, "templates"),
  path.join(ROOT, "site"),
  path.join(ROOT, "posts"),
  path.join(ROOT, "demos"),
  path.join(ROOT, "textures"),
  path.join(ROOT, "banner.png"),
];

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

let isBuilding = false;
let pendingBuild = false;

async function runBuild() {
  if (isBuilding) {
    pendingBuild = true;
    return;
  }
  try {
    isBuilding = true;
    await build();
    console.log("[build] site updated");
  } catch (err) {
    console.error("[build] failed", err);
  } finally {
    isBuilding = false;
    if (pendingBuild) {
      pendingBuild = false;
      runBuild();
    }
  }
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let relativePath = decodeURIComponent(url.pathname);
  if (relativePath === "/") {
    relativePath = "/index.html";
  }

  let filePath = path.join(DIST, relativePath);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

async function start() {
  await runBuild();

  http
    .createServer(serveFile)
    .listen(PORT, () =>
      console.log(`[dev] server running at http://localhost:${PORT}`)
    );

  const watcher = chokidar.watch(WATCH_PATHS, {
    ignoreInitial: true,
  });
  watcher.on("all", (event, filePath) => {
    console.log(`[watch] ${event}: ${path.relative(ROOT, filePath)}`);
    runBuild();
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
