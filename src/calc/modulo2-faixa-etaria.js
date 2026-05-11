// @ts-check
/**
 * Módulo 2 — Reajuste por mudança de faixa etária conforme a Resolução
 * Normativa ANS nº 63/2003, observada a jurisprudência consolidada
 * (Tema 952 e 1016 do STJ; IRDR 11 do TJSP; decisão do STF de 2025).
 *
 * Aplica três regras independentes:
 *
 *   R1 (regra_6x)
 *     Valor da 10ª faixa ≤ 6 × valor da 1ª faixa. Fundamento: art. 3º, I.
 *
 *   R2 (regra_variacao_acumulada)
 *     Variação acumulada das faixas 7→10 ≤ variação acumulada das faixas
 *     1→7. A variação é apurada por RAZÃO DIRETA dos valores extremos,
 *     nunca por soma aritmética dos percentuais aplicados em cada
 *     transição. Esta é a tese vinculante do Tema 1016 STJ, confirmada
 *     pelo IRDR 11 do TJSP.
 *
 *     Va_1→7  = (F7  / F1 − 1) × 100
 *     Va_7→10 = (F10 / F7 − 1) × 100
 *
 *   R3 (regra_idoso)
 *     Para contratos celebrados a partir de 01/01/2004, é vedado reajuste
 *     por mudança de faixa após os 60 anos (Lei 10.741/2003, art. 15, §3º).
 *     A decisão do STF de 2025 estendeu a vedação a contratos anteriores
 *     quando há 10+ anos de vínculo do beneficiário com o plano.
 *
 * Quando faltarem dados essenciais para apurar alguma regra, retorna
 * veredito `inconclusivo` com alerta específico.
 */
import { idadeEm } from "./date-utils.js";
import { paraDecimal, formatarBRL } from "./money.js";

/**
 * @typedef {import("./modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 * @typedef {import("./modulo1-reajuste-anual.js").Alerta} Alerta
 * @typedef {import("./modulo1-reajuste-anual.js").Passo} Passo
 * @typedef {import("./modulo1-reajuste-anual.js").FundamentacaoLegal} FundamentacaoLegal
 */

/**
 * @typedef {Object} EntradaModulo2
 * @property {string} dataAssinaturaContrato
 * @property {string} dataNascimentoBeneficiario
 * @property {string} dataReferencia
 * @property {number} valorFaixa1
 * @property {number} [valorFaixa7]
 * @property {number} [valorFaixa10]
 * @property {boolean} [houveReajustePorFaixaPosSessenta]
 * @property {number} [anosNoPlano]
 */

const DATA_CORTE_RN63 = "2004-01-01";
const DATA_LEI_PLANOS = "1999-01-02";

/**
 * @param {EntradaModulo2} entrada
 * @returns {ResultadoCalculo}
 */
