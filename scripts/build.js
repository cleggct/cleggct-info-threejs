const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const ASSETS_DIR = path.join(ROOT, "site", "assets");
const POSTS_DIR = path.join(ROOT, "posts");
const DEMOS_DIR = path.join(ROOT, "demos");
const TEXTURES_DIR = path.join(ROOT, "textures");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const WATER_SRC = path.join(ROOT, "site", "assets", "js", "water.js");
const BANNER_FILE = path.join(ROOT, "banner.png");
const THREE_BUILD_DIR = path.join(ROOT, "node_modules", "three", "build");

const layoutTemplate = readTemplate("layout.html");
const homeTemplate = readTemplate("home.html");
const postTemplate = readTemplate("post.html");
const demoTemplate = readTemplate("demo.html");

function readTemplate(file) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf8");
}

function cleanDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyAssets() {
  copyDir(ASSETS_DIR, path.join(DIST, "assets"));
  copyDir(TEXTURES_DIR, path.join(DIST, "textures"));
  if (fs.existsSync(BANNER_FILE)) {
    fs.copyFileSync(BANNER_FILE, path.join(DIST, path.basename(BANNER_FILE)));
  }
  const vendorDir = path.join(DIST, "assets", "vendor");
  fs.mkdirSync(vendorDir, { recursive: true });
  if (fs.existsSync(THREE_BUILD_DIR)) {
    for (const file of ["three.module.js", "three.core.js"]) {
      const src = path.join(THREE_BUILD_DIR, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(vendorDir, file));
      }
    }
  }
  copyDir(DEMOS_DIR, path.join(DIST, "demos"));
}

function titleFromSlug(slug) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = path.basename(file, ".md");
      const fullPath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const parsed = matter(raw);
      const stats = fs.statSync(fullPath);
      const dateValue = parsed.data.date
        ? new Date(parsed.data.date)
        : stats.mtime;
      return {
        slug,
        title: parsed.data.title || titleFromSlug(slug),
        date: dateValue,
        url: `/posts/${slug}/`,
        body: marked.parse(parsed.content),
      };
    })
    .sort((a, b) => b.date - a.date);
}

function readDemos() {
  if (!fs.existsSync(DEMOS_DIR)) return [];
  return fs
    .readdirSync(DEMOS_DIR)
    .filter((file) => file.endsWith(".js"))
    .map((file) => {
      const slug = path.basename(file, ".js");
      const stats = fs.statSync(path.join(DEMOS_DIR, file));
      return {
        slug,
        title: titleFromSlug(slug),
        date: stats.mtime,
        file,
        url: `/demos/${slug}/`,
      };
    })
    .sort((a, b) => b.date - a.date);
}

function fill(template, values) {
  return template.replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (_, key) => {
    return values[key] ?? "";
  });
}

function renderLayout({
  title,
  bodyClass = "",
  includeWater = false,
  content,
  extraScripts = "",
}) {
  return fill(layoutTemplate, {
    TITLE: title,
    BODY_CLASS: bodyClass,
    CANVAS: includeWater ? '<div id="water-canvas"></div>' : "",
    CONTENT: content,
    EXTRA_SCRIPTS: extraScripts,
  });
}

function writeFile(relPath, contents) {
  const fullPath = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, contents);
}

function buildHome(timeline) {
  const timelineHtml = timeline.length
    ? timeline
        .map(
          (item) =>
            `<li><a href="${item.url}">${item.title}</a><span>${item.kind}</span></li>`
        )
        .join("\n")
    : "<li>Nothing published yet. Check back soon.</li>";

  const homeContent = fill(homeTemplate, {
    TIMELINE: timelineHtml,
  });

  const html = renderLayout({
    title: "cleggct",
    bodyClass: "home",
    includeWater: true,
    content: homeContent,
    extraScripts: '<script type="module" src="/assets/js/water.js"></script>',
  });

  writeFile("index.html", html);
}

function buildPosts(posts) {
  posts.forEach((post) => {
    const content = fill(postTemplate, {
      POST_TITLE: post.title,
      POST_DATE: formatDate(post.date),
      POST_BODY: post.body,
    });

    const html = renderLayout({
      title: `${post.title} — cleggct`,
      content,
    });

    writeFile(path.join("posts", post.slug, "index.html"), html);
  });
}

async function bundleDemo(demo) {
  const outDir = path.join(DIST, "demos", demo.slug);
  fs.mkdirSync(outDir, { recursive: true });
  const relativeImport =
    "./" + path.posix.join("demos", demo.file).replace(/\\/g, "/");
  const entryContents = `import React from "react";
import { createRoot } from "react-dom/client";
import Demo from ${JSON.stringify(relativeImport)};

const mount = document.getElementById("demo-root") || (() => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
})();

const root = createRoot(mount);
root.render(React.createElement(Demo));
`;

  await esbuild.build({
    stdin: {
      contents: entryContents,
      resolveDir: ROOT,
      sourcefile: `${demo.slug}-entry.js`,
    },
    bundle: true,
    format: "iife",
    outfile: path.join(outDir, "bundle.js"),
    loader: {
      ".js": "jsx",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    sourcemap: false,
    logLevel: "silent",
  });
}

async function buildDemos(demos) {
  await Promise.all(demos.map((demo) => bundleDemo(demo)));

  demos.forEach((demo) => {
    const html = fill(demoTemplate, {
      TITLE: `${demo.title} — Demo`,
    });
    writeFile(path.join("demos", demo.slug, "index.html"), html);
  });
}

async function build() {
  cleanDist();
  copyAssets();

  const posts = readPosts();
  const demos = readDemos();
  const timeline = [
    ...posts.map(({ title, url, date }) => ({
      title,
      url,
      date,
      kind: "Post",
    })),
    ...demos.map(({ title, url, date }) => ({
      title,
      url,
      date,
      kind: "Demo",
    })),
  ].sort((a, b) => b.date - a.date);

  buildHome(timeline);
  buildPosts(posts);
  await buildDemos(demos);
}

module.exports = build;

if (require.main === module) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
