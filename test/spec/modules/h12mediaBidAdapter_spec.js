import {expect} from 'chai';
import {spec} from 'modules/h12mediaBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('H12 Media Adapter', function () {
  const DEFAULT_CURRENCY = 'USD';
  const DEFAULT_TTL = 360;
  const DEFAULT_NET_REVENUE = false;
  const adapter = newBidder('spec');

  const validBid = {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      }
    },
    bidder: 'h12media',
    bidId: '1c5e8a1a84522d',
    bidderRequestId: '1d0c4017f02458',
    auctionId: '9adc85ed-43ee-4a78-816b-52b7e578f313',
    params: {
      pubid: 123321,
      pubsubid: 'pubsubtestid',
    },
  };

  const validBid2 = {
    adUnitCode: 'div-gpt-ad-1460505748561-1',
    mediaTypes: {
      banner: {}
    },
    bidder: 'h12media',
    bidId: '2c5e8a1a84522d',
    bidderRequestId: '2d0c4017f02458',
    auctionId: '9adc85ed-43ee-4a78-816b-52b7e578f314',
    params: {
      pubid: 123321,
      size: '100x200'
    },
  };

  const invalidBid = {
    adUnitCode: 'div-gpt-ad-1460505748561-2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      }
    },
    bidder: 'h12media',
    bidId: '3c5e8a1a84522d',
    bidderRequestId: '3d0c4017f02458',
    auctionId: '9adc85ed-43ee-4a78-816b-52b7e578f315',
  };

  const bidderRequest = {
    refererInfo: {
      referer: 'https://localhost'
    },
    gdprConsent: {
      gdprApplies: 1,
      consentString: 'concentDataString',
      vendorData: {
        vendorConsents: {
          '90': 1
        },
      },
    },
    uspConsent: 'consentUspString'
  };

  const serverResponse = {
    currency: 'EUR',
    netRevenue: true,
    ttl: 500,
    bid: {
      bidId: validBid.bidId,
      cpm: 0.33,
      width: 300,
      height: 600,
      creativeId: '335566',
      ad: '<div>my ad</div>',
      meta: {
        advertiserId: '54321',
        advertiserName: 'My advertiser',
        advertiserDomains: ['test.com']
      }
    },
    usersync: [
      {url: 'https://cookiesync.3rdpartypartner.com/?3rdparty_partner_user_id={user_id}&partner_id=h12media&gdpr_applies={gdpr}&gdpr_consent_string={gdpr_cs}', type: 'image'},
      {url: 'https://cookiesync.3rdpartypartner.com/?3rdparty_partner_user_id={user_id}&partner_id=h12media&gdpr_applies={gdpr}&gdpr_consent_string={gdpr_cs}', type: 'iframe'}
    ],
  };

  const serverResponse2 = {
    bid: {
      bidId: validBid2.bidId,
      cpm: 0.33,
      width: 300,
      height: 600,
      creativeId: '335566',
      ad: '<div>my ad 2</div>',
    }
  };

  function removeElement(id) {
    if (document.getElementById(id)) {
      document.body.removeChild(document.getElementById(id));
    }
  }

  function createElement(id) {
    const div = document.createElement('div');
    div.id = id;
    div.style.width = '50px';
    div.style.height = '50px';
    if (frameElement) {
      frameElement.style.width = '100px';
      frameElement.style.height = '100px';
    }
    div.style.background = 'black';
    document.body.appendChild(div);
    return div;
  }
  function createElementVisible(id) {
    const element = createElement(id);
    sandbox.stub(element, 'getBoundingClientRect').returns({
      x: 10,
      y: 10,
    });
    return element;
  }
  function createElementInvisible(id) {
    const element = document.createElement('div');
    element.id = id;
    document.body.appendChild(element);
    element.style.display = 'none';
    return element;
  }

  function createElementHidden(id) {
    const element = createElement(id);
    document.body.appendChild(element);
    element.style.visibility = 'hidden';
    sandbox.stub(element, 'getBoundingClientRect').returns({
      x: 100,
      y: 100,
    });
    return element;
  }

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(frameElement, 'getBoundingClientRect').returns({
      left: 10,
      top: 10,
    });
  });

  afterEach(function () {
    removeElement(validBid.adUnitCode);
    removeElement(validBid2.adUnitCode);
    removeElement(invalidBid.adUnitCode);
    sandbox.restore();
  });

  after(function() {
    sandbox.reset();
  })

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when bid is valid', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when bid does not have pubid parameter', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should return adUnit size', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const requestsData = requests[0].data.bidrequest;

      expect(requestsData).to.include({adunitSize: validBid.mediaTypes.banner.sizes});
    });

    it('should return empty bid size', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const requestsData2 = requests[1].data.bidrequest;

      expect(requestsData2).to.deep.include({adunitSize: []});
    });

    it('should return pubsubid from params', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const requestsData = requests[0].data.bidrequest;
      const requestsData2 = requests[1].data.bidrequest;

      expect(requestsData).to.include({pubsubid: 'pubsubtestid'});
      expect(requestsData2).to.include({pubsubid: ''});
    });

    it('should return empty for incorrect pubsubid from params', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const bidWithPub = {...validBid};
      bidWithPub.params.pubsubid = 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii'; // More than 32 chars
      const requests = spec.buildRequests([bidWithPub], bidderRequest);
      const requestsData = requests[0].data.bidrequest;

      expect(requestsData).to.include({pubsubid: ''});
    });

    it('should return bid size from params', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const requestsData = requests[0].data.bidrequest;
      const requestsData2 = requests[1].data.bidrequest;

      expect(requestsData).to.include({size: ''});
      expect(requestsData2).to.include({size: validBid2.params.size});
    });

    it('should return GDPR info', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const requestsData = requests[0].data;
      const requestsData2 = requests[1].data;

      expect(requestsData).to.include({gdpr: true, gdpr_cs: bidderRequest.gdprConsent.consentString});
      expect(requestsData2).to.include({gdpr: true, gdpr_cs: bidderRequest.gdprConsent.consentString});
    });

    it('should not have error on empty GDPR', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const bidderRequestWithoutGDRP = {...bidderRequest, gdprConsent: null};
      const requests = spec.buildRequests([validBid, validBid2], bidderRequestWithoutGDRP);
      const requestsData = requests[0].data;
      const requestsData2 = requests[1].data;

      expect(requestsData).to.include({gdpr: false});
      expect(requestsData2).to.include({gdpr: false});
    });

    it('should not have error on empty USP', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const bidderRequestWithoutUSP = {...bidderRequest, uspConsent: null};
      const requests = spec.buildRequests([validBid, validBid2], bidderRequestWithoutUSP);
      const requestsData = requests[0].data;
      const requestsData2 = requests[1].data;

      expect(requestsData).to.include({usp: false});
      expect(requestsData2).to.include({usp: false});
    });

    it('should create single POST', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);

      expect(requests[0].method).to.equal('POST');
      expect(requests[1].method).to.equal('POST');
    });
  });

  describe('creative viewability', function () {
    it('should return coords', function () {
      createElementVisible(validBid.adUnitCode);
      const requests = spec.buildRequests([validBid], bidderRequest);
      const requestsData = requests[0].data.bidrequest;

      expect(requestsData).to.deep.include({coords: {x: 10, y: 10}});
    });

    it('should define iframe', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const requestsData = requests[0].data;
      const requestsData2 = requests[1].data;

      expect(requestsData).to.include({isiframe: true});
      expect(requestsData2).to.include({isiframe: true});
    });

    it('should define visible element', function () {
      createElementVisible(validBid.adUnitCode);
      const requests = spec.buildRequests([validBid], bidderRequest);
      const requestsData = requests[0].data.bidrequest;

      expect(requestsData).to.include({ishidden: false});
    });

    it('should define invisible element', function () {
      createElementInvisible(validBid.adUnitCode);
      const requests = spec.buildRequests([validBid], bidderRequest);
      const requestsData = requests[0].data.bidrequest;

      expect(requestsData).to.include({ishidden: true});
    });

    it('should define hidden element', function () {
      createElementHidden(validBid.adUnitCode);
      const requests = spec.buildRequests([validBid], bidderRequest);
      const requestsData = requests[0].data.bidrequest;

      expect(requestsData).to.include({ishidden: true});
    });
  });

  describe('interpretResponse', function () {
    it('should return no bids if the response is not valid', function () {
      const bidResponse = spec.interpretResponse({ body: null }, validBid);

      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response is empty', function () {
      const bidResponse = spec.interpretResponse({ body: [] }, { validBid });

      expect(bidResponse).to.be.empty;
    });

    it('should return valid bid responses', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const request = spec.buildRequests([validBid, validBid2], bidderRequest);
      const bidResponse = spec.interpretResponse({body: serverResponse}, request[0]);

      expect(bidResponse[0]).to.deep.include({
        requestId: validBid.bidId,
        ad: serverResponse.bid.ad,
        mediaType: 'banner',
        creativeId: serverResponse.bid.creativeId,
        cpm: serverResponse.bid.cpm,
        width: serverResponse.bid.width,
        height: serverResponse.bid.height,
        currency: 'EUR',
        netRevenue: true,
        ttl: 500,
        meta: serverResponse.bid.meta,
        pubid: validBid.params.pubid
      });
    });

    it('should return default bid params', function () {
      createElementVisible(validBid.adUnitCode);
      createElementVisible(validBid2.adUnitCode);
      const request = spec.buildRequests([validBid, validBid2], bidderRequest);
      const bidResponse = spec.interpretResponse({body: serverResponse2}, request[0]);

      expect(bidResponse[0]).to.deep.include({
        requestId: validBid2.bidId,
        ad: serverResponse2.bid.ad,
        mediaType: 'banner',
        creativeId: serverResponse2.bid.creativeId,
        cpm: serverResponse2.bid.cpm,
        width: serverResponse2.bid.width,
        height: serverResponse2.bid.height,
        meta: serverResponse2.bid.meta,
        pubid: validBid2.params.pubid,
        currency: DEFAULT_CURRENCY,
        netRevenue: DEFAULT_NET_REVENUE,
        ttl: DEFAULT_TTL,
      });
    });
  });

  describe('getUserSyncs', function () {
    let syncOptions
    beforeEach(function () {
      syncOptions = {
        enabledBidders: ['h12media'],
        pixelEnabled: true,
        iframeEnabled: true
      }
    });

    it('should success with usersync pixel url', function () {
      const result = {
        type: 'image',
        url: `https://cookiesync.3rdpartypartner.com/?3rdparty_partner_user_id={user_id}&partner_id=h12media&gdpr_applies=${bidderRequest.gdprConsent.gdprApplies}&gdpr_consent_string=${bidderRequest.gdprConsent.consentString}`,
      };
      const syncs = spec.getUserSyncs(syncOptions, [{body: serverResponse}], bidderRequest.gdprConsent);

      expect(syncs).to.deep.include(result);
    });

    it('should success with usersync iframe url', function () {
      const result = {
        type: 'iframe',
        url: `https://cookiesync.3rdpartypartner.com/?3rdparty_partner_user_id={user_id}&partner_id=h12media&gdpr_applies=${bidderRequest.gdprConsent.gdprApplies}&gdpr_consent_string=${bidderRequest.gdprConsent.consentString}`,
      };
      const syncs = spec.getUserSyncs(syncOptions, [{body: serverResponse}], bidderRequest.gdprConsent);

      expect(syncs).to.deep.include(result);
    });

    it('should success without GDRP', function () {
      const result = {
        type: 'iframe',
        url: `https://cookiesync.3rdpartypartner.com/?3rdparty_partner_user_id={user_id}&partner_id=h12media&gdpr_applies=false&gdpr_consent_string=`,
      };

      expect(spec.getUserSyncs(syncOptions, [{body: serverResponse}], null)).to.deep.include(result);
    });

    it('should success without usersync url', function () {
      expect(spec.getUserSyncs(syncOptions, [{body: serverResponse2}], bidderRequest.gdprConsent)).to.deep.equal([]);
    });

    it('should return empty usersync on empty response', function () {
      expect(spec.getUserSyncs(syncOptions, [{body: {}}])).to.deep.equal([]);
    });
  });
});
