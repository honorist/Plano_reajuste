// @ts-check
/**
 * Smoke test manual: gera os 4 artefatos do caso-exemplo abusivo
 * e salva em `tests/output/` para inspeção visual.
 *
 * Uso: node scripts/smoke-modulo1.js
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  casoExemplo,
  resultadoModulo1Abusivo,
} from "../tests/fixtures/caso-exemplo.js";
import { gerarPlanilhaXlsx } from "../src/docs/gerar-planilha-xlsx.js";
import { gerarRelatorioDocx } from "../src/docs/gerar-relatorio-docx.js";
import { gerarPeticaoDocx } from "../src/docs/gerar-peticao-docx.js";
import { gerarResumoPdf } from "../src/docs/gerar-resumo-pdf.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "tests", "output");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const entrada = {
  dadosCaso: casoExemplo,
  modulo1: resultadoModulo1Abusivo,
};

console.log("Gerando 4 artefatos para o caso-exemplo abusivo...\n");
console.log(`Caso: ${casoExemplo.beneficiario.nome}`);
console.log(`Operadora: ${casoExemplo.operadora.razaoSocial}`);
console.log(`Veredito Módulo 1: ${resultadoModulo1Abusivo.veredito.toUpperCase()}`);
console.log(`Excesso mensal: R$ ${resultadoModulo1Abusivo.resultado.excesso}`);
console.log(`Restituição CDC: R$ ${resultadoModulo1Abusivo.resultado.restituicao_cdc}`);
console.log("");

const arquivos = [
  {
    nome: "01-resumo-executivo.pdf",
    gerar: () => gerarResumoPdf(entrada),
  },
  {
    nome: "02-peticao-inicial.docx",
    gerar: () => gerarPeticaoDocx(entrada),
  },
  {
    nome: "03-relatorio-tecnico.docx",
    gerar: () => gerarRelatorioDocx(entrada),
  },
  {
    nome: "04-planilha-pericial.xlsx",
    gerar: () => gerarPlanilhaXlsx(entrada),
  },
];

for (const { nome, gerar } of arquivos) {
  const buf = await gerar();
  const caminho = resolve(outDir, nome);
  writeFileSync(caminho, buf);
  console.log(`  ${nome}  (${buf.byteLength.toLocaleString("pt-BR")} bytes)`);
}

console.log(`\nArquivos salvos em ${outDir}`);
console.log("Abra cada um no Word/Excel/leitor PDF para inspeção visual.");
