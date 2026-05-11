// @ts-check
/**
 * Gera o relatório técnico DOCX com fundamentação jurídica completa.
 * Destinado a ser anexado em juízo como prova técnica e a embasar a
 * petição inicial.
 *
 * Estilo: formal, com cabeçalhos numerados, citação de leis e
 * jurisprudência. Sem cores chamativas — preto sobre branco.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ImageRun,
  ExternalHyperlink,
  UnderlineType,
} from "docx";
import { getLogoAzulBytes, CONTATOS } from "./logo.js";

/**
 * @typedef {import("../calc/modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 * @typedef {import("../../tests/fixtures/caso-exemplo.js").DadosCaso} DadosCaso
 */

/**
 * @typedef {Object} EntradaRelatorio
 * @property {DadosCaso} dadosCaso
 * @property {ResultadoCalculo} [modulo1]
 * @property {ResultadoCalculo} [modulo2]
 * @property {ResultadoCalculo} [modulo3]
 * @property {ResultadoCalculo} [modulo4]
 */

/**
 * @param {string} texto
 * @param {{ bold?: boolean, italics?: boolean, size?: number }} [opts]
 */
function txt(texto, opts = {}) {
  return new TextRun({
    text: texto,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size,
    font: "Calibri",
  });
}

/**
 * @param {string} texto
 * @param {{ bold?: boolean, italics?: boolean, espacoDepois?: number, alinhamento?: typeof AlignmentType[keyof typeof AlignmentType] }} [opts]
 */
function paragrafo(texto, opts = {}) {
  return new Paragraph({
    children: [txt(texto, { bold: opts.bold, italics: opts.italics, size: 22 })],
    spacing: { after: opts.espacoDepois ?? 120, line: 320 },
    alignment: opts.alinhamento ?? AlignmentType.JUSTIFIED,
  });
}

/**
 * @param {string} texto
 * @param {1 | 2 | 3} nivel
 */
function titulo(texto, nivel) {
  const sizes = { 1: 32, 2: 28, 3: 24 };
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };
  return new Paragraph({
    children: [txt(texto, { bold: true, size: sizes[nivel] })],
    heading: headingMap[nivel],
    spacing: { before: 320, after: 160 },
  });
}

/**
 * @param {string} prefixo
 * @param {string} valor
 */
function linhaDado(prefixo, valor) {
  return new Paragraph({
    children: [txt(prefixo + ": ", { bold: true, size: 22 }), txt(valor, { size: 22 })],
    spacing: { after: 80 },
  });
}

/**
 * @param {ResultadoCalculo} resultado
 * @param {string} tituloModulo
 * @returns {Paragraph[]}
 */
function blocoModulo(resultado, tituloModulo) {
  /** @type {Paragraph[]} */
  const out = [];
  out.push(titulo(tituloModulo, 2));

  out.push(
    new Paragraph({
      children: [
        txt("Veredito: ", { bold: true, size: 24 }),
        txt(resultado.veredito.toUpperCase(), { bold: true, size: 24 }),
      ],
      spacing: { after: 200 },
    }),
  );

  out.push(paragrafo(resultado.resumo_tecnico));

  out.push(titulo("Passos do cálculo", 3));
  for (const p of resultado.passos) {
    out.push(paragrafo(p.titulo, { bold: true, espacoDepois: 60 }));
    out.push(paragrafo(p.descricao));
    if (p.formula) {
      out.push(
        new Paragraph({
          children: [txt(p.formula, { italics: true, size: 20 })],
          indent: { left: 720 },
          spacing: { after: 80 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 8,
              color: "003B49",
              space: 8,
            },
          },
        }),
      );
    }
  }

  out.push(titulo("Fundamentação legal", 3));
  for (const f of resultado.fundamentacao_legal) {
    out.push(paragrafo(f.norma, { bold: true, espacoDepois: 60 }));
    out.push(paragrafo(f.ementa, { italics: true }));
    out.push(paragrafo(`Aplicação ao caso: ${f.aplicacao_ao_caso}`));
  }

  if (resultado.alertas.length > 0) {
    out.push(titulo("Alertas", 3));
    for (const a of resultado.alertas) {
      out.push(paragrafo(`[${a.severidade.toUpperCase()}] ${a.mensagem}`));
    }
  }

  return out;
}

/**
 * @param {EntradaRelatorio} entrada
 * @returns {Promise<Uint8Array>}
 */
