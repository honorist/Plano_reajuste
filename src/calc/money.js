// @ts-check
/**
 * Operações monetárias com precisão decimal exata.
 *
 * Princípio: zero uso de `+ - * /` em valores monetários. Toda operação
 * passa por `decimal.js`, e o resultado é retornado como string com 2
 * casas (o padrão monetário brasileiro). Isso garante que o valor que
 * vai para a petição inicial é exatamente o valor calculado, sem perda
 * por float64.
 */
import Decimal from "decimal.js";

Decimal.set({
  precision: 30,
  rounding: Decimal.ROUND_HALF_UP,
});

/** @typedef {string | number | Decimal} ValorMonetario */

/**
 * Fábrica utilitária — converte qualquer entrada em `Decimal` validando o tipo.
 * @param {ValorMonetario} v
 * @returns {Decimal}
 */
export function paraDecimal(v) {
  if (v instanceof Decimal) return v;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      throw new TypeError(`Valor numérico inválido: ${v}.`);
    }
    return new Decimal(v);
  }
  if (typeof v === "string") {
    const limpo = v.trim().replace(",", ".");
    try {
      return new Decimal(limpo);
    } catch {
      throw new TypeError(`String monetária inválida: "${v}".`);
    }
  }
  throw new TypeError(
    `Tipo monetário inválido: ${typeof v}. Esperado string, number ou Decimal.`,
  );
}

/**
 * @param {Decimal} d
 * @returns {string}
 */
function comDuasCasas(d) {
  return d.toFixed(2, Decimal.ROUND_HALF_UP);
}

/**
 * @param {ValorMonetario} a
 * @param {ValorMonetario} b
 * @returns {string}
 */
export function somar(a, b) {
  return comDuasCasas(paraDecimal(a).plus(paraDecimal(b)));
}

/**
 * @param {ValorMonetario} a
 * @param {ValorMonetario} b
 * @returns {string}
 */
export function subtrair(a, b) {
  return comDuasCasas(paraDecimal(a).minus(paraDecimal(b)));
}

/**
 * Aplica um percentual sobre um valor.
 * Exemplo: aplicarPercentual(1000, 6.06) → "1060.60".
 *
 * @param {ValorMonetario} valor
 * @param {number} percentual em pontos percentuais (6.06 representa 6,06%)
 * @returns {string}
 */
export function aplicarPercentual(valor, percentual) {
  if (!Number.isFinite(percentual)) {
    throw new TypeError(`Percentual inválido: ${percentual}.`);
  }
  const v = paraDecimal(valor);
  const fator = new Decimal(1).plus(new Decimal(percentual).div(100));
  return comDuasCasas(v.times(fator));
}

/**
 * Calcula o valor pago em excesso: max(0, aplicado - teto).
 * Nunca retorna valor negativo — usuário pagou a maior ou não pagou nada a maior.
 *
 * @param {ValorMonetario} aplicado
 * @param {ValorMonetario} teto
 * @returns {string}
 */
export function excesso(aplicado, teto) {
  const diff = paraDecimal(aplicado).minus(paraDecimal(teto));
  return diff.greaterThan(0) ? comDuasCasas(diff) : "0.00";
}

/**
 * Repetição em dobro do art. 42, § único, do CDC: valor cobrado a maior
 * multiplicado por 2, salvo "engano justificável".
 *
 * @param {ValorMonetario} valorPagoEmExcesso
 * @returns {string}
 */
export function dobroCdc(valorPagoEmExcesso) {
  return comDuasCasas(paraDecimal(valorPagoEmExcesso).times(2));
}

const FORMATADOR_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formata um valor monetário no padrão brasileiro: "R$ 1.234,56".
 *
 * @param {ValorMonetario} valor
 * @returns {string}
 */
export function formatarBRL(valor) {
  return FORMATADOR_BRL.format(paraDecimal(valor).toNumber())
    .replace(/ /g, " ") // troca NBSP por espaço comum (mais portável)
    .trim();
}

/**
 * @param {ValorMonetario} a
 * @param {ValorMonetario} b
 * @returns {boolean}
 */
export function ehMaior(a, b) {
  return paraDecimal(a).greaterThan(paraDecimal(b));
}

/**
 * @param {ValorMonetario} a
 * @param {ValorMonetario} b
 * @returns {boolean}
 */
export function ehMaiorOuIgual(a, b) {
  return paraDecimal(a).greaterThanOrEqualTo(paraDecimal(b));
}

/**
 * @param {ValorMonetario} a
 * @param {ValorMonetario} b
 * @returns {boolean}
 */
export function saoIguais(a, b) {
  return paraDecimal(a).equals(paraDecimal(b));
}
