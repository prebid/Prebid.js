import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";
import { getStorageManager } from "../src/storageManager.js";
import * as utils from "../src/utils.js";

const BIDDER_CODE = "bms";
const ENDPOINT_URL =
  "https://api.prebid.int.us-east-2.bluemsdev.team/v1/bid?exchangeId=prebid";
const GVLID = 620;
const COOKIE_NAME = "bmsCookieId";
const DEFAULT_CURRENCY = "USD";

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

function getBidFloor(bid) {
  if (utils.isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: BANNER,
      size: "*",
    });
    if (
      utils.isPlainObject(floor) &&
      !isNaN(floor.floor) &&
      floor.currency === DEFAULT_CURRENCY
    ) {
      return floor.floor;
    }
  }
  return null;
}

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
  utils.deepSetValue(request, "site.publisher.id", context.publisherId);

  // Adiciona geolocalização se disponível
  if (context.geo) {
    utils.deepSetValue(request, "device.geo", context.geo);
  }

  return request;
}

function imp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);
  const floor = getBidFloor(bidRequest);
  imp.tagid = bidRequest.params.placementId;

  if (floor) {
    imp.bidfloor = floor;
    imp.bidfloorcur = DEFAULT_CURRENCY;
  }

  return imp;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER], // Tipos de mídia suportados

  // Validar requisição de lance
  isBidRequestValid: function (bid) {
    return !!bid.params.placementId && !!bid.params.publisherId;
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
    utils.deepSetValue(ortbRequest, "ext.gvlid", GVLID);

    if (storage.localStorageIsEnabled()) {
      // Incluir ID do cookie do usuário, se disponível
      const ckid = storage.getDataFromLocalStorage(COOKIE_NAME) || null;
      if (ckid) {
        utils.deepSetValue(ortbRequest, "user.ext.buyerid", ckid);
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
  if (bidderRequest?.ortb2?.device?.geo) {
    return bidderRequest.ortb2.device.geo;
  }
  return null;
}

registerBidder(spec);
