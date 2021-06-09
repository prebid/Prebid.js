import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'byplay';
const ENDPOINT_URL = 'https://prebid.byplay.net/bidder';
const VIDEO_PLAYER_URL = 'https://cdn.byplay.net/prebid-byplay-v2.js';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  isBidRequestValid: (bid) => {
    return !!bid.params.sectionId;
  },
  buildRequests: function(validBidRequests) {
    return validBidRequests.map(req => {
      const payload = {
        requestId: req.bidId,
        sectionId: req.params.sectionId,
        ...(req.params.env ? { env: req.params.env } : {})
      };

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(payload),
        options: {
          withCredentials: false
        }
      };
    });
  },
  interpretResponse: (serverResponse, bidderRequest) => {
    const response = serverResponse.body;
    const data = JSON.parse(bidderRequest.data);
    const bidResponse = {
      requestId: data.requestId,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      creativeId: response.creativeId || '0',
      ttl: config.getConfig('_bidderTimeout'),
      currency: 'JPY',
      netRevenue: response.netRevenue,
      mediaType: VIDEO,
      vastXml: response.vastXml,
      renderer: createRenderer()
    };

    return [bidResponse];
  }
};

function createRenderer() {
  const renderer = Renderer.install({ url: VIDEO_PLAYER_URL });

  renderer.setRender(bid => {
    bid.renderer.push(() => {
      window.adtagRender(bid);
    });
  });

  return renderer;
}

registerBidder(spec);
