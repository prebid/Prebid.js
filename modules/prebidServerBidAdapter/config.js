// accountId and bidders params are not included here, should be configured by end-user
export const S2S_VENDORS = {
  'appnexus': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: {
      p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
      noP1Consent: 'https://prebid.adnxs-simple.com/pbs/v1/openrtb2/auction'
    },
    syncEndpoint: {
      p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync',
      noP1Consent: 'https://prebid.adnxs-simple.com/pbs/v1/cookie_sync'
    },
    timeout: 1000
  },
  'appnexuspsp': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: {
      p1Consent: 'https://ib.adnxs.com/openrtb2/prebid',
      noP1Consent: 'https://ib.adnxs-simple.com/openrtb2/prebid'
    },
    timeout: 1000
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
    timeout: 500
  },
  'openx': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: {
      p1Consent: 'https://prebid.openx.net/openrtb2/auction',
      noP1Consent: 'https://prebid.openx.net/openrtb2/auction'
    },
    syncEndpoint: {
      p1Consent: 'https://prebid.openx.net/cookie_sync',
      noP1Consent: 'https://prebid.openx.net/cookie_sync'
    },
    timeout: 1000
  }
}
