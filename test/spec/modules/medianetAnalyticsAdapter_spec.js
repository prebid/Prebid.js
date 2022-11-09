import { expect } from 'chai';
import medianetAnalytics from 'modules/medianetAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import CONSTANTS from 'src/constants.json';
import * as events from 'src/events.js';

const {
  EVENTS: { AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, NO_BID, BID_TIMEOUT, AUCTION_END, SET_TARGETING, BID_WON }
} = CONSTANTS;

const ERROR_WINNING_BID_ABSENT = 'winning_bid_absent';

const MOCK = {
  Ad_Units: [{'code': 'div-gpt-ad-1460505748561-0', 'mediaTypes': {'banner': {'sizes': [[300, 250]]}}, 'bids': [], 'ext': {'prop1': 'value1'}}],
  MULTI_FORMAT_TWIN_AD_UNITS: [{'code': 'div-gpt-ad-1460505748561-0', 'mediaTypes': {'banner': {'sizes': [[300, 250]]}, 'native': {'image': {'required': true, 'sizes': [150, 50]}}}, 'bids': [], 'ext': {'prop1': 'value1'}}, {'code': 'div-gpt-ad-1460505748561-0', 'mediaTypes': {'video': {'playerSize': [640, 480], 'context': 'instream'}}, 'bids': [], 'ext': {'prop1': 'value1'}}],
  TWIN_AD_UNITS: [{'code': 'div-gpt-ad-1460505748561-0', 'mediaTypes': {'banner': {'sizes': [[300, 100]]}}, 'ask': '300x100', 'bids': [{'bidder': 'bidder1', 'params': {'siteId': '451465'}}]}, {'code': 'div-gpt-ad-1460505748561-0', 'mediaTypes': {'banner': {'sizes': [[300, 250], [300, 100]]}}, 'bids': [{'bidder': 'medianet', 'params': {'cid': 'TEST_CID', 'crid': '451466393'}}]}, {'code': 'div-gpt-ad-1460505748561-0', 'mediaTypes': {'banner': {'sizes': [[300, 250]]}}, 'bids': [{'bidder': 'bidder1', 'params': {'siteId': '451466'}}]}],
  AUCTION_INIT: {'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'timestamp': 1584563605739, 'timeout': 6000},
  AUCTION_INIT_WITH_FLOOR: {'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'timestamp': 1584563605739, 'timeout': 6000, 'bidderRequests': [{'bids': [{ 'floorData': {'enforcements': {'enforceJS': true}} }]}]},
  BID_REQUESTED: {'bidderCode': 'medianet', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bids': [{'bidder': 'medianet', 'params': {'cid': 'TEST_CID', 'crid': '451466393'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]], 'ext': ['asdads']}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'sizes': [[300, 250]], 'bidId': '28248b0e6aece2', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'}], 'auctionStart': 1584563605739, 'timeout': 6000, 'uspConsent': '1YY', 'start': 1584563605743},
  MULTI_FORMAT_BID_REQUESTED: {'bidderCode': 'medianet', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bids': [{'bidder': 'medianet', 'params': {'cid': 'TEST_CID', 'crid': '451466393'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]]}, 'video': {'playerSize': [640, 480], 'context': 'instream'}, 'native': {'image': {'required': true, 'sizes': [150, 50]}, 'title': {'required': true, 'len': 80}}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'sizes': [[300, 250]], 'bidId': '28248b0e6aece2', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'}], 'auctionStart': 1584563605739, 'timeout': 6000, 'uspConsent': '1YY', 'start': 1584563605743},
  TWIN_AD_UNITS_BID_REQUESTED: [{'bidderCode': 'bidder1', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bidderRequestId': '16f0746ff657b5', 'bids': [{'bidder': 'bidder1', 'params': {'siteId': '451465'}, 'mediaTypes': {'banner': {'sizes': [[300, 100]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '9615b5d1-7a4f-4c65-9464-4178b91da9e3', 'sizes': [[300, 100]], 'bidId': '2984d18e18bdfe', 'bidderRequestId': '16f0746ff657b5', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client', 'bidRequestsCount': 3, 'bidderRequestsCount': 2, 'bidderWinsCount': 0}, {'bidder': 'bidder1', 'params': {'siteId': '451466'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '8bd7c9f2-0fe6-4ac5-8f2a-7f4a88af1b71', 'sizes': [[300, 250]], 'bidId': '3dced609066035', 'bidderRequestId': '16f0746ff657b5', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client', 'bidRequestsCount': 3, 'bidderRequestsCount': 2, 'bidderWinsCount': 0}], 'auctionStart': 1584563605739, 'timeout': 3000, 'start': 1584563605743}, {'bidderCode': 'medianet', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bidderRequestId': '4b45d1de1fa8fe', 'bids': [{'bidder': 'medianet', 'params': {'cid': 'TEST_CID', 'crid': '451466393'}, 'mediaTypes': {'banner': {'sizes': [[300, 250], [300, 100]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '215c038e-3b6a-465b-8937-d32e2ad8de45', 'sizes': [[300, 250], [300, 100]], 'bidId': '58d34adcb09c99', 'bidderRequestId': '4b45d1de1fa8fe', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client', 'bidRequestsCount': 3, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}], 'auctionStart': 1584563605739, 'timeout': 3000, 'start': 1584563605743}],
  BID_RESPONSE: {'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.10, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]},
  AUCTION_END: {'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'auctionEnd': 1584563605739},
  SET_TARGETING: {'div-gpt-ad-1460505748561-0': {'prebid_test': '1', 'hb_format': 'banner', 'hb_source': 'client', 'hb_size': '300x250', 'hb_pb': '2.00', 'hb_adid': '3e6e4bce5c8fb3', 'hb_bidder': 'medianet', 'hb_format_medianet': 'banner', 'hb_source_medianet': 'client', 'hb_size_medianet': '300x250', 'hb_pb_medianet': '2.00', 'hb_adid_medianet': '3e6e4bce5c8fb3', 'hb_bidder_medianet': 'medianet'}},
  NO_BID_SET_TARGETING: {'div-gpt-ad-1460505748561-0': {}},
  BID_WON: {'bidderCode': 'medianet', 'width': 300, 'height': 250, 'statusMessage': 'Bid available', 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]},
  BID_WON_2: {'bidderCode': 'appnexus', 'width': 300, 'height': 250, 'statusMessage': 'Bid available', 'adId': '3e6e4bce5c8fb4', 'requestId': '28248b0e6aecd5', 'mediaType': 'banner', 'source': 'client', 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'appnexus', 'hb_adid': '3e6e4bce5c8fb4', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'publisherId': 'test123', 'placementId': '451466393'}]},
  BID_WON_UNKNOWN: {'bidderCode': 'appnexus', 'width': 300, 'height': 250, 'statusMessage': 'Bid available', 'adId': '3e6e4bce5c8fkk', 'requestId': '28248b0e6aecd5', 'mediaType': 'banner', 'source': 'client', 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'appnexus', 'hb_adid': '3e6e4bce5c8fb4', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'publisherId': 'test123', 'placementId': '451466393'}]},
  NO_BID: {'bidder': 'medianet', 'params': {'cid': 'test123', 'crid': '451466393', 'site': {}}, 'mediaTypes': {'banner': {'sizes': [[300, 250]], 'ext': ['asdads']}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '303fa0c6-682f-4aea-8e4a-dc68f0d5c7d5', 'sizes': [[300, 250], [300, 600]], 'bidId': '28248b0e6aece2', 'bidderRequestId': '13fccf3809fe43', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'},
  BID_TIMEOUT: [{'bidId': '28248b0e6aece2', 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'params': [{'cid': 'test123', 'crid': '451466393', 'site': {}}, {'cid': '8CUX0H51P', 'crid': '451466393', 'site': {}}], 'timeout': 6}],
  BIDS_SAME_REQ_DIFF_CPM: [{'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.10, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]}, {'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb4', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 1.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.10, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 278, 'pbLg': '1.00', 'pbMg': '1.20', 'pbHg': '1.29', 'pbAg': '1.25', 'pbDg': '1.29', 'pbCg': '1.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '1.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]}],
  BIDS_SAME_REQ_EQUAL_CPM: [{'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.1, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]}, {'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb4', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.1, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 286, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]}],
  BID_RESPONSES: [{'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.1, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'params': [{'cid': 'test123', 'crid': '451466393'}]}, {'bidderCode': 'appnexus', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb4', 'requestId': '28248b0e6aecd5', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 1.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'floorData': {'floorValue': 1.1, 'floorRule': 'banner'}, 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 278, 'pbLg': '1.00', 'pbMg': '1.20', 'pbHg': '1.29', 'pbAg': '1.25', 'pbDg': '1.29', 'pbCg': '1.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'appnexus', 'hb_adid': '3e6e4bce5c8fb4', 'hb_pb': '1.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'params': [{'publisherId': 'test123', 'placementId': '451466393'}]}],
  BID_REQUESTS: [{'bidderCode': 'medianet', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bids': [{'bidder': 'medianet', 'params': {'cid': 'TEST_CID', 'crid': '451466393'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]], 'ext': ['asdads']}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'sizes': [[300, 250]], 'bidId': '28248b0e6aece2', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'}], 'auctionStart': 1584563605739, 'timeout': 6000, 'uspConsent': '1YY', 'start': 1584563605743}, {'bidderCode': 'appnexus', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bids': [{'bidder': 'appnexus', 'params': {'publisherId': 'TEST_CID', 'placementId': '451466393'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]], 'ext': ['asdads']}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'sizes': [[300, 250]], 'bidId': '28248b0e6aecd5', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'}], 'auctionStart': 1584563605739, 'timeout': 6000, 'uspConsent': '1YY', 'start': 1584563605743}]
};

function performAuctionWithFloorConfig() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT_WITH_FLOOR, {adUnits: MOCK.Ad_Units}));
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
  events.emit(BID_WON, MOCK.BID_WON);
}

function performStandardAuctionWithWinner() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.Ad_Units}));
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
  events.emit(BID_WON, MOCK.BID_WON);
}

