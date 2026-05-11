// @ts-check
/**
 * Gera o resumo executivo PDF de 1 página, destinado ao próprio
 * beneficiário (consumidor leigo). Linguagem direta, semáforo de
 * cores e indicação clara dos próximos passos.
 */
import { PDFDocument, StandardFonts, rgb, PDFString, PDFName } from "pdf-lib";
import { formatarBRL } from "../calc/money.js";
import { getLogoBrancoBytes, CONTATOS } from "./logo.js";

/**
 * @typedef {import("../calc/modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 * @typedef {import("../../tests/fixtures/caso-exemplo.js").DadosCaso} DadosCaso
 */

/**
 * @typedef {Object} EntradaResumoPdf
 * @property {DadosCaso} dadosCaso
 * @property {ResultadoCalculo} [modulo1]
 * @property {ResultadoCalculo} [modulo2]
 * @property {ResultadoCalculo} [modulo3]
 * @property {ResultadoCalculo} [modulo4]
 */

// Paleta oficial Juliana Ramos Advocacia
const COR_AZUL = rgb(0, 0.231, 0.286); // #003B49
const COR_BEGE = rgb(0.839, 0.769, 0.722); // #D6C4B8
const COR_OFF = rgb(1, 0.984, 0.945); // #FFFBF1
// Cores semânticas (semáforo)
const COR_ABUSIVO = rgb(0.702, 0.149, 0.118); // #B3261E
const COR_REGULAR = rgb(0.114, 0.42, 0.247); // #1D6B3F
const COR_INCONCLUSIVO = rgb(0.788, 0.541, 0.0); // #C98A00
const COR_PRETO = rgb(0.109, 0.094, 0.09); // #1C1917
const COR_CINZA = rgb(0.341, 0.325, 0.302); // #57534E

/**
 * @param {"abusivo" | "regular" | "inconclusivo"} v
 */
function corVeredito(v) {
  if (v === "abusivo") return COR_ABUSIVO;
  if (v === "regular") return COR_REGULAR;
  return COR_INCONCLUSIVO;
}

/**
 * Adiciona annotation de link clicável a uma área da página.
 * @param {PDFDocument} pdf
 * @param {import('pdf-lib').PDFPage} page
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {string} url
 */
function adicionarLink(pdf, page, x1, y1, x2, y2, url) {
  const linkDict = pdf.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: pdf.context.obj([x1, y1, x2, y2]),
    Border: pdf.context.obj([0, 0, 0]),
    A: pdf.context.obj({
      Type: PDFName.of('Action'),
      S: PDFName.of('URI'),
      URI: PDFString.of(url),
    }),
  });
  page.node.addAnnot(pdf.context.register(linkDict));
}

/**
 * @param {EntradaResumoPdf} entrada
 * @returns {Promise<Uint8Array>}
 */
