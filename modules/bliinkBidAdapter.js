// eslint-disable-next-line prebid/validate-imports
// eslint-disable-next-line prebid/validate-imports
import {registerBidder} from '../src/adapters/bidderFactory.js'
export const BIDDER_CODE = 'bliink'
export const BLIINK_ENDPOINT_ENGINE = 'https://engine.bliink.io/delivery'
export const BLIINK_ENDPOINT_ENGINE_VAST = 'https://engine.bliink.io/vast'
export const BLIINK_ENDPOINT_COOKIE_SYNC = 'https://cookiesync.api.bliink.io'
export const META_KEYWORDS = 'keywords'
export const META_DESCRIPTION = 'description'

const VIDEO = 'video'
const BANNER = 'banner'

const supportedMediaTypes = [BANNER, VIDEO]
const aliasBidderCode = ['bk']

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

  return null
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
      return keywords
        .filter((value) => value)
        .map((value) => value.trim())
    }
  }

  return []
}

export const parseXML = (content) => {
  if (typeof content !== 'string' || content.length === 0) return null

  const parser = new DOMParser()
  let xml;

  try {
    xml = parser.parseFromString(content, 'text/xml')
  } catch (e) {}

  if (xml &&
    xml.getElementsByTagName('VAST')[0] &&
    xml.getElementsByTagName('VAST')[0].tagName === 'VAST') {
    return xml
  }

  return null
}

/**
 * @param bidRequest
 * @param bliinkCreative
 * @return {{cpm, netRevenue: boolean, requestId, width: (*|number), currency, ttl: number, creativeId, height: (*|number)} & {mediaType: string, vastXml}}
 */
export const buildBid = (bidRequest, bliinkCreative) => {
  if (!bidRequest && !bliinkCreative) return null

  const body = {
    requestId: bidRequest.bidId,
    currency: bliinkCreative.currency,
    cpm: bliinkCreative.price,
    creativeId: bliinkCreative.creativeId,
    width: (bidRequest.sizes && bidRequest.sizes[0][0]) || 1,
    height: (bidRequest.sizes && bidRequest.sizes[0][1]) || 1,
    netRevenue: false,
    ttl: 3600,
  }

  // eslint-disable-next-line no-mixed-operators
  if ((bliinkCreative) && bidRequest &&
    // eslint-disable-next-line no-mixed-operators
    !bidRequest.bidId ||
    !bidRequest.sizes ||
    !bidRequest.params ||
    !(bidRequest.params.placement)
  ) return null

  delete bidRequest['bids']

  switch (bliinkCreative.media_type) {
    case VIDEO:
      return Object.assign(body, {
        mediaType: VIDEO,
        vastXml: bliinkCreative.content,
      })
    case BANNER:
      return Object.assign(body, {
        mediaType: BANNER,
        ad: (bliinkCreative && bliinkCreative.content && bliinkCreative.content.creative && bliinkCreative.content.creative.adm) || '',
      })
    default:
      break;
  }
}

/**
 * @description Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
 *
 * @param bid
 * @return boolean
 */
export const isBidRequestValid = (bid) => {
  return !(!bid || !bid.params || !bid.params.placement || !bid.params.tagId)
}

/**
 * @description Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
 *
 * @param _[]
 * @param bidderRequest
 * @return {{ method: string, url: string } | null}
 */
export const buildRequests = (_, bidderRequest) => {
  if (!bidderRequest) return null

  let data = {
    pageUrl: bidderRequest.refererInfo.referer,
    pageDescription: getMetaValue(META_DESCRIPTION),
    keywords: getKeywords().join(','),
    gdpr: false,
    gdpr_consent: '',
    pageTitle: document.title,
  }

  const endPoint = bidderRequest.bids[0].params.placement === VIDEO ? BLIINK_ENDPOINT_ENGINE_VAST : BLIINK_ENDPOINT_ENGINE

  const params = {
    bidderRequestId: bidderRequest.bidderRequestId,
    bidderCode: bidderRequest.bidderCode,
    bids: bidderRequest.bids,
    refererInfo: bidderRequest.refererInfo,
  }

  if (bidderRequest.gdprConsent) {
    data = Object.assign(data, {
      gdpr: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies,
      gdpr_consent: bidderRequest.gdprConsent.consentString
    })
  }

  if (bidderRequest.bids && bidderRequest.bids.length > 0 && bidderRequest.bids[0].sizes && bidderRequest.bids[0].sizes[0]) {
    data = Object.assign(data, {
      width: bidderRequest.bids[0].sizes[0][0],
      height: bidderRequest.bids[0].sizes[0][1]
    })

    return {
      method: 'GET',
      url: `${endPoint}/${bidderRequest.bids[0].params.tagId}`,
      data: data,
      params: params,
    }
  }

  return null
}

