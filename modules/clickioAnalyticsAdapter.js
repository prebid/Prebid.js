import {ajax} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import * as utils from '../src/utils';

const CONSTANTS = require('../src/constants.json');

const analyticsType = 'endpoint';
const endpointUrl = 'https://clickiocdn.com/utr/hb_stat_new/';

function compactizer(arr, val) {
  let tmpVal = (arr.length && arr[arr.length-1] === val) ? '-' : val;
  arr.push(tmpVal);
}

function EventsQueue() {
  let queue = [];

  this.push = (event) => {
    if (event instanceof Array) {
      queue.push.apply(queue, event);
    } else {
      queue.push(event);
    }
  };

  this.popAll = () => {
    let result = queue;
    queue = [];
    return result;
  };
}

function processEventsQue (context) {
  let receivedEvents = context.queue.popAll();
  let grouppedEvents = {};

  let dataAttrs = ['imp', 'bid', 'req', 'res', 'tim', 'won'];
  let allAttrs  = dataAttrs.concat(['adu', 'bdr']);

  receivedEvents.forEach(event => {
    if (!grouppedEvents[event['adu']]) {
      grouppedEvents[event['adu']] = {};
    }

    if (!grouppedEvents[event['adu']][event['bdr']]) {
      grouppedEvents[event['adu']][event['bdr']] = {
        'bdr': event['bdr'],
        'adu': event['adu']
      };
    }

    let aduEvent = grouppedEvents[event['adu']][event['bdr']];

    dataAttrs.forEach(attr => {
      if (typeof event[attr] !== 'undefined') {
        if (typeof aduEvent[attr] === 'undefined') {
          aduEvent[attr] = event[attr];
        } else {
          aduEvent[attr] += event[attr];
        }
      }
    });
  });

  Object.keys(grouppedEvents).forEach(function (eventUnit) {
    let tmpTrackerParams = {};

    allAttrs.forEach(attr => {
      tmpTrackerParams[attr] = [];
    });

    Object.keys(grouppedEvents[eventUnit]).forEach(function (eventBidder) {
      allAttrs.forEach(attr => {
        compactizer(tmpTrackerParams[attr], grouppedEvents[eventUnit][eventBidder][attr]);
      });
    });

    try {
      ajax(
        context.host,
        null, // callback
        tmpTrackerParams,
        {
          method: 'GET',
          contentType: 'application/x-www-form-urlencoded'
        }
      );
    } catch (err) {
      utils.logError('Clickio Analytics: Error on send data: ', err);
    }
  });
}
// var cl = function (data) {
//     console['log'](data);
// };
//
// var cj = function (data) {
//     var jsonString = "";
//
//     try {
//       jsonString = JSON.stringify(data, null, 4)
//     } catch (e) {
//       cgc('Error in JSON.stringify');
//       cge(data);
//       return;
//     }
//
//     cl("\n"+jsonString, true);
// };
//
// var cgc = function (name) {
//     console.groupCollapsed(name);
// };
//
// /**
//  * @param {*=} data
//  * @param {boolean=} preventInstance
//  */
// var cge = function (data) {
//     if (data) {
//       cl(data);
//     }
//
//     console.groupEnd();
// };
//
// var cgcj = function (groupName, object) {
//   cgc(groupName);
//   cj(object);
//   cge();
// };
//
// var cgcl = function (groupName, object) {
//   cgc(groupName);
//   cl(object);
//   cge();
// };

