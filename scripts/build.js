// @ts-check
/**
 * Build de produção: bundla `src/ui/app.js` (e todas as suas dependências
 * — calc, docs, libs como decimal.js, docx, exceljs, pdf-lib) num único
 * arquivo ESM consumível pelo browser. Copia HTML e CSS para `dist/`.
 *
 * Saída: dist/index.html, dist/app.js, dist/styles.css, dist/build-info.json
 */
import { build } from "esbuild";
import {
  mkdirSync,
  cpSync,
  existsSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Bundle do app (ESM)
const result = await build({
  entryPoints: [resolve(root, "src", "ui", "app.js")],
  bundle: true,
  format: "esm",
  outfile: resolve(dist, "app.js"),
  loader: { ".json": "json" },
  target: ["es2022"],
  platform: "browser",
  define: {
    "process.env.NODE_ENV": '"production"',
    global: "globalThis",
  },
  minify: true,
  sourcemap: false,
  logLevel: "info",
  metafile: true,
});

// Copia HTML, CSS e assets da marca
cpSync(resolve(root, "index.html"), resolve(dist, "index.html"));
cpSync(resolve(root, "src", "ui", "styles.css"), resolve(dist, "styles.css"));
cpSync(
  resolve(root, "src", "ui", "assets", "logo-branco.png"),
  resolve(dist, "logo-branco.png"),
);
cpSync(
  resolve(root, "src", "ui", "assets", "logo-azul.png"),
  resolve(dist, "logo-azul.png"),
);
cpSync(
  resolve(root, "src", "ui", "assets", "logo-preto.png"),
  resolve(dist, "logo-preto.png"),
);

// Build info para auditoria
writeFileSync(
  resolve(dist, "build-info.json"),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      bundleSize: result.metafile?.outputs[
        "dist/app.js".replace(/\\/g, "/")
      ]?.bytes,
    },
    null,
    2,
  ),
);

console.log("\n✓ Build concluído em", dist);