export async function gerarRelatorioDocx(entrada) {
  const c = entrada.dadosCaso;

  /** @type {Paragraph[]} */
  const corpo = [];

  // ── Cabeçalho visual: banner logo (fundo azul) + contatos ──────────────
  const logoBytes = await getLogoAzulBytes();

  if (logoBytes.length > 0) {
    corpo.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: logoBytes,
            transformation: { width: 600, height: 338 },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
      }),
    );
  } else {
    corpo.push(
      new Paragraph({
        children: [new TextRun({ text: "JULIANA RAMOS", bold: true, size: 32, color: "003B49", font: "Calibri" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      }),
    );
    corpo.push(
      new Paragraph({
        children: [new TextRun({ text: "ADVOCACIA & CONSULTORIA JURÍDICA", size: 18, color: "003B49", font: "Calibri", characterSpacing: 60 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
    );
  }

  /** @param {string} text @param {string} url */
  const linkRun = (text, url) =>
    new ExternalHyperlink({
      link: url,
      children: [new TextRun({ text, color: "0563C1", underline: { type: UnderlineType.SINGLE }, font: "Calibri", size: 17 })],
    });

  corpo.push(
    new Paragraph({
      children: [
        new TextRun({ text: "✉ ", font: "Segoe UI Symbol", size: 17, color: "003B49" }),
        linkRun(CONTATOS.email, CONTATOS.emailUrl),
        new TextRun({ text: "   |   ", font: "Calibri", size: 17, color: "999999" }),
        new TextRun({ text: "📱 ", font: "Segoe UI Symbol", size: 17, color: "003B49" }),
        linkRun(CONTATOS.whatsapp, CONTATOS.whatsappUrl),
        new TextRun({ text: "   |   ", font: "Calibri", size: 17, color: "999999" }),
        new TextRun({ text: "🌐 ", font: "Segoe UI Symbol", size: 17, color: "003B49" }),
        linkRun(CONTATOS.web, CONTATOS.webUrl),
        new TextRun({ text: "   |   ", font: "Calibri", size: 17, color: "999999" }),
        new TextRun({ text: "📷 ", font: "Segoe UI Symbol", size: 17, color: "003B49" }),
        linkRun(CONTATOS.instagram, CONTATOS.instagramUrl),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D6C4B8", space: 10 } },
    }),
  );
  corpo.push(
    new Paragraph({
      children: [
        txt("RELATÓRIO TÉCNICO DE ANÁLISE DE REAJUSTE — PLANO DE SAÚDE", {
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
    }),
  );
  corpo.push(
    new Paragraph({
      children: [
        txt(
          "Documento gerado de modo determinístico com base na metodologia oficial da ANS e na jurisprudência consolidada do STJ e STF. Destinado a uso como prova técnica auditável.",
          { italics: true, size: 20 },
        ),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
    }),
  );

  // Identificação
  corpo.push(titulo("1. Identificação", 1));
  corpo.push(linhaDado("Beneficiário", c.beneficiario.nome));
  corpo.push(linhaDado("CPF", c.beneficiario.cpf));
  corpo.push(linhaDado("Endereço", c.beneficiario.endereco));
  corpo.push(linhaDado("Data de nascimento", c.beneficiario.dataNascimento));
  corpo.push(linhaDado("Operadora", c.operadora.razaoSocial));
  corpo.push(linhaDado("CNPJ", c.operadora.cnpj));
  corpo.push(linhaDado("Registro ANS", c.operadora.numeroAns));
  corpo.push(linhaDado("Contrato nº", c.contrato.numero));
  corpo.push(linhaDado("Data de assinatura", c.contrato.dataAssinatura));
  corpo.push(linhaDado("Modalidade", c.contrato.tipo));

  // Conclusão consolidada
  corpo.push(titulo("2. Conclusão consolidada", 1));
  /** @type {{nome: string, res: ResultadoCalculo | undefined}[]} */
  const linhas = [
    { nome: "Reajuste anual ANS (Módulo 1)", res: entrada.modulo1 },
    { nome: "Faixa etária (Módulo 2)", res: entrada.modulo2 },
    { nome: "Falso coletivo (Módulo 3)", res: entrada.modulo3 },
    { nome: "Sinistralidade (Módulo 4)", res: entrada.modulo4 },
  ];
  for (const l of linhas) {
    corpo.push(
      paragrafo(
        `${l.nome}: ${l.res ? l.res.veredito.toUpperCase() : "NÃO ANALISADO"}`,
        { bold: true },
      ),
    );
    if (l.res) corpo.push(paragrafo(l.res.resumo_tecnico));
  }

  // Detalhamento por módulo
  corpo.push(titulo("3. Detalhamento técnico por módulo", 1));
  if (entrada.modulo1)
    corpo.push(...blocoModulo(entrada.modulo1, "3.1. Módulo 1 — Reajuste anual ANS"));
  if (entrada.modulo2)
    corpo.push(...blocoModulo(entrada.modulo2, "3.2. Módulo 2 — Faixa etária (RN 63/2003)"));
  if (entrada.modulo3)
    corpo.push(...blocoModulo(entrada.modulo3, "3.3. Módulo 3 — Falso coletivo"));
  if (entrada.modulo4)
    corpo.push(...blocoModulo(entrada.modulo4, "3.4. Módulo 4 — Sinistralidade"));

  // Disclaimer
  corpo.push(titulo("4. Considerações finais", 1));
  corpo.push(
    paragrafo(
      "Este relatório foi produzido automaticamente com base em dados informados e regras públicas (ANS, STJ, STF). Os cálculos seguem precisão decimal exata e estão sujeitos a auditoria. A configuração concreta de abusividade depende de avaliação jurídica pelo(a) advogado(a) responsável.",
      { italics: true },
    ),
  );
  corpo.push(linhaDado("Gerado em", new Date().toISOString().slice(0, 10)));

  const doc = new Document({
    creator: "Juliana Ramos Advocacia & Consultoria Jurídica",
    description: "Relatório técnico de análise de reajuste de plano de saúde",
    title: "Relatório técnico — Reajuste ANS — Juliana Ramos Advocacia",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: corpo,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}
