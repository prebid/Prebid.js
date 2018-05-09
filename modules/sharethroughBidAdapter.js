import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'sharethrough';
const VERSION = '2.0.0';
const STR_ENDPOINT = document.location.protocol + '//btlr.sharethrough.com/header-bid/v1';

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,
  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,
  buildRequests: (bidRequests) => {
    return bidRequests.map(bid => {
      return {
        method: 'GET',
        url: STR_ENDPOINT,
        data: {
          bidId: bid.bidId,
          placement_key: bid.params.pkey,
          hbVersion: '$prebid.version$',
          strVersion: VERSION,
          hbSource: 'prebid'
        }
      };
    })
  },
  interpretResponse: ({ body }, req) => {
    if (!Object.keys(body).length) return [];

    const creative = body.creatives[0];

    return [{
      requestId: req.data.bidId,
      width: 0,
      height: 0,
      cpm: creative.cpm,
      creativeId: creative.creative.creative_key,
      deal_id: creative.creative.deal_id,
      currency: 'USD',
      netRevenue: true,
      ttl: 360,
      ad: generateAd(body, req)
    }];
  }
}

function generateAd(body, req) {
  const strRespId = `str_response_${req.data.bidId}`;

  return `
    <div data-str-native-key="${req.data.placement_key}" data-stx-response-name="${strRespId}">
    </div>
    <script>var ${strRespId} = "${b64EncodeUnicode(JSON.stringify(body))}"</script>
    <script src="//native.sharethrough.com/assets/sfp-set-targeting.js"></script>
    <script>
    (function() {
      if (!(window.STR && window.STR.Tag) && !(window.top.STR && window.top.STR.Tag)) {
        const sfp_js = document.createElement('script');
        sfp_js.src = "//native.sharethrough.com/assets/sfp.js";
        sfp_js.type = 'text/javascript';
        sfp_js.charset = 'utf-8';
        try {
            window.top.document.getElementsByTagName('body')[0].appendChild(sfp_js);
        } catch (e) {
          console.log(e);
        }
      }
    })()
    </script>`;
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
function b64EncodeUnicode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
}

registerBidder(sharethroughAdapterSpec);
