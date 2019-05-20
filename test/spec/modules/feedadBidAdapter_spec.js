import {expect} from 'chai';
import {spec} from 'modules/feedadBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes';

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
        bidder: "feedad",
        sizes: []
      });
      expect(result).to.equal(false);
    });
    it('should detect missing client token', function () {
      let result = spec.isBidRequestValid({
        bidder: "feedad",
        sizes: [],
        params: {placementId: "placement"}
      });
      expect(result).to.equal(false);
    });
    it('should detect zero length client token', function () {
      let result = spec.isBidRequestValid({
        bidder: "feedad",
        sizes: [],
        params: {clientToken: "", placementId: "placement"}
      });
      expect(result).to.equal(false);
    });
    it('should detect missing placement id', function () {
      let result = spec.isBidRequestValid({
        bidder: "feedad",
        sizes: [],
        params: {clientToken: "clientToken"}
      });
      expect(result).to.equal(false);
    });
    it('should detect zero length placement id', function () {
      let result = spec.isBidRequestValid({
        bidder: "feedad",
        sizes: [],
        params: {clientToken: "clientToken", placementId: ""}
      });
      expect(result).to.equal(false);
    });
    it('should detect too long placement id', function () {
      var placementId = "";
      for (var i = 0; i < 300; i++) {
        placementId += "a";
      }
      let result = spec.isBidRequestValid({
        bidder: "feedad",
        sizes: [],
        params: {clientToken: "clientToken", placementId}
      });
      expect(result).to.equal(false);
    });
    it('should detect invalid placement id', function () {
      [
        "placement id with spaces",
        "some|id",
        "PLACEMENTID",
        "placeme:ntId"
      ].forEach(id => {
        let result = spec.isBidRequestValid({
          bidder: "feedad",
          sizes: [],
          params: {clientToken: "clientToken", placementId: id}
        });
        expect(result).to.equal(false);
      });
    });
    it('should accept valid parameters', function () {
      let result = spec.isBidRequestValid({
        bidder: "feedad",
        sizes: [],
        params: {clientToken: "clientToken", placementId: "placement-id"}
      });
      expect(result).to.equal(true);
    });
  });
});
