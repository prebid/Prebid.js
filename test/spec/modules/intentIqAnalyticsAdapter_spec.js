import { expect } from 'chai';
import { iiqAnalyticsAnalyticsAdapter } from 'modules/intentIqAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import adapterManager from 'src/adapterManager.js';
import { config } from 'src/config.js';

const partner = 10;
const pai = '11';
const pcid = '12';
const userPercentage = 0;
const defaultPercentage = 100;
const defaultConfigParams = { params: { partner: partner } };
const percentageConfigParams = { params: { partner: partner, percentage: userPercentage } };
const paiConfigParams = { params: { partner: partner, pai: pai } };
const pcidConfigParams = { params: { partner: partner, pcid: pcid } };
const allConfigParams = { params: { partner: partner, pai: pai, pcid: pcid } };
const responseHeader = { 'Content-Type': 'application/json' }

const testData = { data: 'test' }

const FIRST_PARTY_DATA_KEY = '_iiq_fdata'
const PRECENT_LS_KEY = '_iiq_precent'
const GROUP_LS_KEY = '_iiq_group'
const WITH_IIQ = 'A'
const WITHOUT_IIQ = 'B'

const USERID_CONFIG = [
  {
    'name': 'intentIqId',
    'params': {
      'partner': partner,
      'unpack': null,
      'percentage': 100,
    },
    'storage': {
      'type': 'html5',
      'name': 'intentIqId',
      'expires': 60,
      'refreshInSeconds': 14400
    }
  }
]

let events = require('src/events');
let constants = require('src/constants.json');
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
  'status': 'rendered',

};

adapterManager.registerAnalyticsAdapter({
  code: 'iiqAnalytics',
  adapter: iiqAnalyticsAnalyticsAdapter
});

beforeEach(function () {
  adapterManager.enableAnalytics({
    provider: 'iiqAnalytics',
    options: {}
  });
});

describe('IntentIQ tests', function () {
  var mockObj;
  before(function () {
    mockObj = sinon.stub(config, 'getConfig').withArgs('userSync.userIds').returns(
      USERID_CONFIG
    );
  });

  after(function () {
    config.getConfig.restore();
  });

  it('IIQ Analytical Adapter biw win report', function () {
    localStorage.setItem(PRECENT_LS_KEY + '_' + partner, '95')
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, 'A')
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, '{"pcid":"f961ffb1-a0e1-4696-a9d2-a21d815bd344"}')

    events.emit(constants.EVENTS.BID_WON, wonRequest);
    let request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1&agid=')
    expect(request.url).to.contain('&jsver=5.3&source=pbjs&payload=')
  });

  it('IIQ Analytical Adapter biw win report', function () {
    localStorage.setItem(PRECENT_LS_KEY + '_' + partner, '95')
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, 'A')
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, '{"pcid":"f961ffb1-a0e1-4696-a9d2-a21d815bd344"}')

    events.emit(constants.EVENTS.BID_WON, wonRequest);
    let request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1&agid=')
    expect(request.url).to.contain('&jsver=5.3&source=pbjs&payload=')
  });
});
