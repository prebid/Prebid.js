import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";
import { getStorageManager } from "../src/storageManager.js";
import { deepSetValue } from "../src/utils.js";
import { config } from "src/config.js";

const BIDDER_CODE = "bms";
const ENDPOINT_URL =
  "https://api.prebid.int.us-east-2.bluemsdev.team/v1/bid?exchangeId=prebid";
const GVLID = 620;
const COOKIE_NAME = "bmsCookieId";

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

// Configuração do consentimento
config.setConfig({
  consentManagement: {
    gdpr: {
      cmpApi: "iab",
      timeout: 8000,
      defaultGdprScope: true,
    },
  },
});

const converter = ortbConverter({
  context: {
    netRevenue: true, // Configuração padrão de receita líquida
    ttl: 100, // Tempo de vida padrão para respostas de lances
  },
  imp,
  request,
});

function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);

  // Adiciona ID do publisher
  deepSetValue(request, "site.publisher.id", context.publisherId);

  // Adiciona geolocalização se disponível
  if (context.geo) {
    deepSetValue(request, "device.geo", context.geo);
  }

  return request;
}

function imp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);

  // Configurações específicas do impression
  imp.bidfloor = bidRequest.params.bidFloor;
  imp.bidfloorcur = bidRequest.params.currency;
  imp.tagid = bidRequest.params.placementId;

  return imp;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER], // Tipos de mídia suportados

  // Validar requisição de lance
  isBidRequestValid: function (bid) {
    return (
      !!bid.params.placementId &&
      !!bid.params.publisherId &&
      !!bid.params.bidFloor &&
      !!bid.params.currency
    );
  },

  // Construir requisições OpenRTB usando `ortbConverter`
  buildRequests: function (validBidRequests, bidderRequest) {
    // Extrair geolocalização
    const geo = extractGeoLocation(bidderRequest);

    const context = {
      publisherId: validBidRequests.find(
        (bidRequest) => bidRequest.params?.publisherId
      )?.params.publisherId,
      geo: geo, // Adiciona informações de geolocalização ao contexto
    };

    const ortbRequest = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context,
    });

    // Adicionar extensões à requisição
    ortbRequest.ext = ortbRequest.ext || {};
    deepSetValue(ortbRequest, "ext.gvlid", GVLID);

    if (storage.localStorageIsEnabled()) {
      // Incluir ID do cookie do usuário, se disponível
      const ckid = storage.getDataFromLocalStorage(COOKIE_NAME) || null;
      if (ckid) {
        deepSetValue(ortbRequest, "user.ext.buyerid", ckid);
      }
    }

    return {
      method: "POST",
      url: ENDPOINT_URL,
      data: ortbRequest,
      options: {
        contentType: "application/json",
      },
    };
  },

  // Interpretar respostas OpenRTB usando `ortbConverter`
  interpretResponse: function (serverResponse, request) {
    const ortbResponse = serverResponse.body;

    // Analisar resposta OpenRTB em respostas Prebid
    const prebidResponses = converter.fromORTB({
      response: ortbResponse,
      request: request.data,
    }).bids;

    // Adicionar metadados aos lances
    prebidResponses.forEach((bid) => {
      bid.meta = bid.meta || {};
      bid.meta.adapterVersion = "1.0.0";
    });

    return prebidResponses;
  },
};

// Função auxiliar para extrair geolocalização
function extractGeoLocation(bidderRequest) {
  // Prioridade 1: Verificar geo no bidderRequest
  if (bidderRequest?.ortb2?.device?.geo) {
    return bidderRequest.ortb2.device.geo;
  }

  // Prioridade 2: Tentar obter geolocalização do navegador
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          return {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            type: 1, // GPS/Serviços de Localização
            accuracy: position.coords.accuracy,
          };
        },
        (error) => {
          // eslint-disable-next-line no-console
          console.warn("Erro na geolocalização:", error);
          return null;
        }
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Erro ao acessar geolocalização:", error);
    }
  }

  return null;
}

// Registrar o bidder
registerBidder(spec);
