// accountId and bidders params are not included here, should be configured by end-user
export const S2S_VENDORS = {
  'appnexus': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
    syncEndpoint: 'https://prebid.adnxs.com/pbs/v1/cookie_sync',
    timeout: 1000
  },
  'rubicon': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
    syncEndpoint: 'https://prebid-server.rubiconproject.com/cookie_sync',
    timeout: 500
  },
  'openx': {
    adapter: 'prebidServer',
    enabled: true,
    endpoint: 'https://prebid.openx.net/openrtb2/auction',
    syncEndpoint: 'https://prebid.openx.net/cookie_sync',
    timeout: 1000
  }
}
