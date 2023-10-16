import ooloAnalytics, { PAGEVIEW_ID } from 'modules/ooloAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
import constants from 'src/constants.json'
import * as events from 'src/events'
import { config } from 'src/config';
import { buildAuctionData, generatePageViewId } from 'modules/ooloAnalyticsAdapter';

const auctionId = '0ea14159-2058-4b87-a966-9d7652176a56';
const auctionStart = 1598513385415
const timeout = 3000
const adUnit1 = 'top_1';
const adUnit2 = 'top_2';
const bidId1 = '392b5a6b05d648'
const bidId2 = '392b5a6b05d649'
const bidId3 = '392b5a6b05d650'

const auctionInit = {
  timestamp: auctionStart,
  auctionId: auctionId,
  timeout: timeout,
  auctionStart,
  adUnits: [{
    code: adUnit1,
    transactionId: 'abalksdkjfh-12sade'
  }, {
    code: adUnit2,
    transactionId: 'abalksdkjfh-12sadf'
  }]
};

const bidRequested = {
  auctionId,
  bidderCode: 'appnexus',
  bidderRequestId: '2946b569352ef2',
  start: 1598513405254,
  bids: [
    {
      auctionId,
      bidId: bidId1,
      bidderRequestId: '2946b569352ef2',
      bidder: 'appnexus',
      adUnitCode: adUnit1,
      sizes: [[728, 90], [970, 90]],
      mediaTypes: {
        banner: {
          sizes: [[728, 90], [970, 90]],
        },
      },
      params: {
        placementId: '4799418',
      },
      schain: {}
    },
    {
      auctionId,
      bidId: bidId2,
      bidderRequestId: '2946b569352ef3',
      bidder: 'rubicon',
      adUnitCode: adUnit2,
      sizes: [[728, 90], [970, 90]],
      mediaTypes: {
        banner: {
          sizes: [[728, 90], [970, 90]],
        },
      },
      params: {
        placementId: '4799418',
      },
      schain: {}
    },
    {
      auctionId,
      bidId: bidId3,
      bidderRequestId: '2946b569352ef4',
      bidder: 'ix',
      adUnitCode: adUnit2,
      sizes: [[728, 90], [970, 90]],
      mediaTypes: {
        banner: {
          sizes: [[728, 90], [970, 90]],
        },
      },
      params: {
        placementId: '4799418',
      },
      schain: {}
    },
  ],
}

const noBid = {
  auctionId,
  adUnitCode: adUnit2,
  bidId: bidId2,
  requestId: bidId2
}

const bidResponse = {
  auctionId,
  bidderCode: 'appnexus',
  mediaType: 'banner',
  width: 0,
  height: 0,
  statusMessage: 'Bid available',
  adId: '222bb26f9e8bd',
  cpm: 0.112256,
  responseTimestamp: 1598513485254,
  requestTimestamp: 1462919238936,
  bidder: 'appnexus',
  adUnitCode: adUnit1,
  timeToRespond: 401,
  pbLg: '0.00',
  pbMg: '0.10',
  pbHg: '0.11',
  pbAg: '0.10',
  size: '0x0',
  requestId: bidId1,
  creativeId: '123456',
  adserverTargeting: {
    hb_bidder: 'appnexus',
    hb_adid: '222bb26f9e8bd',
    hb_pb: '10.00',
    hb_size: '0x0',
    foobar: '0x0',
  },
  netRevenue: true,
  currency: 'USD',
  ttl: 300,
}

const auctionEnd = {
  auctionId: auctionId
};

const bidTimeout = [
  {
    adUnitCode: adUnit2,
    auctionId: auctionId,
    bidId: bidId3,
    bidder: 'ix',
    timeout: timeout
  }
];

const bidWon = {
  auctionId,
  adUnitCode: adUnit1,
  bidId: bidId1,
  cpm: 0.5
}

function simulateAuction () {
  events.emit(constants.EVENTS.AUCTION_INIT, auctionInit);
  events.emit(constants.EVENTS.BID_REQUESTED, bidRequested);
  events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);
  events.emit(constants.EVENTS.NO_BID, noBid);
  events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
  events.emit(constants.EVENTS.AUCTION_END, auctionEnd);
}

