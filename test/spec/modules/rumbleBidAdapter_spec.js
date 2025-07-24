import {spec, converter} from 'modules/rumbleBidAdapter.js';
import { config } from '../../../src/config.js';
import {BANNER} from "../../../src/mediaTypes.js";
import {deepClone, getUniqueIdentifierStr} from "../../../src/utils.js";
import {expect} from "chai";

const bidder = 'rumble';

describe('RumbleBidAdapter', function() {
  describe('isBidRequestValid', function() {
    const bidId = getUniqueIdentifierStr();
    const bidderRequestId = getUniqueIdentifierStr();

    function newBid() {
      return {
        bidder,
        bidId,
        bidderRequestId,
        params: {
          publisherId: '123',
          siteId: '321',
        },
        mediaTypes: {
          [BANNER]: {
            sizes: [[300, 250]]
          }
        },
      }
    }

    it('should return true when all required parameters exist', function() {
      expect(spec.isBidRequestValid(newBid())).to.equal(true);
    });

    it('should return false when publisherId is not present', function() {
      let bid = newBid();
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when siteId is not present', function() {
      let bid = newBid();
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if mediaTypes.banner or video is not present', function () {
      let bid = newBid();
      delete bid.mediaTypes
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when global configuration is present', function() {
      let bid = newBid();
      delete bid.params.publisherId;
      delete bid.params.siteId;

      config.mergeConfig({
        rumble: {
          publisherId: 1,
          siteId: 1,
          test: true,
        }
      });

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [{
      bidder: 'rumble',
      params: {
        publisherId: 1,
        siteId: 2,
        zoneId: 3,
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      sizes: [[300, 250]],
      bidId: getUniqueIdentifierStr(),
      bidderRequestId: getUniqueIdentifierStr(),
      auctionId: getUniqueIdentifierStr(),
      src: 'client',
      bidRequestsCount: 1
    }];

    let bidderRequest = {
      bidderCode: 'rumble',
      auctionId: getUniqueIdentifierStr(),
      refererInfo: {
        domain: 'localhost',
        page: 'http://localhost/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
      },
      ortb2: {
        site: {
          publisher: {
            name: 'rumble'
          }
        }
      }
    };

    function createRequests(bidRequests, bidderRequest) {
      let cbr = deepClone(bidderRequest);
      cbr.bids = bidRequests;
      return spec.buildRequests(bidRequests, cbr);
    }

    it('should validate request', function() {
      let requests = createRequests(bidRequests, bidderRequest);

      expect(requests).to.have.lengthOf(bidRequests.length);

      requests.forEach(function(request, idx) {
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal('https://a.ads.rmbl.ws/v1/sites/2/ortb?pid=1&a=3');
        expect(request.bidRequest).to.equal(bidRequests[idx]);
      });
    });
  });
});