export function calcularReajusteFaixaEtaria(entrada) {
  /** @type {Alerta[]} */
  const alertas = [];

  // 1. Contratos pré-1999 → regime jurídico distinto, fora do MVP
  if (entrada.dataAssinaturaContrato < DATA_LEI_PLANOS) {
    alertas.push({
      severidade: "atencao",
      mensagem:
        "Contrato celebrado antes da Lei 9.656/98 (pré-1999) e aparentemente não adaptado. " +
        "Aplica-se regime jurídico distinto (cláusulas contratuais originais ou RN 06/1998), " +
        "fora do escopo deste módulo.",
    });
    return montarInconclusivo(entrada, alertas);
  }

  // 2. Histórico mínimo: precisamos de F1 e F10 para qualquer análise
  if (entrada.valorFaixa10 === undefined) {
    alertas.push({
      severidade: "atencao",
      mensagem:
        "Histórico de faixas incompleto: valor da 10ª faixa (59 anos ou mais) " +
        "não foi informado. Sem ele, não é possível aferir a regra do limite 6× nem " +
        "a variação acumulada das faixas 7→10.",
    });
    return montarInconclusivo(entrada, alertas);
  }

  const F1 = paraDecimal(entrada.valorFaixa1);
  const F10 = paraDecimal(entrada.valorFaixa10);

  /** @type {string[]} */
  const violacoes = [];

  // Regra 1 — limite de 6×
  const limite6x = F1.times(6);
  const regra1Violada = F10.greaterThan(limite6x);
  if (regra1Violada) violacoes.push("regra_6x");

  // Regra 2 — variação acumulada (Tema 1016 STJ)
  let va_1_7 = null;
  let va_7_10 = null;
  let regra2Violada = false;
  if (entrada.valorFaixa7 !== undefined) {
    const F7 = paraDecimal(entrada.valorFaixa7);
    va_1_7 = F7.div(F1).minus(1).times(100).toDecimalPlaces(2).toNumber();
    va_7_10 = F10.div(F7).minus(1).times(100).toDecimalPlaces(2).toNumber();
    regra2Violada = va_7_10 > va_1_7;
    if (regra2Violada) violacoes.push("regra_variacao_acumulada");
  } else {
    alertas.push({
      severidade: "info",
      mensagem:
        "Valor da 7ª faixa não informado. A regra da variação acumulada (RN 63 art. 3º, II) " +
        "não pôde ser verificada — recomenda-se solicitar a tabela completa à operadora.",
    });
  }

  // Regra 3 — vedação pós-60 anos
  const idade = idadeEm(
    entrada.dataNascimentoBeneficiario,
    entrada.dataReferencia,
  );
  const contratoAposRn63 = entrada.dataAssinaturaContrato >= DATA_CORTE_RN63;
  const beneficiarioIdoso = idade >= 60;
  const aplicaStf2025 =
    !contratoAposRn63 && (entrada.anosNoPlano ?? 0) >= 10;
  const regra3Aplicavel = (contratoAposRn63 || aplicaStf2025) && beneficiarioIdoso;
  const regra3Violada =
    regra3Aplicavel && entrada.houveReajustePorFaixaPosSessenta === true;
  if (regra3Violada) violacoes.push("regra_idoso");

  // Veredito
  const veredito = violacoes.length > 0 ? "abusivo" : "regular";

  // Passos didáticos
  const passos = montarPassos({
    entrada,
    F1: entrada.valorFaixa1,
    F7: entrada.valorFaixa7,
    F10: entrada.valorFaixa10,
    limite6x: limite6x.toNumber(),
    regra1Violada,
    va_1_7,
    va_7_10,
    regra2Violada,
    regra2Avaliada: entrada.valorFaixa7 !== undefined,
    idade,
    regra3Aplicavel,
    regra3Violada,
    aplicaStf2025,
  });

  // Fundamentação legal
  const fundamentacao = montarFundamentacao({
    regra1Violada,
    regra2Violada,
    regra3Violada,
    aplicaStf2025,
  });

  // Resumos
  const resumoLeigo = montarResumoLeigo({ veredito, violacoes });
  const resumoTecnico = montarResumoTecnico({
    veredito,
    violacoes,
    F1: entrada.valorFaixa1,
    F10: entrada.valorFaixa10,
    va_1_7,
    va_7_10,
    idade,
  });

  return {
    veredito,
    resultado: {
      violacoes,
      valor_faixa_1: paraDecimal(entrada.valorFaixa1).toFixed(2),
      valor_faixa_7:
        entrada.valorFaixa7 !== undefined
          ? paraDecimal(entrada.valorFaixa7).toFixed(2)
          : null,
      valor_faixa_10: paraDecimal(entrada.valorFaixa10).toFixed(2),
      limite_6x: limite6x.toFixed(2),
      variacao_acumulada_1_7: va_1_7,
      variacao_acumulada_7_10: va_7_10,
      idade_beneficiario: idade,
      regra_idoso_aplicavel: regra3Aplicavel,
    },
    passos,
    fundamentacao_legal: fundamentacao,
    alertas,
    resumo_leigo: resumoLeigo,
    resumo_tecnico: resumoTecnico,
  };
}

/**
 * @param {EntradaModulo2} entrada
 * @param {Alerta[]} alertas
 * @returns {ResultadoCalculo}
 */
