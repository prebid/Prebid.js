import { expect } from 'chai';
import { spec, getWidthAndHeightFromVideoObject, playerSizeIsNestedArray, defaultSize } from 'modules/ozoneBidAdapter.js';
import { config } from 'src/config.js';
import {Renderer} from '../../../src/Renderer.js';
import {getGranularityKeyName, getGranularityObject} from '../../../modules/ozoneBidAdapter.js';
import * as utils from '../../../src/utils.js';
const OZONEURI = 'https://elb.the-ozone-project.com/openrtb2/auction';
const BIDDER_CODE = 'ozone';
/*

NOTE - use firefox console to deep copy the objects to use here

 */
var validBidRequests = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsWithUserIdData = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87',
    userId: {'pubcid': '12345678', 'id5id': 'ID5-someId', 'criteortus': {'ozone': {'userid': 'critId123'}}, 'idl_env': 'liverampId', 'lipb': {'lipbid': 'lipbidId123'}, 'parrableid': 'parrableid123'}
  }
];
var validBidRequestsMinimal = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    params: { publisherId: '9876abcd12-3', placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsNoSizes = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];

var validBidRequestsWithBannerMediaType = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}},
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsWithNonBannerMediaTypesAndValidOutstreamVideo = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, video: {skippable: true, playback_method: ['auto_play_sound_off'], targetDiv: 'some-different-div-id-to-my-adunitcode'} } ] },
    mediaTypes: {video: {mimes: ['video/mp4'], 'context': 'outstream', 'sizes': [640, 480]}, native: {info: 'dummy data'}},
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];

var validBidderRequest = {
  auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
  auctionStart: 1536838908986,
  bidderCode: 'ozone',
  bidderRequestId: '1c1586b27a1b5c8',
  bids: [{
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }],
  doneCbCallCount: 1,
  start: 1536838908987,
  timeout: 3000
};

// bidder request with GDPR - change the values for testing:
// gdprConsent.gdprApplies (true/false)
// gdprConsent.vendorData.purposeConsents (make empty, make null, remove it)
// gdprConsent.vendorData.vendorConsents (remove 524, remove all, make the element null, remove it)
var bidderRequestWithFullGdpr = {
  auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
  auctionStart: 1536838908986,
  bidderCode: 'ozone',
  bidderRequestId: '1c1586b27a1b5c8',
  bids: [{
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }],
  doneCbCallCount: 1,
  start: 1536838908987,
  timeout: 3000,
  gdprConsent: {
    'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
    'vendorData': {
      'metadata': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
      'gdprApplies': true,
      'hasGlobalScope': false,
      'cookieVersion': '1',
      'created': '2019-05-31T12:46:48.825',
      'lastUpdated': '2019-05-31T12:46:48.825',
      'cmpId': '28',
      'cmpVersion': '1',
      'consentLanguage': 'en',
      'consentScreen': '1',
      'vendorListVersion': 148,
      'maxVendorId': 631,
      'purposeConsents': {
        '1': true,
        '2': true,
        '3': true,
        '4': true,
        '5': true
      },
      'vendorConsents': {
        '468': true,
        '522': true,
        '524': true, /* 524 is ozone */
        '565': true,
        '591': true
      }
    },
    'gdprApplies': true
  },
};

var gdpr1 = {
  'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
  'vendorData': {
    'metadata': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
    'gdprApplies': true,
    'hasGlobalScope': false,
    'cookieVersion': '1',
    'created': '2019-05-31T12:46:48.825',
    'lastUpdated': '2019-05-31T12:46:48.825',
    'cmpId': '28',
    'cmpVersion': '1',
    'consentLanguage': 'en',
    'consentScreen': '1',
    'vendorListVersion': 148,
    'maxVendorId': 631,
    'purposeConsents': {
      '1': true,
      '2': true,
      '3': true,
      '4': true,
      '5': true
    },
    'vendorConsents': {
      '468': true,
      '522': true,
      '524': true, /* 524 is ozone */
      '565': true,
      '591': true
    }
  },
  'gdprApplies': true
};

// simulating the Mirror
var bidderRequestWithPartialGdpr = {
  auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
  auctionStart: 1536838908986,
  bidderCode: 'ozone',
  bidderRequestId: '1c1586b27a1b5c8',
  bids: [{
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }],
  doneCbCallCount: 1,
  start: 1536838908987,
  timeout: 3000,
  gdprConsent: {
    'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
    'gdprApplies': true,
    'vendorData': {
      'metadata': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
      'gdprApplies': true
    }
  },
};

