// @ts-check
/**
 * Testes de `src/calc/money.js` — valores monetários com precisão decimal
 * exata (via decimal.js), formatação BRL e operações que serão usadas em
 * juízo (cálculo de excesso, dobro do CDC art. 42).
 *
 * Por que decimal.js: `0.1 + 0.2` em float64 retorna `0.30000000000000004`.
 * Isso é inaceitável quando o número vira pedido líquido em petição.
 */
import { describe, it, expect } from "vitest";
import {
  somar,
  subtrair,
  aplicarPercentual,
  excesso,
  dobroCdc,
  formatarBRL,
  paraDecimal,
  ehMaior,
  ehMaiorOuIgual,
  saoIguais,
} from "../../src/calc/money.js";

describe("somar/subtrair — precisão decimal exata", () => {
  it("0.1 + 0.2 == 0.30 (anti-float trap)", () => {
    expect(somar("0.1", "0.2")).toBe("0.30");
  });

  it("subtração mantém 2 casas decimais", () => {
    expect(subtrair("1100.00", "1060.60")).toBe("39.40");
  });

  it("aceita números como entrada (não só strings)", () => {
    expect(somar(0.1, 0.2)).toBe("0.30");
    expect(subtrair(100, 33.33)).toBe("66.67");
  });
});

describe("aplicarPercentual — aplica reajuste com 2 casas exatas", () => {
  it("reajuste positivo (teto ANS 2025 de 6,06% sobre R$ 1.000)", () => {
    expect(aplicarPercentual("1000", 6.06)).toBe("1060.60");
  });

  it("redutor (-8,19% do ciclo 2021/22 sobre R$ 1.000)", () => {
    expect(aplicarPercentual("1000", -8.19)).toBe("918.10");
  });

  it("arredonda ao centavo (banker's rounding tolerado)", () => {
    // 33,33 * 1,10 = 36,663 — esperar 36,66 (HALF_EVEN) ou 36,66 (HALF_UP)
    const r = aplicarPercentual("33.33", 10);
    expect(["36.66", "36.67"]).toContain(r);
  });

  it("reajuste 6,91% sobre R$ 850 (ciclo 2024/25) — caso de teste fixture", () => {
    expect(aplicarPercentual("850", 6.91)).toBe("908.74");
  });
});

describe("excesso — valor pago a maior (mensalidadeAplicada - tetoEsperado)", () => {
  it("aplicado acima do teto retorna o excesso positivo", () => {
    expect(excesso("1100.00", "1060.60")).toBe("39.40");
  });

  it("aplicado igual ou abaixo do teto retorna 0.00", () => {
    expect(excesso("1060.60", "1060.60")).toBe("0.00");
    expect(excesso("1050.00", "1060.60")).toBe("0.00");
  });
});

describe("dobroCdc — repetição em dobro do art. 42 § único do CDC", () => {
  it("retorna o dobro do valor pago em excesso", () => {
    expect(dobroCdc("39.40")).toBe("78.80");
  });

  it("zero permanece zero", () => {
    expect(dobroCdc("0.00")).toBe("0.00");
  });
});

describe("formatarBRL — formatação no padrão brasileiro", () => {
  it("formata milhares com ponto e decimais com vírgula", () => {
    expect(formatarBRL("1234.56")).toBe("R$ 1.234,56");
  });

  it("formata valores menores que 1 real", () => {
    expect(formatarBRL("0.50")).toBe("R$ 0,50");
  });

  it("formata zero", () => {
    expect(formatarBRL("0.00")).toBe("R$ 0,00");
  });

  it("formata valores negativos (redutor / restituição)", () => {
    expect(formatarBRL("-39.40")).toMatch(/^-?R\$ -?39,40$/);
  });

  it("formata valores na casa do milhão", () => {
    expect(formatarBRL("1234567.89")).toBe("R$ 1.234.567,89");
  });
});

describe("comparações monetárias", () => {
  it("ehMaior compara estritamente", () => {
    expect(ehMaior("100.01", "100.00")).toBe(true);
    expect(ehMaior("100.00", "100.00")).toBe(false);
  });

  it("ehMaiorOuIgual aceita igualdade", () => {
    expect(ehMaiorOuIgual("100.00", "100.00")).toBe(true);
  });

  it("saoIguais detecta igualdade após normalização decimal", () => {
    expect(saoIguais("100", "100.00")).toBe(true);
    expect(saoIguais("100.10", "100.1")).toBe(true);
  });
});

describe("paraDecimal — fábrica utilitária", () => {
  it("converte string e number sem perda de precisão", () => {
    expect(paraDecimal("0.1").plus("0.2").toFixed(2)).toBe("0.30");
    expect(paraDecimal(0.1).plus(0.2).toFixed(2)).toBe("0.30");
  });

  it("aceita vírgula como separador decimal (formato BR)", () => {
    expect(paraDecimal("1234,56").toFixed(2)).toBe("1234.56");
  });

  it("rejeita strings inválidas", () => {
    expect(() => paraDecimal("abc")).toThrow(TypeError);
    expect(() => paraDecimal("1.2.3")).toThrow(TypeError);
  });

  it("rejeita números não finitos", () => {
    expect(() => paraDecimal(Number.NaN)).toThrow(TypeError);
    expect(() => paraDecimal(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("rejeita tipos não suportados", () => {
    // @ts-expect-error — testando entrada inválida em runtime
    expect(() => paraDecimal(true)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => paraDecimal(null)).toThrow(TypeError);
    // @ts-expect-error
    expect(() => paraDecimal({})).toThrow(TypeError);
  });
});

describe("aplicarPercentual — validações de entrada", () => {
  it("rejeita percentual não finito", () => {
    expect(() => aplicarPercentual("1000", Number.NaN)).toThrow(TypeError);
    expect(() => aplicarPercentual("1000", Number.POSITIVE_INFINITY)).toThrow(
      TypeError,
    );
  });
});
