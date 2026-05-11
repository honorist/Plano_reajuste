// @ts-check
/**
 * Máscaras automáticas para campos de formulário brasileiros.
 *
 * Cada função recebe uma string (valor cru, com ou sem máscara já aplicada)
 * e devolve a versão formatada conforme o padrão brasileiro. Funções são
 * puras e não tocam no DOM — quem aplica é `aplicarMascara`.
 */

/**
 * @param {string} v
 * @returns {string}
 */
function soDigitos(v) {
  return String(v ?? "").replace(/\D/g, "");
}

/**
 * CPF: 000.000.000-00
 * @param {string} v
 */
export function mascaraCpf(v) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * CNPJ: 00.000.000/0000-00
 * @param {string} v
 */
export function mascaraCnpj(v) {
  const d = soDigitos(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * CEP: 00000-000
 * @param {string} v
 */
export function mascaraCep(v) {
  const d = soDigitos(v).slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

/**
 * Registro ANS: 6 dígitos + traço + dígito verificador (000000-0)
 * @param {string} v
 */
export function mascaraAns(v) {
  const d = soDigitos(v).slice(0, 7);
  return d.replace(/(\d{6})(\d{1,1})$/, "$1-$2");
}

/**
 * Moeda brasileira: R$ 000.000.000,00
 * Aceita a entrada do usuário tanto em centavos puros ("12345" → "R$ 123,45")
 * quanto em valor já parcialmente digitado ("123,45" → "R$ 123,45").
 *
 * @param {string} v
 */
export function mascaraMoeda(v) {
  const d = soDigitos(v);
  if (!d) return "";
  // interpreta os dígitos como centavos
  const centavos = parseInt(d, 10);
  const reais = Math.floor(centavos / 100);
  const restoCent = (centavos % 100).toString().padStart(2, "0");
  const reaisFormatado = reais
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${reaisFormatado},${restoCent}`;
}

/**
 * Converte uma string formatada como moeda BRL em número.
 * "R$ 1.234,56" → 1234.56
 * "1234.56"     → 1234.56
 * ""             → 0
 *
 * @param {string | null | undefined} v
 * @returns {number}
 */
export function desformatarMoeda(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  // Se a string tem vírgula (formato BR), trata a vírgula como separador decimal
  if (/,/.test(s)) {
    const limpa = s.replace(/[^\d,]/g, "").replace(",", ".");
    return Number(limpa) || 0;
  }
  // Caso contrário, número simples (1234.56 ou 1234)
  return Number(s.replace(/[^\d.-]/g, "")) || 0;
}

/**
 * Anexa um listener `input` ao elemento que aplica a máscara enquanto o
 * usuário digita, preservando a posição razoável do cursor.
 *
 * @param {HTMLInputElement | null} input
 * @param {(v: string) => string} mascara
 */
export function aplicarMascara(input, mascara) {
  if (!input) return;
  input.addEventListener("input", (ev) => {
    const target = /** @type {HTMLInputElement} */ (ev.target);
    const cursor = target.selectionStart ?? target.value.length;
    const antes = target.value.length;
    const novo = mascara(target.value);
    target.value = novo;
    const depois = novo.length;
    // Reposiciona o cursor: se o usuário estava no fim, mantém no fim;
    // caso contrário, ajusta pela diferença de comprimento.
    const novaPos = cursor + (depois - antes);
    target.setSelectionRange(novaPos, novaPos);
  });
  // aplica imediatamente caso já haja valor (autofill, paste)
  if (input.value) input.value = mascara(input.value);
}
