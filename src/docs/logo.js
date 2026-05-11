// @ts-check
/** Helper compartilhado: carrega logos e expõe dados de contato da advogada. */

/** @type {Uint8Array | null} */
let cacheBranco = null;
/** @type {Uint8Array | null} */
let cacheAzul = null;

// Resolve o caminho absoluto dos assets independentemente do ambiente.
// Em Node.js, usa fs.readFileSync. No browser, usa fetch.
const IS_NODE = typeof process !== "undefined" && process.versions?.node;

/**
 * @param {string} nomeArquivo  Ex.: "logo-azul.png"
 * @returns {Promise<Uint8Array>}
 */
async function carregarLogo(nomeArquivo) {
  if (IS_NODE) {
    try {
      const { readFileSync } = await import("node:fs");
      const { resolve, dirname } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const base = dirname(fileURLToPath(import.meta.url));
      // assets ficam em src/ui/assets/ — dois níveis acima de src/docs/
      const caminho = resolve(base, "..", "ui", "assets", nomeArquivo);
      return new Uint8Array(readFileSync(caminho));
    } catch {
      return new Uint8Array(0);
    }
  }
  // Browser: fetch relativo ao HTML (dist/)
  try {
    const res = await fetch(`./${nomeArquivo}`);
    if (!res.ok) return new Uint8Array(0);
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return new Uint8Array(0);
  }
}

/** @returns {Promise<Uint8Array>} Logo branco para fundos escuros */
export async function getLogoBrancoBytes() {
  if (!cacheBranco) cacheBranco = await carregarLogo("logo-branco.png");
  return /** @type {Uint8Array} */ (cacheBranco);
}

/** @returns {Promise<Uint8Array>} Logo azul para fundos claros */
export async function getLogoAzulBytes() {
  if (!cacheAzul) cacheAzul = await carregarLogo("logo-azul.png");
  return /** @type {Uint8Array} */ (cacheAzul);
}

/**
 * Converte Uint8Array para string base64.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export const CONTATOS = {
  nome: "Juliana Ramos Advocacia & Consultoria Jurídica",
  email: "contato@julianaramosadvocacia.com.br",
  emailUrl: "mailto:contato@julianaramosadvocacia.com.br",
  whatsapp: "+55 31 9905-6172",
  whatsappUrl: "https://wa.me/5531990056172",
  web: "julianaramosadvocacia.com.br",
  webUrl: "https://julianaramosadvocacia.com.br/home/",
  instagram: "@julianapirl",
  instagramUrl: "https://instagram.com/julianapirl",
};
