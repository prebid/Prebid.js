import {BANNER, VIDEO} from '../src/mediaTypes.js'
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {generateUUID, isPlainObject, isArray, logWarn, deepClone} from '../src/utils.js'
import {Renderer} from '../src/Renderer.js'
import {OUTSTREAM} from '../src/video.js'
import {config} from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'mediaConsortium'

const PROFILE_API_USAGE_CONFIG_KEY = 'useProfileApi'
const ONE_PLUS_X_ID_USAGE_CONFIG_KEY = 'readOnePlusXId'

const SYNC_ENDPOINT = 'https://relay.hubvisor.io/v1/sync/big'
const AUCTION_ENDPOINT = 'https://relay.hubvisor.io/v1/auction/big'

const XANDR_OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

export const OPTIMIZATIONS_STORAGE_KEY = 'media_consortium_optimizations'

const SYNC_TYPES = {
  image: 'image',
  redirect: 'image',
  iframe: 'iframe'
}

const storageManager = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  version: '0.0.1',
  code: BIDDER_CODE,
  gvlid: 1112,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid(bid) {
    return true
  },
  buildRequests(bidRequests, bidderRequest) {
    const useProfileApi = config.getConfig(PROFILE_API_USAGE_CONFIG_KEY) ?? false
    const readOnePlusXId = config.getConfig(ONE_PLUS_X_ID_USAGE_CONFIG_KEY) ?? false

    const {
      auctionId,
      bids,
      gdprConsent: {gdprApplies = false, consentString} = {},
      ortb2: {device, site}
    } = bidderRequest

    const currentTimestamp = Date.now()
    const optimizations = getOptimizationsFromLocalStorage()

    const impressions = bids.reduce((acc, bidRequest) => {
      const {bidId, adUnitCode, mediaTypes} = bidRequest
      const optimization = optimizations[adUnitCode]

      if (optimization) {
        const {expiresAt, isEnabled} = optimization

        if (expiresAt >= currentTimestamp && !isEnabled) {
          return acc
        }
      }

      let finalizedMediatypes = deepClone(mediaTypes)

      if (mediaTypes.video && mediaTypes.video.context !== OUTSTREAM) {
        logWarn(`Filtering video request for adUnitCode ${adUnitCode} because context is not ${OUTSTREAM}`)

        if (Object.keys(finalizedMediatypes).length > 1) {
          delete finalizedMediatypes.video
        } else {
          return acc
        }
      }

      return acc.concat({id: bidId, adUnitCode, mediaTypes: finalizedMediatypes})
    }, [])

    if (!impressions.length) {
      return
    }

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
          applies: gdprApplies,
          consentString
        }
      },
      timeout: 3600,
      options: {
        useProfileApi
      }
    }

    if (readOnePlusXId) {
      const fpId = getFpIdFromLocalStorage()

      if (fpId) {
        request.user.ids['1plusX'] = fpId
      }
    }

    const syncData = {
      gdpr: gdprApplies,
      ad_unit_codes: impressions.map(({adUnitCode}) => adUnitCode).join(',')
    }

    if (consentString) {
      syncData.gdpr_consent = consentString
    }

    return [
      {
        method: 'GET',
        url: SYNC_ENDPOINT,
        data: syncData
      },
      {
        method: 'POST',
        url: AUCTION_ENDPOINT,
        data: request
      }
    ]
  },
  interpretResponse(serverResponse, params) {
    if (!isValidResponse(serverResponse)) return []

    const {body: {bids, optimizations}} = serverResponse

    if (optimizations && isArray(optimizations)) {
      const currentTimestamp = Date.now()

      const optimizationsToStore = optimizations.reduce((acc, optimization) => {
        const {adUnitCode, isEnabled, ttl} = optimization

        return {
          ...acc,
          [adUnitCode]: {isEnabled, expiresAt: currentTimestamp + ttl}
        }
      }, getOptimizationsFromLocalStorage())

      storageManager.setDataInLocalStorage(OPTIMIZATIONS_STORAGE_KEY, JSON.stringify(optimizationsToStore))
    }

    return bids.map((bid) => {
      const {
        impressionId,
        price: {cpm, currency},
        dealId,
        ad: {
          creative: {id, mediaType, size: {width, height}, markup}
        },
        ttl = 360
      } = bid

      const formattedBid = {
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
        ad: markup,
        adUrl: null
      }

      if (mediaType === VIDEO) {
        const impressionRequest = params.data.impressions.find(({id}) => id === impressionId)

        formattedBid.vastXml = markup

        if (impressionRequest) {
          formattedBid.renderer = buildXandrOutstreamRenderer(impressionId, impressionRequest.adUnitCode)
        } else {
          logWarn(`Could not find adUnitCode matching the impressionId ${impressionId} to setup the renderer`)
        }
      }

      return formattedBid
    })
  },
  getUserSyncs(syncOptions, serverResponses) {
    if (serverResponses.length !== 2) {
      return
    }

    const [sync] = serverResponses

    return sync.body?.bidders?.reduce((acc, {type, url}) => {
      const syncType = SYNC_TYPES[type]

      if (!syncType || !url) {
        return acc
      }

      return acc.concat({type: syncType, url})
    }, [])
  }
}

registerBidder(spec)

export function getOptimizationsFromLocalStorage() {
  try {
    const storedOptimizations = storageManager.getDataFromLocalStorage(OPTIMIZATIONS_STORAGE_KEY)

    return storedOptimizations ? JSON.parse(storedOptimizations) : {}
  } catch (err) {
    return {}
  }
}

function getFpIdFromLocalStorage() {
  try {
    return storageManager.getDataFromLocalStorage('ope_fpid')
  } catch (err) {
    return null
  }
}

function isValidResponse(response) {
  return isPlainObject(response) &&
      isPlainObject(response.body) &&
      isArray(response.body.bids)
}

function buildXandrOutstreamRenderer(bidId, adUnitCode) {
  const renderer = Renderer.install({
    id: bidId,
    url: XANDR_OUTSTREAM_RENDERER_URL,
    loaded: false,
    adUnitCode,
    targetId: adUnitCode
  });

  try {
    renderer.setRender(xandrOutstreamRenderer);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

function xandrOutstreamRenderer(bid) {
  const {width, height, adUnitCode, vastXml} = bid

  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [width, height],
      targetId: adUnitCode,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        content: vastXml,
        showVolume: false,
        allowFullscreen: true,
        skippable: false
      }
    });
  });
}
