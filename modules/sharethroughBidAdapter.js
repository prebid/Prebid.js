import { registerBidder } from '../src/adapters/bidderFactory';

const VERSION = '3.2.0';
const BIDDER_CODE = 'sharethrough';
const STR_ENDPOINT = 'https://btlr.sharethrough.com/WYu2BXv1/v1';
const DEFAULT_SIZE = [1, 1];

// this allows stubbing of utility function that is used internally by the sharethrough adapter
export const sharethroughInternal = {
  b64EncodeUnicode,
  handleIframe,
  isLockedInFrame,
  getProtocol
};

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,

  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,

  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map(bidRequest => {
      let query = {
        placement_key: bidRequest.params.pkey,
        bidId: bidRequest.bidId,
        consent_required: false,
        instant_play_capable: canAutoPlayHTML5Video(),
        hbSource: 'prebid',
        hbVersion: '$prebid.version$',
        strVersion: VERSION
      };

      const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
      query.secure = nonHttp || (sharethroughInternal.getProtocol().indexOf('https') > -1);

      if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) {
        query.consent_string = bidderRequest.gdprConsent.consentString;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        query.consent_required = !!bidderRequest.gdprConsent.gdprApplies;
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        query.us_privacy = bidderRequest.uspConsent
      }

      if (bidRequest.userId && bidRequest.userId.tdid) {
        query.ttduid = bidRequest.userId.tdid;
      }

      if (bidRequest.schain) {
        query.schain = JSON.stringify(bidRequest.schain);
      }

      if (bidRequest.bidfloor) {
        query.bidfloor = parseFloat(bidRequest.bidfloor);
      }

      // Data that does not need to go to the server,
      // but we need as part of interpretResponse()
      const strData = {
        skipIframeBusting: bidRequest.params.iframe,
        iframeSize: bidRequest.params.iframeSize,
        sizes: bidRequest.sizes
      };

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
    let size = DEFAULT_SIZE;
    if (req.strData.iframeSize || req.strData.sizes.length) {
      size = req.strData.iframeSize
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

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const syncParams = uspConsent ? `&us_privacy=${uspConsent}` : '';
    const syncs = [];
    const shouldCookieSync = syncOptions.pixelEnabled &&
      serverResponses.length > 0 &&
      serverResponses[0].body &&
      serverResponses[0].body.cookieSyncUrls;

    if (shouldCookieSync) {
      serverResponses[0].body.cookieSyncUrls.forEach(url => {
        syncs.push({ type: 'image', url: url + syncParams });
      });
    }

    return syncs;
  },

  // Empty implementation for prebid core to be able to find it
  onTimeout: (data) => {},

  // Empty implementation for prebid core to be able to find it
  onBidWon: (bid) => {},

  // Empty implementation for prebid core to be able to find it
  onSetTargeting: (bid) => {}
};

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
  });
}

function generateAd(body, req) {
  const strRespId = `str_response_${req.data.bidId}`;

  let adMarkup = `
    <div data-str-native-key="${req.data.placement_key}" data-stx-response-name="${strRespId}">
    </div>
    <script>var ${strRespId} = "${b64EncodeUnicode(JSON.stringify(body))}"</script>
  `;

  if (req.strData.skipIframeBusting) {
    // Don't break out of iframe
    adMarkup = adMarkup + `<script src="//native.sharethrough.com/assets/sfp.js"></script>`;
  } else {
    // Add logic to the markup that detects whether or not in top level document is accessible
    // this logic will deploy sfp.js and/or iframe buster script(s) as appropriate
    adMarkup = adMarkup + `
      <script>
        (${sharethroughInternal.isLockedInFrame.toString()})()
      </script>
      <script>
        (${sharethroughInternal.handleIframe.toString()})()
      </script>`;
  }

  return adMarkup;
}

function handleIframe () {
  // only load iframe buster JS if we can access the top level document
  // if we are 'locked in' to this frame then no point trying to bust out: we may as well render in the frame instead
  var iframeBusterLoaded = false;
  if (!window.lockedInFrame) {
    var sfpIframeBusterJs = document.createElement('script');
    sfpIframeBusterJs.src = 'https://native.sharethrough.com/assets/sfp-set-targeting.js';
    sfpIframeBusterJs.type = 'text/javascript';
    try {
      window.document.getElementsByTagName('body')[0].appendChild(sfpIframeBusterJs);
      iframeBusterLoaded = true;
    } catch (e) {
      console.error(e);
    }
  }

  var clientJsLoaded = (!iframeBusterLoaded) ? !!(window.STR && window.STR.Tag) : !!(window.top.STR && window.top.STR.Tag);
  if (!clientJsLoaded) {
    var sfpJs = document.createElement('script');
    sfpJs.src = 'https://native.sharethrough.com/assets/sfp.js';
    sfpJs.type = 'text/javascript';

    // only add sfp js to window.top if iframe busting successfully loaded; otherwise, add to iframe
    try {
      if (iframeBusterLoaded) {
        window.top.document.getElementsByTagName('body')[0].appendChild(sfpJs);
      } else {
        window.document.getElementsByTagName('body')[0].appendChild(sfpJs);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// determines if we are capable of busting out of the iframe we are in
// if we catch a DOMException when trying to access top-level document, it means we're stuck in the frame we're in
function isLockedInFrame () {
  window.lockedInFrame = false;
  try {
    window.lockedInFrame = !window.top.document;
  } catch (e) {
    window.lockedInFrame = (e instanceof DOMException);
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
function b64EncodeUnicode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
}

function canAutoPlayHTML5Video() {
  const userAgent = navigator.userAgent;
  if (!userAgent) return false;

  const isAndroid = /Android/i.test(userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(userAgent);
  const chromeVersion = parseInt((/Chrome\/([0-9]+)/.exec(userAgent) || [0, 0])[1]);
  const chromeiOSVersion = parseInt((/CriOS\/([0-9]+)/.exec(userAgent) || [0, 0])[1]);
  const safariVersion = parseInt((/Version\/([0-9]+)/.exec(userAgent) || [0, 0])[1]);

  if (
    (isAndroid && chromeVersion >= 53) ||
    (isiOS && (safariVersion >= 10 || chromeiOSVersion >= 53)) ||
    !(isAndroid || isiOS)
  ) {
    return true;
  } else {
    return false;
  }
}

function getProtocol() {
  return document.location.protocol;
}

registerBidder(sharethroughAdapterSpec);
