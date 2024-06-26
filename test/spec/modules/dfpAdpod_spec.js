import {auctionManager} from '../../../src/auctionManager.js';
import {config} from '../../../src/config.js';
import {gdprDataHandler, uspDataHandler} from '../../../src/consentHandler.js';
import parse from 'url-parse';
import {buildAdpodVideoUrl} from '../../../modules/dfpAdpod.js';
import {expect} from 'chai/index.js';
import * as utils from '../../../src/utils.js';
import {server} from '../../mocks/xhr.js';
import * as adpod from 'modules/adpod.js';

describe('dfpAdpod', function () {
  let amStub;
  let amGetAdUnitsStub;

  before(function () {
    let adUnits = [{
      code: 'adUnitCode-1',
      mediaTypes: {
        video: {
          context: 'adpod',
          playerSize: [640, 480],
          adPodDurationSec: 60,
          durationRangeSec: [15, 30],
          requireExactDuration: true
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 14542875,
          }
        }
      ]
    }];

    amGetAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits');
    amGetAdUnitsStub.returns(adUnits);
    amStub = sinon.stub(auctionManager, 'getBidsReceived');
  });

  beforeEach(function () {
    config.setConfig({
      adpod: {
        brandCategoryExclusion: true,
        deferCaching: false
      }
    });
  })

  afterEach(function() {
    config.resetConfig();
  });

  after(function () {
    amGetAdUnitsStub.restore();
    amStub.restore();
  });

  function getBidsReceived() {
    return [
      createBid(10, 'adUnitCode-1', 15, '10.00_395_15s', '123', '395', '10.00'),
      createBid(15, 'adUnitCode-1', 15, '15.00_395_15s', '123', '395', '15.00'),
      createBid(25, 'adUnitCode-1', 30, '15.00_406_30s', '123', '406', '25.00'),
    ]
  }

  function createBid(cpm, adUnitCode, durationBucket, priceIndustryDuration, uuid, label, hbpb) {
    return {
      'bidderCode': 'appnexus',
      'width': 640,
      'height': 360,
      'statusMessage': 'Bid available',
      'adId': '28f24ced14586c',
      'mediaType': 'video',
      'source': 'client',
      'requestId': '28f24ced14586c',
      'cpm': cpm,
      'creativeId': 97517771,
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 3600,
      'adUnitCode': adUnitCode,
      'video': {
        'context': 'adpod',
        'durationBucket': durationBucket
      },
      'appnexus': {
        'buyerMemberId': 9325
      },
      'vastUrl': 'http://some-vast-url.com',
      'vastImpUrl': 'http://some-vast-imp-url.com',
      'auctionId': 'ec266b31-d652-49c5-8295-e83fafe5532b',
      'responseTimestamp': 1548442460888,
      'requestTimestamp': 1548442460827,
      'bidder': 'appnexus',
      'timeToRespond': 61,
      'pbLg': '5.00',
      'pbMg': '5.00',
      'pbHg': '5.00',
      'pbAg': '5.00',
      'pbDg': '5.00',
      'pbCg': '',
      'size': '640x360',
      'adserverTargeting': {
        'hb_bidder': 'appnexus',
        'hb_adid': '28f24ced14586c',
        'hb_pb': hbpb,
        'hb_size': '640x360',
        'hb_source': 'client',
        'hb_format': 'video',
        'hb_pb_cat_dur': priceIndustryDuration,
        'hb_cache_id': uuid
      },
      'customCacheKey': `${priceIndustryDuration}_${uuid}`,
      'meta': {
        'primaryCatId': 'iab-1',
        'adServerCatId': label
      },
      'videoCacheKey': '4cf395af-8fee-4960-af0e-88d44e399f14'
    }
  }

  it('should return masterTag url', function() {
    amStub.returns(getBidsReceived());
    let uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
    uspDataHandlerStub.returns('1YYY');
    let gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
    gdprDataHandlerStub.returns({
      gdprApplies: true,
      consentString: 'consent',
      addtlConsent: 'moreConsent'
    });
    let url;
    parse(buildAdpodVideoUrl({
      code: 'adUnitCode-1',
      callback: handleResponse,
      params: {
        'iu': 'my/adUnit',
        'description_url': 'someUrl.com',
      }
    }));

    function handleResponse(err, masterTag) {
      if (err) {
        return;
      }
      url = parse(masterTag);

      expect(url.protocol).to.equal('https:');
      expect(url.host).to.equal('securepubads.g.doubleclick.net');

      const queryParams = utils.parseQS(url.query);
      expect(queryParams).to.have.property('correlator');
      expect(queryParams).to.have.property('description_url', 'someUrl.com');
      expect(queryParams).to.have.property('env', 'vp');
      expect(queryParams).to.have.property('gdfp_req', '1');
      expect(queryParams).to.have.property('iu', 'my/adUnit');
      expect(queryParams).to.have.property('output', 'vast');
      expect(queryParams).to.have.property('sz', '640x480');
      expect(queryParams).to.have.property('unviewed_position_start', '1');
      expect(queryParams).to.have.property('url');
      expect(queryParams).to.have.property('cust_params');
      expect(queryParams).to.have.property('gdpr', '1');
      expect(queryParams).to.have.property('gdpr_consent', 'consent');
      expect(queryParams).to.have.property('addtl_consent', 'moreConsent');

      const custParams = utils.parseQS(decodeURIComponent(queryParams.cust_params));
      expect(custParams).to.have.property('hb_cache_id', '123');
      expect(custParams).to.have.property('hb_pb_cat_dur', '15.00_395_15s,15.00_406_30s,10.00_395_15s');
      uspDataHandlerStub.restore();
      gdprDataHandlerStub.restore();
    }
  });

  it('should return masterTag url with correct custom params when brandCategoryExclusion is false', function() {
    config.setConfig({
      adpod: {
        brandCategoryExclusion: false,
      }
    });
    function getBids() {
      let bids = [
        createBid(10, 'adUnitCode-1', 15, '10.00_15s', '123', '395', '10.00'),
        createBid(15, 'adUnitCode-1', 15, '15.00_15s', '123', '395', '15.00'),
        createBid(25, 'adUnitCode-1', 30, '15.00_30s', '123', '406', '25.00'),
      ];
      bids.forEach((bid) => {
        delete bid.meta;
      });
      return bids;
    }
    amStub.returns(getBids());
    let url;
    parse(buildAdpodVideoUrl({
      code: 'adUnitCode-1',
      callback: handleResponse,
      params: {
        'iu': 'my/adUnit',
        'description_url': 'someUrl.com',
      }
    }));

    function handleResponse(err, masterTag) {
      if (err) {
        return;
      }
      url = parse(masterTag);
      expect(url.protocol).to.equal('https:');
      expect(url.host).to.equal('securepubads.g.doubleclick.net');

      const queryParams = utils.parseQS(url.query);
      expect(queryParams).to.have.property('correlator');
      expect(queryParams).to.have.property('description_url', 'someUrl.com');
      expect(queryParams).to.have.property('env', 'vp');
      expect(queryParams).to.have.property('gdfp_req', '1');
      expect(queryParams).to.have.property('iu', 'my/adUnit');
      expect(queryParams).to.have.property('output', 'xml_vast3');
      expect(queryParams).to.have.property('sz', '640x480');
      expect(queryParams).to.have.property('unviewed_position_start', '1');
      expect(queryParams).to.have.property('url');
      expect(queryParams).to.have.property('cust_params');

      const custParams = utils.parseQS(decodeURIComponent(queryParams.cust_params));
      expect(custParams).to.have.property('hb_cache_id', '123');
      expect(custParams).to.have.property('hb_pb_cat_dur', '10.00_15s,15.00_15s,15.00_30s');
    }
  });

  it('should handle error when cache fails', function() {
    config.setConfig({
      adpod: {
        brandCategoryExclusion: true,
        deferCaching: true
      }
    });
    amStub.returns(getBidsReceived());

    parse(buildAdpodVideoUrl({
      code: 'adUnitCode-1',
      callback: handleResponse,
      params: {
        'iu': 'my/adUnit',
        'description_url': 'someUrl.com',
      }
    }));

    server.requests[0].respond(503, {
      'Content-Type': 'plain/text',
    }, 'The server could not save anything at the moment.');

    function handleResponse(err, masterTag) {
      expect(masterTag).to.be.null;
      expect(err).to.be.an('error');
    }
  });
})
