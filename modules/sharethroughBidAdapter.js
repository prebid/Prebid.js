import { registerBidder } from 'src/adapters/bidderFactory';

const VERSION = '3.0.1';
const BIDDER_CODE = 'sharethrough';
const STR_ENDPOINT = document.location.protocol + '//btlr.sharethrough.com/header-bid/v1';

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,

  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,

  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map(bid => {
      let query = {
        bidId: bid.bidId,
        placement_key: bid.params.pkey,
        hbVersion: '$prebid.version$',
        strVersion: VERSION,
        hbSource: 'prebid',
        consent_required: false
      };

      if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) {
        query.consent_string = bidderRequest.gdprConsent.consentString;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        query.consent_required = !!bidderRequest.gdprConsent.gdprApplies;
      }

      // Data that does not need to go to the server,
      // but we need as part of interpretResponse()
      const strData = {
        stayInIframe: bid.params.iframe,
        iframeSize: bid.params.iframeSize,
        sizes: bid.sizes
      }

      return {
        method: 'GET',
        url: STR_ENDPOINT,
        data: query,
        strData: strData
      };
    })
  },

  interpretResponse: ({ body }, req) => {
    if (!body || !body.creatives || !body.creatives.length) {
      return [];
    }

    const creative = body.creatives[0];
    let size = [0, 0];
    if (req.strData.stayInIframe) {
      size = req.strData.iframeSize != undefined
        ? req.strData.iframeSize
        : getLargestSize(req.strData.sizes);
    }

    return [{
      requestId: req.data.bidId,
      width: size[0],
      height: size[1],
      cpm: creative.cpm,
      creativeId: creative.creative.creative_key,
      dealId: creative.creative.deal_id,
      currency: 'USD',
      netRevenue: true,
      ttl: 360,
      ad: generateAd(body, req)
    }];
  },

  getUserSyncs: (syncOptions, serverResponses) => {
    const syncs = [];
    const shouldCookieSync = syncOptions.pixelEnabled &&
                             serverResponses.length > 0 &&
                             serverResponses[0].body &&
                             serverResponses[0].body.cookieSyncUrls;

    if (shouldCookieSync) {
      serverResponses[0].body.cookieSyncUrls.forEach(url => {
        syncs.push({ type: 'image', url: url });
      });
    }

    return syncs;
  }
}

function getLargestSize(sizes) {
  function area(size) {
    return size[0] * size[1];
  }

  return sizes.reduce((prev, current) => {
    if (area(current) > area(prev)) {
      return current
    } else {
      return prev
    }
  }, [0, 0]);
}

function generateAd(body, req) {
  const strRespId = `str_response_${req.data.bidId}`;

  let adMarkup = `
    <div data-str-native-key="${req.data.placement_key}" data-stx-response-name="${strRespId}">
    </div>
    <script>var ${strRespId} = "${b64EncodeUnicode(JSON.stringify(body))}"</script>
  `

  if (req.strData.stayInIframe) {
    // Don't break out of iframe
    adMarkup = adMarkup + `<script src="//native.sharethrough.com/assets/sfp.js"></script>`
  } else {
    // Break out of iframe
    adMarkup = adMarkup + `
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
    </script>`
  }

  return adMarkup;
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
