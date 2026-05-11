// @ts-check
/**
 * Gera a minuta de petição inicial DOCX em padrão forense robusto,
 * estruturada conforme a praxe brasileira para ações de revisão
 * contratual com restituição em dobro contra operadoras de plano
 * de saúde.
 *
 * Seções padrão: endereçamento → qualificação → fatos → direito (com
 * subseções por matéria) → tutela de urgência → pedidos → valor da
 * causa → requerimentos finais → fecho.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from "docx";
import { formatarBRL } from "../calc/money.js";

/**
 * @typedef {import("../calc/modulo1-reajuste-anual.js").ResultadoCalculo} ResultadoCalculo
 * @typedef {import("../../tests/fixtures/caso-exemplo.js").DadosCaso} DadosCaso
 */

/**
 * @typedef {Object} EntradaPeticao
 * @property {DadosCaso} dadosCaso
 * @property {ResultadoCalculo} [modulo1]
 * @property {ResultadoCalculo} [modulo2]
 * @property {ResultadoCalculo} [modulo3]
 * @property {ResultadoCalculo} [modulo4]
 */

/**
 * @param {string} texto
 * @param {{ bold?: boolean, italics?: boolean }} [opts]
 */
function r(texto, opts = {}) {
  return new TextRun({
    text: texto,
    bold: opts.bold,
    italics: opts.italics,
    font: "Times New Roman",
    size: 24,
  });
}

/**
 * @param {(string | TextRun)[]} partes
 * @param {{ alinhamento?: typeof AlignmentType[keyof typeof AlignmentType], espacoDepois?: number, indent?: boolean, espacoLinha?: number }} [opts]
 */
function p(partes, opts = {}) {
  const children = partes.map((parte) =>
    typeof parte === "string" ? r(parte) : parte,
  );
  return new Paragraph({
    children,
    spacing: { after: opts.espacoDepois ?? 240, line: opts.espacoLinha ?? 360 },
    alignment: opts.alinhamento ?? AlignmentType.JUSTIFIED,
    indent: opts.indent ? { firstLine: 720 } : undefined,
  });
}

/** @param {string} texto */
function tituloSecao(texto) {
  return new Paragraph({
    children: [
      new TextRun({
        text: texto,
        bold: true,
        font: "Times New Roman",
        size: 26,
      }),
    ],
    spacing: { before: 360, after: 240 },
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.CENTER,
  });
}

/** @param {string} texto */
function subtitulo(texto) {
  return new Paragraph({
    children: [
      new TextRun({
        text: texto,
        bold: true,
        font: "Times New Roman",
        size: 24,
      }),
    ],
    spacing: { before: 240, after: 160 },
    heading: HeadingLevel.HEADING_3,
  });
}

/** @param {EntradaPeticao} entrada */
function modulosAbusivos(entrada) {
  /** @type {Array<{ id: string, res: ResultadoCalculo }>} */
  const out = [];
  if (entrada.modulo1?.veredito === "abusivo")
    out.push({ id: "Reajuste anual ANS", res: entrada.modulo1 });
  if (entrada.modulo2?.veredito === "abusivo")
    out.push({ id: "Reajuste por faixa etária", res: entrada.modulo2 });
  if (entrada.modulo3?.veredito === "abusivo")
    out.push({ id: "Falso coletivo", res: entrada.modulo3 });
  if (entrada.modulo4?.veredito === "abusivo")
    out.push({ id: "Reajuste por sinistralidade", res: entrada.modulo4 });
  return out;
}

/**
 * @param {EntradaPeticao} entrada
 * @returns {Promise<Buffer>}
 */