function montarInconclusivo(entrada, alertas) {
  return {
    veredito: "inconclusivo",
    resultado: {
      violacoes: [],
      valor_faixa_1: paraDecimal(entrada.valorFaixa1).toFixed(2),
      valor_faixa_10:
        entrada.valorFaixa10 !== undefined
          ? paraDecimal(entrada.valorFaixa10).toFixed(2)
          : null,
    },
    passos: [
      {
        titulo: "Análise não conclusiva",
        descricao:
          "Os dados informados não permitem aplicar todas as regras do Módulo 2. " +
          "Consulte os alertas para a providência necessária.",
      },
    ],
    fundamentacao_legal: [
      {
        norma: "Resolução Normativa ANS nº 63/2003",
        ementa:
          "Define os limites para a variação de preço por mudança de faixa etária em planos privados de assistência à saúde.",
        aplicacao_ao_caso:
          "Norma de referência para a análise. Reabra o cálculo quando todos os dados de faixa estiverem disponíveis.",
      },
    ],
    alertas,
    resumo_leigo:
      "Não foi possível concluir a análise de faixa etária com os dados informados. Veja os alertas para saber o que ainda falta.",
    resumo_tecnico:
      "Análise inconclusiva por ausência de dados essenciais (contrato pré-1999 ou histórico de faixas incompleto). Necessário complementar a documentação para reabrir a apuração.",
  };
}

/**
 * @param {{
 *   entrada: EntradaModulo2,
 *   F1: number,
 *   F7: number | undefined,
 *   F10: number,
 *   limite6x: number,
 *   regra1Violada: boolean,
 *   va_1_7: number | null,
 *   va_7_10: number | null,
 *   regra2Violada: boolean,
 *   regra2Avaliada: boolean,
 *   idade: number,
 *   regra3Aplicavel: boolean,
 *   regra3Violada: boolean,
 *   aplicaStf2025: boolean
 * }} ctx
 * @returns {Passo[]}
 */
