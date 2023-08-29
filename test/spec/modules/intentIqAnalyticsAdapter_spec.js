import { expect } from 'chai';
import iiqAnalyticsAnalyticsAdapter from 'modules/intentIqAnalyticsAdapter.js'
import { config } from 'src/config.js';
import { server } from '../../mocks/xhr';
let events = require('src/events');
let constants = require('src/constants.json');

const partner = 10;
const reportURL = 'https://reports.intentiq.com/report'
const defaultPercentage = '95';
const percentage = 100

const FIRST_PARTY_KEY = '_iiq_fdata'
const PERCENT_LS_KEY = '_iiq_percent'
const GROUP_LS_KEY = '_iiq_group'
const WITH_IIQ = 'A'

const USERID_CONFIG = [
  {
    'name': 'intentIqId',
    'params': {
      'partner': partner,
      'unpack': null,
      'percentage': percentage,
    },
    'storage': {
      'type': 'html5',
      'name': 'intentIqId',
      'expires': 60,
      'refreshInSeconds': 14400
    }
  }
]

let wonRequest = {
  'bidderCode': 'pubmatic',
  'width': 728,
  'height': 90,
  'statusMessage': 'Bid available',
  'adId': '23caeb34c55da51',
  'requestId': '87615b45ca4973',
  'transactionId': '5e69fd76-8c86-496a-85ce-41ae55787a50',
  'auctionId': '0cbd3a43-ff45-47b8-b002-16d3946b23bf',
  'mediaType': 'banner',
  'source': 'client',
  'cpm': 5,
  'currency': 'USD',
  'ttl': 300,
  'referrer': '',
  'adapterCode': 'pubmatic',
  'originalCpm': 5,
  'originalCurrency': 'USD',
  'responseTimestamp': 1669644710345,
  'requestTimestamp': 1669644710109,
  'bidder': 'testbidder',
  'adUnitCode': 'addUnitCode',
  'timeToRespond': 236,
  'pbLg': '5.00',
  'pbMg': '5.00',
  'pbHg': '5.00',
  'pbAg': '5.00',
  'pbDg': '5.00',
  'pbCg': '',
  'size': '728x90',
  'status': 'rendered'
};

const fpid = {'pcid': 'f961ffb1-a0e1-4696-a9d2-a21d815bd344'}

describe('IntentIQ tests all', function () {
  let requests
  beforeEach(function () {
    sinon.stub(config, 'getConfig').withArgs('userSync.userIds').returns(
      USERID_CONFIG
    );
    requests = server.requests;
    sinon.stub(events, 'getEvents').returns([]);
    iiqAnalyticsAnalyticsAdapter.enableAnalytics({
      provider: 'iiqAnalytics',
    });
  });

  afterEach(function () {
    config.getConfig.restore();
    events.getEvents.restore();
    iiqAnalyticsAnalyticsAdapter.disableAnalytics();
    localStorage.clear()
    server.reset()
  });

  it('IIQ Analytical Adapter bid win report', function () {
    localStorage.setItem(PERCENT_LS_KEY + '_' + partner, defaultPercentage)
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, WITH_IIQ)
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify(fpid))

    events.emit(constants.EVENTS.BID_WON, wonRequest);
    const req = requests[0]

    expect(iiqAnalyticsAnalyticsAdapter.getUrl()).to.equal(reportURL)
    expect(req.method).to.equal('GET')
    expect(req.url).to.contain(reportURL + '?pid=' + partner + '&mct=1')
    expect(req.url).to.contain('iiqid=' + fpid.pcid)
    expect(req.url).to.contain('&jsver=5.3&source=pbjs&payload=')
  }
  );

  it('should not include "iiqid" parameter in url', function () {
    localStorage.setItem(PERCENT_LS_KEY + '_' + partner, defaultPercentage)
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, WITH_IIQ)

    events.emit(constants.EVENTS.BID_WON, wonRequest);

    expect(requests[0].url).to.not.contain('iiqid=' + fpid.pcid)
  }
  );
});
