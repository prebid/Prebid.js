import {expect} from 'chai';
import {spec} from 'modules/orbitsoftBidAdapter';

const ENDPOINT_URL = 'https://orbitsoft.com/php/ads/hb.phps';
describe('Orbitsoft adapter', function () {
  describe('implementation', function () {
    describe('for requests', function () {
      it('should accept valid bid', function () {
        let validBid = {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL
            }
          },
          isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid', function () {
        let invalidBid = {
            bidder: 'orbitsoft'
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });
    describe('for requests', function () {
      it('should accept valid bid with styles', function () {
        let validBid = {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL,
              style: {
                title: {
                  family: 'Tahoma',
                  size: 'medium',
                  weight: 'normal',
                  style: 'normal',
                  color: '0053F9'
                },
                description: {
                  family: 'Tahoma',
                  size: 'medium',
                  weight: 'normal',
                  style: 'normal',
                  color: '0053F9'
                },
                url: {
                  family: 'Tahoma',
                  size: 'medium',
                  weight: 'normal',
                  style: 'normal',
                  color: '0053F9'
                },
                colors: {
                  background: 'ffffff',
                  border: 'E0E0E0',
                  link: '5B99FE'
                }
              }
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);

        let buildRequest = spec.buildRequests([validBid])[0];
        let requestUrl = buildRequest.url;
        let requestUrlParams = buildRequest.data;
        expect(requestUrl).to.equal(ENDPOINT_URL);
        expect(requestUrlParams).have.property('f1', 'Tahoma');
        expect(requestUrlParams).have.property('fs1', 'medium');
        expect(requestUrlParams).have.property('w1', 'normal');
        expect(requestUrlParams).have.property('s1', 'normal');
        expect(requestUrlParams).have.property('c3', '0053F9');
        expect(requestUrlParams).have.property('f2', 'Tahoma');
        expect(requestUrlParams).have.property('fs2', 'medium');
        expect(requestUrlParams).have.property('w2', 'normal');
        expect(requestUrlParams).have.property('s2', 'normal');
        expect(requestUrlParams).have.property('c4', '0053F9');
        expect(requestUrlParams).have.property('f3', 'Tahoma');
        expect(requestUrlParams).have.property('fs3', 'medium');
        expect(requestUrlParams).have.property('w3', 'normal');
        expect(requestUrlParams).have.property('s3', 'normal');
        expect(requestUrlParams).have.property('c5', '0053F9');
        expect(requestUrlParams).have.property('c2', 'ffffff');
        expect(requestUrlParams).have.property('c1', 'E0E0E0');
        expect(requestUrlParams).have.property('c6', '5B99FE');
      });

      it('should accept valid bid with custom params', function () {
        let validBid = {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL,
              customParams: {
                cacheBuster: 'bf4d7c1',
                clickUrl: 'https://testclickurl.com'
              }
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);

        let buildRequest = spec.buildRequests([validBid])[0];
        let requestUrlCustomParams = buildRequest.data;
        expect(requestUrlCustomParams).have.property('c.cacheBuster', 'bf4d7c1');
        expect(requestUrlCustomParams).have.property('c.clickUrl', 'https://testclickurl.com');
      });

      it('should reject invalid bid without requestUrl', function () {
        let invalidBid = {
            bidder: 'orbitsoft',
            params: {
              placementId: '123'
            }
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('should reject invalid bid without placementId', function () {
        let invalidBid = {
            bidder: 'orbitsoft',
            params: {
              requestUrl: ENDPOINT_URL
            }
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });
    describe('bid responses', function () {
      it('should return complete bid response', function () {
        let serverResponse = {
          body: {
            callback_uid: '265b29b70cc106',
            cpm: 0.5,
            width: 240,
            height: 240,
            content_url: 'https://orbitsoft.com/php/ads/hb.html',
          }
        };

        let bidRequests = [
          {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL
            }
          }
        ];
        let bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].cpm).to.equal(0.5);
        expect(bids[0].width).to.equal(240);
        expect(bids[0].height).to.equal(240);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].adUrl).to.have.length.above(1);
        expect(bids[0].adUrl).to.have.string('https://orbitsoft.com/php/ads/hb.html');
      });

      it('should return empty bid response', function () {
        let bidRequests = [
          {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL
            }
          }
        ];
        let serverResponse = {
            body: {
              callback_uid: '265b29b70cc106',
              cpm: 0
            }
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on incorrect size', function () {
        let bidRequests = [
          {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL
            }
          }
        ];
        let serverResponse = {
            body: {
              callback_uid: '265b29b70cc106',
              cpm: 1.5,
              width: 0,
              height: 0
            }
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response with error', function () {
        let bidRequests = [
          {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL
            }
          }
        ];
        let serverResponse = {error: 'error'},
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on empty body', function () {
        let bidRequests = [
          {
            bidder: 'orbitsoft',
            params: {
              placementId: '123',
              requestUrl: ENDPOINT_URL
            }
          }
        ];
        let serverResponse = {},
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });
    });
  });
});
