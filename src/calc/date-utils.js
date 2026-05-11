// @ts-check
/**
 * Utilitários de manipulação de datas em formato ISO.
 *
 * Princípio: NUNCA usar `new Date()` para aritmética. Strings ISO
 * (YYYY-MM e YYYY-MM-DD) permitem comparação lexicográfica e aritmética
 * via decomposição inteira, sem fuso horário e sem armadilhas de
 * `new Date("2024-05")` (que em BRT cai em abril/2024).
 *
 * Toda função aqui é pura e determinística.
 */

const RE_MES_ISO = /^(\d{4})-(0[1-9]|1[0-2])$/;
const RE_DATA_ISO = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * @param {number} ano
 * @returns {boolean}
 */
function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** @type {readonly number[]} */
const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * @param {number} ano
 * @param {number} mes 1-12
 */
function diasNoMes(ano, mes) {
  if (mes === 2 && ehBissexto(ano)) return 29;
  return DIAS_POR_MES[mes - 1];
}

/**
 * Lança se o argumento não estiver no formato YYYY-MM válido.
 * @param {unknown} mes
 * @returns {asserts mes is string}
 */
export function validarMesIso(mes) {
  if (typeof mes !== "string" || !RE_MES_ISO.test(mes)) {
    throw new TypeError(
      `Mês ISO inválido: esperado "YYYY-MM", recebido ${JSON.stringify(mes)}.`,
    );
  }
}

/**
 * Lança se a string não for uma data YYYY-MM-DD válida (inclui validação de bissexto).
 * @param {unknown} data
 * @returns {asserts data is string}
 */
export function validarDataIso(data) {
  if (typeof data !== "string") {
    throw new TypeError(
      `Data ISO inválida: esperado "YYYY-MM-DD", recebido ${JSON.stringify(data)}.`,
    );
  }
  const m = RE_DATA_ISO.exec(data);
  if (!m) {
    throw new TypeError(
      `Data ISO inválida: esperado "YYYY-MM-DD", recebido "${data}".`,
    );
  }
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (dia > diasNoMes(ano, mes)) {
    throw new RangeError(
      `Data ISO inexistente no calendário: "${data}" (mês ${mes} de ${ano} tem ${diasNoMes(
        ano,
        mes,
      )} dias).`,
    );
  }
}

/**
 * Verifica se `mes` (YYYY-MM) está contido no intervalo `[inicio, fim]`, inclusivo nas duas pontas.
 * Comparação puramente lexicográfica — só funciona porque o formato é YYYY-MM (zero-pad obrigatório).
 *
 * @param {string} mes
 * @param {string} inicio
 * @param {string} fim
 * @returns {boolean}
 */
export function mesEstaNoCiclo(mes, inicio, fim) {
  validarMesIso(mes);
  validarMesIso(inicio);
  validarMesIso(fim);
  return mes >= inicio && mes <= fim;
}

/**
 * Soma `n` meses ao mês ISO informado. Suporta valores negativos.
 *
 * @param {string} mes
 * @param {number} n
 * @returns {string}
 */
export function somarMeses(mes, n) {
  validarMesIso(mes);
  if (!Number.isInteger(n)) {
    throw new TypeError(`Número de meses deve ser inteiro, recebido ${n}.`);
  }
  const [anoStr, mesStr] = mes.split("-");
  const total = Number(anoStr) * 12 + (Number(mesStr) - 1) + n;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${String(novoAno).padStart(4, "0")}-${String(novoMes).padStart(2, "0")}`;
}

/**
 * Retorna a idade em anos completos entre `dataNascimento` e `dataReferencia`.
 * Para nascidos em 29/Fev, considera que completam idade em 01/Mar nos anos não bissextos.
 *
 * @param {string} dataNascimento
 * @param {string} dataReferencia
 * @returns {number}
 */
export function idadeEm(dataNascimento, dataReferencia) {
  validarDataIso(dataNascimento);
  validarDataIso(dataReferencia);

  if (dataReferencia < dataNascimento) {
    throw new RangeError(
      `Data de referência (${dataReferencia}) é anterior à data de nascimento (${dataNascimento}).`,
    );
  }

  const [anoN, mesN, diaN] = dataNascimento.split("-").map(Number);
  const [anoR, mesR, diaR] = dataReferencia.split("-").map(Number);

  let idade = anoR - anoN;
  const aindaNaoAniversariou =
    mesR < mesN || (mesR === mesN && diaR < diaN);
  if (aindaNaoAniversariou) idade -= 1;
  return idade;
}

/**
 * Para uma data de assinatura YYYY-MM-DD, devolve o YYYY-MM correspondente
 * ao aniversário do contrato no ano informado.
 *
 * @param {string} dataAssinatura
 * @param {number} anoAlvo
 * @returns {string}
 */
export function aniversarioContratoEm(dataAssinatura, anoAlvo) {
  validarDataIso(dataAssinatura);
  if (!Number.isInteger(anoAlvo) || anoAlvo < 1900 || anoAlvo > 2200) {
    throw new RangeError(`Ano alvo fora do intervalo razoável: ${anoAlvo}.`);
  }
  const mes = dataAssinatura.slice(5, 7);
  return `${String(anoAlvo).padStart(4, "0")}-${mes}`;
}

/**
 * @typedef {Object} CicloAns
 * @property {string} inicio
 * @property {string} fim
 * @property {number} percentual
 * @property {string} ato_normativo
 * @property {string | null} [observacao]
 */

/**
 * Encontra o ciclo ANS cujo intervalo `[inicio, fim]` contém o mês informado.
 *
 * @param {string} mes
 * @param {readonly CicloAns[]} ciclos
 * @returns {CicloAns | null}
 */
export function encontrarCicloAns(mes, ciclos) {
  validarMesIso(mes);
  for (const c of ciclos) {
    if (mesEstaNoCiclo(mes, c.inicio, c.fim)) return c;
  }
  return null;
}