function performMultiFormatAuctionWithNoBid() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.MULTI_FORMAT_TWIN_AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MULTI_FORMAT_BID_REQUESTED);
  events.emit(NO_BID, MOCK.NO_BID);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.NO_BID_SET_TARGETING);
}

function performTwinAdUnitAuctionWithNoBid() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.TWIN_AD_UNITS}));
  MOCK.TWIN_AD_UNITS_BID_REQUESTED.forEach(bidRequested => events.emit(BID_REQUESTED, bidRequested));
  MOCK.TWIN_AD_UNITS_BID_REQUESTED.forEach(bidRequested => bidRequested.bids.forEach(noBid => events.emit(NO_BID, noBid)));
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.NO_BID_SET_TARGETING);
}

function performStandardAuctionWithNoBid() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.Ad_Units}));
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(NO_BID, MOCK.NO_BID);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.NO_BID_SET_TARGETING);
}

function performStandardAuctionWithTimeout() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.Ad_Units}));
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.NO_BID_SET_TARGETING);
}

function performStandardAuctionMultiBidWithSameRequestId(bidRespArray) {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.Ad_Units}));
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  bidRespArray.forEach(bidResp => events.emit(BID_RESPONSE, bidResp));
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
  events.emit(BID_WON, MOCK.BID_WON);
}