export async function gerarResumoPdf(entrada) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 em pontos
  const { width, height } = page.getSize();

  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const M = 40; // margem esquerda

  // ── Cabeçalho azul institucional ────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: COR_AZUL });
  page.drawRectangle({ x: 0, y: height - 104, width, height: 4, color: COR_BEGE });

  // Logo branco no cabeçalho
  const logoBytes = await getLogoBrancoBytes();
  let logoLargura = 0;
  if (logoBytes.length > 0) {
    try {
      const img = await pdf.embedPng(logoBytes);
      const alturaAlvo = 62;
      const escala = alturaAlvo / img.height;
      logoLargura = img.width * escala;
      page.drawImage(img, {
        x: M,
        y: height - 20 - alturaAlvo,
        width: logoLargura,
        height: alturaAlvo,
      });
    } catch {
      logoLargura = 0;
    }
  }

  // Textos do cabeçalho (à direita do logo)
  const textX = logoBytes.length > 0 && logoLargura > 0 ? M + logoLargura + 14 : M;
  page.drawText("JULIANA RAMOS", { x: textX, y: height - 32, size: 14, font: fontBold, color: COR_OFF });
  page.drawText("ADVOCACIA & CONSULTORIA JURÍDICA", { x: textX, y: height - 48, size: 8, font: fontReg, color: COR_BEGE });
  page.drawText("ANÁLISE DE REAJUSTE DE PLANO DE SAÚDE", { x: textX, y: height - 72, size: 11, font: fontBold, color: COR_OFF });
  page.drawText("Conformidade com ANS · STJ · STF", { x: textX, y: height - 86, size: 8, font: fontReg, color: COR_BEGE });

  // ── Faixa de contatos clicáveis ─────────────────────────────────────────
  const CONTATO_H = 26;
  const CONTATO_Y = height - 104 - CONTATO_H;
  page.drawRectangle({ x: 0, y: CONTATO_Y, width, height: CONTATO_H, color: rgb(0.965, 0.941, 0.922) });

  const itensContato = [
    { label: 'contato@julianaramosadvocacia.com.br', url: CONTATOS.emailUrl },
    { label: '+55 31 9905-6172 (WhatsApp)', url: CONTATOS.whatsappUrl },
    { label: 'julianaramosadvocacia.com.br', url: CONTATOS.webUrl },
    { label: '@julianapirl (Instagram)', url: CONTATOS.instagramUrl },
  ];
  const colW = (width - 2 * M) / itensContato.length;
  const ctY = CONTATO_Y + 9;
  for (let i = 0; i < itensContato.length; i++) {
    const cx = M + i * colW;
    const item = itensContato[i];
    page.drawText(item.label, { x: cx, y: ctY, size: 7.5, font: fontReg, color: COR_AZUL });
    const tw = fontReg.widthOfTextAtSize(item.label, 7.5);
    adicionarLink(pdf, page, cx, ctY - 2, cx + tw, ctY + 9, item.url);
  }

  let y = height - 104 - CONTATO_H - 18;

  // Dados do beneficiário
  page.drawText("BENEFICIÁRIO", {
    x: M,
    y,
    size: 9,
    font: fontBold,
    color: COR_CINZA,
  });
  y -= 14;
  page.drawText(entrada.dadosCaso.beneficiario.nome, {
    x: M,
    y,
    size: 12,
    font: fontBold,
    color: COR_PRETO,
  });
  y -= 14;
  page.drawText(
    `Operadora: ${entrada.dadosCaso.operadora.razaoSocial} — Contrato ${entrada.dadosCaso.contrato.numero}`,
    { x: M, y, size: 10, font: fontReg, color: COR_PRETO },
  );
  y -= 22;

  // Veredito principal (priorizar Módulo 1)
  const principal = entrada.modulo1 ?? entrada.modulo2 ?? entrada.modulo3 ?? entrada.modulo4;
  if (principal) {
    const cor = corVeredito(principal.veredito);
    page.drawRectangle({
      x: M,
      y: y - 60,
      width: width - 2 * M,
      height: 60,
      color: cor,
    });
    page.drawText(principal.veredito.toUpperCase(), {
      x: M + 16,
      y: y - 26,
      size: 22,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Resultado da análise principal", {
      x: M + 16,
      y: y - 48,
      size: 10,
      font: fontReg,
      color: rgb(1, 1, 1),
    });
    y -= 80;
  }

  // Resumo leigo
  if (principal) {
    page.drawText("O QUE ISSO SIGNIFICA", {
      x: M,
      y,
      size: 9,
      font: fontBold,
      color: COR_CINZA,
    });
    y -= 14;
    const linhas = quebrarLinhas(principal.resumo_leigo, 85);
    for (const l of linhas) {
      page.drawText(l, {
        x: M,
        y,
        size: 10,
        font: fontReg,
        color: COR_PRETO,
      });
      y -= 14;
    }
    y -= 8;
  }

  // Indicadores numéricos
  if (
    entrada.modulo1?.veredito === "abusivo" &&
    entrada.modulo1.resultado.excesso
  ) {
    page.drawText("INDICADORES (MÓDULO 1)", {
      x: M,
      y,
      size: 9,
      font: fontBold,
      color: COR_CINZA,
    });
    y -= 16;
    const linhas = [
      `Reajuste aplicado: ${entrada.modulo1.resultado.percentual_aplicado}% — Teto ANS: ${entrada.modulo1.resultado.percentual_teto}%`,
      `Mensalidade anterior: ${formatarBRL(String(entrada.modulo1.resultado.anterior))} -> cobrada: ${formatarBRL(String(entrada.modulo1.resultado.aplicado))}`,
      `Valor cobrado a mais por mês: ${formatarBRL(String(entrada.modulo1.resultado.excesso))}`,
      `Restituição em dobro (CDC art. 42): ${formatarBRL(String(entrada.modulo1.resultado.restituicao_cdc))}`,
    ];
    for (const l of linhas) {
      page.drawText(l, {
        x: M,
        y,
        size: 10,
        font: fontReg,
        color: COR_PRETO,
      });
      y -= 14;
    }
    y -= 8;
  }

  // Alertas
  const todosAlertas = [
    ...(entrada.modulo1?.alertas ?? []),
    ...(entrada.modulo2?.alertas ?? []),
    ...(entrada.modulo3?.alertas ?? []),
    ...(entrada.modulo4?.alertas ?? []),
  ];
  if (todosAlertas.length > 0) {
    page.drawText("ALERTAS", {
      x: M,
      y,
      size: 9,
      font: fontBold,
      color: COR_CINZA,
    });
    y -= 14;
    for (const a of todosAlertas.slice(0, 3)) {
      const linhas = quebrarLinhas(
        `[${a.severidade.toUpperCase()}] ${a.mensagem}`,
        90,
      );
      for (const l of linhas) {
        page.drawText(l, {
          x: M,
          y,
          size: 9,
          font: fontItalic,
          color: COR_CINZA,
        });
        y -= 12;
      }
    }
    y -= 6;
  }

  // Próximos passos
  page.drawRectangle({
    x: M,
    y: 110,
    width: width - 2 * M,
    height: 70,
    borderColor: COR_AZUL,
    borderWidth: 1.5,
  });
  page.drawText("PRÓXIMOS PASSOS", {
    x: M + 12,
    y: 162,
    size: 10,
    font: fontBold,
    color: COR_AZUL,
  });
  const passos = [
    "1. Procure um(a) advogado(a) com experiência em planos de saúde.",
    "2. Reúna boletos dos últimos 5 anos e o contrato original.",
    "3. Leve este resumo, o relatório técnico e a planilha em anexo.",
  ];
  let yp = 146;
  for (const p of passos) {
    page.drawText(p, {
      x: M + 12,
      y: yp,
      size: 10,
      font: fontReg,
      color: COR_PRETO,
    });
    yp -= 13;
  }

  // Rodapé com disclaimer
  page.drawText(
    "Documento informativo. NÃO substitui consultoria jurídica. Dados não trafegam por servidor (LGPD).",
    {
      x: M,
      y: 32,
      size: 8,
      font: fontItalic,
      color: COR_CINZA,
    },
  );
  page.drawText(
    `Gerado em ${new Date().toISOString().slice(0, 10)} — Juliana Ramos Advocacia & Consultoria Jurídica`,
    { x: M, y: 20, size: 8, font: fontReg, color: COR_CINZA },
  );

  return await pdf.save();
}

/**
 * Quebra um texto longo em linhas com no máximo `maxChars` caracteres,
 * respeitando limites de palavras.
 *
 * @param {string} texto
 * @param {number} maxChars
 * @returns {string[]}
 */
function quebrarLinhas(texto, maxChars) {
  const palavras = texto.split(/\s+/);
  /** @type {string[]} */
  const linhas = [];
  let atual = "";
  for (const w of palavras) {
    if ((atual + " " + w).trim().length > maxChars) {
      if (atual) linhas.push(atual);
      atual = w;
    } else {
      atual = (atual ? atual + " " : "") + w;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}
