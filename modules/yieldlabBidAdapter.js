import { _each, deepAccess, isArray, isFn, isPlainObject, timestamp } from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { find } from '../src/polyfill.js'
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js'
import { Renderer } from '../src/Renderer.js'
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const ENDPOINT = 'https://ad.yieldlab.net'
const BIDDER_CODE = 'yieldlab'
const BID_RESPONSE_TTL_SEC = 300
const CURRENCY_CODE = 'EUR'
const OUTSTREAMPLAYER_URL = 'https://ad.adition.com/dynamic.ad?a=o193092&ma_loadEvent=ma-start-event'
const GVLID = 70
const DIMENSION_SIGN = 'x'

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [VIDEO, BANNER, NATIVE],

  /**
   * @param {object} bid
   * @returns {boolean}
   */
  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.adslotId && bid.params.supplyId) {
      return true
    }
    return false
  },

  /**
   * This method should build correct URL
   * @param {BidRequest[]} validBidRequests
   * @param [bidderRequest]
   * @returns {ServerRequest|ServerRequest[]}
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const adslotIds = []
    const adslotSizes = [];
    const timestamp = Date.now()
    const query = {
      ts: timestamp,
      json: true
    }

    _each(validBidRequests, function (bid) {
      adslotIds.push(bid.params.adslotId)
      const sizes = extractSizes(bid)
      if (sizes.length > 0) {
        adslotSizes.push(bid.params.adslotId + ':' + sizes.join('|'))
      }
      if (bid.params.extId) {
        query.id = bid.params.extId;
      }
      if (bid.params.targeting) {
        query.t = createTargetingString(bid.params.targeting)
      }
      if (bid.userIdAsEids && Array.isArray(bid.userIdAsEids)) {
        query.ids = createUserIdString(bid.userIdAsEids)
      }
      if (bid.params.customParams && isPlainObject(bid.params.customParams)) {
        for (const prop in bid.params.customParams) {
          query[prop] = bid.params.customParams[prop]
        }
      }
      if (bid.schain && isPlainObject(bid.schain) && Array.isArray(bid.schain.nodes)) {
        query.schain = createSchainString(bid.schain)
      }

      const iabContent = getContentObject(bid)
      if (iabContent) {
        query.iab_content = createIabContentString(iabContent)
      }
      const floor = getBidFloor(bid, sizes)
      if (floor) {
        query.floor = floor;
      }
    })

    if (bidderRequest) {
      if (bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
        // TODO: is 'page' the right value here?
        query.pubref = bidderRequest.refererInfo.page
      }

      if (bidderRequest.gdprConsent) {
        query.gdpr = (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
        if (query.gdpr) {
          query.consent = bidderRequest.gdprConsent.consentString
        }
      }
    }

    const adslots = adslotIds.join(',')
    if (adslotSizes.length > 0) {
      query.sizes = adslotSizes.join(',')
    }
    const queryString = createQueryString(query)

    return {
      method: 'GET',
      url: `${ENDPOINT}/yp/${adslots}?${queryString}`,
      validBidRequests: validBidRequests,
      queryParams: query
    }
  },

  /**
   * Map ad values and pricing and stuff
   * @param {ServerResponse} serverResponse
   * @param {BidRequest} originalBidRequest
   * @returns {Bid[]}
   */
  interpretResponse: function (serverResponse, originalBidRequest) {
    const bidResponses = []
    const timestamp = Date.now()
    const reqParams = originalBidRequest.queryParams

    originalBidRequest.validBidRequests.forEach(function (bidRequest) {
      if (!serverResponse.body) {
        return
      }

      const matchedBid = find(serverResponse.body, function (bidResponse) {
        return bidRequest.params.adslotId == bidResponse.id
      })

      if (matchedBid) {
        const adUnitSize = bidRequest.sizes.length === 2 && !isArray(bidRequest.sizes[0]) ? bidRequest.sizes : bidRequest.sizes[0]
        const adSize = bidRequest.params.adSize !== undefined ? parseSize(bidRequest.params.adSize) : (matchedBid.adsize !== undefined) ? parseSize(matchedBid.adsize) : adUnitSize
        const extId = bidRequest.params.extId !== undefined ? '&id=' + bidRequest.params.extId : ''
        const adType = matchedBid.adtype !== undefined ? matchedBid.adtype : ''
        const gdprApplies = reqParams.gdpr ? '&gdpr=' + reqParams.gdpr : ''
        const gdprConsent = reqParams.consent ? '&consent=' + reqParams.consent : ''
        const pvId = matchedBid.pvid !== undefined ? '&pvid=' + matchedBid.pvid : ''
        const iabContent = reqParams.iab_content ? '&iab_content=' + reqParams.iab_content : ''

        const bidResponse = {
          requestId: bidRequest.bidId,
          cpm: matchedBid.price / 100,
          width: adSize[0],
          height: adSize[1],
          creativeId: '' + matchedBid.id,
          dealId: (matchedBid['c.dealid']) ? matchedBid['c.dealid'] : matchedBid.pid,
          currency: CURRENCY_CODE,
          netRevenue: false,
          ttl: BID_RESPONSE_TTL_SEC,
          referrer: '',
          ad: `<script src="${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/?ts=${timestamp}${extId}${gdprApplies}${gdprConsent}${pvId}${iabContent}"></script>`,
          meta: {
            advertiserDomains: (matchedBid.advertiser) ? matchedBid.advertiser : 'n/a'
          }
        }

        if (isVideo(bidRequest, adType)) {
          const playersize = getPlayerSize(bidRequest)
          if (playersize) {
            bidResponse.width = playersize[0]
            bidResponse.height = playersize[1]
          }
          bidResponse.mediaType = VIDEO
          bidResponse.vastUrl = `${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/?ts=${timestamp}${extId}${gdprApplies}${gdprConsent}${pvId}${iabContent}`
          if (isOutstream(bidRequest)) {
            const renderer = Renderer.install({
              id: bidRequest.bidId,
              url: OUTSTREAMPLAYER_URL,
              loaded: false
            })
            renderer.setRender(outstreamRender)
            bidResponse.renderer = renderer
          }
        }

        if (isNative(bidRequest, adType)) {
          // there may be publishers still rely on it
          const url = `${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/?ts=${timestamp}${extId}${gdprApplies}${gdprConsent}${pvId}`
          bidResponse.adUrl = url
          bidResponse.mediaType = NATIVE
          const nativeImageAssetObj = find(matchedBid.native.assets, e => e.id === 2)
          const nativeImageAsset = nativeImageAssetObj ? nativeImageAssetObj.img : { url: '', w: 0, h: 0 };
          const nativeTitleAsset = find(matchedBid.native.assets, e => e.id === 1)
          const nativeBodyAsset = find(matchedBid.native.assets, e => e.id === 3)
          bidResponse.native = {
            title: nativeTitleAsset ? nativeTitleAsset.title.text : '',
            body: nativeBodyAsset ? nativeBodyAsset.data.value : '',
            image: {
              url: nativeImageAsset.url,
              width: nativeImageAsset.w,
              height: nativeImageAsset.h,
            },
            clickUrl: matchedBid.native.link.url,
            impressionTrackers: matchedBid.native.imptrackers,
          };
        }

        bidResponses.push(bidResponse)
      }
    })
    return bidResponses
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @param {Object} gdprConsent Is the GDPR Consent object wrapping gdprApplies {boolean} and consentString {string} attributes.
   * @param {string} uspConsent Is the US Privacy Consent string.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];

    if (syncOptions.iframeEnabled) {
      const params = [];
      params.push(`ts=${timestamp()}`);
      params.push(`type=h`)
      if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
        params.push(`gdpr=${Number(gdprConsent.gdprApplies)}`);
      }
      if (gdprConsent && (typeof gdprConsent.consentString === 'string')) {
        params.push(`gdpr_consent=${gdprConsent.consentString}`);
      }
      syncs.push({
        type: 'iframe',
        url: `${ENDPOINT}/d/6846326/766/2x2?${params.join('&')}`
      });
    }

    return syncs;
  }
};

