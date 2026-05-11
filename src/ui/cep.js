// @ts-check
/**
 * Integração com serviços públicos de CEP brasileiros.
 *
 * Tenta primeiro o ViaCEP (mais conhecido) e, em caso de falha de rede
 * ou bloqueio (por exemplo, extensão de privacidade), faz fallback para
 * o BrasilAPI. Ambos retornam dados públicos a partir do CEP.
 *
 * Documentação:
 *   ViaCEP   — https://viacep.com.br/
 *   BrasilAPI — https://brasilapi.com.br/docs#tag/CEP
 *
 * LGPD: a única informação enviada é o CEP, que é dado público. O
 * retorno (logradouro, bairro, cidade, UF) também é público. Nenhum
 * dado pessoal do beneficiário trafega.
 */

const VIACEP = "https://viacep.com.br/ws";
const BRASILAPI = "https://brasilapi.com.br/api/cep/v2";

/**
 * @typedef {Object} EnderecoNormalizado
 * @property {string} cep
 * @property {string} logradouro
 * @property {string} bairro
 * @property {string} cidade
 * @property {string} uf
 * @property {string} fonte
 */

/**
 * @param {string} limpo  8 dígitos
 * @returns {Promise<EnderecoNormalizado | null>}
 */
async function consultarViaCep(limpo) {
  const r = await fetch(`${VIACEP}/${limpo}/json/`);
  if (!r.ok) throw new Error(`ViaCEP status ${r.status}`);
  const data = await r.json();
  if (data.erro) return null;
  return {
    cep: data.cep || limpo,
    logradouro: data.logradouro || "",
    bairro: data.bairro || "",
    cidade: data.localidade || "",
    uf: data.uf || "",
    fonte: "ViaCEP",
  };
}

/**
 * @param {string} limpo  8 dígitos
 * @returns {Promise<EnderecoNormalizado | null>}
 */
async function consultarBrasilApi(limpo) {
  const r = await fetch(`${BRASILAPI}/${limpo}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`BrasilAPI status ${r.status}`);
  const data = await r.json();
  return {
    cep: data.cep || limpo,
    logradouro: data.street || "",
    bairro: data.neighborhood || "",
    cidade: data.city || "",
    uf: data.state || "",
    fonte: "BrasilAPI",
  };
}

/**
 * Busca um CEP com fallback automático entre ViaCEP e BrasilAPI.
 *
 * @param {string} cep  apenas dígitos ou já formatado (00000-000)
 * @returns {Promise<EnderecoNormalizado | null>}
 */
export async function buscarCep(cep) {
  const limpo = String(cep ?? "").replace(/\D/g, "");
  if (limpo.length !== 8) return null;

  try {
    const r = await consultarViaCep(limpo);
    if (r) return r;
  } catch (err) {
    console.warn("[CEP] ViaCEP indisponível, tentando BrasilAPI:", err);
  }

  try {
    const r = await consultarBrasilApi(limpo);
    if (r) return r;
  } catch (err) {
    console.warn("[CEP] BrasilAPI também indisponível:", err);
  }

  return null;
}

/**
 * Liga um input de CEP a campos de logradouro, bairro, cidade e UF.
 * Dispara em `input` (paste, autofill) e em `blur` (saída do campo).
 *
 * @param {Object} campos
 * @param {HTMLInputElement} campos.inputCep
 * @param {HTMLInputElement} [campos.inputLogradouro]
 * @param {HTMLInputElement} [campos.inputBairro]
 * @param {HTMLInputElement} [campos.inputCidade]
 * @param {HTMLInputElement} [campos.inputUf]
 * @param {HTMLElement} [campos.statusEl]  elemento para mostrar status
 */
export function ligarBuscaPorCep(campos) {
  const { inputCep, inputLogradouro, inputBairro, inputCidade, inputUf, statusEl } =
    campos;

  let buscandoFor = ""; // evita disparar busca duplicada para o mesmo CEP

  async function executar() {
    const digitos = inputCep.value.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    if (digitos === buscandoFor) return;
    buscandoFor = digitos;

    if (statusEl) {
      statusEl.textContent = "Buscando endereço…";
      statusEl.dataset.estado = "buscando";
    }

    const dados = await buscarCep(digitos);

    if (!dados) {
      if (statusEl) {
        statusEl.textContent =
          "CEP não encontrado — preencha o endereço manualmente.";
        statusEl.dataset.estado = "erro";
      }
      buscandoFor = "";
      return;
    }

    if (inputLogradouro) inputLogradouro.value = dados.logradouro || inputLogradouro.value;
    if (inputBairro) inputBairro.value = dados.bairro || inputBairro.value;
    if (inputCidade) inputCidade.value = dados.cidade || inputCidade.value;
    if (inputUf) inputUf.value = dados.uf || inputUf.value;

    // Sucesso: limpa o status — os próprios campos preenchidos são o feedback visual.
    if (statusEl) {
      statusEl.textContent = "";
      delete statusEl.dataset.estado;
    }
  }

  // Em input: dispara quando completar 8 dígitos (paste, digitação)
  inputCep.addEventListener("input", () => {
    const digitos = inputCep.value.replace(/\D/g, "");
    if (digitos.length === 8) {
      executar();
    } else {
      if (statusEl) {
        statusEl.textContent = "";
        delete statusEl.dataset.estado;
      }
      buscandoFor = "";
    }
  });

  // Em blur: garante busca também ao sair do campo
  inputCep.addEventListener("blur", () => {
    executar();
  });
}
