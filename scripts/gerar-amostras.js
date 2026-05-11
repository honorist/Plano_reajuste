// @ts-check
/**
 * Gera amostras dos 4 documentos com dados fictícios para visualização.
 * Uso: node scripts/gerar-amostras.js
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "amostras");
mkdirSync(OUT, { recursive: true });

// Node 18+ tem fetch nativo; versões anteriores não precisam de polyfill
// pois logo.js usa fs.readFileSync quando detecta Node.js

// Caso de exemplo completo
/** @type {import("../tests/fixtures/caso-exemplo.js").DadosCaso} */
const dadosCaso = {
  beneficiario: {
    nome: "Maria Aparecida dos Santos",
    cpf: "123.456.789-00",
    endereco: "Rua das Flores, 45, Apto 12 — Bairro Jardim, Belo Horizonte/MG — CEP 30140-110",
    dataNascimento: "1958-04-12",
  },
  operadora: {
    razaoSocial: "Unimed Belo Horizonte Cooperativa de Trabalho Médico",
    cnpj: "17.577.804/0001-55",
    numeroAns: "343889",
  },
  contrato: {
    numero: "0012345-6",
    dataAssinatura: "2010-03-15",
    tipo: "individual",
  },
  comarca: "Belo Horizonte/MG",
  foro: "Foro da Comarca de Belo Horizonte/MG",
};

const resultadoM1 = {
  veredito: "abusivo",
  resumo_tecnico: "O reajuste aplicado de 18,71% supera o teto ANS de 9,63% para o ciclo 2023. O excesso mensal cobrado é de R$ 93,40.",
  resumo_leigo: "A operadora cobrou um reajuste maior do que a ANS permite. Você pagou R$ 93,40 a mais por mês.",
  resultado: {
    anterior: 589.50,
    aplicado: 699.69,
    percentual_aplicado: 18.69,
    percentual_teto: 9.63,
    teto_legal: 646.24,
    excesso: 53.45,
    restituicao_cdc: 106.90,
    ciclo_ans: { ato_normativo: "Comunicado ANS nº 25/2023" },
  },
  passos: [
    { titulo: "Apuração do percentual aplicado", descricao: "Calculado pela variação entre mensalidade anterior (R$ 589,50) e aplicada (R$ 699,69).", formula: "(699,69 - 589,50) / 589,50 = 18,69%" },
    { titulo: "Verificação do teto ANS", descricao: "O teto autorizado pela ANS para o ciclo de aniversário 2023 é de 9,63%.", formula: "Comunicado ANS nº 25/2023" },
    { titulo: "Cálculo do excesso", descricao: "Diferença entre o valor cobrado e o teto legal.", formula: "R$ 699,69 - R$ 646,24 = R$ 53,45" },
  ],
  fundamentacao_legal: [
    {
      norma: "Lei nº 9.656/1998, art. 35-E",
      ementa: "Os reajustes de mensalidade de planos individuais dependem de prévia autorização da ANS.",
      aplicacao_ao_caso: "O reajuste aplicado de 18,69% não foi autorizado pela ANS para o ciclo correspondente.",
    },
    {
      norma: "CDC, art. 42, parágrafo único",
      ementa: "O consumidor cobrado em quantia indevida tem direito à repetição do indébito em dobro.",
      aplicacao_ao_caso: "Aplica-se a restituição em dobro de R$ 106,90 por mês de cobrança indevida.",
    },
  ],
  alertas: [
    { severidade: "critico", mensagem: "Reajuste excede o teto ANS em 9,06 pontos percentuais — abusividade configurada." },
    { severidade: "atencao", mensagem: "Verificar boletos dos últimos 5 anos para cálculo total da restituição." },
  ],
};

const entradaDocs = { dadosCaso, modulo1: /** @type {any} */ (resultadoM1) };

console.log("Gerando amostras em:", OUT);

// ── PDF ────────────────────────────────────────────────────────────────────
try {
  const { gerarResumoPdf } = await import("../src/docs/gerar-resumo-pdf.js");
  const pdf = await gerarResumoPdf(entradaDocs);
  writeFileSync(resolve(OUT, "amostra-resumo.pdf"), pdf);
  console.log("✓ amostra-resumo.pdf");
} catch (/** @type {any} */ e) {
  console.error("✗ PDF:", e.message);
}

// ── Petição DOCX ───────────────────────────────────────────────────────────
try {
  const { gerarPeticaoDocx } = await import("../src/docs/gerar-peticao-docx.js");
  const docx = await gerarPeticaoDocx(entradaDocs);
  writeFileSync(resolve(OUT, "amostra-peticao.docx"), docx);
  console.log("✓ amostra-peticao.docx");
} catch (/** @type {any} */ e) {
  console.error("✗ Petição DOCX:", e.message);
}

// ── Relatório DOCX ─────────────────────────────────────────────────────────
try {
  const { gerarRelatorioDocx } = await import("../src/docs/gerar-relatorio-docx.js");
  const docx = await gerarRelatorioDocx(entradaDocs);
  writeFileSync(resolve(OUT, "amostra-relatorio.docx"), docx);
  console.log("✓ amostra-relatorio.docx");
} catch (/** @type {any} */ e) {
  console.error("✗ Relatório DOCX:", e.message);
}

// ── Planilha XLSX ──────────────────────────────────────────────────────────
try {
  const { gerarPlanilhaXlsx } = await import("../src/docs/gerar-planilha-xlsx.js");
  const xlsx = await gerarPlanilhaXlsx(entradaDocs);
  writeFileSync(resolve(OUT, "amostra-planilha.xlsx"), xlsx);
  console.log("✓ amostra-planilha.xlsx");
} catch (/** @type {any} */ e) {
  console.error("✗ Planilha XLSX:", e.message);
}

console.log("\nPronto! Abra os arquivos em", OUT);
