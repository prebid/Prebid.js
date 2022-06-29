// eslint-disable-next-line prebid/validate-imports
// eslint-disable-next-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { config } from '../src/config.js'
import { _each, deepAccess, cleanObj } from '../src/utils.js'
export const BIDDER_CODE = 'bliink'
export const BLIINK_ENDPOINT_ENGINE = 'https://engine.bliink.io/prebid'

export const BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME = 'https://storage.googleapis.com/bliink-creatives-web-app/bliink/cookie_sync/index.html'
export const META_KEYWORDS = 'keywords'
export const META_DESCRIPTION = 'description'

const VIDEO = 'video'
const BANNER = 'banner'

const supportedMediaTypes = [BANNER, VIDEO]
const aliasBidderCode = ['bk']

/**
 * @description get coppa value from config
 */

function getCoppa() {
  return config.getConfig('coppa') === true ? 1 : 0;
}

export function getMetaList(name) {
  if (!name || name.length === 0) return []

  return [
    {
      key: 'name',
      value: name,
    },
    {
      key: 'name*',
      value: name,
    },
    {
      key: 'itemprop*',
      value: name,
    },
    {
      key: 'property',
      value: `'og:${name}'`,
    },
    {
      key: 'property',
      value: `'twitter:${name}'`,
    },
    {
      key: 'property',
      value: `'article:${name}'`,
    },
  ]
}

export function getOneMetaValue(query) {
  const metaEl = document.querySelector(query)

  if (metaEl && metaEl.content) {
    return metaEl.content
  }

  return null;
}

export function getMetaValue(name) {
  const metaList = getMetaList(name)
  for (let i = 0; i < metaList.length; i++) {
    const meta = metaList[i];
    const metaValue = getOneMetaValue(`meta[${meta.key}=${meta.value}]`);
    if (metaValue) {
      return metaValue
    }
  }
  return ''
}

export function getKeywords() {
  const metaKeywords = getMetaValue(META_KEYWORDS)
  if (metaKeywords) {
    const keywords = [
      ...metaKeywords.split(','),
    ]

    if (keywords && keywords.length > 0) {
      return keywords.filter((value) => value).map((value) => value.trim());
    }
  }

  return [];
}

export const parseXML = (content) => {
  if (typeof content !== 'string' || content.length === 0) return null

  const parser = new DOMParser()
  let xml;

  try {
    xml = parser.parseFromString(content, 'text/xml')
  } catch (e) {}

  if (
    xml &&
    xml.getElementsByTagName('VAST')[0] &&
    xml.getElementsByTagName('VAST')[0].tagName === 'VAST'
  ) {
    return xml;
  }

  return null;
};

/**
 * @param bidRequest
 * @param bliinkCreative
 * @return {{cpm, netRevenue: boolean, requestId, width: (*|number), currency, ttl: number, creativeId, height: (*|number)} & {mediaType: string, vastXml}}
 */
export const buildBid = (bidRequest, bliinkCreative) => {
  if (!bidRequest || !bliinkCreative || !bidRequest.creative || !bidRequest.creative[bliinkCreative.mediaType]) return null;

  const bidResponse = Object.assign(bliinkCreative, {
    cpm: bidRequest.price,
    currency: bidRequest.currency,
    creativeId: bidRequest.creative.creativeId,
    requestId: bidRequest.transactionId,
    width: bidRequest.creative[bliinkCreative.mediaType].width || 1,
    height: bidRequest.creative[bliinkCreative.mediaType].height || 1,
    ttl: 3600,
    netRevenue: true,
  });
  return bidResponse;
};

/**
 * @description Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
 *
 * @param bid
 * @return boolean
 */
export const isBidRequestValid = (bid) => {
  return !(!bid || !bid.params || !bid.params.placement || !bid.params.tagId);
};

/**
 * @description Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
 *
 * @param _[]
 * @param bidderRequest
 * @return {{ method: string, url: string } | null}
 */
