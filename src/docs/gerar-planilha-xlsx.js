// @ts-check
/**
 * Gera a planilha pericial XLSX com todos os cálculos detalhados,
 * fórmulas visíveis e fundamentação. Destinada a uso em perícia
 * e como prova documental anexa à petição.
 *
 * Estrutura: 1 aba por módulo de cálculo + aba consolidada.
 */
import ExcelJS from "exceljs";

/**
 * @typedef {import("../calc/modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 */

/**
 * @typedef {Object} EntradaPlanilha
 * @property {ResultadoCalculo} [modulo1]
 * @property {ResultadoCalculo} [modulo2]
 * @property {ResultadoCalculo} [modulo3]
 * @property {ResultadoCalculo} [modulo4]
 * @property {import("../../tests/fixtures/caso-exemplo.js").DadosCaso} [dadosCaso]
 */

// Paleta Juliana Ramos Advocacia
const COR_AZUL = "FF003B49";
const COR_BEGE = "FFD6C4B8";
const COR_OFF = "FFFFFBF1";
// Semáforo do veredito
const COR_ABUSIVO = "FFB3261E";
const COR_REGULAR = "FF1D6B3F";
const COR_INCONCLUSIVO = "FFC98A00";

/**
 * @param {"abusivo" | "regular" | "inconclusivo"} veredito
 * @returns {string} ARGB
 */
function corVeredito(veredito) {
  if (veredito === "abusivo") return COR_ABUSIVO;
  if (veredito === "regular") return COR_REGULAR;
  return COR_INCONCLUSIVO;
}

/**
 * @param {ExcelJS.Worksheet} aba
 * @param {ResultadoCalculo} resultado
 * @param {string} tituloModulo
 */
function preencherAbaModulo(aba, resultado, tituloModulo) {
  // Título
  aba.mergeCells("A1:D1");
  const tit = aba.getCell("A1");
  tit.value = tituloModulo;
  tit.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  tit.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COR_AZUL },
  };
  tit.alignment = { vertical: "middle", horizontal: "center" };
  aba.getRow(1).height = 24;

  // Veredito
  aba.mergeCells("A2:D2");
  const ver = aba.getCell("A2");
  ver.value = `VEREDITO: ${resultado.veredito.toUpperCase()}`;
  ver.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  ver.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: corVeredito(resultado.veredito) },
  };
  ver.alignment = { vertical: "middle", horizontal: "center" };
  aba.getRow(2).height = 20;

  // Dados numéricos
  aba.addRow([]);
  aba.addRow(["Item", "Valor", "Observação"]).font = { bold: true };
  aba.getRow(4).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COR_BEGE },
  };

  for (const [chave, valor] of Object.entries(resultado.resultado)) {
    if (valor === null || typeof valor === "object") continue;
    aba.addRow([chave.replace(/_/g, " "), valor]);
  }

  // Passos
  aba.addRow([]);
  const linhaPassos = aba.addRow(["PASSOS DO CÁLCULO"]);
  linhaPassos.font = { bold: true, size: 12 };
  for (const passo of resultado.passos) {
    aba.addRow([passo.titulo]).font = { bold: true };
    aba.addRow([passo.descricao]).alignment = { wrapText: true };
    if (passo.formula) aba.addRow([`Fórmula: ${passo.formula}`]);
  }

  // Fundamentação
  aba.addRow([]);
  const linhaFund = aba.addRow(["FUNDAMENTAÇÃO LEGAL"]);
  linhaFund.font = { bold: true, size: 12 };
  for (const f of resultado.fundamentacao_legal) {
    aba.addRow([f.norma]).font = { bold: true };
    aba.addRow([f.ementa]);
    aba.addRow([`Aplicação ao caso: ${f.aplicacao_ao_caso}`]).alignment = {
      wrapText: true,
    };
    aba.addRow([]);
  }

  // Alertas
  if (resultado.alertas.length > 0) {
    aba.addRow(["ALERTAS"]).font = { bold: true, size: 12 };
    for (const a of resultado.alertas) {
      aba.addRow([`[${a.severidade.toUpperCase()}] ${a.mensagem}`]).alignment =
        { wrapText: true };
    }
  }

  aba.getColumn(1).width = 28;
  aba.getColumn(2).width = 18;
  aba.getColumn(3).width = 40;
  aba.getColumn(4).width = 14;
}

/**
 * @param {ExcelJS.Worksheet} aba
 * @param {EntradaPlanilha} entrada
 */
