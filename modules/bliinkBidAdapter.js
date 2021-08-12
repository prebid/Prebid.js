// eslint-disable-next-line prebid/validate-imports
// eslint-disable-next-line prebid/validate-imports
import {registerBidder} from 'src/adapters/bidderFactory'

export const BIDDER_CODE = 'bliink'
export const BLIINK_ENDPOINT_ENGINE = 'https://engine.bliink.io/delivery'
export const BLIINK_ENDPOINT_ENGINE_VAST = 'https://engine-stg.bliink.io/vast'
export const BLIINK_ENDPOINT_COOKIE_SYNC = 'https://cookiesync.api.bliink.io'
export const META_KEYWORDS = 'keywords'
export const META_DESCRIPTION = 'description'

const VIDEO = 'video'
const NATIVE = 'native'
const BANNER = 'banner'

const supportedMediaTypes = [BANNER, VIDEO, NATIVE]
const aliasBidderCode = ['bk']

export function getMetaList(name) {
  if (!name || name.length === 0) return null

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

export function getMultipleMetaValue(query) {
  const metaEls = document.querySelectorAll(query)

  if (metaEls.length !== 0) {
    const values = []

    metaEls.forEach((metaEl) => {
      if (metaEl.content) {
        values.push(metaEl.content)
      }
    })

    return values
      .map((value) => value.trim())
      .join(',')
  }

  return null
}

export function getMetaValue(name, type = 1) {
  const metaList = getMetaList(name)

  let metaContent = ''

  metaList.forEach((meta) => {
    const method = type === 1 ? getOneMetaValue : getMultipleMetaValue
    const metaValue = method(`meta[${meta.key}=${meta.value}]`)

    if (metaValue) {
      metaContent = metaValue

      return null
    }
  })

  return metaContent
}

export function getKeywords() {
  if (
    getMetaValue(META_KEYWORDS)
  ) {
    const keywords = [
      ...getMetaValue(META_KEYWORDS).split(','),
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
  if (typeof content !== 'string' || content.length === 0) return ''

  const parser = new DOMParser()
  return parser.parseFromString(content, 'text/xml')
}

export const isXMLFormat = (content) => {
  if (typeof content !== 'string' || content.length === 0) return false

  const xml = parseXML(content)

  return xml.getElementsByTagName('VAST')[0] &&
    xml.getElementsByTagName('VAST')[0].tagName === 'VAST'
}

/**
 * @param bidRequest
 * @param bliinkCreative
 * @return {{cpm, netRevenue: boolean, ad: string, requestId, width: number, currency: string, mediaType: string, vastXml, ttl: number, creativeId, height: number}|null}
 */
export const buildBid = (bidRequest, bliinkCreative) => {
  if (!bidRequest && !bliinkCreative) return null

  const body = {
    requestId: bidRequest.bidId,
    cpm: bliinkCreative.price,
    creativeId: bliinkCreative.id,
    currency: 'EUR',
    netRevenue: false,
    width: 1,
    height: 1,
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

  return {
    ...body,
    currency: bliinkCreative.currency,
    width: 1,
    height: 1,
    mediaType: VIDEO,
    ad: '<html lang="en"></html>',
    vastXml: bliinkCreative.content,
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
    data = {
      ...data,
      gdpr: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies,
      gdpr_consent: bidderRequest.gdprConsent.consentString
    }
  }

  if (bidderRequest.bids && bidderRequest.bids.length > 0 && bidderRequest.bids[0].sizes && bidderRequest.bids[0].sizes[0]) {
    data = {
      ...data,
      width: bidderRequest.bids[0].sizes[0][0],
      height: bidderRequest.bids[0].sizes[0][1]
    }

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
  if ((serverResponse && serverResponse.mode === 'no-ad') && (!request.params)) {
    return []
  }

  const body = serverResponse.body
  const serverBody = request.params

  if (body && typeof body === 'string' && isXMLFormat(serverResponse.body)) {
    const xml = parseXML(serverResponse.body)

    const price = xml.getElementsByTagName('Price') && xml.getElementsByTagName('Price')[0]
    const currency = xml.getElementsByTagName('Currency') && xml.getElementsByTagName('Currency')[0]

    const creative = {
      content: serverResponse.body,
      price: (price && price.textContent) || 0,
      currency: (currency && currency.textContent) || 'EUR',
      id: '',
      media_type: 'video',
    }

    return buildBid(serverBody.bids[0], creative);
  }

  return []
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
  let gdprParams = ''

  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      gdprParams = `hasConsent=${Number(gdprConsent.gdprApplies)}&consentString=${gdprConsent.consentString}`
    } else {
      gdprParams = `consentString=${gdprConsent.consentString}`
    }
  }

  if (syncOptions.pixelEnabled && serverResponses.length > 0) {
    if (gdprConsent) {
      const UrlBliink = [
        `${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=smart&uid=[sas_uid]`,
        `${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=azerion&uid={PUB_USER_ID}`,
        `${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=appnexus&uid=$UID`,
        `https://ad.360yield.com/server_match?partner_id=1531&r=${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=azerion&uid={PUB_USER_ID}}`,
        `https://ads.stickyadstv.com/auto-user-sync`,
        `https://cookiesync.api.bliink.io/getuid?url=https%3A%2F%2Fvisitor.omnitagjs.com%2Fvisitor%2Fsync%3Fuid%3D1625272249969090bb9d544bd6d8d645%26name%3DBLIINK%26visitor%3D%24UID%26external%3Dtrue`,
        `https://pixel.advertising.com/ups/58444/sync?&gdpr=1&gdpr_consent=${gdprConsent.consentString}&redir=true&uid=sampleUserId`,
        `https://ups.analytics.yahoo.com/ups/58499/occ?gdpr=1&gdpr_consent=${gdprConsent.consentString}`,
        `https://secure.adnxs.com/getuid?${BLIINK_ENDPOINT_COOKIE_SYNC}/cookiesync?partner=appnexus&uid=$UID}`
      ]

      UrlBliink.forEach(item => {
        syncs = [
          ...syncs,
          {
            type: 'image',
            url: item + `&${gdprParams}`,
          },
        ]
      })

      return syncs
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
