// import { transformBidderParamKeywords } from 'src/utils';

// accountId and bidders params are not included here, should be configured by end-user
export const S2S_VENDORS = {
  'appnexus': {
    adapter: 'prebidServer',
    cookieSet: false,
    enabled: true,
    endpoint: '//prebid.adnxs.com/pbs/v1/openrtb2/auction',
    syncEndpoint: '//prebid.adnxs.com/pbs/v1/cookie_sync',
    timeout: 1000
  },
  'rubicon': {
    adapter: 'prebidServer',
    cookieSet: false,
    enabled: true,
    endpoint: '//prebid-server.rubiconproject.com/auction',
    syncEndpoint: '//prebid-server.rubiconproject.com/cookie_sync',
    timeout: 500
  }
}

// export const paramTypes = {
//   'appnexus': {
//     'member': 'string',
//     'invCode': 'string',
//     'placementId': 'number',
//     'keywords': transformBidderParamKeywords
//   },
//   'rubicon': {
//     'accountId': 'number',
//     'siteId': 'number',
//     'zoneId': 'number'
//   },
//   'indexExchange': {
//     'siteID': 'number'
//   },
//   'audienceNetwork': {
//     'placementId': 'string'
//   },
//   'pubmatic': {
//     'publisherId': 'string',
//     'adSlot': 'string'
//   },
//   'districtm': {
//     'member': 'string',
//     'invCode': 'string',
//     'placementId': 'number'
//   },
//   'pulsepoint': {
//     'cf': 'string',
//     'cp': 'number',
//     'ct': 'number'
//   },
//   'conversant': {
//     'site_id': 'string',
//     'secure': 'number',
//     'mobile': 'number'
//   },
//   'openx': {
//     'unit': 'string',
//     'customFloor': 'number'
//   },
// };