function preencherCapa(aba, entrada) {
  aba.mergeCells("A1:D1");
  const t = aba.getCell("A1");
  t.value =
    "JULIANA RAMOS ADVOCACIA & CONSULTORIA JURÍDICA — Análise de Reajuste de Plano de Saúde";
  t.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  t.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COR_AZUL },
  };
  t.alignment = { vertical: "middle", horizontal: "center" };
  aba.getRow(1).height = 28;

  aba.addRow([]);
  if (entrada.dadosCaso) {
    const c = entrada.dadosCaso;
    aba.addRow(["DADOS DO CASO"]).font = { bold: true, size: 12 };
    aba.addRow(["Beneficiário", c.beneficiario.nome]);
    aba.addRow(["CPF", c.beneficiario.cpf]);
    aba.addRow(["Endereço", c.beneficiario.endereco]);
    aba.addRow(["Operadora", c.operadora.razaoSocial]);
    aba.addRow(["CNPJ", c.operadora.cnpj]);
    aba.addRow(["Registro ANS", c.operadora.numeroAns]);
    aba.addRow(["Contrato", c.contrato.numero]);
    aba.addRow(["Assinatura", c.contrato.dataAssinatura]);
    aba.addRow(["Tipo", c.contrato.tipo]);
  }

  aba.addRow([]);
  aba.addRow(["MÓDULOS EXECUTADOS"]).font = { bold: true, size: 12 };
  const cabec = aba.addRow(["Módulo", "Veredito", "Excesso (R$)", "Restituição CDC"]);
  cabec.font = { bold: true };

  const linhas = [
    { id: "Módulo 1 — Reajuste anual ANS", res: entrada.modulo1 },
    { id: "Módulo 2 — Faixa etária", res: entrada.modulo2 },
    { id: "Módulo 3 — Falso coletivo", res: entrada.modulo3 },
    { id: "Módulo 4 — Sinistralidade", res: entrada.modulo4 },
  ];

  for (const { id, res } of linhas) {
    if (!res) {
      aba.addRow([id, "—", "—", "—"]);
      continue;
    }
    const linha = aba.addRow([
      id,
      res.veredito.toUpperCase(),
      res.resultado.excesso ?? "—",
      res.resultado.restituicao_cdc ?? "—",
    ]);
    linha.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: corVeredito(res.veredito) },
    };
    linha.getCell(2).font = { color: { argb: "FFFFFFFF" }, bold: true };
  }

  aba.getColumn(1).width = 36;
  aba.getColumn(2).width = 14;
  aba.getColumn(3).width = 18;
  aba.getColumn(4).width = 18;

  aba.addRow([]);
  aba.addRow(["Gerado em", new Date().toISOString().slice(0, 10)]);
  aba.addRow([
    "Disclaimer",
    "Este documento é prova técnica auditável. Não substitui parecer jurídico.",
  ]);
}

/**
 * Gera a planilha XLSX como buffer (Uint8Array).
 *
 * @param {EntradaPlanilha} entrada
 * @returns {Promise<Uint8Array>}
 */
export async function gerarPlanilhaXlsx(entrada) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Juliana Ramos Advocacia & Consultoria Jurídica";
  wb.created = new Date();
  wb.modified = new Date();

  preencherCapa(wb.addWorksheet("Resumo"), entrada);

  if (entrada.modulo1) {
    preencherAbaModulo(
      wb.addWorksheet("Módulo 1 — Anual ANS"),
      entrada.modulo1,
      "MÓDULO 1 — REAJUSTE ANUAL CONFORME ANS",
    );
  }
  if (entrada.modulo2) {
    preencherAbaModulo(
      wb.addWorksheet("Módulo 2 — Faixa Etária"),
      entrada.modulo2,
      "MÓDULO 2 — REAJUSTE POR FAIXA ETÁRIA (RN 63/2003)",
    );
  }
  if (entrada.modulo3) {
    preencherAbaModulo(
      wb.addWorksheet("Módulo 3 — Falso Coletivo"),
      entrada.modulo3,
      "MÓDULO 3 — FALSO COLETIVO (TEMA 952/1016 STJ)",
    );
  }
  if (entrada.modulo4) {
    preencherAbaModulo(
      wb.addWorksheet("Módulo 4 — Sinistralidade"),
      entrada.modulo4,
      "MÓDULO 4 — REAJUSTE POR SINISTRALIDADE",
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(/** @type {ArrayBuffer} */ (buffer));
}
