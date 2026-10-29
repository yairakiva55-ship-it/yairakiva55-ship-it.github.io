// Builds app/www from the website files in the repo root, so the app always runs the same code as the site.
// Usage: npm run build   (from the app/ folder)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, "..");
const SITE = path.resolve(APP, "..");
const OUT = path.join(APP, "www");

const FILES = [
  "index.html", "rooms.js", "admin.js", "skin.js", "bottom-nav.js", "terms-gate.js",
  "privacy.html", "data-deletion.html", "manifest.webmanifest",
  "spade-home-icon-v2.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png",
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "vendor"), { recursive: true });

for (const f of FILES) {
  const src = path.join(SITE, f);
  if (!fs.existsSync(src)) { console.warn("missing (skipped):", f); continue; }
  fs.copyFileSync(src, path.join(OUT, f));
}
fs.copyFileSync(path.join(APP, "native", "native.js"), path.join(OUT, "native.js"));

// index.html: load native.js first, drop the website's service worker (not used inside the app).
let html = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
html = html.replace(/<script>if\("serviceWorker" in navigator\)[\s\S]*?<\/script>\n?/, "");
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<script src="/native.js"></script>');
fs.writeFileSync(path.join(OUT, "index.html"), html);

// Supabase SDK bundled inside the app (works offline / without CDNs). Falls back to the CDN if this step is skipped.
try {
  const esbuild = await import("esbuild");
  await esbuild.build({
    stdin: { contents: 'export { createClient } from "@supabase/supabase-js";', resolveDir: APP, loader: "js" },
    bundle: true, format: "esm", minify: true, platform: "browser", target: "es2020",
    outfile: path.join(OUT, "vendor", "supabase.js"),
  });
  console.log("bundled vendor/supabase.js");
} catch (e) {
  console.warn("Supabase SDK not bundled (app will load it from the CDN):", e.message);
}
console.log("web build ready in", OUT);
