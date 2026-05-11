// @ts-check
/**
 * Módulo 4 — Reajuste por sinistralidade em planos coletivos.
 *
 * Avalia a razoabilidade do reajuste por sinistralidade aplicado em
 * plano coletivo, com base na documentação atuarial, na previsão
 * contratual e na coerência com o histórico real de sinistralidade.
 *
 * Fundamentos:
 *  - Resolução Normativa ANS nº 389/2015, art. 14: a operadora deve
 *    disponibilizar memória de cálculo e metodologia com no mínimo
 *    30 dias de antecedência.
 *  - Súmula 3/2001 ANS: cláusula de reajuste deve ser clara e expressa.
 *  - CDC art. 51, IV: nulidade de cláusula iníqua ou abusiva.
 *  - Jurisprudência STJ: reajustes > 20% sem justificativa atuarial
 *    robusta são considerados abusivos.
 *
 * O módulo é mais qualitativo que os anteriores — o veredito final
 * deve ser confirmado por perícia contábil em fase de instrução.
 */

/**
 * @typedef {import("./modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 * @typedef {import("./modulo1-reajuste-anual.js").FundamentacaoLegal} FundamentacaoLegal
 * @typedef {import("./modulo1-reajuste-anual.js").Alerta} Alerta
 */

/**
 * @typedef {Object} RegistroSinistralidade
 * @property {number} ano
 * @property {number} sinistralidade  percentual (0-200+)
 */

/**
 * @typedef {Object} EntradaModulo4
 * @property {RegistroSinistralidade[]} historicoSinistralidade
 * @property {number} percentualAplicado
 * @property {boolean} documentacaoFornecidaPelaOperadora
 * @property {boolean} contratoExplicitaFormulaSinistralidade
 * @property {number} numeroVidas
 */

const LIMITE_RAZOABILIDADE_PCT = 20; // jurisprudência tende a considerar > 20% abusivo sem justificativa robusta

/**
 * @param {EntradaModulo4} entrada
 * @returns {ResultadoCalculo}
 */
export function avaliarSinistralidade(entrada) {
  /** @type {string[]} */
  const motivos = [];
  /** @type {Alerta[]} */
  const alertas = [];

  // 1. Sugere Módulo 3 se for de pequena adesão
  if (entrada.numeroVidas < 30) {
    alertas.push({
      severidade: "atencao",
      mensagem:
        "Coletivo com menos de 30 vidas: rode antes o Módulo 3 (Falso coletivo). " +
        "Se equiparável a individual, os tetos ANS prevalecem sobre cláusula de sinistralidade.",
    });
  }

  // 2. Documentação ausente
  if (!entrada.documentacaoFornecidaPelaOperadora) {
    motivos.push("sem_documentacao");
  }

  // 3. Cláusula sem fórmula
  if (!entrada.contratoExplicitaFormulaSinistralidade) {
    motivos.push("clausula_sem_formula");
  }

  // 4. Percentual excessivo
  if (entrada.percentualAplicado > LIMITE_RAZOABILIDADE_PCT) {
    motivos.push("percentual_excessivo");
  }

  // 5. Contradição com histórico de sinistralidade
  const contradicao = detectarContradicao(
    entrada.historicoSinistralidade,
    entrada.percentualAplicado,
  );
  if (contradicao) motivos.push("contradicao_sinistralidade");

  // Veredito
  /** @type {"abusivo" | "regular" | "inconclusivo"} */
  let veredito;
  if (motivos.length > 0) {
    veredito = "abusivo";
  } else {
    veredito = "regular";
    alertas.push({
      severidade: "info",
      mensagem:
        "Cálculo aparentemente coerente, mas o módulo é qualitativo. " +
        "Recomenda-se perícia contábil/atuarial em fase de instrução para confirmar " +
        "a memória de cálculo apresentada pela operadora e a aderência ao histórico assistencial.",
    });
  }

  const quesitos = montarQuesitosPericia(entrada);

  return {
    veredito,
    resultado: {
      motivos,
      percentual_aplicado: entrada.percentualAplicado,
      numero_vidas: entrada.numeroVidas,
      historico: entrada.historicoSinistralidade,
      quesitos_pericia: quesitos,
    },
    passos: montarPassos(entrada, motivos),
    fundamentacao_legal: montarFundamentacao(motivos.length > 0),
    alertas,
    resumo_leigo: montarResumoLeigo(veredito, motivos),
    resumo_tecnico: montarResumoTecnico(veredito, entrada, motivos),
  };
}