export const buildRequests = (validBidRequests, bidderRequest) => {
  if (!bidderRequest) return null
  const schain = _getSchain(validBidRequests[0])
  const tags = bidderRequest.bids.map((bid) => {
    return {
      sizes: bid.sizes.map((size) => ({ w: size[0], h: size[1] })),
      id: bid.params.tagId,
      transactionId: bid.bidId,
      mediaTypes: Object.keys(bid.mediaTypes),
      imageUrl: '',
    };
  });

  const data = {
    schain: schain || {},
    pageTitle: document.title,
    pageUrl: bidderRequest.refererInfo.referer,
    pageDescription: getMetaValue(META_DESCRIPTION),
    keywords: getKeywords().join(','),
    gdpr: false,
    gdprConsent: '',
    tags: tags,
  };
  const gdprConsentData = _getGdprConsent(bidderRequest) || {};
  const postData = Object.assign(data, gdprConsentData);

  return {
    method: 'POST',
    url: BLIINK_ENDPOINT_ENGINE,
    data: postData,
  };
};

/**
 * @description Parse the response (from buildRequests) and generate one or more bid objects.
 *
 * @param serverResponse
 * @param request
 * @return
 */
const interpretResponse = (serverResponse, request) => {
  if (serverResponse && serverResponse.mode === 'no-ad') {
    return [];
  }
  const bodyResponse = serverResponse.body.bids
  const bidResponses = [];
  _each(bodyResponse, function (response) {
    let xml;
    if (response.creative.video && response.creative.video.content) {
      xml = parseXML(response.creative.video.content);
    }
    let creative;
    switch (response.creative.media_type) {
      case xml && VIDEO:
        const vastXml = response.creative.video.content
        creative = {
          mediaType: 'video',
          vastXml,
          vastUrl: 'data:text/xml;charset=utf-8;base64,' + btoa(vastXml.replace(/\\"/g, '"'))
        };

        return bidResponses.push(buildBid(response, creative));
      case BANNER:
        creative = {
          ad: response.creative.banner.adm,
          mediaType: 'banner',
        };
        return bidResponses.push(buildBid(response, creative));

      default:
        break;
    }
  });
  return bidResponses;
};

/**
 * @description  If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs. For more information, see Registering User Syncs below
 * @param syncOptions
 * @param serverResponses
 * @param gdprConsent
 * @return {[{type: string, url: string}]|*[]}
 */
const getUserSyncs = (syncOptions, serverResponses, gdprConsent) => {
  let syncs = [];
  if (syncOptions.pixelEnabled && serverResponses.length > 0) {
    if (gdprConsent) {
      const gdprParams = `consentString=${gdprConsent.consentString}`;
      const apiVersion = `apiVersion=${gdprConsent.apiVersion}`;
      let sync;
      if (syncOptions.iframeEnabled) {
        sync = [
          {
            type: 'iframe',
            url: `${BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME}?gdpr=${Number(
              gdprConsent.gdprApplies
            )}&coppa=${getCoppa()}&${gdprParams}&${apiVersion}`,
          },
        ];
      } else {
        sync = serverResponses[0].body.userSyncs;
      }

      return sync;
    }
  }

  return syncs;
};

function _getGdprConsent(bidderRequest) {
  if (!deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    gdprApplies,
    consentString,
  } = bidderRequest.gdprConsent;

  return cleanObj({
    gdprConsent: consentString,
    gdpr: gdprApplies,
  });
}

function _getSchain(bidRequest) {
  return deepAccess(bidRequest, 'schain');
}

/**
 * @type {{interpretResponse: interpretResponse, code: string, aliases: string[], getUserSyncs: getUserSyncs, buildRequests: buildRequests, onTimeout: onTimeout, onSetTargeting: onSetTargeting, isBidRequestValid: isBidRequestValid, onBidWon: onBidWon}}
 */
export const spec = {
  code: BIDDER_CODE,
  aliases: aliasBidderCode,
  supportedMediaTypes: supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
