// @ts-check
/**
 * Testes de integração — pipeline cálculo → geração de documentos.
 *
 * Validamos:
 *  - Cada gerador retorna um Buffer/Uint8Array não-vazio
 *  - DOCX e XLSX são ZIPs válidos (magic number "PK\x03\x04")
 *  - PDF tem magic number "%PDF-"
 *  - Strings essenciais (acentos, valores monetários, leis) estão
 *    presentes literalmente no DOCX
 */
import { describe, it, expect } from "vitest";
import PizZip from "pizzip";
import {
  casoExemplo,
  resultadoModulo1Abusivo,
  resultadoModulo1Regular,
  resultadoModulo1Inconclusivo,
  resultadoFakeAbusivo,
} from "../fixtures/caso-exemplo.js";
import { gerarPlanilhaXlsx } from "../../src/docs/gerar-planilha-xlsx.js";
import { gerarRelatorioDocx } from "../../src/docs/gerar-relatorio-docx.js";
import { gerarPeticaoDocx } from "../../src/docs/gerar-peticao-docx.js";
import { gerarResumoPdf } from "../../src/docs/gerar-resumo-pdf.js";

/**
 * @param {Buffer | Uint8Array} buf
 * @returns {string}
 */
function extrairTextoDocx(buf) {
  const zip = new PizZip(buf);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  // remove tags, mantém só o texto entre <w:t>...</w:t>
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [];
  return matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
}

describe("Pipeline cálculo → planilha XLSX (ExcelJS)", () => {
  it("gera arquivo XLSX válido (ZIP) com aba de Resumo + Módulo 1", async () => {
    const buf = await gerarPlanilhaXlsx({
      modulo1: resultadoModulo1Abusivo,
      dadosCaso: casoExemplo,
    });
    expect(buf.byteLength).toBeGreaterThan(1000);

    // Magic number ZIP
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K

    // Estrutura ZIP válida (pizzip lê)
    const zip = new PizZip(buf);
    const sheetNames = Object.keys(zip.files).filter((f) =>
      f.startsWith("xl/worksheets/"),
    );
    expect(sheetNames.length).toBeGreaterThanOrEqual(2);
  });

  it("inclui nome do beneficiário e CPF na aba de Resumo", async () => {
    const buf = await gerarPlanilhaXlsx({
      modulo1: resultadoModulo1Abusivo,
      dadosCaso: casoExemplo,
    });
    const zip = new PizZip(buf);
    // Strings em XLSX ficam em xl/sharedStrings.xml
    const shared = zip.file("xl/sharedStrings.xml")?.asText() ?? "";
    expect(shared).toContain("JOSÉ DA SILVA EXEMPLO");
    expect(shared).toContain("123.456.789-00");
  });
});

describe("Pipeline cálculo → relatório técnico DOCX (docx v9)", () => {
  it("gera DOCX válido (ZIP) com tamanho razoável", async () => {
    const buf = await gerarRelatorioDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
    });
    expect(buf.byteLength).toBeGreaterThan(2000);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it("preserva acentos PT-BR sem mojibake", async () => {
    const buf = await gerarRelatorioDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toContain("Beneficiário");
    expect(texto).toContain("Operadora");
    expect(texto).toMatch(/ANÁLISE|Análise/);
    expect(texto).toContain("Fundamentação");
  });

  it("cita Lei 9.656/98, ato normativo ANS e CDC art. 42 em caso abusivo", async () => {
    const buf = await gerarRelatorioDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toMatch(/9\.?656/);
    expect(texto).toMatch(/Comunicado.*ANS|ANS.*2024/i);
    expect(texto).toMatch(/CDC|8\.?078|art\.?\s*42/i);
  });
});

describe("Pipeline cálculo → petição inicial DOCX", () => {
  it("contém endereçamento ao Juízo e qualificação das partes", async () => {
    const buf = await gerarPeticaoDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toContain("EXCELENTÍSSIMO");
    expect(texto).toMatch(/JUIZ\(A\) DE DIREITO/);
    expect(texto).toContain("JOSÉ DA SILVA EXEMPLO");
    expect(texto).toContain("OPERADORA EXEMPLO LTDA.");
    expect(texto).toContain("CPF");
    expect(texto).toContain("CNPJ");
  });

  it("inclui pedidos numerados (a, b, c...)", async () => {
    const buf = await gerarPeticaoDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toMatch(/\ba\)/);
    expect(texto).toMatch(/\bb\)/);
    expect(texto).toMatch(/\bc\)/);
  });

  it("para caso regular, sinaliza ausência de abusividade sem pedidos de condenação", async () => {
    const buf = await gerarPeticaoDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Regular,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toMatch(/não apresentam.*ind[íi]cio.*abusividade/i);
  });
});

describe("Pipeline com todos os módulos (incluindo fixtures dos módulos 2-4)", () => {
  it("planilha XLSX consolida 4 módulos com vereditos distintos", async () => {
    const buf = await gerarPlanilhaXlsx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
      modulo2: resultadoFakeAbusivo,
      modulo3: resultadoModulo1Regular,
      modulo4: resultadoModulo1Inconclusivo,
    });
    const zip = new PizZip(buf);
    const sheets = Object.keys(zip.files).filter((f) =>
      f.startsWith("xl/worksheets/"),
    );
    expect(sheets.length).toBeGreaterThanOrEqual(5); // Resumo + 4 módulos (ExcelJS pode inserir extras)
  });

  it("relatório técnico inclui blocos de todos os 4 módulos", async () => {
    const buf = await gerarRelatorioDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
      modulo2: resultadoFakeAbusivo,
      modulo3: resultadoFakeAbusivo,
      modulo4: resultadoFakeAbusivo,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toContain("Módulo 1");
    expect(texto).toContain("Módulo 2");
    expect(texto).toContain("Módulo 3");
    expect(texto).toContain("Módulo 4");
  });

  it("petição adiciona seções para módulos 2 e 3 quando abusivos", async () => {
    const buf = await gerarPeticaoDocx({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
      modulo2: resultadoFakeAbusivo,
      modulo3: resultadoFakeAbusivo,
    });
    const texto = extrairTextoDocx(buf);
    expect(texto).toMatch(/faixa et[áa]ria/i);
    expect(texto).toMatch(/formalmente coletivo|Tema 952/i);
  });

  it("PDF de resumo trata veredito inconclusivo sem quebrar", async () => {
    const buf = await gerarResumoPdf({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Inconclusivo,
    });
    const head = new TextDecoder().decode(buf.slice(0, 5));
    expect(head).toBe("%PDF-");
  });
});

describe("Pipeline cálculo → resumo PDF (pdf-lib)", () => {
  it("gera PDF válido com magic number %PDF-", async () => {
    const buf = await gerarResumoPdf({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Abusivo,
    });
    expect(buf.byteLength).toBeGreaterThan(1500);

    // bytes 0-4 devem ser "%PDF-"
    const head = new TextDecoder().decode(buf.slice(0, 5));
    expect(head).toBe("%PDF-");
  });

  it("gera PDF também para caso regular (sem excesso)", async () => {
    const buf = await gerarResumoPdf({
      dadosCaso: casoExemplo,
      modulo1: resultadoModulo1Regular,
    });
    expect(buf.byteLength).toBeGreaterThan(1500);
  });
});
