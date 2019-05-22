import {expect} from 'chai';
import {spec} from 'modules/feedadBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes';
import * as xhr from '../../../src/ajax';
import * as sinon from 'sinon';

const CODE = 'feedad';

describe('FeedAdAdapter', function () {
  const adapter = newBidder(spec);

  describe('Public API', function () {
    it('should have the FeedAd bidder code', function () {
      expect(spec.code).to.equal(CODE);
    });
    it('should only support video and banner ads', function () {
      expect(spec.supportedMediaTypes).to.be.a('array');
      expect(spec.supportedMediaTypes).to.include(BANNER);
      expect(spec.supportedMediaTypes).to.include(VIDEO);
      expect(spec.supportedMediaTypes).not.to.include(NATIVE);
    });
    it('should include the BidderSpec functions', function () {
      expect(spec.isBidRequestValid).to.be.a('function');
      expect(spec.buildRequests).to.be.a('function');
      expect(spec.interpretResponse).to.be.a('function');
      expect(spec.getUserSyncs).to.be.a('function');
      expect(spec.onTimeout).to.be.a('function');
      expect(spec.onBidWon).to.be.a('function');
      expect(spec.onSetTargeting).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should detect missing params', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: []
      });
      expect(result).to.equal(false);
    });
    it('should detect missing client token', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {placementId: 'placement'}
      });
      expect(result).to.equal(false);
    });
    it('should detect zero length client token', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: '', placementId: 'placement'}
      });
      expect(result).to.equal(false);
    });
    it('should detect missing placement id', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken'}
      });
      expect(result).to.equal(false);
    });
    it('should detect zero length placement id', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken', placementId: ''}
      });
      expect(result).to.equal(false);
    });
    it('should detect too long placement id', function () {
      var placementId = '';
      for (var i = 0; i < 300; i++) {
        placementId += 'a';
      }
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken', placementId}
      });
      expect(result).to.equal(false);
    });
    it('should detect invalid placement id', function () {
      [
        'placement id with spaces',
        'some|id',
        'PLACEMENTID',
        'placeme:ntId'
      ].forEach(id => {
        let result = spec.isBidRequestValid({
          bidder: 'feedad',
          sizes: [],
          params: {clientToken: 'clientToken', placementId: id}
        });
        expect(result).to.equal(false);
      });
    });
    it('should accept valid parameters', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      });
      expect(result).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('should accept empty lists', function () {
      let result = spec.buildRequests([]);
      expect(result.data.requests).to.be.empty;
    });
    it('should filter native media types', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          native: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.data.requests).to.be.empty;
    });
    it('should filter video media types without outstream context', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          video: {
            context: 'instream'
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.data.requests).to.be.empty;
    });
    it('should pass through outstream video media', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          video: {
            context: 'outstream'
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.data.requests).to.be.lengthOf(1);
      expect(result.data.requests[0]).to.deep.equal(bid);
    });
    it('should pass through banner media', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.data.requests).to.be.lengthOf(1);
      expect(result.data.requests[0]).to.deep.equal(bid);
    });
    it('should detect empty media types', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: undefined,
          video: undefined,
          native: undefined
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.data.requests).to.be.empty;
    });
    it('should use POST', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.method).to.equal('POST');
    });
    it('should use the correct URL', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.url).to.equal('http://localhost:3000/bidRequests');
    });
    it('should specify the content type explicitly', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid]);
      expect(result.options).to.deep.equal({
        contentType: 'application/json'
      })
    });
  });

  describe('onTimeout', function () {
    let xhr;

    beforeEach(function () {
      xhr = sinon.stub();
    });

    it('should send parameters to backend', function () {
      let params = {some: 'parameters'};
      spec.onTimeout(params, xhr);
      expect(xhr.calledOnceWith('http://localhost:3000/onTimeout', null, JSON.stringify(params), {
        withCredentials: true,
        method: 'POST',
        contentType: 'application/json'
      })).to.be.true;
    });

    it('should do nothing on empty data', function () {
      spec.onTimeout(undefined, xhr);
      spec.onTimeout(null, xhr);
      expect(xhr.called).to.be.false;
    });
  });

  describe('onBidWon', function () {
    let xhr;

    beforeEach(function () {
      xhr = sinon.stub();
    });

    it('should send parameters to backend', function () {
      let params = {some: 'parameters'};
      spec.onBidWon(params, xhr);
      expect(xhr.calledOnceWith('http://localhost:3000/onBidWon', null, JSON.stringify(params), {
        withCredentials: true,
        method: 'POST',
        contentType: 'application/json'
      })).to.be.true;
    });

    it('should do nothing on empty data', function () {
      spec.onBidWon(undefined, xhr);
      spec.onBidWon(null, xhr);
      expect(xhr.called).to.be.false;
    });
  });
});