export async function gerarPeticaoDocx(entrada) {
  const c = entrada.dadosCaso;
  const abusivos = modulosAbusivos(entrada);

  /** @type {Paragraph[]} */
  const corpo = [];

  // ── Cabeçalho com a marca do escritório ─────────────────────────────────
  corpo.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "JULIANA RAMOS ADVOCACIA & CONSULTORIA JURÍDICA",
          bold: true,
          size: 22,
          color: "003B49",
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
  );
  corpo.push(
    new Paragraph({
      children: [
        new TextRun({
          text: c.advogadoOAB
            ? `${c.advogadoNome ?? ""} — ${c.advogadoOAB}`
            : "",
          size: 18,
          font: "Times New Roman",
          color: "475569",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
  );

  // ── Endereçamento ──────────────────────────────────────────────────────
  corpo.push(
    p(
      [
        new TextRun({
          text: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ª VARA CÍVEL DA COMARCA DE ${c.comarca.toUpperCase()}`,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
      { alinhamento: AlignmentType.LEFT, espacoDepois: 720 },
    ),
  );

  // ── Qualificação e proposição da ação ──────────────────────────────────
  corpo.push(
    p(
      [
        new TextRun({
          text: c.beneficiario.nome,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
        r(
          `, brasileiro(a), [estado civil], [profissão], portador(a) da Cédula de Identidade RG nº ___________, inscrito(a) no CPF/MF sob o nº ${c.beneficiario.cpf}, residente e domiciliado(a) à ${c.beneficiario.endereco}, endereço eletrônico __________@____, vem, respeitosamente, perante Vossa Excelência, ${
            c.advogadoNome
              ? `por intermédio de seu(sua) advogado(a) que esta subscreve, ${c.advogadoNome} (${c.advogadoOAB}), com escritório profissional no endereço constante do timbre supra — onde recebe intimações nos termos do art. 106, I, do CPC —, e com fundamento nos artigos 319 e seguintes do Código de Processo Civil, c/c arts. 6º, VIII, 42, parágrafo único, 47 e 51, IV, da Lei nº 8.078/1990 (Código de Defesa do Consumidor), arts. 35-E e ss. da Lei nº 9.656/1998, e na regulação editada pela Agência Nacional de Saúde Suplementar — ANS, propor a presente`
              : "propor a presente"
          } `,
        ),
        new TextRun({
          text: "AÇÃO DECLARATÓRIA DE NULIDADE DE CLÁUSULA CONTRATUAL C/C REVISÃO DE CONTRATO E REPETIÇÃO DE INDÉBITO, COM PEDIDO DE TUTELA PROVISÓRIA DE URGÊNCIA",
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
        r(` em face de `),
        new TextRun({
          text: c.operadora.razaoSocial,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
        r(
          `, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${c.operadora.cnpj}, com registro de operadora junto à ANS sob o nº ${c.operadora.numeroAns}, com endereço a ser indicado pelo réu na forma do art. 319, II, do CPC, pelas razões de fato e de direito a seguir aduzidas.`,
        ),
      ],
      { indent: true },
    ),
  );

  // ════════════ I — DOS FATOS ════════════════════════════════════════════
  corpo.push(tituloSecao("I — DOS FATOS"));
  corpo.push(
    p(
      [
        `A parte Requerente é beneficiária regularmente vinculada ao plano privado de assistência à saúde mantido pela Requerida, na modalidade ${humanizarTipo(c.contrato.tipo)}, contrato nº ${c.contrato.numero}, celebrado em ${formatarDataBR(c.contrato.dataAssinatura)}, regido pela Lei nº 9.656/1998 e pelas normas editadas pela Agência Nacional de Saúde Suplementar — ANS, a quem incumbe a regulação setorial, na forma da Lei nº 9.961/2000.`,
      ],
      { indent: true },
    ),
  );

  if (entrada.modulo1) {
    const m = entrada.modulo1;
    const valorTeto = formatarBRL(String(m.resultado.teto_legal ?? "0"));
    corpo.push(
      p(
        [
          `Sucede que, no mês de aniversário do contrato, a Requerida aplicou reajuste anual sobre a mensalidade, majorando o valor de ${formatarBRL(String(m.resultado.anterior))} para ${formatarBRL(String(m.resultado.aplicado))}, o que representa percentual de ${formatarPercentual(m.resultado.percentual_aplicado)} sobre a mensalidade pretérita.`,
        ],
        { indent: true },
      ),
    );
    if (m.veredito === "abusivo") {
      corpo.push(
        p(
          [
            `Ocorre que o teto máximo autorizado pela ANS para o respectivo ciclo é de ${formatarPercentual(m.resultado.percentual_teto)} (${m.resultado.ciclo_ans && typeof m.resultado.ciclo_ans === "object" && "ato_normativo" in m.resultado.ciclo_ans ? /** @type {any} */ (m.resultado.ciclo_ans).ato_normativo : "Comunicado ANS específico"}), de modo que a mensalidade legalmente cobrável não poderia ultrapassar ${valorTeto}. O excedente cobrado mensalmente é de ${formatarBRL(String(m.resultado.excesso))}, conforme se demonstra pela planilha pericial que segue anexa.`,
          ],
          { indent: true },
        ),
      );
    }
  }

  if (entrada.modulo2?.veredito === "abusivo") {
    corpo.push(
      p(
        [
          "Cumulativamente, a Requerida procedeu a reajuste por mudança de faixa etária em desconformidade com a Resolução Normativa ANS nº 63/2003 e com a tese vinculante firmada pelo Superior Tribunal de Justiça no Tema Repetitivo 1016, segundo a qual a variação acumulada entre faixas deve ser apurada pela razão entre os valores extremos, e não pela mera soma aritmética dos percentuais — método juridicamente incorreto e frequentemente empregado pelas operadoras para mascarar a desproporcionalidade do encargo imposto ao consumidor idoso.",
        ],
        { indent: true },
      ),
    );
  }

  if (entrada.modulo3?.veredito === "abusivo") {
    corpo.push(
      p(
        [
          "Outrossim, conquanto o contrato esteja formalmente classificado como coletivo, sua configuração concreta — número diminuto de vidas, vínculo familiar entre beneficiários e ausência de pool de risco genuíno — impõe, à luz do Tema 952 e do Tema 1016 do STJ, sua equiparação ao regime individual/familiar, com a consequente incidência dos tetos de reajuste anualmente divulgados pela ANS, sob pena de fraude à regulação setorial.",
        ],
        { indent: true },
      ),
    );
  }

  if (entrada.modulo4?.veredito === "abusivo") {
    corpo.push(
      p(
        [
          "No tocante ao reajuste por sinistralidade, a Requerida não logrou exibir memória de cálculo idônea, em manifesta afronta ao art. 14 da Resolução Normativa ANS nº 389/2015 e à Súmula Normativa nº 3/2001 da própria autarquia, configurando-se a abusividade da cláusula nos exatos termos do art. 51, IV, do Código de Defesa do Consumidor.",
        ],
        { indent: true },
      ),
    );
  }

  if (abusivos.length === 0) {
    corpo.push(
      p(
        [
          "Os reajustes ora analisados, à luz da metodologia da ANS e da jurisprudência consolidada, não apresentam, à primeira vista, indício suficiente de abusividade. Esta minuta deve, portanto, ser reservada como modelo, sendo recomendada a complementação probatória antes de seu ajuizamento.",
        ],
        { indent: true },
      ),
    );
  } else {
    corpo.push(
      p(
        [
          "Diante do quadro acima descrito, e das múltiplas tentativas frustradas de resolução administrativa da controvérsia, não restou alternativa à parte Requerente senão socorrer-se da via jurisdicional, o que faz pelos fundamentos jurídicos a seguir expostos.",
        ],
        { indent: true },
      ),
    );
  }

  // ════════════ II — DO DIREITO ══════════════════════════════════════════
  corpo.push(tituloSecao("II — DO DIREITO"));

  // II.1 — Da aplicação do CDC
  corpo.push(subtitulo("II.1 — Da aplicação do Código de Defesa do Consumidor"));
  corpo.push(
    p(
      [
        "Os contratos de plano privado de assistência à saúde caracterizam autêntica relação de consumo, na forma dos arts. 2º e 3º da Lei nº 8.078/1990. A incidência do microssistema consumerista, ademais, foi sumulada pelo Superior Tribunal de Justiça (Súmula 608: «Aplica-se o Código de Defesa do Consumidor aos contratos de plano de saúde, salvo os administrados por entidades de autogestão»).",
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        "A operadora atua mediante adesão, em contrato pré-redigido e impositivo, no qual o consumidor figura como parte hipossuficiente — técnica, econômica e informacionalmente —, justificando a aplicação plena dos princípios da boa-fé objetiva, da transparência e do equilíbrio contratual, bem como a inversão do ônus da prova (art. 6º, VIII, do CDC).",
      ],
      { indent: true },
    ),
  );

  // II.2 — Do reajuste anual abusivo (se aplicável)
  if (entrada.modulo1?.veredito === "abusivo") {
    corpo.push(
      subtitulo(
        "II.2 — Da abusividade do reajuste anual: violação ao teto ANS",
      ),
    );
    corpo.push(
      p(
        [
          "O art. 35-E da Lei nº 9.656/1998 estabelece, em sua essência, que os reajustes de mensalidade em planos individuais e familiares dependem de prévia autorização da ANS, autoridade reguladora competente, divulgada anualmente por meio de comunicado próprio. O percentual assim autorizado constitui teto máximo, e qualquer cobrança em valor superior ofende não apenas a referida lei como, também, o regime constitucional do direito à saúde (CRFB, art. 196) e o princípio da boa-fé objetiva (CC, art. 422).",
        ],
        { indent: true },
      ),
    );
    corpo.push(
      p(
        [
          "Na hipótese dos autos, conforme exaustivamente demonstrado pelo relatório técnico anexo, o percentual aplicado pela Requerida excedeu o teto autorizado, configurando, na essência, cobrança em quantia indevida, situação que atrai a sanção do art. 42, parágrafo único, do CDC — restituição em dobro dos valores pagos a maior, acrescidos de correção monetária e juros legais.",
        ],
        { indent: true },
      ),
    );
  }

  // II.3 — Faixa etária (se aplicável)
  if (entrada.modulo2?.veredito === "abusivo") {
    corpo.push(
      subtitulo(
        "II.3 — Da abusividade do reajuste por mudança de faixa etária",
      ),
    );
    corpo.push(
      p(
        [
          "A Resolução Normativa ANS nº 63/2003 fixa dez faixas etárias e impõe dois limites técnicos cumulativos: (i) o valor da décima faixa não pode superar em mais de seis vezes o valor da primeira (art. 3º, I); e (ii) a variação acumulada entre as faixas 7 e 10 não pode ser superior àquela verificada entre as faixas 1 e 7 (art. 3º, II).",
        ],
        { indent: true },
      ),
    );
    corpo.push(
      p(
        [
          "O Superior Tribunal de Justiça, no julgamento do Tema Repetitivo 1016, sedimentou que a variação acumulada deve ser apurada pela razão direta entre o valor final e o valor inicial — fórmula matemática que afasta, peremptoriamente, a metodologia da simples soma aritmética dos percentuais, comumente adotada pelas operadoras com finalidade mascarada de elidir o controle regulatório.",
        ],
        { indent: true },
      ),
    );
    corpo.push(
      p(
        [
          "Acresce-se que o Estatuto da Pessoa Idosa (Lei nº 10.741/2003, art. 15, § 3º) veda, in totum, qualquer reajuste de mensalidade por mudança de faixa etária após os 60 anos completos do beneficiário, em contratos celebrados a partir de 1º/1/2004 — vedação que o Supremo Tribunal Federal, em decisão de 8/10/2025, estendeu inclusive a contratos anteriores, desde que o consumidor conte com dez ou mais anos de vínculo com o plano.",
        ],
        { indent: true },
      ),
    );
  }

  // II.4 — Falso coletivo (se aplicável)
  if (entrada.modulo3?.veredito === "abusivo") {
    corpo.push(
      subtitulo("II.4 — Da equiparação do contrato coletivo a individual"),
    );
    corpo.push(
      p(
        [
          "Embora rotulado como coletivo, o contrato sob exame ostenta natureza atípica: número diminuto de vidas, ausência de pool de risco genuíno e estipulante constituído sem atividade econômica preexistente — configuração que a doutrina e a jurisprudência denominam «falso coletivo» e cuja consequência é a equiparação ao regime individual/familiar para fins de incidência dos tetos ANS.",
        ],
        { indent: true },
      ),
    );
    corpo.push(
      p(
        [
          "O Superior Tribunal de Justiça, no Tema Repetitivo 1016, estendeu expressamente a essas relações jurídicas a tese fixada no Tema 952 e, por extensão, a plena incidência do CDC, autorizando, em consequência, o controle judicial dos reajustes praticados e a substituição da cláusula abusiva por critério razoável — qual seja, o índice individual divulgado pela ANS para o ciclo correspondente.",
        ],
        { indent: true },
      ),
    );
  }

  // II.5 — Sinistralidade (se aplicável)
  if (entrada.modulo4?.veredito === "abusivo") {
    corpo.push(
      subtitulo("II.5 — Da abusividade do reajuste por sinistralidade"),
    );
    corpo.push(
      p(
        [
          "O reajuste por sinistralidade somente é juridicamente válido quando atendidos, cumulativamente, três requisitos: (i) previsão contratual com fórmula clara e objetiva (Súmula Normativa nº 3/2001 da ANS); (ii) disponibilização tempestiva, ao contratante, da memória de cálculo e da metodologia (RN ANS nº 389/2015, art. 14); e (iii) razoabilidade do percentual aplicado, à luz do histórico real de sinistralidade do grupo. A inobservância de qualquer desses requisitos torna a cláusula nula de pleno direito (CDC, art. 51, IV).",
        ],
        { indent: true },
      ),
    );
  }

  // II.6 — Inversão do ônus da prova
  corpo.push(
    subtitulo("II.6 — Da inversão do ônus da prova"),
  );
  corpo.push(
    p(
      [
        "À evidência, é manifesta a hipossuficiência técnica e probatória da parte Requerente perante a Requerida — detentora exclusiva dos elementos atuariais, contábeis e regulatórios necessários à aferição da legalidade dos reajustes praticados. Por isso, requer-se desde já a inversão do ônus da prova, com fundamento no art. 6º, VIII, do CDC, c/c art. 373, § 1º, do CPC, impondo-se à Requerida a obrigação de comprovar a regularidade dos reajustes aplicados.",
      ],
      { indent: true },
    ),
  );

  // II.7 — Restituição em dobro
  if (entrada.modulo1?.veredito === "abusivo") {
    corpo.push(
      subtitulo("II.7 — Da restituição em dobro dos valores indevidos"),
    );
    corpo.push(
      p(
        [
          "O art. 42, parágrafo único, do Código de Defesa do Consumidor estabelece, de modo cogente, que o consumidor cobrado em quantia indevida tem direito à repetição do indébito em dobro, salvo hipótese de «engano justificável». O Superior Tribunal de Justiça, no julgamento do EAREsp 600.663/RS, em sede de embargos de divergência (2021), pacificou que a sanção independe de prova de má-fé, bastando a culpa lato sensu. Tratando-se, in casu, de operadora profissional, sujeita à regulação da ANS, é inafastável o reconhecimento do dever de restituir em dobro.",
        ],
        { indent: true },
      ),
    );
  }

  // ════════════ III — DA TUTELA DE URGÊNCIA ══════════════════════════════
  corpo.push(tituloSecao("III — DO PEDIDO DE TUTELA PROVISÓRIA DE URGÊNCIA"));
  corpo.push(
    p(
      [
        "Presentes os requisitos do art. 300 do Código de Processo Civil — probabilidade do direito invocado, exaustivamente demonstrada nos itens precedentes, e perigo de dano de difícil ou impossível reparação, consubstanciado na cobrança mensal e continuada de valores indevidos, com risco concreto de inadimplência forçada e consequente rescisão do contrato (cuja interrupção, em caráter assistencial à saúde, é de notória gravidade) —, requer-se, em sede liminar, a concessão de tutela provisória de urgência para:",
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        "(i) determinar à Requerida que, no prazo de 48 (quarenta e oito) horas a contar da intimação, abstenha-se de exigir da parte Requerente o pagamento de mensalidade em valor superior àquele resultante da aplicação do teto autorizado pela ANS ao último reajuste, mantendo-se, no mais, vigente e adimplido o contrato; e",
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        "(ii) cominar à Requerida multa diária de R$ 1.000,00 (mil reais) — ou outra que Vossa Excelência houver por bem arbitrar —, sem prejuízo das demais sanções cabíveis, em caso de descumprimento da ordem judicial (CPC, art. 537).",
      ],
      { indent: true },
    ),
  );

  // ════════════ IV — DOS PEDIDOS ═════════════════════════════════════════
  corpo.push(tituloSecao("IV — DOS PEDIDOS"));
  corpo.push(
    p(
      [
        "Ante todo o exposto, requer-se a Vossa Excelência:",
      ],
      { espacoDepois: 160 },
    ),
  );
  corpo.push(
    p(
      [
        "a) o deferimento da tutela provisória de urgência nos exatos termos requeridos no Capítulo III supra;",
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        "b) a citação da Requerida, no endereço a ser indicado na forma do art. 319, II, do CPC, para que, querendo, conteste a presente ação no prazo legal, sob as penas dos arts. 344 e 345 do CPC;",
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        "c) seja declarada a nulidade das cláusulas contratuais que autorizam reajuste em desconformidade com a regulação da ANS e com a jurisprudência consolidada do STJ, na forma do art. 51, IV, do CDC;",
      ],
      { indent: true },
    ),
  );
  if (entrada.modulo1?.veredito === "abusivo") {
    corpo.push(
      p(
        [
          `d) seja a Requerida condenada a recalcular a mensalidade da parte Requerente, observando, para o reajuste impugnado, exclusivamente o percentual máximo autorizado pela ANS para o ciclo correspondente (${formatarPercentual(entrada.modulo1.resultado.percentual_teto)}), aplicando-se a mesma metodologia aos reajustes vincendos;`,
        ],
        { indent: true },
      ),
    );
    corpo.push(
      p(
        [
          `e) seja a Requerida condenada à restituição em dobro dos valores cobrados a maior, nos termos do art. 42, parágrafo único, do CDC, na ordem de ${formatarBRL(String(entrada.modulo1.resultado.restituicao_cdc))} por mensalidade, a serem multiplicados pelo número de meses em que a cobrança indevida persistiu — a ser apurado em sede de liquidação de sentença —, acrescidos de correção monetária pelo IPCA-E e juros moratórios à taxa legal, contados de cada desembolso (Súmula 54/STJ, com adaptações);`,
        ],
        { indent: true },
      ),
    );
  }
  if (entrada.modulo3?.veredito === "abusivo") {
    corpo.push(
      p(
        [
          "f) seja reconhecida, incidentalmente, a natureza atípica do contrato firmado entre as partes (falso coletivo), com sua equiparação ao regime individual/familiar, para fins de aplicação retroativa e prospectiva dos tetos ANS, com as consequências jurídicas dela decorrentes;",
        ],
        { indent: true },
      ),
    );
  }
  corpo.push(
    p(
      [
        `${entrada.modulo3?.veredito === "abusivo" ? "g" : entrada.modulo1?.veredito === "abusivo" ? "f" : "d"}) seja deferida a inversão do ônus da prova, com fundamento no art. 6º, VIII, do CDC, impondo-se à Requerida a comprovação documental da regularidade dos reajustes;`,
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        `${entrada.modulo3?.veredito === "abusivo" ? "h" : entrada.modulo1?.veredito === "abusivo" ? "g" : "e"}) seja a Requerida condenada ao pagamento das custas processuais e dos honorários advocatícios sucumbenciais, em patamar não inferior a 20% (vinte por cento) sobre o valor da condenação, na forma do art. 85, § 2º, do CPC;`,
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        `${entrada.modulo3?.veredito === "abusivo" ? "i" : entrada.modulo1?.veredito === "abusivo" ? "h" : "f"}) protesta-se, desde já, pela produção de todas as provas em direito admitidas, especialmente prova documental superveniente, prova pericial contábil e atuarial — para apuração da memória de cálculo dos reajustes e do quantum debeatur —, prova testemunhal e depoimento pessoal do(s) representante(s) legal(is) da Requerida, sob pena de confesso.`,
      ],
      { indent: true },
    ),
  );

  // ════════════ V — DO VALOR DA CAUSA ════════════════════════════════════
  corpo.push(tituloSecao("V — DO VALOR DA CAUSA"));
  const valorCausa =
    entrada.modulo1?.veredito === "abusivo"
      ? formatarBRL(
          (
            Number(entrada.modulo1.resultado.restituicao_cdc ?? 0) * 24
          ).toFixed(2),
        )
      : "a ser arbitrado por Vossa Excelência";
  corpo.push(
    p(
      [
        `Dá-se à causa o valor de ${valorCausa}, correspondente à projeção da restituição em dobro pelo prazo prescricional bienal previsto no art. 27 do CDC, observando-se o disposto no art. 292, II e VI, do CPC, sem prejuízo de eventual ajuste ao final, quando da liquidação.`,
      ],
      { indent: true },
    ),
  );

  // ════════════ VI — REQUERIMENTOS FINAIS ════════════════════════════════
  corpo.push(tituloSecao("VI — DOS REQUERIMENTOS FINAIS"));
  corpo.push(
    p(
      [
        "Requer-se, por fim, que todas as intimações sejam realizadas em nome do(a) advogado(a) que esta subscreve, sob pena de nulidade (CPC, art. 272, § 2º), bem como que se anote nos autos o endereço eletrônico indicado no preâmbulo para fins do art. 246 do CPC. Manifesta-se, ainda, desde já, em favor da realização de audiência de conciliação ou de mediação, na forma do art. 334 do CPC, se Vossa Excelência houver por bem designar.",
      ],
      { indent: true },
    ),
  );
  corpo.push(
    p(
      [
        "Termos em que, pede deferimento.",
      ],
      { alinhamento: AlignmentType.RIGHT, espacoDepois: 480 },
    ),
  );

  // ── Local, data e assinatura ────────────────────────────────────────────
  corpo.push(
    p(
      [`${c.comarca}, ${new Date().toLocaleDateString("pt-BR")}.`],
      { alinhamento: AlignmentType.CENTER, espacoDepois: 720 },
    ),
  );
  corpo.push(
    p(
      [
        new TextRun({
          text: c.advogadoNome ?? "________________________",
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
      { alinhamento: AlignmentType.CENTER, espacoDepois: 60 },
    ),
  );
  corpo.push(
    p([c.advogadoOAB ?? ""], { alinhamento: AlignmentType.CENTER }),
  );

  const doc = new Document({
    creator: "Juliana Ramos Advocacia & Consultoria Jurídica",
    description: "Minuta de petição inicial — Reajuste de plano de saúde",
    title: "Petição inicial — Reajuste ANS — Juliana Ramos Advocacia",
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } },
      },
    },
    sections: [
      {
        properties: {},
        children: corpo,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * @param {string} iso  formato YYYY-MM-DD
 */
function formatarDataBR(iso) {
  if (!iso || typeof iso !== "string" || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** @param {number | string} pct */
function formatarPercentual(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return String(pct);
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

/** @param {string} tipo */
function humanizarTipo(tipo) {
  const map = {
    individual: "individual",
    familiar: "familiar",
    coletivo_empresarial: "coletivo empresarial",
    coletivo_adesao: "coletivo por adesão",
  };
  return /** @type {Record<string, string>} */ (map)[tipo] ?? tipo;
}
