import type { InvoiceRequest, InvoiceResult, CompanyRegistration, CompanyRegistrationResult } from "./types";

// Cliente da API da Focus NFe (https://focusnfe.com.br). Emissão de NFS-e
// é assíncrona: este POST só "protocola" o pedido; o resultado real
// (autorizada ou rejeitada pela prefeitura) chega depois, por um
// callback no nosso webhook (/api/webhooks/focus-nfe).
//
// Regime especial de tributação exigido pela Focus NFe, por código:
// 1=Microempresa Municipal, 2=Estimativa, 3=Sociedade de Profissionais,
// 4=Cooperativa, 5=MEI, 6=ME/EPP do Simples Nacional.
const REGIME_CODE: Record<InvoiceRequest["taxRegime"], number> = {
  mei: 5,
  simples_nacional: 6,
  lucro_presumido: 1,
  lucro_real: 1,
};

function baseUrl(env: "homologacao" | "producao") {
  return env === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
}

// Cadastra a empresa como emitente na Focus NFe, usando o token de
// REVENDA (variável de ambiente FOCUS_NFE_RESELLER_TOKEN — nunca salvo
// no banco). O certificado e a senha passam só nesta chamada, em
// memória, e não são persistidos pelo NEGOCIAR em nenhum momento.
//
// Nomes de campo seguem o padrão documentado publicamente da Focus NFe;
// como este endpoint específico de cadastro via API de revenda não pôde
// ser testado contra uma conta real, pequenos ajustes de nome de campo
// podem ser necessários no primeiro teste em homologação.
export async function registerCompanyEmitter(
  resellerToken: string,
  environment: "homologacao" | "producao",
  data: CompanyRegistration,
): Promise<CompanyRegistrationResult> {
  const payload = {
    cnpj: data.cnpj,
    nome: data.legalName,
    nome_fantasia: data.tradeName,
    email: data.email,
    inscricao_municipal: data.municipalRegistration,
    regime_tributario: REGIME_CODE[data.taxRegime],
    logradouro: data.address.street,
    numero: data.address.number,
    complemento: data.address.complement ?? undefined,
    bairro: data.address.district,
    municipio: data.address.city,
    uf: data.address.state,
    cep: data.address.zipCode,
    codigo_municipio: data.address.ibgeCityCode,
    habilita_nfse: true,
    arquivo_certificado_base64: data.certificateBase64,
    senha_certificado: data.certificatePassword,
  };

  try {
    const res = await fetch(`${baseUrl(environment)}/v2/empresas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${resellerToken}:`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });
    const resData = await res.json().catch(() => ({}));

    if (res.status === 200 || res.status === 201) {
      return { ok: true, focusCompanyId: resData.id ?? resData.cnpj, apiToken: resData.token_producao ?? resData.token };
    }
    return { ok: false, errorMessage: resData.mensagem ?? resData.erros?.[0]?.mensagem ?? `Erro HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : "Falha de conexão com o provedor." };
  }
}

export async function issueInvoice(req: InvoiceRequest): Promise<InvoiceResult> {
  const payload = {
    data_emissao: new Date().toISOString().slice(0, 19),
    natureza_operacao: 1, // tributação no município
    optante_simples_nacional: req.taxRegime !== "lucro_real" && req.taxRegime !== "lucro_presumido",
    regime_especial_tributacao: REGIME_CODE[req.taxRegime],
    discriminacao: req.serviceDescription,
    valor_servicos: (req.serviceValueCents / 100).toFixed(2),
    codigo_tributario_municipio: req.municipalServiceCode,
    item_lista_servico: req.municipalServiceCode,
    aliquota: req.issRate ?? undefined,
    tomador: {
      razao_social: req.customer.name,
      email: req.customer.email ?? undefined,
      cpf: !req.customer.isCompany ? req.customer.document ?? undefined : undefined,
      cnpj: req.customer.isCompany ? req.customer.document ?? undefined : undefined,
    },
  };

  try {
    const res = await fetch(`${baseUrl(req.environment)}/v2/nfse?ref=${encodeURIComponent(req.ref)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${req.apiToken}:`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 200 || res.status === 201 || res.status === 202) {
      // já veio autorizada (raro) ou foi pra processamento (comum)
      if (data.status === "autorizado") {
        return {
          ok: true,
          status: "issued",
          nfseNumber: data.numero,
          verificationCode: data.codigo_verificacao,
          pdfUrl: data.url_danfse ?? data.caminho_danfse,
        };
      }
      return { ok: true, status: "processing" };
    }

    return {
      ok: false,
      status: "error",
      errorMessage: data.mensagem ?? data.erros?.[0]?.mensagem ?? `Erro HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, status: "error", errorMessage: e instanceof Error ? e.message : "Falha de conexão com o provedor." };
  }
}

// Consulta o status atual de uma nota já protocolada (usado se o webhook falhar em chegar).
export async function getInvoiceStatus(ref: string, apiToken: string, environment: "homologacao" | "producao"): Promise<InvoiceResult> {
  try {
    const res = await fetch(`${baseUrl(environment)}/v2/nfse/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiToken}:`).toString("base64")}` },
    });
    const data = await res.json().catch(() => ({}));
    if (data.status === "autorizado") {
      return { ok: true, status: "issued", nfseNumber: data.numero, verificationCode: data.codigo_verificacao, pdfUrl: data.url_danfse ?? data.caminho_danfse };
    }
    if (data.status === "erro_autorizacao" || data.status === "cancelado") {
      return { ok: false, status: "error", errorMessage: data.mensagem ?? "Nota rejeitada pela prefeitura." };
    }
    return { ok: true, status: "processing" };
  } catch (e) {
    return { ok: false, status: "error", errorMessage: e instanceof Error ? e.message : "Falha ao consultar." };
  }
}