function performStandardAuctionMultiBidResponseNoWin() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.Ad_Units}));
  MOCK.BID_REQUESTS.forEach(bidReq => events.emit(BID_REQUESTED, bidReq));
  MOCK.BID_RESPONSES.forEach(bidResp => events.emit(BID_RESPONSE, bidResp));
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
}

function getQueryData(url, decode = false) {
  const queryArgs = url.split('?')[1].split('&');
  return queryArgs.reduce((data, arg) => {
    let [key, val] = arg.split('=');
    if (decode) {
      val = decodeURIComponent(val);
    }
    if (data[key] !== undefined) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(val);
    } else {
      data[key] = val;
    }
    return data;
  }, {});
}

describe('Media.net Analytics Adapter', function() {
  let sandbox;
  let CUSTOMER_ID = 'test123';
  let VALID_CONFIGURATION = {
    options: {
      cid: CUSTOMER_ID
    }
  };
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Configuration', function() {
    it('should log error if publisher id is not passed', function() {
      sandbox.stub(utils, 'logError');

      medianetAnalytics.enableAnalytics();
      expect(
        utils.logError.calledWith(
          'Media.net Analytics adapter: cid is required.'
        )
      ).to.be.true;
    });

    it('should not log error if valid config is passed', function() {
      sandbox.stub(utils, 'logError');

      medianetAnalytics.enableAnalytics(VALID_CONFIGURATION);
      expect(utils.logError.called).to.equal(false);
      medianetAnalytics.disableAnalytics();
    });
  });

  describe('Events', function() {
    beforeEach(function () {
      medianetAnalytics.enableAnalytics({
        options: {
          cid: 'test123'
        }
      });
      medianetAnalytics.clearlogsQueue();
    });
    afterEach(function () {
      medianetAnalytics.clearlogsQueue();
      medianetAnalytics.disableAnalytics();
    });

    it('should not log if only Auction Init', function() {
      medianetAnalytics.clearlogsQueue();
      medianetAnalytics.track({ AUCTION_INIT })
      expect(medianetAnalytics.getlogsQueue().length).to.equal(0);
    });

    it('should have all applicable sizes in request', function() {
      medianetAnalytics.clearlogsQueue();
      performMultiFormatAuctionWithNoBid();
      const noBidLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log))[0];
      medianetAnalytics.clearlogsQueue();
      expect(noBidLog.mtype).to.have.ordered.members([encodeURIComponent('banner|native|video'), encodeURIComponent('banner|video|native')]);
      expect(noBidLog.szs).to.have.ordered.members([encodeURIComponent('300x250|1x1|640x480'), encodeURIComponent('300x250|1x1|640x480')]);
      expect(noBidLog.vplcmtt).to.equal('instream');
    });

    it('twin ad units should have correct sizes', function() {
      performTwinAdUnitAuctionWithNoBid();
      const noBidLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log, true))[0];
      const banner = 'banner';
      expect(noBidLog.pvnm).to.have.ordered.members(['-2', 'bidder1', 'bidder1', 'medianet']);
      expect(noBidLog.mtype).to.have.ordered.members([banner, banner, banner, banner]);
      expect(noBidLog.status).to.have.ordered.members(['1', '2', '2', '2']);
      expect(noBidLog.size).to.have.ordered.members(['', '', '', '']);
      expect(noBidLog.szs).to.have.ordered.members(['300x100|300x250', '300x100', '300x250', '300x250|300x100']);
    });

    it('AP log should fire only once', function() {
      performStandardAuctionWithNoBid();
      events.emit(SET_TARGETING, MOCK.NO_BID_SET_TARGETING);
      const logs = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log, true));
      expect(logs.length).to.equal(1);
      expect(logs[0].lgtp).to.equal('APPR');
    });

    it('should have winner log in standard auction', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithWinner();
      let winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      medianetAnalytics.clearlogsQueue();

      expect(winnerLog.length).to.equal(1);
    });

    it('should have correct values in winner log', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithWinner();
      let winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      medianetAnalytics.clearlogsQueue();

      expect(winnerLog[0]).to.include({
        winner: '1',
        pvnm: 'medianet',
        curr: 'USD',
        src: 'client',
        size: '300x250',
        mtype: 'banner',
        gdpr: '0',
        cid: 'test123',
        lper: '1',
        ogbdp: '1.1495',
        flt: '1',
        supcrid: 'div-gpt-ad-1460505748561-0',
        mpvid: '123',
        bidflr: '1.1'
      });
    });

    it('should have correct bid floor data in winner log', function() {
      medianetAnalytics.clearlogsQueue();
      performAuctionWithFloorConfig();
      let winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      medianetAnalytics.clearlogsQueue();

      expect(winnerLog[0]).to.include({
        winner: '1',
        curr: 'USD',
        ogbdp: '1.1495',
        bidflr: '1.1',
        flrrule: 'banner',
        flrdata: encodeURIComponent('ln=||skp=||enfj=true||enfd=||sr=||fs=')
      });
    });

    it('should have no bid status', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithNoBid();
      let noBidLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      noBidLog = noBidLog[0];

      medianetAnalytics.clearlogsQueue();
      expect(noBidLog.pvnm).to.have.ordered.members(['-2', 'medianet']);
      expect(noBidLog.iwb).to.have.ordered.members(['0', '0']);
      expect(noBidLog.status).to.have.ordered.members(['1', '2']);
      expect(noBidLog.src).to.have.ordered.members(['client', 'client']);
      expect(noBidLog.curr).to.have.ordered.members(['', '']);
      expect(noBidLog.mtype).to.have.ordered.members(['banner', 'banner']);
      expect(noBidLog.ogbdp).to.have.ordered.members(['', '']);
      expect(noBidLog.mpvid).to.have.ordered.members(['', '']);
      expect(noBidLog.crid).to.have.ordered.members(['', '451466393']);
    });

    it('should have timeout status', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithTimeout();
      let timeoutLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      timeoutLog = timeoutLog[0];

      medianetAnalytics.clearlogsQueue();
      expect(timeoutLog.pvnm).to.have.ordered.members(['-2', 'medianet']);
      expect(timeoutLog.iwb).to.have.ordered.members(['0', '0']);
      expect(timeoutLog.status).to.have.ordered.members(['1', '3']);
      expect(timeoutLog.src).to.have.ordered.members(['client', 'client']);
      expect(timeoutLog.curr).to.have.ordered.members(['', '']);
      expect(timeoutLog.mtype).to.have.ordered.members(['banner', 'banner']);
      expect(timeoutLog.ogbdp).to.have.ordered.members(['', '']);
      expect(timeoutLog.mpvid).to.have.ordered.members(['', '']);
      expect(timeoutLog.crid).to.have.ordered.members(['', '451466393']);
    });

    it('should pick winning bid if multibids with same request id', function() {
      performStandardAuctionMultiBidWithSameRequestId(MOCK.BIDS_SAME_REQ_DIFF_CPM);
      let winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner)[0];
      expect(winningBid.adid).equals('3e6e4bce5c8fb3');
      medianetAnalytics.clearlogsQueue();

      const reversedResponseArray = [].concat(MOCK.BIDS_SAME_REQ_DIFF_CPM).reverse();
      performStandardAuctionMultiBidWithSameRequestId(reversedResponseArray);
      winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner)[0];
      expect(winningBid.adid).equals('3e6e4bce5c8fb3');
    });

    it('should pick winning bid if multibids with same request id and equal cpm', function() {
      performStandardAuctionMultiBidWithSameRequestId(MOCK.BIDS_SAME_REQ_EQUAL_CPM);
      let winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner)[0];
      expect(winningBid.adid).equals('3e6e4bce5c8fb3');
      medianetAnalytics.clearlogsQueue();

      const reversedResponseArray = [].concat(MOCK.BIDS_SAME_REQ_EQUAL_CPM).reverse();
      performStandardAuctionMultiBidWithSameRequestId(reversedResponseArray);
      winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner)[0];
      expect(winningBid.adid).equals('3e6e4bce5c8fb3');
    });

    it('should pick single winning bid per bid won', function() {
      performStandardAuctionMultiBidResponseNoWin();
      const queue = medianetAnalytics.getlogsQueue();
      queue.length = 0;

      events.emit(BID_WON, MOCK.BID_WON);
      let winningBids = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      expect(winningBids[0].adid).equals(MOCK.BID_WON.adId);
      expect(winningBids.length).equals(1);
      events.emit(BID_WON, MOCK.BID_WON_2);
      winningBids = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      expect(winningBids[1].adid).equals(MOCK.BID_WON_2.adId);
      expect(winningBids.length).equals(2);
    });

    it('should ignore unknown winning bid and log error', function() {
      performStandardAuctionMultiBidResponseNoWin();
      const queue = medianetAnalytics.getlogsQueue();
      queue.length = 0;

      events.emit(BID_WON, MOCK.BID_WON_UNKNOWN);
      let winningBids = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      let errors = medianetAnalytics.getErrorQueue().map((log) => getQueryData(log));
      expect(winningBids.length).equals(0);
      expect(errors.length).equals(1);
      expect(errors[0].event).equals(ERROR_WINNING_BID_ABSENT);
    });
  });
});
