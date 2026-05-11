// @ts-check
/**
 * Caso de exemplo usado pelos testes dos geradores de documentos.
 * Representa uma situação real e plausível para um beneficiário típico
 * de plano individual com reajuste abusivo.
 */
import { calcularReajusteAnualAns } from "../../src/calc/modulo1-reajuste-anual.js";

/**
 * @typedef {Object} DadosBeneficiario
 * @property {string} nome
 * @property {string} cpf
 * @property {string} endereco
 * @property {string} dataNascimento
 */

/**
 * @typedef {Object} DadosOperadora
 * @property {string} razaoSocial
 * @property {string} cnpj
 * @property {string} numeroAns
 */

/**
 * @typedef {Object} DadosContrato
 * @property {string} numero
 * @property {string} dataAssinatura
 * @property {"individual" | "familiar"} tipo
 */

/**
 * @typedef {Object} DadosCaso
 * @property {DadosBeneficiario} beneficiario
 * @property {DadosOperadora} operadora
 * @property {DadosContrato} contrato
 * @property {string} comarca
 * @property {string} foro
 * @property {string} [advogadoNome]
 * @property {string} [advogadoOAB]
 */

/** @type {DadosCaso} */
export const casoExemplo = {
  beneficiario: {
    nome: "JOSÉ DA SILVA EXEMPLO",
    cpf: "123.456.789-00",
    endereco: "Rua das Acácias, 123, Vila Esperança, São Paulo/SP, CEP 01234-567",
    dataNascimento: "1965-03-15",
  },
  operadora: {
    razaoSocial: "OPERADORA EXEMPLO LTDA.",
    cnpj: "12.345.678/0001-90",
    numeroAns: "000000-0",
  },
  contrato: {
    numero: "CTR-2018-001234",
    dataAssinatura: "2018-07-22",
    tipo: "individual",
  },
  comarca: "São Paulo",
  foro: "Foro Central da Comarca de São Paulo — Vara Cível",
  advogadoNome: "DRA. FULANA DE TAL EXEMPLO",
  advogadoOAB: "OAB/SP 000.000",
};

/**
 * Resultado do Módulo 1 para um reajuste de 10% no ciclo 2024/25 (teto ANS 6,91%).
 * Caso clássico de abusividade.
 */
export const resultadoModulo1Abusivo = calcularReajusteAnualAns({
  dataAssinaturaContrato: "2018-07-22",
  mesAniversarioReajuste: "2024-07",
  mensalidadeAnterior: 850.0,
  mensalidadeAplicada: 935.0, // +10% — excede 6,91% do ciclo 2024/25
  tipoContrato: "individual",
});

/**
 * Resultado regular — reajuste dentro do teto.
 */
export const resultadoModulo1Regular = calcularReajusteAnualAns({
  dataAssinaturaContrato: "2020-07-01",
  mesAniversarioReajuste: "2025-07",
  mensalidadeAnterior: 1000.0,
  mensalidadeAplicada: 1060.6,
  tipoContrato: "individual",
});

/**
 * Resultado inconclusivo — aniversário fora da janela do MVP.
 */
export const resultadoModulo1Inconclusivo = calcularReajusteAnualAns({
  dataAssinaturaContrato: "2010-03-15",
  mesAniversarioReajuste: "2015-03",
  mensalidadeAnterior: 800.0,
  mensalidadeAplicada: 900.0,
  tipoContrato: "individual",
});

/**
 * Fakes para exercitar os caminhos dos módulos 2, 3 e 4 nos geradores,
 * antes da implementação completa desses módulos. Estrutura conforme
 * o contrato ResultadoCalculo.
 *
 * @type {import("../../src/calc/modulo1-reajuste-anual.js").ResultadoCalculo}
 */
export const resultadoFakeAbusivo = {
  veredito: "abusivo",
  resultado: {
    excesso: "50.00",
    restituicao_cdc: "100.00",
    detalhe: "fixture de teste",
  },
  passos: [
    { titulo: "Passo único", descricao: "Stub para teste de pipeline." },
  ],
  fundamentacao_legal: [
    {
      norma: "Stub — RN exemplo",
      ementa: "Ementa fictícia.",
      aplicacao_ao_caso: "Aplicação fictícia.",
    },
  ],
  alertas: [{ severidade: "info", mensagem: "alerta de fixture" }],
  resumo_leigo: "Resumo leigo de fixture para exercitar pipeline.",
  resumo_tecnico: "Resumo técnico de fixture para exercitar pipeline.",
};