let clickioAnalyticsAdapter = Object.assign(adapter({
    endpointUrl,
    analyticsType
}), {
    track({eventType, args}) {
      if (!clickioAnalyticsAdapter.context) {
        return;
      }

/*
        // if (eventType == CONSTANTS.EVENTS.BIDDER_DONE
        //     || eventType == CONSTANTS.EVENTS.BID_ADJUSTMENT
        // ) {
        //     cgcj('Clickio Analytics Call ('+eventType+': '+args.bidderCode+')', args);
        // } else if (eventType == CONSTANTS.EVENTS.BID_RESPONSE) {
        //     cgcj('Clickio Analytics Call ('+eventType+': '+args.bidderCode+': '+args.cpm+')', args);
        // } else if (eventType == CONSTANTS.EVENTS.NO_BID) {
        //     // cgcj('Clickio Analytics Call ('+eventType+': '+args.bidderCode+': '+args.cpm+')', args);
        // } else {
        //     cgcj('Clickio Analytics Call ('+eventType+')', args);
        // }

        // Clickio Analytics Call (auctionInit)
        // {
        //     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //     "timestamp": 1559574504556,
        //     "auctionStatus": "inProgress",
        //     "adUnits": [
        //         {
        //             "code": "/45470634/clickio_area_599113_300x600",
        //             "sizes": [
        //                 [
        //                     300,
        //                     250
        //                 ]
        //             ],
        //             "bids": [
        //                 {
        //                     "bidder": "districtm",
        //                     "params": {
        //                         "placementId": "12093571"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "criteo",
        //                     "params": {
        //                         "zoneId": "1171245"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "smartadserver",
        //                     "params": {
        //                         "networkId": 3070,
        //                         "domain": "//prg.smartadserver.com",
        //                         "currency": "EUR",
        //                         "formatId": 65139,
        //                         "tagId": "sas_65139",
        //                         "siteId": 235136,
        //                         "pageId": 934422
        //                     }
        //                 },
        //                 {
        //                     "bidder": "appnexus",
        //                     "params": {
        //                         "placementId": "14122397"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "pubmatic",
        //                     "params": {
        //                         "publisherId": "157687",
        //                         "adSlot": "200158_300x250_1@300x250"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "rubicon",
        //                     "params": {
        //                         "accountId": "19944",
        //                         "siteId": "233404",
        //                         "zoneId": "1169006",
        //                         "inventory": {
        //                             "ad_unit_id": [
        //                                 "583607"
        //                             ]
        //                         }
        //                     }
        //                 }
        //             ],
        //             "__spec__": {
        //                 "type": "js_npm",
        //                 "lazy_load": false,
        //                 "ar_time": 30,
        //                 "delayed_hb": 1,
        //                 "div_name": "lx_583607"
        //             },
        //             "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148"
        //         }
        //     ],
        //     "adUnitCodes": [
        //         "/45470634/clickio_area_599113_300x600"
        //     ],
        //     "bidderRequests": [
        //         {
        //             "bidderCode": "districtm",
        //             "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //             "bidderRequestId": "18adf730a642c6",
        //             "bids": [
        //                 {
        //                     "bidder": "districtm",
        //                     "params": {
        //                         "placementId": "12093571"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "227339a19e432c8",
        //                     "bidderRequestId": "18adf730a642c6",
        //                     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559574504556,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             }
        //         },
        //         {
        //             "bidderCode": "rubicon",
        //             "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //             "bidderRequestId": "314f4526b02803",
        //             "bids": [
        //                 {
        //                     "bidder": "rubicon",
        //                     "params": {
        //                         "accountId": "19944",
        //                         "siteId": "233404",
        //                         "zoneId": "1169006",
        //                         "inventory": {
        //                             "ad_unit_id": [
        //                                 "583607"
        //                             ]
        //                         }
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "4f321fae0318f08",
        //                     "bidderRequestId": "314f4526b02803",
        //                     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559574504556,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             }
        //         },
        //         {
        //             "bidderCode": "appnexus",
        //             "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //             "bidderRequestId": "5907e238b6138e",
        //             "bids": [
        //                 {
        //                     "bidder": "appnexus",
        //                     "params": {
        //                         "placementId": "14122397"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "60d8b219c81d61",
        //                     "bidderRequestId": "5907e238b6138e",
        //                     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559574504556,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             }
        //         },
        //         {
        //             "bidderCode": "smartadserver",
        //             "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //             "bidderRequestId": "7c4418c4af67008",
        //             "bids": [
        //                 {
        //                     "bidder": "smartadserver",
        //                     "params": {
        //                         "networkId": 3070,
        //                         "domain": "//prg.smartadserver.com",
        //                         "currency": "EUR",
        //                         "formatId": 65139,
        //                         "tagId": "sas_65139",
        //                         "siteId": 235136,
        //                         "pageId": 934422
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "865f8c64c63f51",
        //                     "bidderRequestId": "7c4418c4af67008",
        //                     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559574504556,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             }
        //         },
        //         {
        //             "bidderCode": "pubmatic",
        //             "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //             "bidderRequestId": "9aba5abc54d8e6",
        //             "bids": [
        //                 {
        //                     "bidder": "pubmatic",
        //                     "params": {
        //                         "publisherId": "157687",
        //                         "adSlot": "200158_300x250_1@300x250"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "103d1e5b38b79ab8",
        //                     "bidderRequestId": "9aba5abc54d8e6",
        //                     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559574504556,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             }
        //         },
        //         {
        //             "bidderCode": "criteo",
        //             "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //             "bidderRequestId": "11252edaba8f3998",
        //             "bids": [
        //                 {
        //                     "bidder": "criteo",
        //                     "params": {
        //                         "zoneId": "1171245"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "7dd18f08-b2da-4f07-89d3-173f01886148",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "12856a0c41e35e38",
        //                     "bidderRequestId": "11252edaba8f3998",
        //                     "auctionId": "eba56699-121a-41de-9c67-0b8e3d4032b4",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559574504556,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             }
        //         }
        //     ],
        //     "noBids": [],
        //     "bidsReceived": [],
        //     "winningBids": [],
        //     "timeout": 1000,
        //     "config": {}
        // }

        // Clickio Analytics Call (setTargeting)
        // {
        //     "/45470634/clickio_area_599113_300x600": {
        //         "hb_format": "banner",
        //         "hb_source": "client",
        //         "hb_size": "300x250",
        //         "hb_pb": "1.65",
        //         "hb_adid": "13fff4020863489",
        //         "hb_bidder": "appnexus",
        //         "hb_format_appnexus": "banner",
        //         "hb_source_appnexus": "client",
        //         "hb_size_appnexus": "300x250",
        //         "hb_pb_appnexus": "1.65",
        //         "hb_adid_appnexus": "13fff4020863489",
        //         "hb_bidder_appnexus": "appnexus"
        //     }
        // }

        // Clickio Analytics Call (auctionEnd)
        // {
        //     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //     "timestamp": 1559575022561,
        //     "auctionEnd": 1559575023249,
        //     "auctionStatus": "completed",
        //     "adUnits": [
        //         {
        //             "code": "/45470634/clickio_area_599113_300x600",
        //             "sizes": [
        //                 [
        //                     300,
        //                     250
        //                 ]
        //             ],
        //             "bids": [
        //                 {
        //                     "bidder": "districtm",
        //                     "params": {
        //                         "placementId": "12093571"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "criteo",
        //                     "params": {
        //                         "zoneId": "1171245"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "smartadserver",
        //                     "params": {
        //                         "networkId": 3070,
        //                         "domain": "//prg.smartadserver.com",
        //                         "currency": "EUR",
        //                         "formatId": 65139,
        //                         "tagId": "sas_65139",
        //                         "siteId": 235136,
        //                         "pageId": 934422
        //                     }
        //                 },
        //                 {
        //                     "bidder": "appnexus",
        //                     "params": {
        //                         "placementId": "14122397"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "pubmatic",
        //                     "params": {
        //                         "publisherId": "157687",
        //                         "adSlot": "200158_300x250_1@300x250"
        //                     }
        //                 },
        //                 {
        //                     "bidder": "rubicon",
        //                     "params": {
        //                         "accountId": "19944",
        //                         "siteId": "233404",
        //                         "zoneId": "1169006",
        //                         "inventory": {
        //                             "ad_unit_id": [
        //                                 "583607"
        //                             ]
        //                         }
        //                     }
        //                 }
        //             ],
        //             "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984"
        //         }
        //     ],
        //     "adUnitCodes": [
        //         "/45470634/clickio_area_599113_300x600"
        //     ],
        //     "bidderRequests": [
        //         {
        //             "bidderCode": "smartadserver",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "bidderRequestId": "1fadd2121c757f8",
        //             "bids": [
        //                 {
        //                     "bidder": "smartadserver",
        //                     "params": {
        //                         "networkId": 3070,
        //                         "domain": "//prg.smartadserver.com",
        //                         "currency": "EUR",
        //                         "formatId": 65139,
        //                         "tagId": "sas_65139",
        //                         "siteId": 235136,
        //                         "pageId": 934422
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "2c153731461bc98",
        //                     "bidderRequestId": "1fadd2121c757f8",
        //                     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559575022561,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             },
        //             "start": 1559575022567
        //         },
        //         {
        //             "bidderCode": "rubicon",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "bidderRequestId": "337bbbdeecc382",
        //             "bids": [
        //                 {
        //                     "bidder": "rubicon",
        //                     "params": {
        //                         "accountId": 19944,
        //                         "siteId": 233404,
        //                         "zoneId": 1169006,
        //                         "inventory": {
        //                             "ad_unit_id": [
        //                                 "583607"
        //                             ]
        //                         },
        //                         "floor": null
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "4f9f08f3a27745",
        //                     "bidderRequestId": "337bbbdeecc382",
        //                     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //                     "src": "client",
        //                     "bidRequestsCount": 1,
        //                     "startTime": 1559575022572
        //                 }
        //             ],
        //             "auctionStart": 1559575022561,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             },
        //             "start": 1559575022569
        //         },
        //         {
        //             "bidderCode": "appnexus",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "bidderRequestId": "5b6df441c8c3a48",
        //             "bids": [
        //                 {
        //                     "bidder": "appnexus",
        //                     "params": {
        //                         "placementId": "14122397"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "661936be32001b8",
        //                     "bidderRequestId": "5b6df441c8c3a48",
        //                     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559575022561,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             },
        //             "start": 1559575022574
        //         },
        //         {
        //             "bidderCode": "criteo",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "bidderRequestId": "75b41782b62f63",
        //             "bids": [
        //                 {
        //                     "bidder": "criteo",
        //                     "params": {
        //                         "zoneId": "1171245"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "80d638c724ceda8",
        //                     "bidderRequestId": "75b41782b62f63",
        //                     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559575022561,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             },
        //             "start": 1559575022577
        //         },
        //         {
        //             "bidderCode": "pubmatic",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "bidderRequestId": "98af5673503d168",
        //             "bids": [
        //                 {
        //                     "bidder": "pubmatic",
        //                     "params": {
        //                         "publisherId": "157687",
        //                         "adSlot": "200158_300x250_1@300x250"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "10427cbea48c7bd",
        //                     "bidderRequestId": "98af5673503d168",
        //                     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559575022561,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             },
        //             "start": 1559575022601
        //         },
        //         {
        //             "bidderCode": "districtm",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "bidderRequestId": "119e3de06e48dd08",
        //             "bids": [
        //                 {
        //                     "bidder": "districtm",
        //                     "params": {
        //                         "placementId": "12093571"
        //                     },
        //                     "mediaTypes": {
        //                         "banner": {
        //                             "sizes": [
        //                                 [
        //                                     300,
        //                                     250
        //                                 ]
        //                             ]
        //                         }
        //                     },
        //                     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //                     "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ],
        //                     "bidId": "12b30aa46a6c43e",
        //                     "bidderRequestId": "119e3de06e48dd08",
        //                     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //                     "src": "client",
        //                     "bidRequestsCount": 1
        //                 }
        //             ],
        //             "auctionStart": 1559575022561,
        //             "timeout": 1000,
        //             "refererInfo": {
        //                 "referer": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/",
        //                 "reachedTop": true,
        //                 "numIframes": 0,
        //                 "stack": [
        //                     "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/"
        //                 ],
        //                 "canonicalUrl": "https://medianet.adlabsnetworks.com/public/ke/adlabs/prebid-test/index_files/a_004.htm"
        //             },
        //             "start": 1559575022604
        //         }
        //     ],
        //     "noBids": [
        //         {
        //             "bidder": "pubmatic",
        //             "params": {
        //                 "publisherId": "157687",
        //                 "adSlot": "200158_300x250_1@300x250"
        //             },
        //             "mediaTypes": {
        //                 "banner": {
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ]
        //                 }
        //             },
        //             "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //             "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //             "sizes": [
        //                 [
        //                     300,
        //                     250
        //                 ]
        //             ],
        //             "bidId": "10427cbea48c7bd",
        //             "bidderRequestId": "98af5673503d168",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "src": "client",
        //             "bidRequestsCount": 1
        //         },
        //         {
        //             "bidder": "rubicon",
        //             "params": {
        //                 "accountId": 19944,
        //                 "siteId": 233404,
        //                 "zoneId": 1169006,
        //                 "inventory": {
        //                     "ad_unit_id": [
        //                         "583607"
        //                     ]
        //                 },
        //                 "floor": null
        //             },
        //             "mediaTypes": {
        //                 "banner": {
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ]
        //                 }
        //             },
        //             "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //             "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //             "sizes": [
        //                 [
        //                     300,
        //                     250
        //                 ]
        //             ],
        //             "bidId": "4f9f08f3a27745",
        //             "bidderRequestId": "337bbbdeecc382",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "src": "client",
        //             "bidRequestsCount": 1,
        //             "startTime": 1559575022572
        //         },
        //         {
        //             "bidder": "districtm",
        //             "params": {
        //                 "placementId": "12093571"
        //             },
        //             "mediaTypes": {
        //                 "banner": {
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ]
        //                 }
        //             },
        //             "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //             "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //             "sizes": [
        //                 [
        //                     300,
        //                     250
        //                 ]
        //             ],
        //             "bidId": "12b30aa46a6c43e",
        //             "bidderRequestId": "119e3de06e48dd08",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "src": "client",
        //             "bidRequestsCount": 1
        //         },
        //         {
        //             "bidder": "smartadserver",
        //             "params": {
        //                 "networkId": 3070,
        //                 "domain": "//prg.smartadserver.com",
        //                 "currency": "EUR",
        //                 "formatId": 65139,
        //                 "tagId": "sas_65139",
        //                 "siteId": 235136,
        //                 "pageId": 934422
        //             },
        //             "mediaTypes": {
        //                 "banner": {
        //                     "sizes": [
        //                         [
        //                             300,
        //                             250
        //                         ]
        //                     ]
        //                 }
        //             },
        //             "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //             "transactionId": "fed5afbf-695b-405d-9a39-a85c43047984",
        //             "sizes": [
        //                 [
        //                     300,
        //                     250
        //                 ]
        //             ],
        //             "bidId": "2c153731461bc98",
        //             "bidderRequestId": "1fadd2121c757f8",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "src": "client",
        //             "bidRequestsCount": 1
        //         }
        //     ],
        //     "bidsReceived": [
        //         {
        //             "bidderCode": "appnexus",
        //             "width": 300,
        //             "height": 250,
        //             "statusMessage": "Bid available",
        //             "adId": "133bda2762f81a9",
        //             "requestId": "661936be32001b8",
        //             "mediaType": "banner",
        //             "source": "client",
        //             "cpm": 1.0115,
        //             "creativeId": 68011866,
        //             "currency": "USD",
        //             "netRevenue": true,
        //             "ttl": 300,
        //             "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //             "appnexus": {
        //                 "buyerMemberId": 1231
        //             },
        //             "ad": "<!-- Creative 68011866 served by Member 1231 via AppNexus --><html><body style=\"margin-left: 0%; margin-right: 0%; margin-top: 0%; margin-bottom: 0%\"><script type=\"text/javascript\">(function(){var base = 'cas.eu.criteo.com/delivery/';var url = 'rdi.eu.criteo.com/delivery/r/';if (url.charAt(0) != '$')base = url;document.write('<iframe src=\"https://' + base + 'rtb/appnexus/display.aspx?creative=9083891&amp;cb=245313550&amp;z=1.19&amp;width=300&amp;height=250&amp;did=5cf539f59213d9207dae0fad3e7a0800&u=%7Cz5WXEvSpZEQ9l4WkVIHwuUNlr9ks6AORf4zdsX3m00c%3D%7C&c1=jWCgqsKSUoUKSrwGVpWfAQSOF9EBbu-gO_dw6KbwjZrUGpKPKCzTPrGmPMs7IhrQrfSPCoDELb8BIl2dMCO-7YfT4mYBmV9uwCfLVbw8bbXNvAmzB3j9FF9PEd1LZW5wpWsHXWYOQPIhDIA0noxpQ3vhDoJ3pTTFACYnKFgZ7Qcb1CAbHD1zbF_Dd8IWrUOr3qlLPRi9pP6X1KV7FcmRSnpK5eLlMeOi7t9lODbpin6qA3Ga_i2egAJB11p0MM6WfbKYx24G94K6fTv_BtFjlL09ky-I_gnwW8UfAbiNEGUwxhdNM8y_5Daj2VBldUfyH41oHEmmxO8DCI4cYsdZMvxf5K-qQhHVfEsGpngWvZsKcaqTRWwFDEF_AjJmoTK2UESmrmMCvhb7ilugsN1VS8MFeHA5oud5LelwBTzkUZHFV4MyrPV7060U6kznzt2c-SlkW26qSKU\" framespacing=\"0\" frameborder=\"no\" scrolling=\"no\" width=\"300\" height=\"250\"></iframe>');})();</script></body></html><iframe src=\"https://acdn.adnxs.com/dmp/async_usersync.html?gdpr=0&seller_id=9954&pub_id=1316000\" width=\"1\" height=\"1\" frameborder=\"0\" scrolling=\"no\" marginheight=\"0\" marginwidth=\"0\" topmargin=\"0\" leftmargin=\"0\" style=\"position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0;\"></iframe><script>try {!function(){function e(e,t){return\"function\"==typeof __an_obj_extend_thunk?__an_obj_extend_thunk(e,t):e}function t(e,t){\"function\"==typeof __an_err_thunk&&__an_err_thunk(e,t)}function n(e,t){if(\"function\"==typeof __an_redirect_thunk)__an_redirect_thunk(e);else{var n=navigator.connection;navigator.__an_connection&&(n=navigator.__an_connection),window==window.top&&n&&n.downlinkMax<=.115&&\"function\"==typeof HTMLIFrameElement&&HTMLIFrameElement.prototype.hasOwnProperty(\"srcdoc\")?(window.__an_resize=function(e,t,n){var r=e.frameElement;r&&\"__an_if\"==r.getAttribute(\"name\")&&(t&&(r.style.width=t+\"px\"),n&&(r.style.height=n+\"px\"))},document.write('<iframe name=\"__an_if\" style=\"width:0;height:0\" srcdoc=\"<script type=\\'text/javascript\\' src=\\''+e+\"&\"+t.bdfif+\"=1'></sc\"),document.write('ript>\" frameborder=\"0\" scrolling=\"no\" marginheight=0 marginwidth=0 topmargin=\"0\" leftmargin=\"0\" allowtransparency=\"true\"></iframe>')):document.write('<script language=\"javascript\" src=\"'+e+'\"></scr'+'ipt>')}};var r=function(e){this.rdParams=e};r.prototype={constructor:r,walkAncestors:function(e){try{if(!window.location.ancestorOrigins)return;for(var t=0,n=window.location.ancestorOrigins.length;n>t;t++)e.call(null,window.location.ancestorOrigins[t],t)}catch(r){\"undefined\"!=typeof console}return[]},walkUpWindows:function(e){var t,n=[];do try{t=t?t.parent:window,e.call(null,t,n)}catch(r){return\"undefined\"!=typeof console,n.push({referrer:null,location:null,isTop:!1}),n}while(t!=window.top);return n},getPubUrlStack:function(e){var n,r=[],o=null,i=null,a=null,c=null,d=null,s=null,u=null;for(n=e.length-1;n>=0;n--){try{a=e[n].location}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: location\")}if(a)i=encodeURIComponent(a),r.push(i),u||(u=i);else if(0!==n){c=e[n-1];try{d=c.referrer,s=c.ancestor}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: prevFrame\")}d?(i=encodeURIComponent(d),r.push(i),u||(u=i)):s?(i=encodeURIComponent(s),r.push(i),u||(u=i)):r.push(o)}else r.push(o)}return{stack:r,detectUrl:u}},getLevels:function(){var e=this.walkUpWindows(function(e,n){try{n.push({referrer:e.document.referrer||null,location:e.location.href||null,isTop:e==window.top})}catch(r){n.push({referrer:null,location:null,isTop:e==window.top}),\"undefined\"!=typeof console,t(r,\"AnRDModule::getLevels\")}});return this.walkAncestors(function(t,n){e[n].ancestor=t}),e},getRefererInfo:function(){var e=\"\";try{var n=this.getLevels(),r=n.length-1,o=null!==n[r].location||r>0&&null!==n[r-1].referrer,i=this.getPubUrlStack(n);e=this.rdParams.rdRef+\"=\"+i.detectUrl+\"&\"+this.rdParams.rdTop+\"=\"+o+\"&\"+this.rdParams.rdIfs+\"=\"+r+\"&\"+this.rdParams.rdStk+\"=\"+i.stack+\"&\"+this.rdParams.rdQs}catch(a){e=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::getRefererInfo\")}return e}};var o=function(n){var o=\"\";try{n=e(n,0);var i=e(new r(n),1);return i.getRefererInfo()}catch(a){o=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::executeRD\")}return o};;var c=\"https://fra1-ib.adnxs.com/rd_log?an_audit=0&referrer=https%3A%2F%2Fmedianet.adlabsnetworks.com%2Fpublic%2Fke%2Fadlabs%2Fprebid-test%2F&e=wqT_3QK8DPBMPAYAAAMA1gAFAQj389TnBRCqksieiuPP2mMY1_KqqdmAnNQBKjYJCtejcD0K8z8RyHa-nxov8D8ZAAAAYLgeB0AhyHa-nxov8D8pCtcJJMgxAAAAQOF61D8wnfvdBjjiTUDPCUg0UNqOtyBYnPtjYABot-p9ePbdBIABAYoBA1VTRJIFBvSwBZgBrAKgAfoBqAEBsAEAuAEBwAEFyAEC0AEA2AEA4AEA8AEAkgLWAzkya0dmT3lOSEx3eHZMVGhVRUFRVi1kLWtONXZ4eVFRamlYS0Z6dGNfN3F4Qy1rVnZaZW80QUkweUkxcmVqMWk0NERtMUJWS1JCT1lyNkZQZmZxY21nN1RUNUdWdW5EOGVwY1YyS1RWNE52Sl8wUWpidi1uQzZKc2Vvc2x0blNYMVVtby11NEtEYXNHVFNOWHE5cXdBVUFXOVMtTXZ0U0hWNll1aVI4c0ZMbUduYS1QaDhkcUhvcDFjSVM1LTc3M2dnbmdTQzdIZ2tDT2hJVUQ3cExRSnpxRnlSTnVQWmJWMzVOanNmUlVlaElZWkFNZlNOcVBfNU9qSkRmU016azhnd3llRkIwSnY4SDRmeDhsLTFib2xxQWljejBuTFZsaFVjTWd4MVAtaGRiYTJyY1Q3QkVjT19oQkFaOU9tMjNMWXBuVWx1OHpKdWJpWW5KUFhlN2U5NWRMc2JzbWM0LTF3S1A5S1YtQ2QzTVdtNjBDZllzZlJ1M002LXVzUy0tX3p2NXV1MlZVelhablJKTERDdi1UZHFnSWlWTGNsT1N1WEZlZkJ0aXR1TzJoYl9HNlZuZThqWFhrMFA0MEFkMmxEOUxCQ19tclpWNWc0LWhheHhTbmVB2AIA4AKzrkzqAkFodHRwczovL21lZGlhbmV0LmFkbGFic25ldHdvcmtzLmNvbS9wdWJsaWMva2UvYWRsYWJzL3ByZWJpZC10ZXN0L_ICwgQKE0RFTElWRVJZX1BBUkFNRVRFUlMSqgRkaWQ9NWNmNTM5ZjU5MjEzZDkyMDdkYWUwZmFkM2U3YTA4MDAmdT0lN0N6NVdYRXZTcFpFUTlsNFdrVklId3VVTmxyOWtzNkFPUmY0emRzWDNtMDBjJTNEJTdDJmMxPWpXQ2dxc0tTVW9VS1Nyd0dWcFdmQVFTT0Y5RUJidS1nT19kdzZLYndqWnJVR3BLUEtDelRQckdtUE1zN0loclFyZlNQQ29ERUxiOEJJbDJkTUNPLTdZZlQ0bVlCbVY5dXdDZkxWYnc4YmJYTnZBbXpCM2o5RkY5UEVkMUxaVzV3cFdzSFhXWU9RUEloRElBMG5veHBRM3ZoRG9KM3BUVEZBQ1luS0ZnWjdRY2IxQ0FiSEQxemJGX0RkOElXclVPcjNxbExQUmk5cFA2WDFLVjdGY21SU25wSzVlTGxNZU9pN3Q5bE9EYnBpbjZxQTNHYV9pMmVnQUpCMTFwME1NNldmYktZeDI0Rzk0SzZmVHZfQnRGamxMMDlreS1JX2dud1c4VWZBYmlORUdVd3hoZE5NOHlfNURhajJWQmxkVWZ5SDQxb0hFbW14TzhEQ0k0Y1lzZFpNdnhmNUstcVFoSFZmRXNHcG5nV3Zac0tjYXFUUld3RkRFRl9Bakptb1RLMlVFU21ybU1DdmhiN2lsdWdzTjFWUzhNRmVIQTVvdWQ1TGVsd0JUemtVWkhGVjRNeXJQVjcwNjBVNmt6bnp0MmMtU2xrVzI2cVNLVfICLQoMREVMSVZFUllfVVJMEh1yZGkuZXUuY3JpdGVvLmNvbS9kZWxpdmVyeS9yL4ADAYgDAZADAJgDF6ADAaoDAMADrALIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQOMTg1LjE4OS4xMTMuMjOoBJ44sgQQCAAQARisAiD6ASgAMAA4ArgEAMAEAMgEANoEAggB4AQB8ATajrcgiAUBmAUAoAXWraPlrK7Rh3vABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWeE_oFBAgAEACQBgCYBgC4BgDBBgAAAAAAAPA_yAYA2gYWChAAAAAAAAAAAAAAAAAAAAAAEAAYAOAGAfIGAggAgAcBiAcA&s=35458d5864ef8a16de7b610bc6cce2c0fb7c1ce8\";c+=\"&\"+o({rdRef:\"bdref\",rdTop:\"bdtop\",rdIfs:\"bdifs\",rdStk:\"bstk\",rdQs:\"\"}),n(c,{bdfif:\"bdfif\"})}();} catch (e) { }</script><div name=\"anxv\" lnttag=\"v;tv=view7-1hs;st=0;d=300x250;vc=iab;vid_ccr=1;ab=10;tag_id=14122397;cb=https%3A%2F%2Ffra1-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttps%253A%252F%252Fmedianet.adlabsnetworks.com%252Fpublic%252Fke%252Fadlabs%252Fprebid-test%252F%26e%3DwqT_3QLpDPBMaQYAAAMA1gAFAQj389TnBRCqksieiuPP2mMY1_KqqdmAnNQBKjYJCtejcD0K8z8RyHa-nxov8D8ZAAAAYLgeB0AhyHa-nxov8D8pCtcJJMgxAAAAQOF61D8wnfvdBjjiTUDPCUg0UNqOtyBYnPtjYABot-p9ePbdBIABAYoBA1VTRJIFBvTdBZgBrAKgAfoBqAEBsAEAuAEBwAEFyAEC0AEA2AEA4AEA8AEAkgLWAzkya0dmT3lOSEx3eHZMVGhVRUFRVi1kLWtONXZ4eVFRamlYS0Z6dGNfN3F4Qy1rVnZaZW80QUkweUkxcmVqMWk0NERtMUJWS1JCT1lyNkZQZmZxY21nN1RUNUdWdW5EOGVwY1YyS1RWNE52Sl8wUWpidi1uQzZKc2Vvc2x0blNYMVVtby11NEtEYXNHVFNOWHE5cXdBVUFXOVMtTXZ0U0hWNll1aVI4c0ZMbUduYS1QaDhkcUhvcDFjSVM1LTc3M2dnbmdTQzdIZ2tDT2hJVUQ3cExRSnpxRnlSTnVQWmJWMzVOanNmUlVlaElZWkFNZlNOcVBfNU9qSkRmU016azhnd3llRkIwSnY4SDRmeDhsLTFib2xxQWljejBuTFZsaFVjTWd4MVAtaGRiYTJyY1Q3QkVjT19oQkFaOU9tMjNMWXBuVWx1OHpKdWJpWW5KUFhlN2U5NWRMc2JzbWM0LTF3S1A5S1YtQ2QzTVdtNjBDZllzZlJ1M002LXVzUy0tX3p2NXV1MlZVelhablJKTERDdi1UZHFnSWlWTGNsT1N1WEZlZkJ0aXR1TzJoYl9HNlZuZThqWFhrMFA0MEFkMmxEOUxCQ19tclpWNWc0LWhheHhTbmVB2AIA4AKzrkzqAkFodHRwczovL21lZGlhbmV0LmFkbGFic25ldHdvcmtzLmNvbS9wdWJsaWMva2UvYWRsYWJzL3ByZWJpZC10ZXN0L_ICwgQKE0RFTElWRVJZX1BBUkFNRVRFUlMSqgRkaWQ9NWNmNTM5ZjU5MjEzZDkyMDdkYWUwZmFkM2U3YTA4MDAmdT0lN0N6NVdYRXZTcFpFUTlsNFdrVklId3VVTmxyOWtzNkFPUmY0emRzWDNtMDBjJTNEJTdDJmMxPWpXQ2dxc0tTVW9VS1Nyd0dWcFdmQVFTT0Y5RUJidS1nT19kdzZLYndqWnJVR3BLUEtDelRQckdtUE1zN0loclFyZlNQQ29ERUxiOEJJbDJkTUNPLTdZZlQ0bVlCbVY5dXdDZkxWYnc4YmJYTnZBbXpCM2o5RkY5UEVkMUxaVzV3cFdzSFhXWU9RUEloRElBMG5veHBRM3ZoRG9KM3BUVEZBQ1luS0ZnWjdRY2IxQ0FiSEQxemJGX0RkOElXclVPcjNxbExQUmk5cFA2WDFLVjdGY21SU25wSzVlTGxNZU9pN3Q5bE9EYnBpbjZxQTNHYV9pMmVnQUpCMTFwME1NNldmYktZeDI0Rzk0SzZmVHZfQnRGamxMMDlreS1JX2dud1c4VWZBYmlORUdVd3hoZE5NOHlfNURhajJWQmxkVWZ5SDQxb0hFbW14TzhEQ0k0Y1lzZFpNdnhmNUstcVFoSFZmRXNHcG5nV3Zac0tjYXFUUld3RkRFRl9Bakptb1RLMlVFU21ybU1DdmhiN2lsdWdzTjFWUzhNRmVIQTVvdWQ1TGVsd0JUemtVWkhGVjRNeXJQVjcwNjBVNmt6bnp0MmMtU2xrVzI2cVNLVfICLQoMREVMSVZFUllfVVJMEh1yZGkuZXUuY3JpdGVvLmNvbS9kZWxpdmVyeS9yL4ADAYgDAZADAJgDF6ADAaoDLRoTNzE4NDcxODE1NTU5OTcxMDUwNioEMTIzMToQQ1ItMzQzNzYtMzAweDI1MMADrALIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQOMTg1LjE4OS4xMTMuMjOoBJ44sgQQCAAQARisAiD6ASgAMAA4ArgEAMAEAMgEANoEAggB4AQB8ATajrcgiAUBmAUAoAXWraPlrK7Rh3vABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWeE_oFBAgAEACQBgCYBgC4BgDBBgAAAAAAAPA_yAYA2gYWChAAAAAAAAAAAAAAAAAAAAAAEAAYAOAGAfIGAggAgAcBiAcA%26s%3D36a2103d1ce7ffe103452185d082cdf6bef6d057;ts=1559575031;cet=0;cecb=\" width=\"0\" height=\"0\" style=\"display: block; margin: 0; padding: 0; height: 0; width: 0;\"><script type=\"text/javascript\" async=\"true\" src=\"https://cdn.adnxs.com/v/s/166/trk.js\"></script></div><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"https://fra1-ib.adnxs.com/it?an_audit=0&referrer=https%253A%252F%252Fmedianet.adlabsnetworks.com%252Fpublic%252Fke%252Fadlabs%252Fprebid-test%252F&e=wqT_3QLzB_BM8wMAAAMA1gAFAQj389TnBRCqksieiuPP2mMY1_KqqdmAnNQBKjYJCtejcD0K8z8RyHa-nxov8D8ZAAAAYLgeB0AhyHa-nxov8D8pCtcJJMgxAAAAQOF61D8wnfvdBjjiTUDPCUg0UNqOtyBYnPtjYABot-p9ePbdBIABAYoBA1VTRJIFBvRnA5gBrAKgAfoBqAEBsAEAuAEBwAEFyAEC0AEA2AEA4AEA8AEAkgLWAzkya0dmT3lOSEx3eHZMVGhVRUFRVi1kLWtONXZ4eVFRamlYS0Z6dGNfN3F4Qy1rVnZaZW80QUkweUkxcmVqMWk0NERtMUJWS1JCT1lyNkZQZmZxY21nN1RUNUdWdW5EOGVwY1YyS1RWNE52Sl8wUWpidi1uQzZKc2Vvc2x0blNYMVVtby11NEtEYXNHVFNOWHE5cXdBVUFXOVMtTXZ0U0hWNll1aVI4c0ZMbUduYS1QaDhkcUhvcDFjSVM1LTc3M2dnbmdTQzdIZ2tDT2hJVUQ3cExRSnpxRnlSTnVQWmJWMzVOanNmUlVlaElZWkFNZlNOcVBfNU9qSkRmU016azhnd3llRkIwSnY4SDRmeDhsLTFib2xxQWljejBuTFZsaFVjTWd4MVAtaGRiYTJyY1Q3QkVjT19oQkFaOU9tMjNMWXBuVWx1OHpKdWJpWW5KUFhlN2U5NWRMc2JzbWM0LTF3S1A5S1YtQ2QzTVdtNjBDZllzZlJ1M002LXVzUy0tX3p2NXV1MlZVelhablJKTERDdi1UZHFnSWlWTGNsT1N1WEZlZkJ0aXR1TzJoYl9HNlZuZThqWFhrMFA0MEFkMmxEOUxCQ19tclpWNWc0LWhheHhTbmVB2AIA4AKzrkzqAkFodHRwczovL21lZGlhbmV0LmFkbGFic25ldHdvcmtzLmNvbS9wdWJsaWMva2UvYWRsYWJzL3ByZWJpZC10ZXN0L4ADAYgDAZADAJgDF6ADAaoDLRoTNzE4NDcxODE1NTU5OTcxMDUwNioEMTIzMToQQ1ItMzQzNzYtMzAweDI1MMADrALIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQOMTg1LjE4OS4xMTMuMjOoBJ44sgQQCAAQARisAiD6ASgAMAA4ArgEAMAEAMgEANoEAggB4AQB8ATajrcgiAUBmAUAoAXWraPlrK7Rh3vABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWeE_oFBAgAEACQBgCYBgC4BgDBBgAAAAAAAPA_yAYA2gYWChAAAAAAAAAAAAAAAAAAAAAAEAAYAOAGAfIGAggAgAcBiAcA&s=b6bafaeaa7f74abd7826e9aa08df2772caef3f50\"></div>",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "responseTimestamp": 1559575023059,
        //             "requestTimestamp": 1559575022574,
        //             "bidder": "appnexus",
        //             "timeToRespond": 485,
        //             "pbLg": "1.00",
        //             "pbMg": "1.00",
        //             "pbHg": "1.01",
        //             "pbAg": "1.00",
        //             "pbDg": "1.01",
        //             "pbCg": "1.00",
        //             "size": "300x250",
        //             "adserverTargeting": {
        //                 "hb_bidder": "appnexus",
        //                 "hb_adid": "133bda2762f81a9",
        //                 "hb_pb": "1.00",
        //                 "hb_size": "300x250",
        //                 "hb_source": "client",
        //                 "hb_format": "banner"
        //             }
        //         },
        //         {
        //             "bidderCode": "criteo",
        //             "width": 300,
        //             "height": 250,
        //             "statusMessage": "Bid available",
        //             "adId": "fbb74494-a694-4e5b-8b01-c711600831da",
        //             "requestId": "80d638c724ceda8",
        //             "mediaType": "banner",
        //             "source": "client",
        //             "cpm": 0.6911988854408264,
        //             "ad": "<iframe id='f5dda669' name='f5dda669' src='https://rdi.eu.criteo.com/delivery/r/afr.php?did=5cf539f5f07a7717d97b422f31419400&u=%7CEzt8Kn2KdnC%2F55Dm399sxl5u4j37NJV0AjfmMOnmo24%3D%7C&c1=oW7FwMVq0Qp6YUVIy3n282_Kd-uONxMNmTgdx3Jv6fHsg5HS1p7ivsxOVDLIFfA-JmlQVWUmv6B3xwk4NVl5PsihKhoTe4-nwDXDHTvtEPjaBr0gwkH5w7FhzgjOxcZMcCEhbN9W2CvG3oHFBvLAkLBT2TJErnr4aR-kntPSZ4GzA4SqguxMCEC0A6wuI7r35Tr0EfRt9pKYrLmFHT6hZXAcCS4hKaJyzPaC-ZofUcpOfelbfgjUKrwp9VcXydjlRC_nv-4oxus0lOkugxm2vbrvsq1LjJwy3OODJPKJPrwK1qXzLg7SSU26YsTy_kjF5LJOCU9GbHLd6ZpAH4Iz8LhlqKO6FvHUS0APfQ6WqgJsxMG8SyV2zdXQiq5rartTpTH_7KTWnvRxDzA8oNeOF_BgEG6azaW_JSqVK8UfL7uWcVeUz-7EwIdSd9uv3B2ujVr9Vi_y-Ov3Mqs1IRR7UQ' framespacing='0' frameborder='no' scrolling='no' width='300' height='250'></iframe>",
        //             "currency": "GBP",
        //             "netRevenue": true,
        //             "ttl": 60,
        //             "creativeId": "80d638c724ceda8",
        //             "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //             "responseTimestamp": 1559575023107,
        //             "requestTimestamp": 1559575022577,
        //             "bidder": "criteo",
        //             "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //             "timeToRespond": 530,
        //             "pbLg": "0.50",
        //             "pbMg": "0.60",
        //             "pbHg": "0.69",
        //             "pbAg": "0.65",
        //             "pbDg": "0.69",
        //             "pbCg": "0.69",
        //             "size": "300x250",
        //             "adserverTargeting": {
        //                 "hb_bidder": "criteo",
        //                 "hb_adid": "fbb74494-a694-4e5b-8b01-c711600831da",
        //                 "hb_pb": "0.69",
        //                 "hb_size": "300x250",
        //                 "hb_source": "client",
        //                 "hb_format": "banner"
        //             }
        //         }
        //     ],
        //     "winningBids": [],
        //     "timeout": 1000
        // }

        // Clickio Analytics Call (bidWon)
        // {
        //     "bidderCode": "appnexus",
        //     "width": 300,
        //     "height": 250,
        //     "statusMessage": "Bid available",
        //     "adId": "133bda2762f81a9",
        //     "requestId": "661936be32001b8",
        //     "mediaType": "banner",
        //     "source": "client",
        //     "cpm": 1.0115,
        //     "creativeId": 68011866,
        //     "currency": "USD",
        //     "netRevenue": true,
        //     "ttl": 300,
        //     "adUnitCode": "/45470634/clickio_area_599113_300x600",
        //     "appnexus": {
        //         "buyerMemberId": 1231
        //     },
        //     "ad": "...",
        //     "auctionId": "e8206820-67e1-423c-a626-330c2662ec6d",
        //     "responseTimestamp": 1559575023059,
        //     "requestTimestamp": 1559575022574,
        //     "bidder": "appnexus",
        //     "timeToRespond": 485,
        //     "pbLg": "1.00",
        //     "pbMg": "1.00",
        //     "pbHg": "1.01",
        //     "pbAg": "1.00",
        //     "pbDg": "1.01",
        //     "pbCg": "1.00",
        //     "size": "300x250",
        //     "adserverTargeting": {
        //         "hb_bidder": "appnexus",
        //         "hb_adid": "133bda2762f81a9",
        //         "hb_pb": "1.00",
        //         "hb_size": "300x250",
        //         "hb_source": "client",
        //         "hb_format": "banner"
        //     },
        //     "status": "rendered",
        //     "params": [
        //         {
        //             "placementId": "14122397"
        //         }
        //     ]
        // }

        // if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
        //     cgcj('Clickio Analytics Call ('+eventType+': '+args.bidderCode+': '+args.cpm+')', args);
        // }

    // "BID_TIMEOUT": "bidTimeout",
    // "BID_REQUESTED": "bidRequested",
    // "BID_RESPONSE": "bidResponse",
    // "BID_WON": "bidWon",
*/

        if (eventType === CONSTANTS.EVENTS.BID_REQUESTED
            ||eventType === CONSTANTS.EVENTS.BID_TIMEOUT
            ||eventType === CONSTANTS.EVENTS.BID_RESPONSE
            ||eventType === CONSTANTS.EVENTS.BID_WON
        ) {
          if (eventType === CONSTANTS.EVENTS.BID_REQUESTED
          ) {
            let tmpSorter = function (a, b) {
              if (a.adu.toLowerCase() < b.adu.toLowerCase()) {
                  return -1;
              } else if (a.adu.toLowerCase() > b.adu.toLowerCase()) {
                  return 1;
              } else {
                if (a.bdr.toLowerCase() < b.bdr.toLowerCase()) {
                  return -1;
                } else if (a.bdr.toLowerCase() > b.bdr.toLowerCase()) {
                  return 1;
                } else {
                  return 0;
                }
              }
            };

            args.bids.sort(tmpSorter);

            let tmpTrackerParams = {
              cmp: [],
              adu: [],
              bdr: [],
              req: []
            };

            args.bids.forEach(bid => {
              compactizer(tmpTrackerParams.cmp, (args.gdprConsent && args.gdprConsent.vendorData) ? args.gdprConsent.vendorData.cmpId : null);
              compactizer(tmpTrackerParams.adu, bid.adUnitCode);
              compactizer(tmpTrackerParams.bdr, bid.bidder);
              compactizer(tmpTrackerParams.cmp, 1);
            });

            ajax(
              '//clickiocdn.com/utr/cmps/',
              null, // callback
              {
                "cmp": tmpTrackerParams.cmp.join(','),
                "adu": tmpTrackerParams.adu.join(','),
                "bdr": tmpTrackerParams.bdr.join(','),
                "req": tmpTrackerParams.req.join(',')
              },
              {
                method:      'GET',
                contentType: 'application/x-www-form-urlencoded'
              }
            );
          }

          let queueEvent = {
            // PK
            'adu': args.adUnitCode,
            'bdr': args.bidderCode
          };

          if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
            queueEvent['res'] = 1;
          } else if (eventType === CONSTANTS.EVENTS.BID_TIMEOUT) {
            queueEvent['tim'] = 1;
          } else if (eventType === CONSTANTS.EVENTS.BID_REQUESTED) {
            queueEvent['req'] = 1;
          } else if (eventType === CONSTANTS.EVENTS.BID_WON) {
            // bid rendered
            let cpmValue = args.cpm;

            if (window.clickioCpmCache
                && typeof window.clickioCpmCache[args.adId] != 'undefined'
            ) {
              cpmValue = window.clickioCpmCache[args.adId];
              delete window.clickioCpmCache[args.adId];
            }

            queueEvent['bid'] = cpmValue;
            queueEvent['imp'] = 1;
            queueEvent['won'] = 1;
          }

          clickioAnalyticsAdapter.context.queue.push(queueEvent);

          if (!clickioAnalyticsAdapter.context.timer) {
            setTimeout(function(){
              clickioAnalyticsAdapter.context.timer = null;
              processEventsQue(clickioAnalyticsAdapter.context)
            }, 3000);
          }
        }
    }
});

clickioAnalyticsAdapter.originEnableAnalytics = clickioAnalyticsAdapter.enableAnalytics;

clickioAnalyticsAdapter.enableAnalytics = function (config) {
    // if (!config.options.ci) {
    //     utils.logError('Client ID (ci) option is not defined. Analytics won\'t work');
    //     return;
    // }

    clickioAnalyticsAdapter.context = {
        queue: new EventsQueue(),
        timer: null,
        host: config.options.host || endpointUrl
    };

    clickioAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
    adapter: clickioAnalyticsAdapter,
    code:    'clickio'
});

export default clickioAnalyticsAdapter;