/**
 * @description Parse the response (from buildRequests) and generate one or more bid objects.
 *
 * @param serverResponse
 * @param request
 * @return
 */
const interpretResponse = (serverResponse, request) => {
  if ((serverResponse && serverResponse.mode === 'no-ad')) {
    return []
  }

  const body = serverResponse.body
  const serverBody = request.params

  const xml = parseXML(body)

  let creative;

  switch (serverBody.bids[0].params.placement) {
    case xml && VIDEO:
      const price = xml.getElementsByTagName('Price') && xml.getElementsByTagName('Price')[0]
      const currency = xml.getElementsByTagName('Currency') && xml.getElementsByTagName('Currency')[0]
      const creativeId = xml.getElementsByTagName('CreativeId') && xml.getElementsByTagName('CreativeId')[0]

      creative = {
        content: body,
        price: (price && price.textContent) || 0,
        currency: (currency && currency.textContent) || 'EUR',
        creativeId: creativeId || 0,
        media_type: 'video',
      }

      return buildBid(serverBody.bids[0], creative)
    case BANNER:
      if (body) {
        creative = {
          content: body,
          price: body.price,
          currency: body.currency,
          creativeId: 0,
          media_type: 'banner',
        }

        return buildBid(serverBody.bids[0], creative)
      }

      break
    default:
      break
  }
}

/**
 * @description  If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs. For more information, see Registering User Syncs below
 * @param syncOptions
 * @param serverResponses
 * @param gdprConsent
 * @return {[{type: string, url: string}]|*[]}
 */
const getUserSyncs = (syncOptions, serverResponses, gdprConsent) => {
  let syncs = []

  if (syncOptions.pixelEnabled && serverResponses.length > 0) {
    if (gdprConsent) {
      const gdprParams = `consentString=${gdprConsent.consentString}`
      const smartCallbackURL = encodeURIComponent(`${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=smart&uid=[sas_uid]`)
      const azerionCallbackURL = encodeURIComponent(`${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=azerion&uid={PUB_USER_ID}`)
      const appnexusCallbackURL = encodeURIComponent(`${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=azerion&uid=$UID`)
      return [
        {
          type: 'script',
          url: 'https://prg.smartadserver.com/ac?out=js&nwid=3392&siteid=305791&pgname=rg&fmtid=81127&tgt=[sas_target]&visit=m&tmstp=[timestamp]&clcturl=[countgo]'
        },
        {
          type: 'image',
          url: `https://sync.smartadserver.com/getuid?nwid=3392&${gdprParams}&url=${smartCallbackURL}`,
        },
        {
          type: 'image',
          url: `https://ad.360yield.com/server_match?partner_id=1531&${gdprParams}&r=${azerionCallbackURL}`,
        },
        {
          type: 'image',
          url: `https://ads.stickyadstv.com/auto-user-sync?${gdprParams}`,
        },
        {
          type: 'image',
          url: `https://cookiesync.api.bliink.io/getuid?url=https%3A%2F%2Fvisitor.omnitagjs.com%2Fvisitor%2Fsync%3Fuid%3D1625272249969090bb9d544bd6d8d645%26name%3DBLIINK%26visitor%3D%24UID%26external%3Dtrue&${gdprParams}`,
        },
        {
          type: 'image',
          url: `https://cookiesync.api.bliink.io/getuid?url=https://pixel.advertising.com/ups/58444/sync?&gdpr=1&gdpr_consent=${gdprConsent.consentString}&redir=true&uid=$UID`,
        },
        {
          type: 'image',
          url: `https://ups.analytics.yahoo.com/ups/58499/occ?gdpr=1&gdpr_consent=${gdprConsent.consentString}`,
        },
        {
          type: 'image',
          url: `https://secure.adnxs.com/getuid?${appnexusCallbackURL}`,
        },
      ]
    }
  }

  return syncs;
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
}

registerBidder(spec)