/**
 * Is this a video format?
 * @param {Object} format
 * @param {String} adtype
 * @returns {Boolean}
 */
function isVideo(format, adtype) {
  return deepAccess(format, 'mediaTypes.video') && adtype.toLowerCase() === 'video'
}

/**
 * Is this a native format?
 * @param {Object} format
 * @param {String} adtype
 * @returns {Boolean}
 */
function isNative(format, adtype) {
  return deepAccess(format, 'mediaTypes.native') && adtype.toLowerCase() === 'native'
}

/**
 * Is this an outstream context?
 * @param {Object} format
 * @returns {Boolean}
 */
function isOutstream(format) {
  const context = deepAccess(format, 'mediaTypes.video.context')
  return (context === 'outstream')
}

/**
 * Gets optional player size
 * @param {Object} format
 * @returns {Array}
 */
function getPlayerSize(format) {
  const playerSize = deepAccess(format, 'mediaTypes.video.playerSize')
  return (playerSize && isArray(playerSize[0])) ? playerSize[0] : playerSize
}

/**
 * Expands a 'WxH' string as a 2-element [W, H] array
 * @param {String} size
 * @returns {Array}
 */
function parseSize(size) {
  return size.split(DIMENSION_SIGN).map(Number)
}

/**
 * Creates a string out of an array of eids with source and uid
 * @param {Array} eids
 * @returns {String}
 */