// make sure the impid matches the request bidId
var validResponse = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="https://fra1-ib.adnxs.com/ab?e=wqT_3QLXB6DXAwAAAwDWAAUBCNDh6dwFENjt4vTs9Y6bWhjxtI3siuOTmREqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eMuOBYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTM2ODQ4MDgwKTt1ZigncicsIDk4NDkzNTgxNh4A8JySAv0BIWJ6YWpPQWl1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFFcGk0aURBQURnUDhFQktZdUlnd0FBNERfSkFUMDR0TTFxYXZFXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ8oSmdDQUtBQ0FMVUMFEARMMAkI8FBNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEcnJDdUNyb0RDVVpTUVRFNk16WTROT0FER2cuLpoCPSFLQXVvRkE2AAFwblBGYklBUW9BRG9KUmxKQk1Ub3pOamcwUUJwSkENAfBAOEQ4LsICL2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL2dldHRpbmctc3RhcnRlZC5odG1s2AIA4AKtmEjqAiINOthkZW1vLnRoZS1vem9uZS1wcm9qZWN0LmNvbS_yAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDLhYAIExFQUZfTkFNRQEdCB4KGjIzAPCHTEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECTEyNy4wLjAuMagEALIEDAgAEAAYACAAMAA4ALgEAMAEAMgEANIEDjkzMjUjRlJBMTozNjg02gQCCAHgBADwBEHvIIgFAZgFAKAF_xEBsAGqBSRkNjE5ODgwNy03YTUzLTQxNDEtYjJkYi1kMmNiNzU0ZDY4YmHABQDJBWlQFPA_0gUJCQkMpAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYAmAYAuAYAwQYAAAAAAAAAAMgGAA..&s=ab84b182eef7d9b4e58c74fe8987705c25ed803c&referrer=http%3A%2F%2Fdemo.the-ozone-project.com%2F&pp=${AUCTION_PRICE}"></script>',
            'adid': '98493581',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9325',
            'crid': '98493581',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555545,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'appnexus'
      }
    ],
    'cur': 'GBP', /* NOTE - this is where cur is, not in the seatbids. */
    'ext': {
      'responsetimemillis': {
        'appnexus': 47,
        'openx': 30
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
};
var validOutstreamResponse = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="https://fra1-ib.adnxs.com/ab?e=wqT_3QLXB6DXAwAAAwDWAAUBCNDh6dwFENjt4vTs9Y6bWhjxtI3siuOTmREqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eMuOBYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTM2ODQ4MDgwKTt1ZigncicsIDk4NDkzNTgxNh4A8JySAv0BIWJ6YWpPQWl1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFFcGk0aURBQURnUDhFQktZdUlnd0FBNERfSkFUMDR0TTFxYXZFXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ8oSmdDQUtBQ0FMVUMFEARMMAkI8FBNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEcnJDdUNyb0RDVVpTUVRFNk16WTROT0FER2cuLpoCPSFLQXVvRkE2AAFwblBGYklBUW9BRG9KUmxKQk1Ub3pOamcwUUJwSkENAfBAOEQ4LsICL2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL2dldHRpbmctc3RhcnRlZC5odG1s2AIA4AKtmEjqAiINOthkZW1vLnRoZS1vem9uZS1wcm9qZWN0LmNvbS_yAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDLhYAIExFQUZfTkFNRQEdCB4KGjIzAPCHTEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECTEyNy4wLjAuMagEALIEDAgAEAAYACAAMAA4ALgEAMAEAMgEANIEDjkzMjUjRlJBMTozNjg02gQCCAHgBADwBEHvIIgFAZgFAKAF_xEBsAGqBSRkNjE5ODgwNy03YTUzLTQxNDEtYjJkYi1kMmNiNzU0ZDY4YmHABQDJBWlQFPA_0gUJCQkMpAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYAmAYAuAYAwQYAAAAAAAAAAMgGAA..&s=ab84b182eef7d9b4e58c74fe8987705c25ed803c&referrer=http%3A%2F%2Fdemo.the-ozone-project.com%2F&pp=${AUCTION_PRICE}"></script>',
            'adid': '98493581',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9325',
            'crid': '98493581',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'video'
              },
              'bidder': {
                'unruly': {
                  'renderer': {
                    'config': {
                      'targetingUUID': 'aafd3388-afaf-41f4-b271-0ac8e0325a7f',
                      'siteId': 1052815,
                      'featureOverrides': {}
                    },
                    'url': 'https://video.unrulymedia.com/native/native-loader.js#supplyMode=prebid?cb=6284685353877994',
                    'id': 'unruly_inarticle'
                  },
                  'vast_url': 'data:text/xml;base64,PD94bWwgdmVyc2lvbj0i'
                }
              }
            }
          }
        ],
        'seat': 'unruly'
      }
    ],
    'ext': {
      'responsetimemillis': {
        'appnexus': 47,
        'openx': 30
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
};
var validBidResponse1adWith2Bidders = {
  'body': {
    'id': '91221f96-b931-4acc-8f05-c2a1186fa5ac',
    'seatbid': [
      {
        'bid': [
          {
            'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
            'impid': '2899ec066a91ff8',
            'price': 0.36754,
            'adm': '<script>removed</script>',
            'adid': '134928661',
            'adomain': [
              'somecompany.com'
            ],
            'iurl': 'https:\/\/ams1-ib.adnxs.com\/cr?id=134928661',
            'cid': '8825',
            'crid': '134928661',
            'cat': [
              'IAB8-15',
              'IAB8-16',
              'IAB8-4',
              'IAB8-1',
              'IAB8-14',
              'IAB8-6',
              'IAB8-13',
              'IAB8-3',
              'IAB8-17',
              'IAB8-12',
              'IAB8-8',
              'IAB8-7',
              'IAB8-2',
              'IAB8-9',
              'IAB8',
              'IAB8-11'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 14640,
                  'auction_id': 1.8369641905139e+18,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'appnexus'
      },
      {
        'bid': [
          {
            'id': '75665207-a1ca-49db-ba0e-a5e9c7d26f32',
            'impid': '37fff511779365a',
            'price': 1.046,
            'adm': '<div>removed</div>',
            'adomain': [
              'kx.com'
            ],
            'crid': '13005',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              }
            }
          }
        ],
        'seat': 'openx'
      }
    ],
    'ext': {
      'responsetimemillis': {
        'appnexus': 91,
        'openx': 109,
        'ozappnexus': 46,
        'ozbeeswax': 2,
        'pangaea': 91
      }
    }
  },
  'headers': {}
};

describe('ozone Adapter', function () {
  describe('isBidRequestValid', function () {
    // A test ad unit that will consistently return test creatives
    let validBidReq = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });

    var validBidReq2 = {

      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890',
        customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}],
        lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}},
      },
      siteId: 1234567890
    }

    it('should return true when required params found and all optional params are valid', function () {
      expect(spec.isBidRequestValid(validBidReq2)).to.equal(true);
    });

    var xEmptyPlacement = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate empty placementId', function () {
      expect(spec.isBidRequestValid(xEmptyPlacement)).to.equal(false);
    });

    var xMissingPlacement = {
      bidder: BIDDER_CODE,
      params: {
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate missing placementId', function () {
      expect(spec.isBidRequestValid(xMissingPlacement)).to.equal(false);
    });

    var xBadPlacement = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '123X45',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a non-numeric value', function () {
      expect(spec.isBidRequestValid(xBadPlacement)).to.equal(false);
    });

    var xBadPlacementTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 123456789, /* should be exactly 10 chars */
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a numeric value of wrong length', function () {
      expect(spec.isBidRequestValid(xBadPlacementTooShort)).to.equal(false);
    });

    var xBadPlacementTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 12345678901, /* should be exactly 10 chars */
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a numeric value of wrong length', function () {
      expect(spec.isBidRequestValid(xBadPlacementTooLong)).to.equal(false);
    });

    var xMissingPublisher = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        siteId: '1234567890'
      }
    };

    it('should not validate missing publisherId', function () {
      expect(spec.isBidRequestValid(xMissingPublisher)).to.equal(false);
    });

    var xMissingSiteId = {
      bidder: BIDDER_CODE,
      params: {
        publisherId: '9876abcd12-3',
        placementId: '1234567890',
      }
    };

    it('should not validate missing sitetId', function () {
      expect(spec.isBidRequestValid(xMissingSiteId)).to.equal(false);
    });

    var xBadPublisherTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12a',
        siteId: '1234567890'
      }
    };

    it('should not validate publisherId being too short', function () {
      expect(spec.isBidRequestValid(xBadPublisherTooShort)).to.equal(false);
    });

    var xBadPublisherTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12abc',
        siteId: '1234567890'
      }
    };

    it('should not validate publisherId being too long', function () {
      expect(spec.isBidRequestValid(xBadPublisherTooLong)).to.equal(false);
    });

    var publisherNumericOk = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: 123456789012,
        siteId: '1234567890'
      }
    };

    it('should validate publisherId being 12 digits', function () {
      expect(spec.isBidRequestValid(publisherNumericOk)).to.equal(true);
    });

    var xEmptyPublisher = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '',
        siteId: '1234567890'
      }
    };

    it('should not validate empty publisherId', function () {
      expect(spec.isBidRequestValid(xEmptyPublisher)).to.equal(false);
    });

    var xBadSite = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '12345Z'
      }
    };

    it('should not validate bad siteId', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var xBadSiteTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '12345678901'
      }
    };

    it('should not validate siteId too long', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var xBadSiteTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '123456789'
      }
    };

    it('should not validate siteId too short', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var allNonStrings = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 1234567890,
        publisherId: '9876abcd12-3',
        siteId: 1234567890
      }
    };

    it('should validate all numeric values being sent as non-string numbers', function () {
      expect(spec.isBidRequestValid(allNonStrings)).to.equal(true);
    });

    var emptySiteId = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 1234567890,
        publisherId: '9876abcd12-3',
        siteId: ''
      }
    };

    it('should not validate siteId being empty string (it is required now)', function () {
      expect(spec.isBidRequestValid(emptySiteId)).to.equal(false);
    });

    var xBadCustomData = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': 'this aint gonna work'
      }
    };

    it('should not validate customData not being an array', function () {
      expect(spec.isBidRequestValid(xBadCustomData)).to.equal(false);
    });

    var xBadCustomData_OLD_CUSTOMDATA_VALUE = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': {'gender': 'bart', 'age': 'low'}
      }
    };

    it('should not validate customData being an object, not an array', function () {
      expect(spec.isBidRequestValid(xBadCustomData_OLD_CUSTOMDATA_VALUE)).to.equal(false);
    });

    var xBadCustomData_zerocd = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1111111110',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': []
      }
    };

    it('should not validate customData array having no elements', function () {
      expect(spec.isBidRequestValid(xBadCustomData_zerocd)).to.equal(false);
    });

    var xBadCustomData_notargeting = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': [{'settings': {}, 'xx': {'gender': 'bart', 'age': 'low'}}],
        siteId: '1234567890'
      }
    };
    it('should not validate customData[] having no "targeting"', function () {
      expect(spec.isBidRequestValid(xBadCustomData_notargeting)).to.equal(false);
    });

    var xBadCustomData_tgt_not_obj = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': [{'settings': {}, 'targeting': 'this should be an object'}],
        siteId: '1234567890'
      }
    };
    it('should not validate customData[0].targeting not being an object', function () {
      expect(spec.isBidRequestValid(xBadCustomData_tgt_not_obj)).to.equal(false);
    });

    var xBadCustomParams = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customParams': 'this key is no longer valid'
      }
    };
    it('should not validate customParams - this is a renamed key', function () {
      expect(spec.isBidRequestValid(xBadCustomParams)).to.equal(false);
    });

    var xBadLotame = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'lotameData': 'this should be an object',
        siteId: '1234567890'
      }
    };
    it('should not validate lotameData being sent', function () {
      expect(spec.isBidRequestValid(xBadLotame)).to.equal(false);
    });

    var xBadVideoContext2 = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'lotameData': {},
        siteId: '1234567890'
      },
      mediaTypes: {
        video: {
          mimes: ['video/mp4']}
      }
    };

    it('should not validate video without context attribute', function () {
      expect(spec.isBidRequestValid(xBadVideoContext2)).to.equal(false);
    });

    let validVideoBidReq = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      },
      mediaTypes: {
        video: {
          mimes: ['video/mp4'],
          'context': 'outstream'},
      }
    };

    it('should validate video outstream being sent', function () {
      expect(spec.isBidRequestValid(validVideoBidReq)).to.equal(true);
    });
    it('should validate video instream being sent even though its not properly supported yet', function () {
      let instreamVid = JSON.parse(JSON.stringify(validVideoBidReq));
      instreamVid.mediaTypes.video.context = 'instream';
      expect(spec.isBidRequestValid(instreamVid)).to.equal(true);
    });
    // validate lotame override parameters
    it('should validate lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': 'tpid123'};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should validate missing lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123'};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(false);
    });
    it('should validate invalid lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123 "this ain\\t right!" eee'};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(false);
    });
    it('should validate no lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to OZONEURI via POST', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.url).to.equal(OZONEURI);
      expect(request.method).to.equal('POST');
    });

    it('sends data as a string', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.data).to.be.a('string');
    });

    it('sends all bid parameters', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('adds all parameters inside the ext object only', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.data).to.be.a('string');
      var data = JSON.parse(request.data);
      expect(data.imp[0].ext.ozone.lotameData).to.be.an('object');
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(request).not.to.have.key('lotameData');
      expect(request).not.to.have.key('customData');
    });

    it('ignores ozoneData in & after version 2.1.1', function () {
      let validBidRequestsWithOzoneData = validBidRequests;
      validBidRequestsWithOzoneData[0].params.ozoneData = {'networkID': '3048', 'dfpSiteID': 'd.thesun', 'sectionID': 'homepage', 'path': '/', 'sec_id': 'null', 'sec': 'sec', 'topics': 'null', 'kw': 'null', 'aid': 'null', 'search': 'null', 'article_type': 'null', 'hide_ads': '', 'article_slug': 'null'};
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.data).to.be.a('string');
      var data = JSON.parse(request.data);
      expect(data.imp[0].ext.ozone.lotameData).to.be.an('object');
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(data.imp[0].ext.ozone.ozoneData).to.be.undefined;
      expect(request).not.to.have.key('lotameData');
      expect(request).not.to.have.key('customData');
    });

    it('has correct bidder', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.bidderRequest.bids[0].bidder).to.equal(BIDDER_CODE);
    });

    it('handles mediaTypes element correctly', function () {
      const request = spec.buildRequests(validBidRequestsWithBannerMediaType, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('handles no ozone, lotame or custom data', function () {
      const request = spec.buildRequests(validBidRequestsMinimal, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('handles video mediaType element correctly, with outstream video', function () {
      const request = spec.buildRequests(validBidRequestsWithNonBannerMediaTypesAndValidOutstreamVideo, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('should not crash when there is no sizes element at all', function () {
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('should be able to handle non-single requests', function () {
      config.setConfig({'ozone': {'singleRequest': false}});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      expect(request).to.be.a('array');
      expect(request[0]).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
      // need to reset the singleRequest config flag:
      config.setConfig({'ozone': {'singleRequest': true}});
    });

    it('should add gdpr consent information to the request when ozone is true', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true,
        vendorData: {
          metadata: consentString,
          gdprApplies: true,
          vendorConsents: {524: true},
          purposeConsents: {1: true, 2: true, 3: true, 4: true, 5: true}
        }
      }

      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload.user.ext.consent).to.equal(consentString);
    });

    // mirror
    it('should add gdpr consent information to the request when ozone.oz_enforceGdpr is false and vendorData is missing vendorConsents (Mirror)', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true,
        vendorData: {
          metadata: consentString,
          gdprApplies: true
        }
      }

      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload.user.ext.consent).to.equal(consentString);
    });
    it('should add gdpr consent information to the request when ozone.oz_enforceGdpr is NOT PRESENT and vendorData is missing vendorConsents (Mirror)', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true,
        vendorData: {
          metadata: consentString,
          gdprApplies: true
        }
      }
      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload.user.ext.consent).to.equal(consentString);
      config.resetConfig();
    });
    it('should kill the auction request when ozone.oz_enforceGdpr is true & vendorData is missing vendorConsents (Mirror)', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true,
        vendorData: {
          metadata: consentString,
          gdprApplies: true
        }
      }
      config.setConfig({'ozone': {'oz_enforceGdpr': true}});
      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      expect(request.length).to.equal(0);
      config.resetConfig();
    });

    it('should set regs.ext.gdpr flag to 0 when gdprApplies is false', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: false,
        vendorData: {
          metadata: consentString,
          gdprApplies: true,
          vendorConsents: {}, /* 524 is not present */
          purposeConsents: {1: true, 2: true, 3: true, 4: true, 5: true}
        }
      };

      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(0);
    });

    it('should not have imp[N].ext.ozone.userId', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: false,
        vendorData: {
          metadata: consentString,
          gdprApplies: true,
          vendorConsents: {524: true},
          purposeConsents: {1: true, 2: true, 3: true, 4: true, 5: true}
        }
      };

      let bidRequests = validBidRequests;
      // values from http://prebid.org/dev-docs/modules/userId.html#pubcommon-id
      bidRequests[0]['userId'] = {
        'criteortus': '1111',
        'digitrustid': {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
        'id5id': '2222',
        'idl_env': '3333',
        'lipb': {'lipbid': '4444'},
        'parrableid': 'eidVersion.encryptionKeyReference.encryptedValue',
        'pubcid': '5555',
        'tdid': '6666'
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      let firstBid = payload.imp[0].ext.ozone;
      expect(firstBid).to.not.have.property('userId');
      delete validBidRequests[0].userId; // tidy up now, else it will screw with other tests
    });

    it('should pick up the value of pubcid when built using the pubCommonId module (not userId)', function () {
      let bidRequests = validBidRequests;
      // values from http://prebid.org/dev-docs/modules/userId.html#pubcommon-id
      bidRequests[0]['userId'] = {
        'criteortus': '1111',
        'digitrustid': {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
        'id5id': '2222',
        'idl_env': '3333',
        'lipb': {'lipbid': '4444'},
        'parrableid': 'eidVersion.encryptionKeyReference.encryptedValue',
        // 'pubcid': '5555', // remove pubcid from here to emulate the OLD module & cause the failover code to kick in
        'tdid': '6666'
      };
      const request = spec.buildRequests(bidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.pubcid).to.equal(bidRequests[0]['crumbs']['pubcid']);
      delete validBidRequests[0].userId; // tidy up now, else it will screw with other tests
    });

    it('should add a user.ext.eids object to contain user ID data in the new location (Nov 2019)', function() {
      const request = spec.buildRequests(validBidRequestsWithUserIdData, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user).to.exist;
      expect(payload.user.ext).to.exist;
      expect(payload.user.ext.eids).to.exist;
      expect(payload.user.ext.eids[0]['source']).to.equal('pubcid');
      expect(payload.user.ext.eids[0]['uids'][0]['id']).to.equal('12345678');
      expect(payload.user.ext.eids[1]['source']).to.equal('pubcommon');
      expect(payload.user.ext.eids[1]['uids'][0]['id']).to.equal('12345678');
      expect(payload.user.ext.eids[2]['source']).to.equal('id5-sync.com');
      expect(payload.user.ext.eids[2]['uids'][0]['id']).to.equal('ID5-someId');
      expect(payload.user.ext.eids[3]['source']).to.equal('criteortus');
      expect(payload.user.ext.eids[3]['uids'][0]['id']).to.equal('critId123');
      expect(payload.user.ext.eids[4]['source']).to.equal('liveramp.com');
      expect(payload.user.ext.eids[4]['uids'][0]['id']).to.equal('liverampId');
      expect(payload.user.ext.eids[5]['source']).to.equal('liveintent.com');
      expect(payload.user.ext.eids[5]['uids'][0]['id']).to.equal('lipbidId123');
      expect(payload.user.ext.eids[6]['source']).to.equal('parrable.com');
      expect(payload.user.ext.eids[6]['uids'][0]['id']).to.equal('parrableid123');
    });

    it('should use oztestmode GET value if set', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for oztestmode:
      spec.getGetParametersAsObject = function() {
        return {'oztestmode': 'mytestvalue_123'};
      };
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(data.imp[0].ext.ozone.customData[0].targeting.oztestmode).to.equal('mytestvalue_123');
    });
    it('should use oztestmode GET value if set, even if there is no customdata in config', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for oztestmode:
      spec.getGetParametersAsObject = function() {
        return {'oztestmode': 'mytestvalue_123'};
      };
      const request = spec.buildRequests(validBidRequestsMinimal, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(data.imp[0].ext.ozone.customData[0].targeting.oztestmode).to.equal('mytestvalue_123');
    });
    var specMock = utils.deepClone(spec);
    it('should use a valid ozstoredrequest GET value if set to override the placementId values, and set oz_rw if we find it', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for ozstoredrequest:
      specMock.getGetParametersAsObject = function() {
        return {'ozstoredrequest': '1122334455'}; // 10 digits are valid
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.ozone.oz_rw).to.equal(1);
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('1122334455');
    });
    it('should NOT use an invalid ozstoredrequest GET value if set to override the placementId values, and set oz_rw to 0', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for ozstoredrequest:
      specMock.getGetParametersAsObject = function() {
        return {'ozstoredrequest': 'BADVAL'}; // 10 digits are valid
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.ozone.oz_rw).to.equal(0);
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('1310000099');
    });

    it('should pick up the value of valid lotame override parameters when there is a lotame object', function () {
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123eee'};
      };
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.ozone.lotameData.Profile.Audiences.Audience[0].id).to.equal('123abc');
      expect(payload.ext.ozone.oz_lot_rw).to.equal(1);
    });
    it('should pick up the value of valid lotame override parameters when there is an empty lotame object', function () {
      let nolotameBidReq = JSON.parse(JSON.stringify(validBidRequests));
      nolotameBidReq[0].params.lotameData = {};
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123eeetpid'};
      };
      const request = spec.buildRequests(nolotameBidReq, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.ozone.lotameData.Profile.Audiences.Audience[0].id).to.equal('123abc');
      expect(payload.imp[0].ext.ozone.lotameData.Profile.tpid).to.equal('123eeetpid');
      expect(payload.imp[0].ext.ozone.lotameData.Profile.pid).to.equal('pid123');
      expect(payload.ext.ozone.oz_lot_rw).to.equal(1);
    });
    it('should pick up the value of valid lotame override parameters when there is NO "lotame" key at all', function () {
      let nolotameBidReq = JSON.parse(JSON.stringify(validBidRequests));
      delete (nolotameBidReq[0].params['lotameData']);
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123eeetpid'};
      };
      const request = spec.buildRequests(nolotameBidReq, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.ozone.lotameData.Profile.Audiences.Audience[0].id).to.equal('123abc');
      expect(payload.imp[0].ext.ozone.lotameData.Profile.tpid).to.equal('123eeetpid');
      expect(payload.imp[0].ext.ozone.lotameData.Profile.pid).to.equal('pid123');
      expect(payload.ext.ozone.oz_lot_rw).to.equal(1);
    });
    // NOTE - only one negative test case;
    // you can't send invalid lotame params to buildRequests because 'validate' will have rejected them
    it('should not use lotame override parameters if they dont exist', function () {
      spec.getGetParametersAsObject = function() {
        return {}; //  no lotame override params
      };
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.oz_lot_rw).to.equal(0);
    });

    it('should pick up the config value of coppa & set it in the request', function () {
      config.setConfig({'coppa': true});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs).to.include.keys('coppa');
      expect(payload.regs.coppa).to.equal(1);
      config.resetConfig();
    });
    it('should pick up the config value of coppa & only set it in the request if its true', function () {
      config.setConfig({'coppa': false});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'regs.coppa')).to.be.undefined;
      config.resetConfig();
    });
  });

  describe('interpretResponse', function () {
    it('should build bid array', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      const bid = result[0];
      expect(bid.cpm).to.equal(validResponse.body.seatbid[0].bid[0].cpm);
      expect(bid.width).to.equal(validResponse.body.seatbid[0].bid[0].width);
      expect(bid.height).to.equal(validResponse.body.seatbid[0].bid[0].height);
    });

    it('should build bid array with gdpr', function () {
      let validBR = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      validBR.gdprConsent = {'gdprApplies': 1, 'consentString': 'This is the gdpr consent string'};
      const request = spec.buildRequests(validBidRequests, validBR); // works the old way, with GDPR not enforced by default
      // const request = spec.buildRequests(validBidRequests, bidderRequestWithFullGdpr); // works with oz_enforceGdpr true by default
      const result = spec.interpretResponse(validResponse, request);
      expect(result.length).to.equal(1);
    });

    it('should build bid array with only partial gdpr', function () {
      var validBidderRequestWithGdpr = bidderRequestWithPartialGdpr;
      validBidderRequestWithGdpr.gdprConsent = {'gdprApplies': 1, 'consentString': 'This is the gdpr consent string'};
      const request = spec.buildRequests(validBidRequests, validBidderRequestWithGdpr);
    });

    it('should fail ok if no seatbid in server response', function () {
      const result = spec.interpretResponse({}, {});
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
    });

    it('should fail ok if seatbid is not an array', function () {
      const result = spec.interpretResponse({'body': {'seatbid': 'nothing_here'}}, {});
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
    });

    it('should have video renderer', function () {
      const request = spec.buildRequests(validBidRequestsWithNonBannerMediaTypesAndValidOutstreamVideo, validBidderRequest);
      const result = spec.interpretResponse(validOutstreamResponse, request);
      const bid = result[0];
      expect(bid.renderer).to.be.an.instanceOf(Renderer);
    });

    it('should correctly parse response where there are more bidders than ad slots', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validBidResponse1adWith2Bidders, request);
      expect(result.length).to.equal(2);
    });

    it('should have a ttl of 600', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result[0].ttl).to.equal(300);
    });
  });

  describe('userSyncs', function () {
    it('should fail gracefully if no server response', function () {
      const result = spec.getUserSyncs('bad', false, gdpr1);
      expect(result).to.be.empty;
    });
    it('should fail gracefully if server response is empty', function () {
      const result = spec.getUserSyncs('bad', [], gdpr1);
      expect(result).to.be.empty;
    });
    it('should append the various values if they exist', function() {
      // get the cookie bag populated
      spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.getUserSyncs({iframeEnabled: true}, 'good server response', gdpr1);
      expect(result).to.be.an('array');
      expect(result[0].url).to.include('publisherId=9876abcd12-3');
      expect(result[0].url).to.include('siteId=1234567890');
      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include('gdpr_consent=BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA');
    });
  });

  describe('video object utils', function () {
    it('should find width & height from video object', function () {
      let obj = {'playerSize': [640, 480], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result.w).to.equal(640);
      expect(result.h).to.equal(480);
    });
    it('should find null from bad video object', function () {
      let obj = {'playerSize': [], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object2', function () {
      let obj = {'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object3', function () {
      let obj = {'playerSize': 'should be an array', 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find that player size is nested', function () {
      let obj = {'playerSize': [[640, 480]], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result.w).to.equal(640);
      expect(result.h).to.equal(480);
    });
    it('should fail if player size is 2 x nested', function () {
      let obj = {'playerSize': [[[640, 480]]], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find that player size is nested', function () {
      let obj = {'playerSize': [[640, 480]], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.true;
    });
    it('should find null from bad video object', function () {
      let obj = {'playerSize': [], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object2', function () {
      let obj = {'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object3', function () {
      let obj = {'playerSize': 'should be an array', 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.null;
    });
  });

  describe('default size', function () {
    it('should should return default sizes if no obj is sent', function () {
      let obj = '';
      const result = defaultSize(obj);
      expect(result.defaultHeight).to.equal(250);
      expect(result.defaultWidth).to.equal(300);
    });
  });

  describe('getGranularityKeyName', function() {
    it('should return a string granularity as-is', function() {
      const result = getGranularityKeyName('', 'this is it', '');
      expect(result).to.equal('this is it');
    });
    it('should return "custom" for a mediaTypeGranularity object', function() {
      const result = getGranularityKeyName('', {}, '');
      expect(result).to.equal('custom');
    });
    it('should return "custom" for a mediaTypeGranularity object', function() {
      const result = getGranularityKeyName('', false, 'string buckets');
      expect(result).to.equal('string buckets');
    });
  });

  describe('getGranularityObject', function() {
    it('should return an object as-is', function() {
      const result = getGranularityObject('', {'name': 'mark'}, '', '');
      expect(result.name).to.equal('mark');
    });
    it('should return an object as-is', function() {
      const result = getGranularityObject('', false, 'custom', {'name': 'rupert'});
      expect(result.name).to.equal('rupert');
    });
  });

  describe('blockTheRequest', function() {
    it('should return true if oz_request is false', function() {
      config.setConfig({'ozone': {'oz_request': false}});
      let result = spec.blockTheRequest(bidderRequestWithFullGdpr);
      expect(result).to.be.true;
      config.resetConfig();
    });
    it('should return false if oz_request is true', function() {
      config.setConfig({'ozone': {'oz_request': true}});
      let result = spec.blockTheRequest(bidderRequestWithFullGdpr);
      expect(result).to.be.false;
      config.resetConfig();
    });
    it('should return true if oz_enforceGdpr is true and consentString is undefined', function() {
      config.setConfig({'ozone': {'oz_enforceGdpr': true}});
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      delete req.gdprConsent.consentString;
      let result = spec.blockTheRequest(req);
      expect(result).to.be.true;
      config.resetConfig();
    });
    it('should return false if oz_enforceGdpr is false and consentString is undefined', function() {
      config.setConfig({'ozone': {'oz_enforceGdpr': false}});
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      delete req.gdprConsent.consentString;
      let result = spec.blockTheRequest(req);
      expect(result).to.be.false;
      config.resetConfig();
    });
    it('should return false if oz_enforceGdpr is NOT SET (default) and consentString is undefined', function() {
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      delete req.gdprConsent.consentString;
      let result = spec.blockTheRequest(req);
      expect(result).to.be.false;
    });
    it('should return false if gdprApplies is false', function() {
      config.setConfig({'ozone': {'oz_request': true}});
      let req = {'gdprConsent': {'gdprApplies': false}};
      let result = spec.blockTheRequest(req);
      expect(result).to.be.false;
      config.resetConfig();
    });
    it('should return false if gdprConsent key does not exist', function() {
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      config.setConfig({'ozone': {'oz_enforceGdpr': true}});
      delete req.gdprConsent;
      let result = spec.blockTheRequest(req);
      expect(result).to.be.false;
      config.resetConfig();
    });
    it('should return false if gdpr is set, and all is ok', function() {
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      config.setConfig({'ozone': {'oz_enforceGdpr': true}});
      let result = spec.blockTheRequest(req);
      expect(result).to.be.false;
      config.resetConfig();
    });
  });

  describe('failsGdprCheck', function() {
    it('should return false for a a fully accepted user', function () {
      let result = spec.failsGdprCheck(bidderRequestWithFullGdpr);
      expect(result).to.be.false;
    });
    it('should return false if gdprConsent is not present on the bidder object', function () {
      let result = spec.failsGdprCheck(validBidderRequest);
      expect(result).to.be.false;
    });
    it('should return true if gdpr applies and vendorData is not an array', function () {
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      req.gdprConsent.vendorData = null;
      let result = spec.failsGdprCheck(req);
      expect(result).to.be.true;
    });
    it('should return true if gdpr applies and purposeConsents do not contain all the required true values', function () {
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      req.gdprConsent.vendorData.purposeConsents[1] = false;
      let result = spec.failsGdprCheck(req);
      expect(result).to.be.true;
    });
    it('should return true if gdpr applies and vendorConsents[524] is not true', function () {
      config.setConfig({'ozone': {'oz_enforceGdpr': true}});
      let req = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr));
      req.gdprConsent.vendorData.vendorConsents[524] = false;
      let result = spec.failsGdprCheck(req);
      expect(result).to.be.true;
      config.resetConfig();
    });
  });

  describe('makeLotameObjectFromOverride', function() {
    it('should update an object with valid lotame data', function () {
      let objLotameOverride = {'oz_lotametpid': '1234', 'oz_lotameid': '12345', 'oz_lotamepid': '123456'};
      let result = spec.makeLotameObjectFromOverride(
        objLotameOverride,
        {'Profile': {'pid': 'originalpid', 'tpid': 'originaltpid', 'Audiences': {'Audience': [{'id': 'aud1'}]}}}
      );
      expect(result.Profile.Audiences.Audience).to.be.an('array');
      expect(result.Profile.Audiences.Audience[0]).to.be.an('object');
      expect(result.Profile.Audiences.Audience[0]).to.deep.include({'id': '12345', 'abbr': '12345'});
    });
    it('should return the original object if it seems weird', function () {
      let objLotameOverride = {'oz_lotametpid': '1234', 'oz_lotameid': '12345', 'oz_lotamepid': '123456'};
      let objLotameOriginal = {'Profile': {'pid': 'originalpid', 'tpid': 'originaltpid', 'somethingstrange': [{'id': 'aud1'}]}};
      let result = spec.makeLotameObjectFromOverride(
        objLotameOverride,
        objLotameOriginal
      );
      expect(result).to.equal(objLotameOriginal);
    });
  });
  describe('lotameDataIsValid', function() {
    it('should allow a valid minimum lotame object', function() {
      let obj = {'Profile': {'pid': '', 'tpid': '', 'Audiences': {'Audience': []}}};
      let result = spec.isLotameDataValid(obj);
      expect(result).to.be.true;
    });
    it('should allow a valid lotame object', function() {
      let obj = {'Profile': {'pid': '12345', 'tpid': '45678', 'Audiences': {'Audience': [{'id': '1234', 'abbr': '567'}, {'id': '9999', 'abbr': '1111'}]}}};
      let result = spec.isLotameDataValid(obj);
      expect(result).to.be.true;
    });
    it('should disallow a lotame object without an Audience.id', function() {
      let obj = {'Profile': {'tpid': '', 'pid': '', 'Audiences': {'Audience': [{'abbr': 'marktest'}]}}};
      let result = spec.isLotameDataValid(obj);
      expect(result).to.be.false;
    });
  });
});
