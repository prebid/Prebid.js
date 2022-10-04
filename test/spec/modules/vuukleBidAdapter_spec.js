import { expect } from 'chai';
import { spec } from 'modules/vuukleBidAdapter.js';
import { config } from '../../../src/config.js';

describe('vuukleBidAdapterTests', function() {
  let bidRequestData = {
    bids: [
      {
        bidId: 'testbid',
        bidder: 'vuukle',
        params: {
          test: 1
        },
        sizes: [[300, 250]]
      }
    ]
  };
  let request = [];

  it('validate_pub_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'vuukle',
        params: {
          test: 1
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_params', function() {
    request = spec.buildRequests(bidRequestData.bids);
    let req_data = request[0].data;

    expect(req_data.bidId).to.equal('testbid');
  });

  it('validate_generated_params_tmax', function() {
    request = spec.buildRequests(bidRequestData.bids, {timeout: 1234});
    let req_data = request[0].data;

    expect(req_data.tmax).to.equal(1234);
  });

  it('validate_response_params', function() {
    let serverResponse = {
      body: {
        'cpm': 0.01,
        'width': 300,
        'height': 250,
        'creative_id': '12345',
        'ad': 'test ad',
        'adomain': ['example.com']
      }
    };

    request = spec.buildRequests(bidRequestData.bids);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.ad).to.equal('test ad');
    expect(bid.cpm).to.equal(0.01);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('12345');
    expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
  });

  describe('consent handling', function() {
    const bidderRequest = {
      gdprConsent: {
        consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
        gdprApplies: 1,
        vendorData: {
          vendor: {
            consents: {
              1004: 1
            }
          }
        }
      }
    }

    it('must handle consent 1/1', function() {
      request = spec.buildRequests(bidRequestData.bids, bidderRequest);
      let req_data = request[0].data;

      expect(req_data.gdpr).to.equal(1);
      expect(req_data.consentGiven).to.equal(1);
      expect(req_data.consent).to.equal('COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw');
    })

    it('must handle consent 0/1', function() {
      bidderRequest.gdprConsent.gdprApplies = 0;
      request = spec.buildRequests(bidRequestData.bids, bidderRequest);
      let req_data = request[0].data;

      expect(req_data.gdpr).to.equal(0);
      expect(req_data.consentGiven).to.equal(1);
    })

    it('must handle consent 0/0', function() {
      bidderRequest.gdprConsent.gdprApplies = 0;
      bidderRequest.gdprConsent.vendorData = undefined;
      request = spec.buildRequests(bidRequestData.bids, bidderRequest);
      let req_data = request[0].data;

      expect(req_data.gdpr).to.equal(0);
      expect(req_data.consentGiven).to.equal(0);
    })

    it('must handle consent undef', function() {
      request = spec.buildRequests(bidRequestData.bids, {});
      let req_data = request[0].data;

      expect(req_data.gdpr).to.equal(0);
      expect(req_data.consentGiven).to.equal(0);
    })
  })

  it('must handle usp consent', function() {
    request = spec.buildRequests(bidRequestData.bids, {uspConsent: '1YNN'});
    let req_data = request[0].data;

    expect(req_data.uspConsent).to.equal('1YNN');
  })

  it('must handle undefined usp consent', function() {
    request = spec.buildRequests(bidRequestData.bids, {});
    let req_data = request[0].data;

    expect(req_data.uspConsent).to.equal(undefined);
  })

  it('must handle coppa flag', function() {
    sinon.stub(config, 'getConfig')
      .withArgs('coppa')
      .returns(true);

    request = spec.buildRequests(bidRequestData.bids);
    let req_data = request[0].data;

    expect(req_data.coppa).to.equal(1);

    config.getConfig.restore();
  })
});
