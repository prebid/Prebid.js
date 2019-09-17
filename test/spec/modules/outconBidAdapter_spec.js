import { expect } from 'chai';
import { spec } from '../../../modules/outconBidAdapter';
describe('outconBidAdapter', function () {
  describe('bidRequestValidity', function () {
    it('Check the bidRequest with pod param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'outcon',
        params: {
          pod: '5d603538eba7192ae14e39a4',
          env: 'test'
        }
      })).to.equal(true);
    });
    it('Check the bidRequest with internalID and publisherID params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'outcon',
        params: {
          internalId: '12345678',
          publisher: '5d5d66f2306ea4114a37c7c2',
          env: 'test'
        }
      })).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    it('Build requests with pod param', function () {
      expect(spec.buildRequests([{
        bidder: 'outcon',
        params: {
          pod: '5d603538eba7192ae14e39a4',
          env: 'test'
        }
      }])).to.eql({
        method: 'GET',
        url: 'http://test.outcondigital.com:8048/ad/get?pod=5d603538eba7192ae14e39a4&demo=true',
        data: {}
      });
    });
    it('Build requests with internalID and publisherID params', function () {
      expect(spec.buildRequests([{
        bidder: 'outcon',
        params: {
          internalId: '12345678',
          publisher: '5d5d66f2306ea4114a37c7c2',
          env: 'test'
        }
      }])).to.eql({
        method: 'GET',
        url: 'http://test.outcondigital.com:8048/ad/get?internalId=12345678&publisher=5d5d66f2306ea4114a37c7c2&demo=true',
        data: {}
      });
    });
  });
  describe('interpretResponse', function () {
    const bidRequest = {
      method: 'GET',
      url: 'http://test.outcondigital.com:8048/ad/',
      data: {
        pod: '5d603538eba7192ae14e39a4',
        env: 'test'
      }
    };
    const bidResponse = {
      body: {
        cpm: 0.10,
        cur: 'USD',
        exp: 10,
        creatives: [
          {
            url: 'http://test.outcondigital.com/uploads/5d42e7a7306ea4689b67c122/frutas.mp4',
            size: 3,
            width: 1920,
            height: 1080,
            codec: 'video/mp4'
          }
        ],
        id: '5d6e6aef22063e392bf7f564',
        type: 'video',
        campaign: '5d42e44b306ea469593c76a2',
        trackingURL: 'http://test.outcondigital.com:8048/ad/track?track=5d6e6aef22063e392bf7f564'
      },
    };
    it('check all the keys that are needed to interpret the response', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);
      let requiredKeys = [
        'requestId',
        'cpm',
        'width',
        'height',
        'creativeId',
        'currency',
        'netRevenue',
        'ttl',
        'ad',
        'vastImpUrl'
      ];
      let resultKeys = Object.keys(result[0]);
      resultKeys.forEach(function(key) {
        expect(requiredKeys.indexOf(key) !== -1).to.equal(true);
      });
    })
  });
});
