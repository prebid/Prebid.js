import {BANNER} from '../src/mediaTypes.js'
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {replaceAuctionPrice, generateUUID, isPlainObject, isArray} from '../src/utils.js'

const BIDDER_CODE = 'MediaConsortium'
const RELAY_ENDPOINT = 'https://relay.hubvisor.io/v1/auction/big'

export const spec = {
  version: '0.0.1',
  code: BIDDER_CODE,
  gvlid: 1112,
  supportedMediaTypes: [BANNER],
  isBidRequestValid(bid) {
    return true
  },
  buildRequests(bidRequests, bidderRequest) {
    const {auctionId, bids, gdprConsent, ortb2: {device, site}} = bidderRequest

    const impressions = bids.map((bidRequest) => {
      const {bidId, adUnitCode, mediaTypes} = bidRequest

      return {id: bidId, adUnitCode, mediaTypes}
    })

    const request = {
      id: auctionId ?? generateUUID(),
      impressions,
      device,
      site,
      user: {
        ids: {}
      },
      regulations: {
        gdpr: {
          applies: gdprConsent?.gdprApplies ?? false,
          consentString: gdprConsent?.consentString
        }
      },
      timeout: 3600,
      ts: performance.now()
    }

    const fpId = getFpIdFromLocalStorage()

    if (fpId) {
      request.user.ids['1plusX'] = fpId
    }

    return {
      method: 'POST',
      url: RELAY_ENDPOINT,
      data: request
    }
  },
  interpretResponse(serverResponse, params) {
    if (!isValidResponse(serverResponse)) return []

    const end = performance.now()

    const {
      body: {
        id: auctionId,
        bids,
        partners: {
          onePlusX, xandr
        }
      }
    } = serverResponse

    xandr.placements.map(({id, hasBid}) => {
      sendEventToGA4('rev_Hbv_Request', {
        cookies: document.cookie,
        user_agent: navigator.userAgent,
        request_url: RELAY_ENDPOINT,
        fpid: onePlusX.fpid,
        placement_id: id,
        auction_id: auctionId
      }, params.data.ts)
    })

    const opeaud = onePlusX.opeaud ?? []
    const opectx = onePlusX.opectx ?? []

    sendEventToGA4('rev_1px_Request', {
      cookies: document.cookie,
      user_agent: navigator.userAgent,
      request_url: onePlusX.url
    }, onePlusX.start)

    sendEventToGA4('rev_1px_Response', {
      execution_time: onePlusX.end - onePlusX.start,
      key_value: opeaud.concat(opectx).join(',')
    }, onePlusX.end)
    if (document.querySelector('#status-1plusx')) {
      document.querySelector('#status-1plusx').innerText = (onePlusX.end - onePlusX.start).toFixed(2)
    }

    xandr.placements.map(({id, hasBid}) => {
      sendEventToGA4('rev_APX_Request', {
        cookies: document.cookie,
        user_agent: navigator.userAgent,
        request_url: xandr.url,
        fpid: onePlusX.fpid,
        placement_id: id,
        auction_id: auctionId
      }, xandr.start)

      sendEventToGA4('rev_APX_Response', {
        is_nobid: !hasBid,
        auction_id: auctionId,
        execution_time: xandr.end - xandr.start
      }, xandr.end)
      if (document.querySelector('#status-appnexus')) {
        document.querySelector('#status-appnexus').innerText = (xandr.end - xandr.start).toFixed(2)
      }
    })

    sendEventToGA4('rev_Hbv_Response', {
      auction_id: auctionId,
      is_nobid: bids.length === 0,
      execution_time: end - params.data.ts
    })
    if (document.querySelector('#status-hubvisor')) {
      document.querySelector('#status-hubvisor').innerText = (end - params.data.ts).toFixed(2)
    }

    return bids.map((bid) => {
      const {
        impressionId,
        price: {cpm, currency},
        dealId,
        ad: {
          creative: {id, mediaType, size: {width, height}, markup}
        },
        ttl = 10
      } = bid

      const markupWithMacroReplaced = replaceAuctionPrice(markup, cpm)

      return {
        requestId: impressionId,
        cpm,
        currency,
        dealId,
        ttl,
        netRevenue: true,
        creativeId: id,
        mediaType,
        width,
        height,
        ad: markupWithMacroReplaced,
        adUrl: null
      }
    })
  }
}

registerBidder(spec)

function getFpIdFromLocalStorage() {
  try {
    return window.localStorage.getItem('ope_fpid')
  } catch (error) {
    return null
  }
}

function isValidResponse(response) {
  return isPlainObject(response) &&
      isPlainObject(response.body) &&
      isArray(response.body.bids)
}

function getSessionId() {
  const gaCookie = document.cookie.split('; ').find(row => row.startsWith('_ga'));
  if (!gaCookie) return null;
  const gaParts = gaCookie.split('.');
  if (gaParts.length < 4) return null;
  return gaParts[2] + '.' + gaParts[3];
}

async function getIpAndGeoLocation() {
  if (localStorage.getItem('prebid_ip') && localStorage.getItem('prebid_geoLocation')) {
    return {ip: localStorage.getItem('prebid_ip'), geoLocation: localStorage.getItem('prebid_geoLocation')};
  }
  const ip = (await fetch('https://api.ipify.org?format=json').then(r => r.json()))?.ip
  if (!ip) return {ip: null, geoLocation: null};
  const geoLocation = (await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json()))?.country;
  localStorage.setItem('prebid_ip', ip);
  localStorage.setItem('prebid_geoLocation', geoLocation);
  return {ip, geoLocation};
}

async function sendEventToGA4(eventName, additionalPayload, customTimestamp) {
  if (!additionalPayload) {
    additionalPayload = {};
  }

  const ts = customTimestamp ? new Date(customTimestamp).toISOString() : new Date().toISOString()
  const ipAndGeoLocation = await getIpAndGeoLocation();

  gtag('get', 'G-HZ5RJ58ZF9', 'client_id', (clientId) => {
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          ...additionalPayload,
          session_id: getSessionId(),
          time_stamp: ts,
          ip: ipAndGeoLocation?.ip,
          geo_location: ipAndGeoLocation?.geoLocation,
          current_url: window.location.href,
        }
      }]
    };

    console.log(`XXX Sending event (${eventName}) to GA4`, payload);

    fetch('https://www.google-analytics.com/mp/collect?measurement_id=G-HZ5RJ58ZF9&api_secret=qF3YrfxBTjmfe6sE_8aCMA', {
      mode: 'no-cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  });
}