function createUserIdString(eids) {
  const str = []
  for (let i = 0; i < eids.length; i++) {
    str.push(eids[i].source + ':' + eids[i].uids[0].id)
  }
  return str.join(',')
}

/**
 * Creates a querystring out of an object with key-values
 * @param {Object} obj
 * @returns {String}
 */
function createQueryString(obj) {
  const str = []
  for (const p in obj) {
    if (obj.hasOwnProperty(p)) {
      const val = obj[p]
      if (p !== 'schain' && p !== 'iab_content') {
        str.push(encodeURIComponent(p) + '=' + encodeURIComponent(val))
      } else {
        str.push(p + '=' + val)
      }
    }
  }
  return str.join('&')
}

/**
 * Creates an unencoded targeting string out of an object with key-values
 * @param {Object} obj
 * @returns {String}
 */
function createTargetingString(obj) {
  const str = []
  for (const p in obj) {
    if (obj.hasOwnProperty(p)) {
      const key = p
      const val = obj[p]
      str.push(key + '=' + val)
    }
  }
  return str.join('&')
}

/**
 * Creates a string out of a schain object
 * @param {Object} schain
 * @returns {String}
 */
function createSchainString(schain) {
  const ver = schain.ver || ''
  const complete = (schain.complete === 1 || schain.complete === 0) ? schain.complete : ''
  const keys = ['asi', 'sid', 'hp', 'rid', 'name', 'domain', 'ext']
  const nodesString = schain.nodes.reduce((acc, node) => {
    return acc += `!${keys.map(key => node[key] ? encodeURIComponentWithBangIncluded(node[key]) : '').join(',')}`
  }, '')
  return `${ver},${complete}${nodesString}`
}

/**
 * Get content object from bid request
 * First get content from bidder params;
 * If not provided in bidder params, get from first party data under 'ortb2.site.content' or 'ortb2.app.content'
 * @param {Object} bid
 * @returns {Object}
 */
