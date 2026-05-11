// @ts-check
/**
 * Testes do Módulo 3 — Falso coletivo (Tema 952 e 1016 do STJ).
 *
 * Identifica situações em que um contrato formalmente coletivo deve ser
 * equiparado a individual/familiar para fins de aplicação dos tetos ANS,
 * conforme jurisprudência consolidada.
 *
 * Os principais indicadores de falso coletivo são:
 *  - Número diminuto de vidas (< 30) sem agrupamento de risco real
 *  - Todos os beneficiários são parentes (família)
 *  - Ausência de vínculo empresarial real (CNPJ ativo, atividade econômica)
 *  - Estipulante é PJ criada apenas para contratar o plano (MEI/EIRELI fictício)
 */
import { describe, it, expect } from "vitest";
import { avaliarFalsoColetivo } from "../../src/calc/modulo3-falso-coletivo.js";

describe("Módulo 3 — Falso coletivo (Tema 952/1016 STJ)", () => {
  it("classifica como regular coletivo empresarial genuíno com 200 vidas", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_empresarial",
      numeroVidas: 200,
      todosBeneficiariosSaoParentes: false,
      haVinculoEmpresarialReal: true,
      estipulanteEhPjDaFamilia: false,
    });
    expect(r.veredito).toBe("regular");
    expect(r.resultado.equiparavel_a_individual).toBe(false);
  });

  it("identifica falso coletivo: 10 vidas, todos família, PJ fictícia (MEI)", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_empresarial",
      numeroVidas: 10,
      todosBeneficiariosSaoParentes: true,
      haVinculoEmpresarialReal: false,
      estipulanteEhPjDaFamilia: true,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.equiparavel_a_individual).toBe(true);
    expect(r.resultado.indicios).toContain("menos_de_30_vidas");
    expect(r.resultado.indicios).toContain("todos_parentes");
    expect(r.resultado.indicios).toContain("estipulante_familiar");
  });

  it("considera regular coletivo por adesão com 5.000 vidas (associação real)", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_adesao",
      numeroVidas: 5000,
      todosBeneficiariosSaoParentes: false,
      haVinculoEmpresarialReal: true,
      estipulanteEhPjDaFamilia: false,
    });
    expect(r.veredito).toBe("regular");
  });

  it("identifica falso coletivo: 2 vidas (titular + dependente), forte indício", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_empresarial",
      numeroVidas: 2,
      todosBeneficiariosSaoParentes: true,
      haVinculoEmpresarialReal: false,
      estipulanteEhPjDaFamilia: true,
    });
    expect(r.veredito).toBe("abusivo");
    expect(r.resultado.equiparavel_a_individual).toBe(true);
  });

  it("considera regular coletivo empresarial 50 vidas, empresa preexistente, sem laços", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_empresarial",
      numeroVidas: 50,
      todosBeneficiariosSaoParentes: false,
      haVinculoEmpresarialReal: true,
      estipulanteEhPjDaFamilia: false,
    });
    expect(r.veredito).toBe("regular");
  });

  it("retorna inconclusivo no limiar (25 vidas, empresa real, sem família)", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_empresarial",
      numeroVidas: 25,
      todosBeneficiariosSaoParentes: false,
      haVinculoEmpresarialReal: true,
      estipulanteEhPjDaFamilia: false,
    });
    expect(r.veredito).toBe("inconclusivo");
    expect(r.alertas.some((a) => /análise caso-a-caso|limiar|30/i.test(a.mensagem))).toBe(
      true,
    );
  });

  it("rejeita tipo individual ou familiar como entrada (use Módulo 1)", () => {
    expect(() =>
      avaliarFalsoColetivo({
        // @ts-expect-error — testando rejeição de entrada inválida
        tipoDeclarado: "individual",
        numeroVidas: 1,
        todosBeneficiariosSaoParentes: false,
        haVinculoEmpresarialReal: false,
        estipulanteEhPjDaFamilia: false,
      }),
    ).toThrow(/individual|familiar|M[óo]dulo 1|coletivo/i);
  });

  it("quando equiparável, sugere reaplicar Módulo 1 com tetos ANS individuais", () => {
    const r = avaliarFalsoColetivo({
      tipoDeclarado: "coletivo_empresarial",
      numeroVidas: 5,
      todosBeneficiariosSaoParentes: true,
      haVinculoEmpresarialReal: false,
      estipulanteEhPjDaFamilia: true,
    });
    expect(r.resultado.proximo_passo).toMatch(/M[óo]dulo 1|teto ANS|individual/i);
    const normas = r.fundamentacao_legal.map((f) => f.norma).join(" | ");
    expect(normas).toMatch(/Tema.*952|Tema.*1016/i);
  });
});