/**
 * @param {RegistroSinistralidade[]} historico
 * @param {number} percentualAplicado
 * @returns {boolean}
 */
function detectarContradicao(historico, percentualAplicado) {
  if (historico.length < 2 || percentualAplicado <= 0) return false;
  const ordenado = [...historico].sort((a, b) => a.ano - b.ano);
  const primeiro = ordenado[0].sinistralidade;
  const ultimo = ordenado[ordenado.length - 1].sinistralidade;
  // Sinistralidade caiu pelo menos 10 pontos percentuais e mesmo assim houve reajuste > 10%
  return ultimo < primeiro - 10 && percentualAplicado > 10;
}

/**
 * @param {EntradaModulo4} entrada
 * @param {string[]} motivos
 * @returns {import("./modulo1-reajuste-anual.js").Passo[]}
 */
function montarPassos(entrada, motivos) {
  return [
    {
      titulo: "1. Previsão contratual da cláusula de sinistralidade",
      descricao: entrada.contratoExplicitaFormulaSinistralidade
        ? "O contrato traz fórmula explícita para o cálculo do reajuste por sinistralidade, atendendo ao requisito formal."
        : "O contrato NÃO apresenta fórmula explícita de sinistralidade. Cláusulas genéricas que delegam à operadora a definição unilateral do reajuste são nulas (CDC art. 51, IV; Súmula 3/2001 ANS).",
    },
    {
      titulo: "2. Documentação atuarial",
      descricao: entrada.documentacaoFornecidaPelaOperadora
        ? "A operadora apresentou memória de cálculo e demonstrativos do reajuste, em cumprimento à RN 389/2015 art. 14."
        : "A operadora NÃO forneceu memória de cálculo nem demonstrativos. A ausência viola a RN 389/2015 art. 14 e inverte o ônus probatório.",
    },
    {
      titulo: "3. Razoabilidade do percentual aplicado",
      descricao:
        `O reajuste aplicado foi de ${entrada.percentualAplicado}%. ` +
        (entrada.percentualAplicado > LIMITE_RAZOABILIDADE_PCT
          ? `Reajustes superiores a ${LIMITE_RAZOABILIDADE_PCT}% são, pela jurisprudência consolidada, considerados desarrazoados sem justificativa atuarial robusta.`
          : `Percentual dentro de patamar aceitável pela jurisprudência, sujeito ainda à verificação documental.`),
    },
    {
      titulo: "4. Coerência com o histórico de sinistralidade",
      descricao:
        entrada.historicoSinistralidade.length === 0
          ? "Histórico de sinistralidade não informado."
          : `Histórico: ${entrada.historicoSinistralidade
              .map((h) => `${h.ano}: ${h.sinistralidade}%`)
              .join("; ")}.` +
            (motivos.includes("contradicao_sinistralidade")
              ? " A sinistralidade vem CAINDO, mas a operadora aplicou reajuste alto — há contradição matemática que precisa ser justificada."
              : " Histórico coerente com o reajuste aplicado."),
    },
    {
      titulo: "5. Conclusão e próximos passos",
      descricao:
        motivos.length > 0
          ? `Foram identificados ${motivos.length} motivo(s) de abusividade (${motivos.join(", ")}). ` +
            "A jurisprudência permite a revisão judicial da cláusula com substituição pelo índice ANS individual ou outro critério razoável."
          : "Reajuste por sinistralidade aparentemente legítimo. A confirmação definitiva depende de perícia contábil sobre os documentos atuariais apresentados.",
    },
  ];
}

/**
 * @param {boolean} ehAbusivo
 * @returns {FundamentacaoLegal[]}
 */
