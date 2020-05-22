import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'hpmdnetwork';
const BIDDER_CODE_ALIAS = 'hpmd';
const HPMDNETWORK_HOST = '//banner.hpmdnetwork.ru/bidder/request';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'RUB';

export const spec = {
  code: BIDDER_CODE,
  aliases: [ BIDDER_CODE_ALIAS ],
  supportedMediaTypes: [ BANNER ],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
};

function isBidRequestValid(bid) {
  const { placementId } = bid.params;
  return !!placementId;
}

function buildRequests(validBidRequests, bidderRequest) {
  const payload = {};
  payload.places = [];

  validBidRequests.forEach((bidRequest) => {
    const place = {
      id: bidRequest.bidId,
      placementId: bidRequest.params.placementId + '',
    };
    payload.places.push(place);
  });

  payload.url = bidderRequest.refererInfo.referer;
  payload.settings = { currency: DEFAULT_CURRENCY };

  return {
    method: 'POST',
    url: HPMDNETWORK_HOST,
    data: payload,
  };
}

function interpretResponse(serverResponse) {
  const { body } = serverResponse;
  const bidResponses = [];

  if (body.bids) {
    body.bids.forEach((bid) => {
      const size = getCreativeSize(bid);
      const bidResponse = {
        requestId: bid.id,
        cpm: bid.cpm,
        ad: wrapDisplayUrl(bid.displayUrl),
        width: size.width,
        height: size.height,
        creativeId: bid.creativeId || generateRandomInt(),
        currency: bid.currency || DEFAULT_CURRENCY,
        netRevenue: true,
        ttl: bid.ttl || DEFAULT_TTL,
      };

      bidResponses.push(bidResponse);
    });
  }

  return bidResponses;
}

function wrapDisplayUrl(displayUrl) {
  return `<html><head></head><body style="margin:0;width:0;height:0;"><script async src="${displayUrl}"></script></body></html>`;
}

function getCreativeSize(creativeSize) {
  const size = {
    width: 1,
    height: 1,
  };

  if (!!creativeSize.width && creativeSize.width !== -1) {
    size.width = creativeSize.width;
  }
  if (!!creativeSize.height && creativeSize.height !== -1) {
    size.height = creativeSize.height;
  }

  return size;
}

function generateRandomInt() {
  return Math.random().toString(16).substring(2);
}

registerBidder(spec);
