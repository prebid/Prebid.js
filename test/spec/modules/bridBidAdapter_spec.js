import { spec } from '../../../modules/bridBidAdapter.js'
import { SYNC_URL } from '../../../libraries/targetVideoUtils/constants.js';

describe('Brid Bid Adapter', function() {
  const videoRequest = [{
    bidder: 'brid',
    params: {
      placementId: 12345,
    },
    mediaTypes: {
      video: {
        playerSize: [[640, 360]],
        context: 'instream',
        playbackmethod: [1, 2, 3, 4]
      }
    }
  }];

  it('Test the bid validation function', function() {
    const validBid = spec.isBidRequestValid(videoRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(videoRequest, videoRequest[0]);
    expect(request).to.not.be.empty;

    const payload = JSON.parse(request[0].data);
    expect(payload).to.not.be.empty;
    expect(payload.sdk).to.deep.equal({
      source: 'pbjs',
      version: '$prebid.version$'
    });
    expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal(12345);
  });

  it('Test nobid responses', function () {
    const responseBody = {
      'id': 'test-id',
      'cur': 'USD',
      'seatbid': [],
      'nbr': 0
    };
    const bidderRequest = null;

    const bidResponse = spec.interpretResponse({ body: responseBody }, {bidderRequest});

    expect(bidResponse.length).to.equal(0);
  });

  it('Test the response parsing function', function () {
    const responseBody = {
      'id': 'test-id',
      'cur': 'USD',
      'seatbid': [{
        'bid': [{
          'id': '5044997188309660254',
          'price': 5,
          'adm': 'test ad',
          'adid': '97517771',
          'crid': '97517771',
          'adomain': ['domain.com'],
          'w': 640,
          'h': 480
        }],
        'seat': 'bidder'
      }]
    };
    const bidderRequest = {
      bidderCode: 'brid',
      bidderRequestId: '22edbae2733bf6',
      bids: videoRequest
    };

    const bidResponse = spec.interpretResponse({ body: responseBody }, {bidderRequest});
    expect(bidResponse).to.not.be.empty;

    const bid = bidResponse[0];
    expect(bid).to.not.be.empty;
    expect(bid.ad).to.equal('test ad');
    expect(bid.cpm).to.equal(5);
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.currency).to.equal('USD');
  });

  it('Test GDPR and USP consents are present in the request', function () {
    let gdprConsentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
    let uspConsentString = '1YA-';
    let bidderRequest = {
      'bidderCode': 'brid',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'uspConsent': uspConsentString,
      'gdprConsent': {
        consentString: gdprConsentString,
        gdprApplies: true,
        addtlConsent: '1~7.12.35.62.66.70.89.93.108'
      }
    };
    bidderRequest.bids = videoRequest;

    const request = spec.buildRequests(videoRequest, bidderRequest);
    const payload = JSON.parse(request[0].data);

    expect(payload.user.ext.consent).to.equal(gdprConsentString);
    expect(payload.regs.ext.us_privacy).to.equal(uspConsentString);
    expect(payload.regs.ext.gdpr).to.equal(1);
  });

  it('Test GDPR is not present', function () {
    let uspConsentString = '1YA-';
    let bidderRequest = {
      'bidderCode': 'brid',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'uspConsent': uspConsentString
    };
    bidderRequest.bids = videoRequest;

    const request = spec.buildRequests(videoRequest, bidderRequest);
    const payload = JSON.parse(request[0].data);

    expect(payload.regs.ext.gdpr).to.be.undefined;
    expect(payload.regs.ext.us_privacy).to.equal(uspConsentString);
  });

  it('Test userSync have only one object and it should have a property type=iframe', function () {
    let userSync = spec.getUserSyncs({ iframeEnabled: true });
    expect(userSync).to.be.an('array');
    expect(userSync.length).to.be.equal(1);
    expect(userSync[0]).to.have.property('type');
    expect(userSync[0].type).to.be.equal('iframe');
  });

  it('Test userSync valid sync url for iframe', function () {
    let [userSync] = spec.getUserSyncs({ iframeEnabled: true }, {}, {consentString: 'anyString'});
    expect(userSync.url).to.contain(SYNC_URL + 'load-cookie.html?endpoint=brid&gdpr=0&gdpr_consent=anyString');
    expect(userSync.type).to.be.equal('iframe');
  });

  it('Test userSyncs iframeEnabled=false', function () {
    let userSyncs = spec.getUserSyncs({iframeEnabled: false});
    expect(userSyncs).to.have.lengthOf(0);
  });
});