function montarPassos(ctx) {
  /** @type {Passo[]} */
  const out = [];

  out.push({
    titulo: "1. Identificação do contrato e do beneficiário",
    descricao:
      `Contrato celebrado em ${ctx.entrada.dataAssinaturaContrato}; beneficiário nascido em ` +
      `${ctx.entrada.dataNascimentoBeneficiario}, com ${ctx.idade} anos na data de referência ` +
      `(${ctx.entrada.dataReferencia}). Aplica-se a Resolução Normativa ANS nº 63/2003 e a ` +
      `jurisprudência consolidada do STJ.`,
  });

  out.push({
    titulo: "2. Regra do limite de 6× (RN 63 art. 3º, I)",
    descricao:
      `Valor da 1ª faixa: ${formatarBRL(ctx.F1)}. Valor da 10ª faixa: ${formatarBRL(ctx.F10)}. ` +
      `Limite legal: ${formatarBRL(ctx.limite6x)} (6 × R$ ${ctx.F1.toFixed(2)}). ` +
      (ctx.regra1Violada
        ? `A 10ª faixa SUPERA o limite legal — regra violada.`
        : `A 10ª faixa está dentro do limite — regra respeitada.`),
    formula: "Limite = 6 × Valor da 1ª faixa",
    valores: {
      valor_faixa_1: formatarBRL(ctx.F1),
      valor_faixa_10: formatarBRL(ctx.F10),
      limite_6x: formatarBRL(ctx.limite6x),
    },
  });

  out.push({
    titulo: "3. Regra da variação acumulada (RN 63 art. 3º, II — Tema 1016 STJ)",
    descricao: ctx.regra2Avaliada
      ? `A variação acumulada entre faixas é apurada pela RAZÃO DIRETA dos valores, ` +
        `e não pela simples soma aritmética dos percentuais aplicados em cada transição. ` +
        `Esta é a tese vinculante do Tema 1016 do STJ, reafirmada pelo IRDR 11 do TJSP. ` +
        `Variação 1→7: ${ctx.va_1_7}%. Variação 7→10: ${ctx.va_7_10}%. ` +
        (ctx.regra2Violada
          ? `A variação 7→10 SUPERA a 1→7 — regra violada.`
          : `A variação 7→10 não excede a 1→7 — regra respeitada.`)
      : `Valor da 7ª faixa não informado. A regra não pôde ser verificada nesta análise.`,
    formula:
      "Va_1→7 = (F7 / F1 − 1) × 100   |   Va_7→10 = (F10 / F7 − 1) × 100",
    valores: ctx.regra2Avaliada
      ? {
          variacao_1_7: `${ctx.va_1_7}%`,
          variacao_7_10: `${ctx.va_7_10}%`,
        }
      : {},
  });

  out.push({
    titulo: "4. Regra da vedação pós-60 anos (Estatuto da Pessoa Idosa)",
    descricao:
      `O beneficiário tem ${ctx.idade} anos. ` +
      (ctx.regra3Aplicavel
        ? `Como ${ctx.aplicaStf2025
              ? "o contrato é anterior a 2004 mas há 10+ anos de plano (STF 2025)"
              : "o contrato foi celebrado após 01/01/2004"}, é vedado reajuste por mudança de ` +
          `faixa após os 60 anos (Lei 10.741/2003, art. 15, §3º; Súmula 91 STJ). ` +
          (ctx.regra3Violada
            ? `Houve aplicação de reajuste etário após os 60 anos — regra violada.`
            : `Não há indicação de reajuste etário após os 60 anos — regra respeitada.`)
        : `Regra inaplicável neste caso (beneficiário não é idoso ou contrato anterior a 2004 sem o critério temporal do STF 2025).`),
  });

  out.push({
    titulo: "5. Conclusão da análise por faixa etária",
    descricao:
      ctx.regra1Violada || ctx.regra2Violada || ctx.regra3Violada
        ? `Foram identificadas violações às regras da RN 63/2003. Os reajustes ` +
          `por mudança de faixa etária aplicados ao beneficiário são abusivos e ` +
          `sujeitos à revisão judicial, com possibilidade de restituição dos valores ` +
          `pagos a maior (CDC art. 42, § único).`
        : `Os reajustes por mudança de faixa etária respeitam as três regras da ` +
          `RN 63/2003 e a jurisprudência consolidada. Nesta análise não há indício ` +
          `de abusividade por faixa etária.`,
  });

  return out;
}

/**
 * @param {{ regra1Violada: boolean, regra2Violada: boolean, regra3Violada: boolean, aplicaStf2025: boolean }} ctx
 * @returns {FundamentacaoLegal[]}
 */
function montarFundamentacao(ctx) {
  /** @type {FundamentacaoLegal[]} */
  const base = [
    {
      norma: "Resolução Normativa ANS nº 63/2003",
      ementa:
        "Define dez faixas etárias e limites máximos para reajuste por mudança de faixa em planos privados de assistência à saúde.",
      link: "https://www.gov.br/ans/pt-br/assuntos/operadoras/reajustes-tecnicos/reajuste-por-faixa-etaria",
      aplicacao_ao_caso:
        "Norma de referência para verificação do limite de 6× e da regra da variação acumulada.",
    },
    {
      norma: "STJ — Tema Repetitivo 1016 (REsp 1.716.113)",
      ementa:
        "A variação acumulada entre faixas deve ser apurada pela razão entre os valores final e inicial, e não pela soma aritmética dos percentuais. Aplicável também a contratos coletivos.",
      aplicacao_ao_caso:
        "Vincula este Juízo (CPC art. 927, III) à metodologia de razão direta. A apuração por soma de percentuais, ainda que comum em planilhas de operadoras, é juridicamente incorreta.",
    },
    {
      norma: "TJSP — IRDR nº 11",
      ementa:
        "Reafirma a apuração da variação acumulada por razão direta e veda reajustes desarrazoados ou aleatórios em desfavor do consumidor.",
      aplicacao_ao_caso:
        "Tese local vinculante para as Câmaras de Direito Privado do TJSP.",
    },
  ];
  if (ctx.regra1Violada || ctx.regra2Violada) {
    base.push({
      norma: "CDC (Lei nº 8.078/1990), art. 51, IV",
      ementa:
        "São nulas as cláusulas que estabeleçam obrigações iníquas, abusivas ou que coloquem o consumidor em desvantagem exagerada.",
      aplicacao_ao_caso:
        "Cláusula de reajuste por faixa etária que viola limites da RN 63/2003 é nula de pleno direito.",
    });
  }
  if (ctx.regra3Violada || ctx.aplicaStf2025) {
    base.push({
      norma: "Lei nº 10.741/2003 — Estatuto da Pessoa Idosa, art. 15, §3º",
      ementa:
        "Veda a discriminação do idoso nos planos de saúde pela cobrança de valores diferenciados em razão da idade.",
      link: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm",
      aplicacao_ao_caso:
        "Veda reajuste por mudança de faixa etária para beneficiários com 60 anos ou mais em contratos sujeitos à norma.",
    });
    base.push({
      norma: "STF — Decisão de 08/10/2025",
      ementa:
        "Estendeu a vedação de reajuste por faixa após 60 anos a contratos anteriores ao Estatuto da Pessoa Idosa, desde que o beneficiário conte com 10+ anos de vínculo com o plano.",
      aplicacao_ao_caso:
        "Aplicável ao caso em que o beneficiário tem 10 ou mais anos de plano, mesmo em contrato anterior a 01/01/2004.",
    });
  }
  return base;
}