function montarFundamentacao(ehAbusivo) {
  /** @type {FundamentacaoLegal[]} */
  const base = [
    {
      norma: "Resolução Normativa ANS nº 389/2015, art. 14",
      ementa:
        "A operadora deve disponibilizar aos contratantes dos planos coletivos, com pelo menos 30 dias de antecedência, a memória de cálculo do reajuste e a metodologia utilizada.",
      aplicacao_ao_caso:
        "A ausência de documentação atuarial constitui violação direta da norma e inverte o ônus probatório em favor do consumidor.",
    },
    {
      norma: "Súmula Normativa nº 3, de 02/02/2001 — ANS",
      ementa:
        "A cláusula de reajuste deve estar redigida em termos claros e expressos.",
      aplicacao_ao_caso:
        "Cláusula genérica que apenas refere 'reajuste por sinistralidade' sem fórmula é nula.",
    },
    {
      norma: "STJ — Tema Repetitivo 1016",
      ementa:
        "Aplicação do CDC e dos critérios objetivos do Tema 952 aos contratos coletivos.",
      aplicacao_ao_caso:
        "Permite controle judicial dos reajustes coletivos e substituição da cláusula abusiva por critério razoável.",
    },
  ];
  if (ehAbusivo) {
    base.push({
      norma: "CDC (Lei nº 8.078/1990), art. 51, IV",
      ementa:
        "São nulas as cláusulas que estabeleçam obrigações iníquas, abusivas ou que coloquem o consumidor em desvantagem exagerada.",
      aplicacao_ao_caso:
        "Cláusula de reajuste sem fórmula clara ou aplicada acima do razoável é nula de pleno direito.",
    });
    base.push({
      norma: "CDC (Lei nº 8.078/1990), art. 42, § único",
      ementa:
        "Repetição em dobro dos valores cobrados em excesso, salvo engano justificável.",
      aplicacao_ao_caso:
        "Valores pagos a maior pela aplicação do reajuste abusivo são restituíveis em dobro.",
    });
  }
  return base;
}

/**
 * @param {EntradaModulo4} entrada
 * @returns {string[]}
 */
function montarQuesitosPericia(entrada) {
  /** @type {string[]} */
  const quesitos = [
    "Apresentar a memória de cálculo completa do reajuste por sinistralidade aplicado, com todas as fórmulas e premissas atuariais utilizadas.",
    "Demonstrar o histórico anual de sinistralidade do contrato dos últimos 5 (cinco) anos, identificando a forma de apuração da receita e da despesa assistencial.",
    "Verificar se a metodologia adotada pela operadora corresponde àquela prevista no contrato, em conformidade com a RN 389/2015 art. 14.",
    "Comparar o percentual aplicado com a variação real da sinistralidade no período, demonstrando a proporcionalidade matemática.",
    "Indicar se a operadora cumpriu o pool de risco (agrupamento de contratos) previsto na RN 309/2012 para coletivos com menos de 30 vidas.",
  ];
  if (entrada.percentualAplicado > LIMITE_RAZOABILIDADE_PCT) {
    quesitos.push(
      `Justificar tecnicamente o percentual de ${entrada.percentualAplicado}% aplicado, em especial se há fatores excepcionais (ex.: alta de utilização de procedimentos específicos, mudança no perfil etário do grupo).`,
    );
  }
  return quesitos;
}

/**
 * @param {"abusivo" | "regular" | "inconclusivo"} veredito
 * @param {string[]} motivos
 * @returns {string}
 */
function montarResumoLeigo(veredito, motivos) {
  if (veredito === "abusivo") {
    return (
      "O reajuste por sinistralidade aplicado tem indícios de abusividade: " +
      motivos
        .map((m) => {
          if (m === "sem_documentacao")
            return "a operadora não forneceu memória de cálculo";
          if (m === "clausula_sem_formula")
            return "o contrato não traz fórmula clara de cálculo";
          if (m === "percentual_excessivo")
            return "o percentual aplicado é alto demais";
          if (m === "contradicao_sinistralidade")
            return "a sinistralidade vem caindo, mas o reajuste é alto";
          return m;
        })
        .join("; ") +
      ". Procure um(a) advogado(a) para questionar e exigir uma perícia contábil."
    );
  }
  return "O reajuste por sinistralidade aparenta estar dentro do que a lei exige. Para confirmar definitivamente, é necessária perícia técnica em juízo.";
}

/**
 * @param {"abusivo" | "regular" | "inconclusivo"} veredito
 * @param {EntradaModulo4} entrada
 * @param {string[]} motivos
 * @returns {string}
 */
function montarResumoTecnico(veredito, entrada, motivos) {
  if (veredito === "abusivo") {
    return (
      `Reajuste por sinistralidade de ${entrada.percentualAplicado}% aplicado em coletivo de ` +
      `${entrada.numeroVidas} vidas com violação dos seguintes requisitos: ${motivos.join(", ")}. ` +
      "Caracterizada a abusividade, impõe-se a revisão judicial da cláusula nos termos da RN 389/2015, " +
      "art. 14, da Súmula 3/2001 da ANS e do CDC arts. 42 § único e 51, IV. " +
      "Recomenda-se perícia contábil/atuarial para apurar o índice substitutivo aplicável e os valores a restituir em dobro."
    );
  }
  return (
    `Reajuste de ${entrada.percentualAplicado}% aparentemente em conformidade com os requisitos da RN 389/2015 ` +
    `e da jurisprudência. Verificação definitiva depende de perícia contábil sobre a memória de cálculo apresentada.`
  );
}