function getContentObject(bid) {
  if (bid.params.iabContent && isPlainObject(bid.params.iabContent)) {
    return bid.params.iabContent
  }

  const globalContent = deepAccess(bid, 'ortb2.site') ? deepAccess(bid, 'ortb2.site.content')
    : deepAccess(bid, 'ortb2.app.content')
  if (globalContent && isPlainObject(globalContent)) {
    return globalContent
  }
  return undefined
}

/**
 * Creates a string for iab_content object
 * @param {Object} iabContent
 * @returns {String}
 */
function createIabContentString(iabContent) {
  const arrKeys = ['keywords', 'cat']
  const str = []
  for (const key in iabContent) {
    if (iabContent.hasOwnProperty(key)) {
      const value = (arrKeys.indexOf(key) !== -1 && Array.isArray(iabContent[key]))
        ? iabContent[key].map(node => encodeURIComponent(node)).join('|') : encodeURIComponent(iabContent[key])
      str.push(''.concat(key, ':', value))
    }
  }
  return encodeURIComponent(str.join(','))
}

/**
 * Encodes URI Component with exlamation mark included. Needed for schain object.
 * @param {String} str
 * @returns {String}
 */
function encodeURIComponentWithBangIncluded(str) {
  return encodeURIComponent(str).replace(/!/g, '%21')
}

/**
 * Handles an outstream response after the library is loaded
 * @param {Object} bid
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ma_width = bid.width
    window.ma_height = bid.height
    window.ma_vastUrl = bid.vastUrl
    window.ma_container = bid.adUnitCode
    window.document.dispatchEvent(new Event('ma-start-event'))
  });
}

/**
 * Extract sizes for a given bid from either `mediaTypes` or `sizes` directly.
 *
 * @param {Object} bid
 * @returns {string[]}
 */
function extractSizes(bid) {
  const { mediaTypes } = bid // see https://docs.prebid.org/dev-docs/adunit-reference.html#examples
  const sizes = []

  if (isPlainObject(mediaTypes)) {
    const { [BANNER]: bannerType } = mediaTypes

    // only applies for multi size Adslots -> BANNER
    if (bannerType && isArray(bannerType.sizes)) {
      if (isArray(bannerType.sizes[0])) { // multiple sizes given
        sizes.push(bannerType.sizes)
      } else { // just one size provided as array -> wrap to uniformly flatten later
        sizes.push([bannerType.sizes])
      }
    }
    // The bid top level field `sizes` is deprecated and should not be used anymore. Keeping it for compatibility.
  } else if (isArray(bid.sizes)) {
    if (isArray(bid.sizes[0])) {
      sizes.push(bid.sizes)
    } else {
      sizes.push([bid.sizes])
    }
  }

  /** @type {Set<string>} */
  const deduplicatedSizeStrings = new Set(sizes.flat().map(([width, height]) => width + DIMENSION_SIGN + height))

  return Array.from(deduplicatedSizeStrings)
}

/**
 * Gets the floor price if the Price Floors Module is enabled for a given auction,
 * which will add the getFloor() function to the bidRequest object.
 *
 * @param {Object} bid
 * @param {string[]} sizes
 * @returns The floor CPM of a matched rule based on the rule selection process (mediaType, size and currency),
 *          using the getFloor() inputs. Multi sizes and unsupported media types will default to '*'
 */
function getBidFloor(bid, sizes) {
  if (!isFn(bid.getFloor)) {
    return undefined;
  }
  const mediaTypes = deepAccess(bid, 'mediaTypes');
  const mediaType = mediaTypes !== undefined ? Object.keys(mediaTypes)[0].toLowerCase() : undefined;
  const floor = bid.getFloor({
    currency: CURRENCY_CODE,
    mediaType: mediaType !== undefined && spec.supportedMediaTypes.includes(mediaType) ? mediaType : '*',
    size: sizes.length !== 1 ? '*' : extractSizes(sizes)
  });
  if (floor.currency === CURRENCY_CODE) {
    return floor.floor;
  }
  return undefined;
}

registerBidder(spec)
