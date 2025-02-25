// accountId and bidders params are not included here, should be configured by end-user
export const S2S_VENDORS = {
  'appnexuspsp': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: {
      p1Consent: 'https://ib.adnxs.com/openrtb2/prebid',
      noP1Consent: 'https://ib.adnxs-simple.com/openrtb2/prebid'
    },
    syncEndpoint: {
      p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync',
      noP1Consent: 'https://prebid.adnxs-simple.com/pbs/v1/cookie_sync'
    },
    maxTimeout: 1000
  },
  'rubicon': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: {
      p1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
      noP1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
    },
    syncEndpoint: {
      p1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync',
      noP1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync',
    },
    maxTimeout: 500
  },
  'openwrap': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: {
      p1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs',
      noP1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs'
    },
    maxTimeout: 500
  }
}