/**
 * @param {{ veredito: "abusivo" | "regular" | "inconclusivo", violacoes: string[] }} ctx
 * @returns {string}
 */
function montarResumoLeigo(ctx) {
  if (ctx.veredito === "abusivo") {
    const explicacoes = ctx.violacoes
      .map((v) => {
        if (v === "regra_6x")
          return "a mensalidade da 10ª faixa supera 6 vezes a da 1ª faixa";
        if (v === "regra_variacao_acumulada")
          return "o aumento das faixas 7→10 supera o aumento das faixas 1→7 (Tema 1016 STJ)";
        if (v === "regra_idoso")
          return "houve aumento por mudança de faixa após os 60 anos, o que é vedado";
        return v;
      })
      .join("; ");
    return (
      `Indício de reajuste por faixa etária abusivo: ${explicacoes}. ` +
      `Procure um(a) advogado(a) para questionar judicialmente esses aumentos e ` +
      `pleitear a devolução em dobro dos valores pagos a maior.`
    );
  }
  return "Os reajustes por mudança de faixa etária respeitam as regras da ANS (RN 63/2003) e a jurisprudência do STJ. Não há, nesta análise, indício de abusividade por faixa etária.";
}

/**
 * @param {{
 *   veredito: "abusivo" | "regular" | "inconclusivo",
 *   violacoes: string[],
 *   F1: number,
 *   F10: number,
 *   va_1_7: number | null,
 *   va_7_10: number | null,
 *   idade: number
 * }} ctx
 * @returns {string}
 */
function montarResumoTecnico(ctx) {
  if (ctx.veredito === "abusivo") {
    return (
      `Análise de reajuste por mudança de faixa etária identifica violação das seguintes regras da RN 63/2003: ` +
      `${ctx.violacoes.join(", ")}. Valor 1ª faixa: ${formatarBRL(ctx.F1)}; valor 10ª faixa: ` +
      `${formatarBRL(ctx.F10)}. ${ctx.va_1_7 !== null ? `Variação acumulada 1→7: ${ctx.va_1_7}%; 7→10: ${ctx.va_7_10}%.` : ""} ` +
      `Beneficiário com ${ctx.idade} anos. Cabe revisão judicial das cláusulas de reajuste por faixa, ` +
      `com restituição em dobro dos valores pagos a maior nos termos do art. 42, § único, do CDC, e aplicação ` +
      `vinculante das teses do Tema 952 e Tema 1016 do STJ.`
    );
  }
  return (
    `Reajustes por mudança de faixa etária respeitam as três regras da RN 63/2003 ` +
    `(limite de 6×, variação acumulada por razão direta e vedação pós-60 anos). ` +
    `Sem indício de abusividade por este módulo. Análise complementar pelos Módulos 1, 3 e 4 pode ser pertinente.`
  );
}
