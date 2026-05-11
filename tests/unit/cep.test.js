// @ts-check
/**
 * Testes da integração com ViaCEP / BrasilAPI (fallback automático).
 *
 * Mocka o `fetch` global para garantir que o código de busca:
 *   1. Tenta ViaCEP primeiro.
 *   2. Faz fallback para BrasilAPI quando ViaCEP falha (rede ou status >= 400).
 *   3. Devolve null quando ambos falham.
 *   4. Devolve null quando o CEP não tem 8 dígitos.
 *   5. Não chama nenhuma API quando CEP inválido.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { buscarCep } from "../../src/ui/cep.js";

describe("buscarCep — fallback ViaCEP → BrasilAPI", () => {
  /** @type {typeof globalThis.fetch} */
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna null para CEP com menos de 8 dígitos sem chamar nenhuma API", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = /** @type {any} */ (fetchSpy);
    expect(await buscarCep("123")).toBeNull();
    expect(await buscarCep("")).toBeNull();
    expect(await buscarCep("01310-10")).toBeNull(); // só 7 dígitos
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("usa ViaCEP quando responde com sucesso", async () => {
    globalThis.fetch = /** @type {any} */ (
      vi.fn(async (url) => {
        if (String(url).includes("viacep.com.br")) {
          return /** @type {any} */ ({
            ok: true,
            status: 200,
            json: async () => ({
              cep: "01310-100",
              logradouro: "Avenida Paulista",
              bairro: "Bela Vista",
              localidade: "São Paulo",
              uf: "SP",
            }),
          });
        }
        throw new Error("não deveria chamar BrasilAPI");
      })
    );

    const r = await buscarCep("01310100");
    expect(r).toMatchObject({
      logradouro: "Avenida Paulista",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
      fonte: "ViaCEP",
    });
  });

  it("retorna null quando ViaCEP retorna { erro: true } e BrasilAPI 404", async () => {
    globalThis.fetch = /** @type {any} */ (
      vi.fn(async (url) => {
        if (String(url).includes("viacep")) {
          return /** @type {any} */ ({
            ok: true,
            status: 200,
            json: async () => ({ erro: true }),
          });
        }
        return /** @type {any} */ ({
          ok: false,
          status: 404,
          json: async () => ({}),
        });
      })
    );

    expect(await buscarCep("00000000")).toBeNull();
  });

  it("faz fallback para BrasilAPI quando ViaCEP lança exceção de rede", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    globalThis.fetch = /** @type {any} */ (
      vi.fn(async (url) => {
        if (String(url).includes("viacep")) {
          throw new Error("Failed to fetch");
        }
        return /** @type {any} */ ({
          ok: true,
          status: 200,
          json: async () => ({
            cep: "20040-020",
            street: "Avenida Rio Branco",
            neighborhood: "Centro",
            city: "Rio de Janeiro",
            state: "RJ",
          }),
        });
      })
    );

    const r = await buscarCep("20040020");
    expect(r).toMatchObject({
      logradouro: "Avenida Rio Branco",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      fonte: "BrasilAPI",
    });
  });

  it("faz fallback quando ViaCEP responde HTTP >= 400", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    globalThis.fetch = /** @type {any} */ (
      vi.fn(async (url) => {
        if (String(url).includes("viacep")) {
          return /** @type {any} */ ({
            ok: false,
            status: 503,
            json: async () => ({}),
          });
        }
        return /** @type {any} */ ({
          ok: true,
          status: 200,
          json: async () => ({
            cep: "70297-400",
            street: "Esplanada dos Ministérios",
            neighborhood: "Zona Cívico-Administrativa",
            city: "Brasília",
            state: "DF",
          }),
        });
      })
    );

    const r = await buscarCep("70297400");
    expect(r?.fonte).toBe("BrasilAPI");
    expect(r?.uf).toBe("DF");
  });

  it("retorna null quando ambas as APIs falham", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    globalThis.fetch = /** @type {any} */ (
      vi.fn(async () => {
        throw new Error("Failed to fetch");
      })
    );

    expect(await buscarCep("01310100")).toBeNull();
  });

  it("aceita CEP já formatado com hífen", async () => {
    globalThis.fetch = /** @type {any} */ (
      vi.fn(async () => /** @type {any} */ ({
        ok: true,
        status: 200,
        json: async () => ({
          cep: "01310-100",
          logradouro: "Av. Paulista",
          bairro: "Bela Vista",
          localidade: "São Paulo",
          uf: "SP",
        }),
      }))
    );

    const r = await buscarCep("01310-100");
    expect(r?.uf).toBe("SP");
  });
});
