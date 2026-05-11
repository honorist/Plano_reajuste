// @ts-check
/** Helper compartilhado: carrega logos e expõe dados de contato da advogada. */

/** @type {Uint8Array | null} */
let cacheBranco = null;
/** @type {Uint8Array | null} */
let cacheAzul = null;

/**
 * @param {string} caminho
 * @returns {Promise<Uint8Array>}
 */
async function fetchBytes(caminho) {
  try {
    const res = await fetch(caminho);
    if (!res.ok) return new Uint8Array(0);
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return new Uint8Array(0);
  }
}

/** @returns {Promise<Uint8Array>} Logo branco para fundos escuros */
export async function getLogoBrancoBytes() {
  if (!cacheBranco) cacheBranco = await fetchBytes('./logo-branco.png');
  return /** @type {Uint8Array} */ (cacheBranco);
}

/** @returns {Promise<Uint8Array>} Logo azul para fundos claros */
export async function getLogoAzulBytes() {
  if (!cacheAzul) cacheAzul = await fetchBytes('./logo-azul.png');
  return /** @type {Uint8Array} */ (cacheAzul);
}

/**
 * Converte Uint8Array para string base64.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export const CONTATOS = {
  nome: 'Juliana Ramos Advocacia & Consultoria Jurídica',
  email: 'contato@julianaramosadvocacia.com.br',
  emailUrl: 'mailto:contato@julianaramosadvocacia.com.br',
  whatsapp: '+55 31 9905-6172',
  whatsappUrl: 'https://wa.me/5531990056172',
  web: 'julianaramosadvocacia.com.br',
  webUrl: 'https://julianaramosadvocacia.com.br/home/',
  instagram: '@julianapirl',
  instagramUrl: 'https://instagram.com/julianapirl',
};
