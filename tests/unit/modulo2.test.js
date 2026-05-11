// @ts-check
/**
 * Testes do Módulo 2 — Reajuste por mudança de faixa etária conforme
 * Resolução Normativa ANS nº 63/2003.
 *
 * Validamos três regras independentes:
 *
 *   R1 — RN 63 art. 3º, I: valor da 10ª faixa ≤ 6 × valor da 1ª faixa.
 *   R2 — RN 63 art. 3º, II: variação acumulada das faixas 7→10 ≤ variação
 *        acumulada das faixas 1→7. CRÍTICO: a variação acumulada é apurada
 *        por razão direta (Vf/Vi − 1), nunca por soma aritmética de
 *        percentuais (Tema 1016 STJ; IRDR 11 TJSP).
 *   R3 — Lei 10.741/2003 + STF 2025: vedação de reajuste por mudança de
 *        faixa para beneficiários com 60+ em contratos pós-01/01/2004
 *        (ou anteriores com 10+ anos de plano, conforme STF 2025).
 */
import { describe, it, expect } from "vitest";
import { calcularReajusteFaixaEtaria } from "../../src/calc/modulo2-faixa-etaria.js";

describe("Módulo 2 — Regra 1 (faixa 10 ≤ 6× faixa 1)", () => {
  it("classifica como abusivo quando F10 = 700 e F1 = 100 (excede 6×)", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1975-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      valorFaixa10: 700,
      valorFaixa7: 200,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.violacoes).toContain("regra_6x");
  });

  it("aceita como regular F10 = 600, F1 = 100 (exatamente 6×)", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1975-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      valorFaixa10: 600,
      valorFaixa7: 250, // VA_1-7 = 150%, VA_7-10 = 140% → ok
    });
    expect(r.resultado.violacoes).not.toContain("regra_6x");
  });
});

describe("Módulo 2 — Regra 2 (variação acumulada por razão direta, Tema 1016 STJ)", () => {
  it("CORRETO: variação acumulada calculada por razão, não por soma de percentuais", () => {
    // F1=100, F7=200 → VA = (200/100 − 1) × 100 = 100%
    // F10=380 → VA = (380/200 − 1) × 100 = 90% → 90 ≤ 100, regular pela R2
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1975-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      valorFaixa7: 200,
      valorFaixa10: 380,
    });
    expect(r.resultado.violacoes).not.toContain("regra_variacao_acumulada");
    expect(r.resultado.variacao_acumulada_1_7).toBe(100);
    expect(r.resultado.variacao_acumulada_7_10).toBe(90);
  });

  it("ABUSIVO: VA_7-10 > VA_1-7 quando calculado por razão direta", () => {
    // F1=100, F7=150 → VA_1-7 = 50%
    // F10=300 → VA_7-10 = (300/150 − 1) × 100 = 100% → 100 > 50, abusivo
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1975-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      valorFaixa7: 150,
      valorFaixa10: 300,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.violacoes).toContain("regra_variacao_acumulada");
  });

  it("explicita o método CORRETO (razão direta) na fundamentação, citando Tema 1016", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1975-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      valorFaixa7: 150,
      valorFaixa10: 300,
    });
    const normas = r.fundamentacao_legal.map((f) => f.norma).join(" | ");
    expect(normas).toMatch(/Tema.*1016/i);
    expect(normas).toMatch(/RN.*63|Resolução Normativa.*63/i);
    // alerta jurídico contra soma aritmética
    const passos = r.passos.map((p) => p.descricao).join(" ");
    expect(passos).toMatch(/razão|raz[ãa]o direta|n[ãa]o.*soma/i);
  });
});

describe("Módulo 2 — Regra 3 (vedação pós-60 anos, Lei 10.741/03 + STF 2025)", () => {
  it("classifica como abusivo reajuste de faixa para 65 anos em contrato pós-2004", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1959-03-15", // 65 anos em 2024
      dataReferencia: "2024-04-01",
      valorFaixa1: 100,
      valorFaixa7: 250,
      valorFaixa10: 580,
      houveReajustePorFaixaPosSessenta: true,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.violacoes).toContain("regra_idoso");
  });

  it("regra não se ativa quando beneficiário tem menos de 60 anos", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1980-03-15", // 44 anos em 2024
      dataReferencia: "2024-04-01",
      valorFaixa1: 100,
      valorFaixa7: 250,
      valorFaixa10: 580,
    });
    expect(r.resultado.violacoes).not.toContain("regra_idoso");
  });

  it("STF 2025: aciona regra 3 também em contrato pré-2004 quando há 10+ anos de plano", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2000-03-15",
      dataNascimentoBeneficiario: "1959-03-15",
      dataReferencia: "2024-04-01",
      valorFaixa1: 100,
      valorFaixa7: 250,
      valorFaixa10: 580,
      anosNoPlano: 24,
      houveReajustePorFaixaPosSessenta: true,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.violacoes).toContain("regra_idoso");
    // fundamentação cita o STF 2025
    const normas = r.fundamentacao_legal.map((f) => f.norma).join(" ");
    expect(normas).toMatch(/STF.*2025|Estatuto da Pessoa Idosa/i);
  });
});

describe("Módulo 2 — Casos especiais e edge cases", () => {
  it("retorna inconclusivo para contrato pré-1999 (regime jurídico distinto)", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "1995-06-01",
      dataNascimentoBeneficiario: "1970-01-01",
      dataReferencia: "2024-01-01",
      valorFaixa1: 100,
      valorFaixa10: 700,
      valorFaixa7: 300,
    });
    expect(r.veredito).toBe("inconclusivo");
    expect(r.alertas.some((a) => /pré-1999|não adaptado/i.test(a.mensagem))).toBe(
      true,
    );
  });

  it("retorna inconclusivo quando histórico de faixas está incompleto", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1975-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      // valorFaixa10 ausente
    });
    expect(r.veredito).toBe("inconclusivo");
    expect(r.alertas.some((a) => /incompleto|faixa 10/i.test(a.mensagem))).toBe(
      true,
    );
  });

  it("classifica como regular quando todas as 3 regras passam e beneficiário < 60", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1980-03-15",
      dataReferencia: "2024-03-15",
      valorFaixa1: 100,
      valorFaixa7: 250, // VA_1-7 = 150%
      valorFaixa10: 580, // VA_7-10 = (580/250-1)*100 = 132%; 580 < 600 (6x)
    });
    expect(r.veredito).toBe("regular");
    expect(r.resultado.violacoes).toEqual([]);
  });

  it("traz pelo menos 5 passos didáticos e fundamentação completa", () => {
    const r = calcularReajusteFaixaEtaria({
      dataAssinaturaContrato: "2010-03-15",
      dataNascimentoBeneficiario: "1959-03-15",
      dataReferencia: "2024-04-01",
      valorFaixa1: 100,
      valorFaixa7: 150,
      valorFaixa10: 700,
      houveReajustePorFaixaPosSessenta: true,
    });
    expect(r.passos.length).toBeGreaterThanOrEqual(5);
    expect(r.fundamentacao_legal.length).toBeGreaterThanOrEqual(2);
    expect(r.resumo_leigo.length).toBeGreaterThan(20);
    expect(r.resumo_tecnico.length).toBeGreaterThan(50);
  });
});