describe('oolo Prebid Analytic', () => {
  let clock

  beforeEach(() => {
    sinon.stub(events, 'getEvents').returns([]);
    clock = sinon.useFakeTimers()
  });

  afterEach(() => {
    ooloAnalytics.disableAnalytics();
    events.getEvents.restore()
    clock.restore();
  })

  describe('enableAnalytics init options', () => {
    it('should not enable analytics if invalid config', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: undefined
        }
      })

      expect(server.requests).to.have.length(0)
    })

    it('should send prebid config to the server', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      const conf = {}
      const pbjsConfig = config.getConfig()

      Object.keys(pbjsConfig).forEach(key => {
        if (key[0] !== '_') {
          conf[key] = pbjsConfig[key]
        }
      })

      expect(server.requests[1].url).to.contain('/hbconf')
      expect(JSON.parse(server.requests[1].requestBody)).to.deep.equal(conf)
    })

    it('should request server config and send page data', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })
      clock.next()

      expect(server.requests[0].url).to.contain('?pid=123')

      const pageData = JSON.parse(server.requests[2].requestBody)

      expect(pageData).to.have.property('timestamp')
      expect(pageData).to.have.property('screenWidth')
      expect(pageData).to.have.property('screenHeight')
      expect(pageData).to.have.property('url')
      expect(pageData).to.have.property('protocol')
      expect(pageData).to.have.property('origin')
      expect(pageData).to.have.property('referrer')
      expect(pageData).to.have.property('pbVersion')
      expect(pageData).to.have.property('pvid')
      expect(pageData).to.have.property('pid')
      expect(pageData).to.have.property('pbModuleVersion')
      expect(pageData).to.have.property('domContentLoadTime')
      expect(pageData).to.have.property('pageLoadTime')
    })
  })

  describe('data handling and sending events', () => {
    it('should send an "auction" event to the server', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })
      clock.next()

      server.requests[0].respond(500)

      simulateAuction()

      expect(server.requests.length).to.equal(3)
      clock.tick(2000)
      expect(server.requests.length).to.equal(4)

      const request = JSON.parse(server.requests[3].requestBody);

      expect(request).to.include({
        eventType: 'auction',
        pid: 123,
        auctionId,
        auctionStart,
        auctionEnd: 0,
        timeout,
      })
      expect(request.pvid).to.be.a('number')
      expect(request.adUnits).to.have.length(2)

      const auctionAdUnit1 = request.adUnits.filter(adUnit => adUnit.adunid === adUnit1)[0]
      const auctionAdUnit2 = request.adUnits.filter(adUnit => adUnit.adunid === adUnit2)[0]

      expect(auctionAdUnit1.auctionId).to.equal(auctionId)
      expect(auctionAdUnit1.bids).to.be.an('array')
      expect(auctionAdUnit1.bids).to.have.length(1)

      // bid response
      expect(auctionAdUnit1.bids[0].bidId).to.equal(bidId1)
      expect(auctionAdUnit1.bids[0].bst).to.equal('bidReceived')
      expect(auctionAdUnit1.bids[0].bidder).to.equal('appnexus')
      expect(auctionAdUnit1.bids[0].cpm).to.equal(0.112256)
      expect(auctionAdUnit1.bids[0].cur).to.equal('USD')
      expect(auctionAdUnit1.bids[0].s).to.equal(bidRequested.start)
      expect(auctionAdUnit1.bids[0].e).to.equal(bidResponse.responseTimestamp)
      expect(auctionAdUnit1.bids[0].rs).to.equal(bidRequested.start - auctionStart)
      expect(auctionAdUnit1.bids[0].re).to.equal(bidResponse.responseTimestamp - auctionStart)
      expect(auctionAdUnit1.bids[0].h).to.equal(0)
      expect(auctionAdUnit1.bids[0].w).to.equal(0)
      expect(auctionAdUnit1.bids[0].mt).to.equal('banner')
      expect(auctionAdUnit1.bids[0].nrv).to.equal(true)
      expect(auctionAdUnit1.bids[0].params).to.have.keys('placementId')
      expect(auctionAdUnit1.bids[0].size).to.equal('0x0')
      expect(auctionAdUnit1.bids[0].crId).to.equal('123456')
      expect(auctionAdUnit1.bids[0].ttl).to.equal(bidResponse.ttl)
      expect(auctionAdUnit1.bids[0].ttr).to.equal(bidResponse.timeToRespond)

      expect(auctionAdUnit2.auctionId).to.equal(auctionId)
      expect(auctionAdUnit2.bids).to.be.an('array')
      expect(auctionAdUnit2.bids).to.have.length(2)

      // no bid
      expect(auctionAdUnit2.bids[0].bidId).to.equal(bidId2)
      expect(auctionAdUnit2.bids[0].bst).to.equal('noBid')
      expect(auctionAdUnit2.bids[0].bidder).to.equal('rubicon')
      expect(auctionAdUnit2.bids[0].s).to.be.a('number')
      expect(auctionAdUnit2.bids[0].e).to.be.a('number')
      expect(auctionAdUnit2.bids[0].params).to.have.keys('placementId')

      // timeout
      expect(auctionAdUnit2.bids[1].bidId).to.equal(bidId3)
      expect(auctionAdUnit2.bids[1].bst).to.equal('bidTimedOut')
      expect(auctionAdUnit2.bids[1].bidder).to.equal('ix')
      expect(auctionAdUnit2.bids[1].s).to.be.a('number')
      expect(auctionAdUnit2.bids[1].e).to.be.a('undefined')
    })

    it('should push events to a queue and process them once server configuration returns', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      events.emit(constants.EVENTS.AUCTION_INIT, auctionInit);
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequested);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

      // configuration returned in an arbitrary moment
      server.requests[0].respond(500)

      events.emit(constants.EVENTS.NO_BID, noBid);
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
      events.emit(constants.EVENTS.AUCTION_END, auctionEnd);

      clock.tick(1500)

      const request = JSON.parse(server.requests[3].requestBody);

      expect(request).to.include({
        eventType: 'auction',
        pid: 123,
        auctionId,
        auctionStart,
        auctionEnd: 0,
        timeout,
      })
      expect(request.pvid).to.be.a('number')
      expect(request.adUnits).to.have.length(2)

      const auctionAdUnit1 = request.adUnits.filter(adUnit => adUnit.adunid === adUnit1)[0]
      const auctionAdUnit2 = request.adUnits.filter(adUnit => adUnit.adunid === adUnit2)[0]

      expect(auctionAdUnit1.auctionId).to.equal(auctionId)
      expect(auctionAdUnit1.bids).to.be.an('array')
      expect(auctionAdUnit1.bids).to.have.length(1)

      // bid response
      expect(auctionAdUnit1.bids[0].bidId).to.equal(bidId1)
      expect(auctionAdUnit1.bids[0].bst).to.equal('bidReceived')
      expect(auctionAdUnit1.bids[0].bidder).to.equal('appnexus')
      expect(auctionAdUnit1.bids[0].cpm).to.equal(0.112256)
      expect(auctionAdUnit1.bids[0].cur).to.equal('USD')
      expect(auctionAdUnit1.bids[0].s).to.equal(bidRequested.start)
      expect(auctionAdUnit1.bids[0].e).to.equal(bidResponse.responseTimestamp)
      expect(auctionAdUnit1.bids[0].rs).to.equal(bidRequested.start - auctionStart)
      expect(auctionAdUnit1.bids[0].re).to.equal(bidResponse.responseTimestamp - auctionStart)
      expect(auctionAdUnit1.bids[0].h).to.equal(0)
      expect(auctionAdUnit1.bids[0].w).to.equal(0)
      expect(auctionAdUnit1.bids[0].mt).to.equal('banner')
      expect(auctionAdUnit1.bids[0].nrv).to.equal(true)
      expect(auctionAdUnit1.bids[0].params).to.have.keys('placementId')
      expect(auctionAdUnit1.bids[0].size).to.equal('0x0')
      expect(auctionAdUnit1.bids[0].crId).to.equal('123456')
      expect(auctionAdUnit1.bids[0].ttl).to.equal(bidResponse.ttl)
      expect(auctionAdUnit1.bids[0].ttr).to.equal(bidResponse.timeToRespond)

      expect(auctionAdUnit2.auctionId).to.equal(auctionId)
      expect(auctionAdUnit2.bids).to.be.an('array')
      expect(auctionAdUnit2.bids).to.have.length(2)

      // no bid
      expect(auctionAdUnit2.bids[0].bidId).to.equal(bidId2)
      expect(auctionAdUnit2.bids[0].bst).to.equal('noBid')
      expect(auctionAdUnit2.bids[0].bidder).to.equal('rubicon')
      expect(auctionAdUnit2.bids[0].s).to.be.a('number')
      expect(auctionAdUnit2.bids[0].e).to.be.a('number')
      expect(auctionAdUnit2.bids[0].params).to.have.keys('placementId')

      // timeout
      expect(auctionAdUnit2.bids[1].bidId).to.equal(bidId3)
      expect(auctionAdUnit2.bids[1].bst).to.equal('bidTimedOut')
      expect(auctionAdUnit2.bids[1].bidder).to.equal('ix')
      expect(auctionAdUnit2.bids[1].s).to.be.a('number')
      expect(auctionAdUnit2.bids[1].e).to.be.a('undefined')
    })

    it('should send "auction" event without all the fields that were set to undefined', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      server.requests[0].respond(500)

      simulateAuction()
      clock.tick(1500)

      const request = JSON.parse(server.requests[3].requestBody);

      const auctionAdUnit1 = request.adUnits.filter(adUnit => adUnit.adunid === adUnit1)[0]
      const auctionAdUnit2 = request.adUnits.filter(adUnit => adUnit.adunid === adUnit2)[0]

      expect(auctionAdUnit1.code).to.equal(undefined)
      expect(auctionAdUnit1.transactionId).to.equal(undefined)
      expect(auctionAdUnit1.adUnitCode).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].auctionStart).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].bids).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].refererInfo).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].bidRequestsCount).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].bidderRequestId).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].bidderRequestsCount).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].bidderWinsCount).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].schain).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].src).to.equal(undefined)
      expect(auctionAdUnit1.bids[0].transactionId).to.equal(undefined)

      // no bid
      expect(auctionAdUnit2.bids[0].schain).to.equal(undefined)
      expect(auctionAdUnit2.bids[0].src).to.equal(undefined)
      expect(auctionAdUnit2.bids[0].transactionId).to.equal(undefined)
    })

    it('should mark bid winner and send to the server along with the auction data', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      server.requests[0].respond(500)
      simulateAuction()
      events.emit(constants.EVENTS.BID_WON, bidWon);
      clock.tick(1500)

      // no bidWon
      expect(server.requests).to.have.length(4)

      const request = JSON.parse(server.requests[3].requestBody);
      expect(request.adUnits[0].bids[0].isW).to.equal(true)
    })

    it('should take BID_WON_TIMEOUT from server config if exists', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {},
        'BID_WON_TIMEOUT': 500
      }))

      simulateAuction()
      events.emit(constants.EVENTS.BID_WON, bidWon);
      clock.tick(499)

      // no auction data
      expect(server.requests).to.have.length(3)

      clock.tick(1)

      // auction data
      expect(server.requests).to.have.length(4)
      const request = JSON.parse(server.requests[3].requestBody);
      expect(request.adUnits[0].bids[0].isW).to.equal(true)
    })

    it('should send a "bidWon" event to the server', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      server.requests[0].respond(500)
      simulateAuction()
      clock.tick(1500)
      events.emit(constants.EVENTS.BID_WON, bidWon);

      expect(server.requests).to.have.length(5)

      const request = JSON.parse(server.requests[4].requestBody);

      expect(request.eventType).to.equal('bidWon')
      expect(request.auctionId).to.equal(auctionId)
      expect(request.adunid).to.equal(adUnit1)
      expect(request.bid.bst).to.equal('bidWon')
      expect(request.bid.cur).to.equal('USD')
      expect(request.bid.cpm).to.equal(0.5)
    })

    it('should sent adRenderFailed to the server', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      server.requests[0].respond(500)
      simulateAuction()
      clock.tick(1500)
      events.emit(constants.EVENTS.AD_RENDER_FAILED, { bidId: 'abcdef', reason: 'exception' });

      expect(server.requests).to.have.length(5)

      const request = JSON.parse(server.requests[4].requestBody);

      expect(request.eventType).to.equal('adRenderFailed')
      expect(request.pvid).to.equal(PAGEVIEW_ID)
      expect(request.bidId).to.equal('abcdef')
      expect(request.reason).to.equal('exception')
    })

    it('should pick fields according to server configuration', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {
          'bidRequested': {
            'sendRaw': 0,
            'pickFields': ['transactionId']
          },
          'noBid': {
            'sendRaw': 0,
            'pickFields': ['src']
          },
          'bidResponse': {
            'sendRaw': 0,
            'pickFields': ['adUrl', 'statusMessage']
          },
          'auctionEnd': {
            'sendRaw': 0,
            'pickFields': ['winningBids']
          },
        }
      }))

      events.emit(constants.EVENTS.AUCTION_INIT, { ...auctionInit });
      events.emit(constants.EVENTS.BID_REQUESTED, { ...bidRequested, bids: bidRequested.bids.map(b => { b.transactionId = '123'; return b }) });
      events.emit(constants.EVENTS.NO_BID, { ...noBid, src: 'client' });
      events.emit(constants.EVENTS.BID_RESPONSE, { ...bidResponse, adUrl: '...' });
      events.emit(constants.EVENTS.AUCTION_END, { ...auctionEnd, winningBids: [] });
      events.emit(constants.EVENTS.BID_WON, { ...bidWon, statusMessage: 'msg2' });

      clock.tick(1500)

      const request = JSON.parse(server.requests[3].requestBody)

      expect(request.adUnits[0].bids[0].transactionId).to.equal('123')
      expect(request.adUnits[0].bids[0].adUrl).to.equal('...')
      expect(request.adUnits[0].bids[0].statusMessage).to.equal('msg2')
      expect(request.adUnits[1].bids[0].src).to.equal('client')
    })

    it('should omit fields according to server configuration', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })
      clock.next()

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {
          'auctionInit': {
            'sendRaw': 0,
            'omitFields': ['custom_1']
          },
          'bidResponse': {
            'sendRaw': 0,
            'omitFields': ['custom_2', 'custom_4', 'custom_5']
          }
        }
      }))

      events.emit(constants.EVENTS.AUCTION_INIT, { ...auctionInit, custom_1: true });
      events.emit(constants.EVENTS.BID_REQUESTED, { ...bidRequested, bids: bidRequested.bids.map(b => { b.custom_2 = true; return b }) });
      events.emit(constants.EVENTS.NO_BID, { ...noBid, custom_3: true });
      events.emit(constants.EVENTS.BID_RESPONSE, { ...bidResponse, custom_4: true });
      events.emit(constants.EVENTS.AUCTION_END, { ...auctionEnd });
      events.emit(constants.EVENTS.BID_WON, { ...bidWon, custom_5: true });

      clock.tick(1500)

      const request = JSON.parse(server.requests[3].requestBody)

      expect(request.custom_1).to.equal(undefined)
      expect(request.custom_6).to.equal(undefined)
      expect(request.adUnits[0].bids[0].custom_2).to.equal(undefined)
      expect(request.adUnits[0].bids[0].custom_4).to.equal(undefined)
      expect(request.adUnits[0].bids[0].custom_5).to.equal(undefined)
      expect(request.adUnits[0].bids[0].custom_7).to.equal(undefined)
    })

    it('should omit fields from raw data according to server configuration', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })
      clock.next()

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {
          'auctionInit': {
            'sendRaw': 1,
            'omitRawFields': ['custom_1']
          },
        }
      }))

      events.emit(constants.EVENTS.AUCTION_INIT, { ...auctionInit, custom_1: true });

      clock.tick(1500)

      const request = JSON.parse(server.requests[3].requestBody)

      expect(request.eventType).to.equal('auctionInit')
      expect(request.custom_1).to.equal(undefined)
    })

    it('should send raw data to custom endpoint if exists in server configuration', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })
      clock.next()

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {
          'auctionInit': {
            'sendRaw': 1,
            'endpoint': 'https://pbjs.com'
          },
        }
      }))

      events.emit(constants.EVENTS.AUCTION_INIT, { ...auctionInit });

      expect(server.requests[3].url).to.equal('https://pbjs.com')
    })

    it('should send raw events based on server configuration', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })
      clock.next()

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {
          'auctionInit': {
            'sendRaw': 0,
          },
          'bidRequested': {
            'sendRaw': 1,
          }
        }
      }))

      events.emit(constants.EVENTS.AUCTION_INIT, auctionInit)
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequested);

      const request = JSON.parse(server.requests[3].requestBody)

      expect(request).to.deep.equal({
        eventType: 'bidRequested',
        pid: 123,
        pvid: PAGEVIEW_ID,
        pbModuleVersion: '1.0.0',
        ...bidRequested
      })
    })

    it('should queue events and raw events until server configuration resolves', () => {
      ooloAnalytics.enableAnalytics({
        provider: 'oolo',
        options: {
          pid: 123
        }
      })

      simulateAuction()
      clock.tick(1500)

      expect(server.requests).to.have.length(3)

      server.requests[0].respond(200, {}, JSON.stringify({
        'events': {
          'auctionInit': {
            'sendRaw': 1,
          },
          'bidRequested': {
            'sendRaw': 1,
          }
        }
      }))

      expect(server.requests).to.have.length(5)
      expect(JSON.parse(server.requests[3].requestBody).eventType).to.equal('auctionInit')
      expect(JSON.parse(server.requests[4].requestBody).eventType).to.equal('bidRequested')
    })
  });

  describe('buildAuctionData', () => {
    let auction = {
      auctionId,
      auctionStart,
      auctionEnd,
      adUnitCodes: ['mid_1'],
      auctionStatus: 'running',
      bidderRequests: [],
      bidsReceived: [],
      noBids: [],
      winningBids: [],
      timestamp: 1234567,
      config: {},
      adUnits: {
        mid_1: {
          adUnitCode: 'mid_1',
          code: 'mid_1',
          transactionId: '123dsafasdf',
          bids: {
            [bidId1]: {
              adUnitCode: 'mid_1',
              cpm: 0.5
            }
          }
        }
      }
    }

    it('should turn adUnits and bids objects into arrays', () => {
      const auctionData = buildAuctionData(auction, [])

      expect(auctionData.adUnits).to.be.an('array')
      expect(auctionData.adUnits[0].bids).to.be.an('array')
    })

    it('should remove fields from the auction', () => {
      const auctionData = buildAuctionData(auction, [])
      const auctionFields = Object.keys(auctionData)
      const adUnitFields = Object.keys(auctionData.adUnits[0])

      expect(auctionFields).not.to.contain('adUnitCodes')
      expect(auctionFields).not.to.contain('auctionStatus')
      expect(auctionFields).not.to.contain('bidderRequests')
      expect(auctionFields).not.to.contain('bidsReceived')
      expect(auctionFields).not.to.contain('noBids')
      expect(auctionFields).not.to.contain('winningBids')
      expect(auctionFields).not.to.contain('timestamp')
      expect(auctionFields).not.to.contain('config')

      expect(adUnitFields).not.to.contain('adUnitCoe')
      expect(adUnitFields).not.to.contain('code')
      expect(adUnitFields).not.to.contain('transactionId')
    })
  })

  describe('generatePageViewId', () => {
    it('should generate a 19 digits number', () => {
      expect(generatePageViewId()).length(19)
    })
  })
});
