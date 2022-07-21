import { expect } from 'chai';
import {
  tryGetCriteoFastBid,
  spec,
  storage,
  PROFILE_ID_PUBLISHERTAG,
  ADAPTER_VERSION,
  canFastBid, getFastBidUrl, FAST_BID_VERSION_CURRENT
} from 'modules/criteoBidAdapter.js';
import { createBid } from 'src/bidfactory.js';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils.js';
import { config } from '../../../src/config.js';
import { NATIVE, VIDEO } from '../../../src/mediaTypes.js';
import * as storageManager from 'src/storageManager.js';

describe('The Criteo bidding adapter', function () {
  let utilsMock, sandbox;

  beforeEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {
      criteo: {
        storageAllowed: true
      }
    };
    // Remove FastBid to avoid side effects
    localStorage.removeItem('criteo_fast_bid');
    utilsMock = sinon.mock(utils);

    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {};
    global.Criteo = undefined;
    utilsMock.restore();
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'criteo',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when given a zoneId bid', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          zoneId: 123,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a networkId bid', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          networkId: 456,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a mixed bid with both a zoneId and a networkId', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          zoneId: 123,
          networkId: 456,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a valid video bid request using mix custom bidder video parameters', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(true);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 2,
            playbackmethod: 1
          }
        },
      })).to.equal(true);
    });

    it('should return true when given a valid video bid request using only mediaTypes.video parameters', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2],
            skip: 1,
            placement: 1,
            minduration: 0,
            playbackmethod: 1,
            startdelay: 0
          }
        },
        params: {
          networkId: 456
        },
      })).to.equal(true);
    });

    it('should return false when given an invalid video bid request', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 2,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'adpod',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1
          }
        },
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const refererUrl = 'https://criteo.com?pbt_debug=1&pbt_nolog=1';
    const bidderRequest = {
      refererInfo: {
        page: refererUrl,
        topmostLocation: refererUrl
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'concentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
        apiVersion: 1,
      },
    };

    let localStorageIsEnabledStub;

    this.beforeEach(function () {
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      localStorageIsEnabledStub.returns(true);
    });

    afterEach(function () {
      localStorageIsEnabledStub.restore();
      config.resetConfig();
    });

    it('should properly build a request if refererInfo is not provided', function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal('');
    });

    it('should properly build a zoneId request', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { },
            integrationMode: 'amp'
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=1&im=1&debug=1&nolog=1/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(refererUrl);
      expect(ortbRequest.slots).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('728x90');
      expect(ortbRequest.slots[0].zoneid).to.equal(123);
      expect(ortbRequest.gdprConsent.consentData).to.equal('concentDataString');
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(true);
      expect(ortbRequest.gdprConsent.version).to.equal(1);
    });

    it('should keep undefined sizes for non native banner', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [[undefined, undefined]]
            }
          },
          params: {},
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('undefinedxundefined');
    });

    it('should keep undefined size for non native banner', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [undefined, undefined]
            }
          },
          params: {},
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('undefinedxundefined');
    });

    it('should properly detect and get sizes of native sizeless banner', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [[undefined, undefined]]
            }
          },
          params: {
            nativeCallback: function () { }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('2x2');
    });

    it('should properly detect and get size of native sizeless banner', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [undefined, undefined]
            }
          },
          params: {
            nativeCallback: function () { }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('2x2');
    });

    it('should properly build a networkId request', function () {
      const bidderRequest = {
        refererInfo: {
          page: refererUrl,
          topmostLocation: refererUrl,
        },
        timeout: 3000,
        gdprConsent: {
          gdprApplies: 0,
          consentString: undefined,
          vendorData: {
            vendorConsents: {
              '1': 0
            },
          },
        },
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(refererUrl);
      expect(ortbRequest.publisher.networkid).to.equal(456);
      expect(ortbRequest.slots).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(2);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('300x250');
      expect(ortbRequest.slots[0].sizes[1]).to.equal('728x90');
      expect(ortbRequest.gdprConsent.consentData).to.equal(undefined);
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(false);
    });

    it('should properly build a mixed request', function () {
      const bidderRequest = {
        refererInfo: {
          page: refererUrl,
          topmostLocation: refererUrl,
        },
        timeout: 3000
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-234',
          transactionId: 'transaction-234',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(refererUrl);
      expect(ortbRequest.publisher.networkid).to.equal(456);
      expect(ortbRequest.slots).to.have.lengthOf(2);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('728x90');
      expect(ortbRequest.slots[1].impid).to.equal('bid-234');
      expect(ortbRequest.slots[1].transactionid).to.equal('transaction-234');
      expect(ortbRequest.slots[1].sizes).to.have.lengthOf(2);
      expect(ortbRequest.slots[1].sizes[0]).to.equal('300x250');
      expect(ortbRequest.slots[1].sizes[1]).to.equal('728x90');
      expect(ortbRequest.gdprConsent).to.equal(undefined);
    });

    it('should properly build a request with undefined gdpr consent fields when they are not provided', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        gdprConsent: {},
      };

      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.gdprConsent.consentData).to.equal(undefined);
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(undefined);
    });

    it('should properly build a request with ccpa consent field', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        uspConsent: '1YNY',
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.uspIab).to.equal('1YNY');
    });

    it('should properly build a request with schain object', function () {
      const expectedSchain = {
        someProperty: 'someValue'
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          schain: expectedSchain,
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.source.ext.schain).to.equal(expectedSchain);
    });

    it('should properly build a request with if ccpa consent field is not provided', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.uspIab).to.equal(undefined);
    });

    it('should properly build a video request', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[640, 480]],
          mediaTypes: {
            video: {
              playerSize: [640, 480],
              mimes: ['video/mp4', 'video/x-flv'],
              maxduration: 30,
              api: [1, 2],
              protocols: [2, 3]
            }
          },
          params: {
            zoneId: 123,
            video: {
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
      expect(ortbRequest.slots[0].sizes).to.deep.equal([]);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['640x480']);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([2, 3]);
      expect(ortbRequest.slots[0].video.skip).to.equal(1);
      expect(ortbRequest.slots[0].video.minduration).to.equal(5);
      expect(ortbRequest.slots[0].video.startdelay).to.equal(5);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([1, 3]);
      expect(ortbRequest.slots[0].video.placement).to.equal(2);
    });

    it('should properly build a video request with more than one player size', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[640, 480], [800, 600]],
          mediaTypes: {
            video: {
              playerSize: [[640, 480], [800, 600]],
              mimes: ['video/mp4', 'video/x-flv'],
              maxduration: 30,
              api: [1, 2],
              protocols: [2, 3]
            }
          },
          params: {
            zoneId: 123,
            video: {
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.deep.equal([]);
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['640x480', '800x600']);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([2, 3]);
      expect(ortbRequest.slots[0].video.skip).to.equal(1);
      expect(ortbRequest.slots[0].video.minduration).to.equal(5);
      expect(ortbRequest.slots[0].video.startdelay).to.equal(5);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([1, 3]);
      expect(ortbRequest.slots[0].video.placement).to.equal(2);
    });

    it('should properly build a video request when mediaTypes.video.skip=0', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[300, 250]],
          mediaTypes: {
            video: {
              playerSize: [[300, 250]],
              mimes: ['video/mp4', 'video/MPV', 'video/H264', 'video/webm', 'video/ogg'],
              minduration: 1,
              maxduration: 30,
              playbackmethod: [2, 3, 4, 5, 6],
              api: [1, 2, 3, 4, 5, 6],
              protocols: [1, 2, 3, 4, 5, 6, 7, 8],
              skip: 0
            }
          },
          params: {
            networkId: 123
          }
        }
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.deep.equal([]);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['300x250']);
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/MPV', 'video/H264', 'video/webm', 'video/ogg']);
      expect(ortbRequest.slots[0].video.minduration).to.equal(1);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([2, 3, 4, 5, 6]);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2, 3, 4, 5, 6]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(ortbRequest.slots[0].video.skip).to.equal(0);
    });

    it('should properly build a request with ceh', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      config.setConfig({
        criteo: {
          ceh: 'hashedemail'
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.ceh).to.equal('hashedemail');
    });

    it('should properly build a request without first party data', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: {} });
      expect(request.data.publisher.ext).to.equal(undefined);
      expect(request.data.user.ext).to.equal(undefined);
      expect(request.data.slots[0].ext).to.equal(undefined);
    });

    it('should properly build a request with criteo specific ad unit first party data', function () {
      // TODO: this test does not do what it says
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: {} });
      expect(request.data.slots[0].ext).to.deep.equal({
        bidfloor: 0.75,
      });
    });

    it('should properly build a request with first party data', function () {
      const siteData = {
        keywords: ['power tools'],
        ext: {
          data: {
            pageType: 'article'
          }
        }
      };
      const userData = {
        gender: 'M',
        ext: {
          data: {
            registered: true
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            ext: {
              data: {
                someContextAttribute: 'abc'
              }
            }
          }
        },
      ];

      const ortb2 = {
        site: siteData,
        user: userData
      };

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 });
      expect(request.data.publisher.ext).to.deep.equal({ data: { pageType: 'article' } });
      expect(request.data.user.ext).to.deep.equal({ data: { registered: true } });
      expect(request.data.slots[0].ext).to.deep.equal({
        bidfloor: 0.75,
        data: {
          someContextAttribute: 'abc'
        }
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array when parsing a no bid response', function () {
      const response = {};
      const request = { bidRequests: [] };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a bid response with a networkId', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            creativecode: 'test-crId',
            width: 728,
            height: 90,
            dealCode: 'myDealCode',
            adomain: ['criteo.com'],
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            networkId: 456,
          }
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].dealId).to.equal('myDealCode');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
    });

    it('should properly parse a bid response with a zoneId', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].adId).to.equal('abc123');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should properly parse a bid response with a video', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            displayurl: 'http://test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
            video: true
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].adId).to.equal('abc123');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].vastUrl).to.equal('http://test-ad');
      expect(bids[0].mediaType).to.equal(VIDEO);
    });

    it('should properly parse a bid response with native', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            width: 728,
            height: 90,
            zoneid: 123,
            native: {
              'products': [{
                'sendTargetingKeys': false,
                'title': 'Product title',
                'description': 'Product desc',
                'price': '100',
                'click_url': 'https://product.click',
                'image': {
                  'url': 'https://publisherdirect.criteo.com/publishertag/preprodtest/creative.png',
                  'height': 300,
                  'width': 300
                },
                'call_to_action': 'Try it now!'
              }],
              'advertiser': {
                'description': 'sponsor',
                'domain': 'criteo.com',
                'logo': { 'url': 'https://www.criteo.com/images/criteo-logo.svg', 'height': 300, 'width': 300 }
              },
              'privacy': {
                'optout_click_url': 'https://info.criteo.com/privacy/informations',
                'optout_image_url': 'https://static.criteo.net/flash/icon/nai_small.png',
              },
              'impression_pixels': [{ 'url': 'https://my-impression-pixel/test/impression' }, { 'url': 'https://cas.com/lg.com' }]
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
          native: true,
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].adId).to.equal('abc123');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].mediaType).to.equal(NATIVE);
    });

    it('should warn only once if sendTargetingKeys set to true on required fields for native bidRequest', () => {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { }
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-456',
          transactionId: 'transaction-456',
          sizes: [[728, 90]],
          params: {
            zoneId: 456,
            publisherSubId: '456',
            nativeCallback: function () { }
          },
        },
      ];

      const nativeParamsWithSendTargetingKeys = [
        {
          nativeParams: {
            image: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            icon: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            clickUrl: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            displayUrl: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            privacyLink: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            privacyIcon: {
              sendTargetingKeys: true
            },
          }
        }
      ];

      utilsMock.expects('logWarn')
        .withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)')
        .exactly(nativeParamsWithSendTargetingKeys.length * bidRequests.length);
      nativeParamsWithSendTargetingKeys.forEach(nativeParams => {
        let transformedBidRequests = { ...bidRequests };
        transformedBidRequests = [Object.assign(transformedBidRequests[0], nativeParams), Object.assign(transformedBidRequests[1], nativeParams)];
        spec.buildRequests(transformedBidRequests, bidderRequest);
      });
      utilsMock.verify();
    });

    it('should properly parse a bid response with a zoneId passed as a string', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: '123',
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should generate unique adIds if none are returned by the endpoint', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            width: 300,
            height: 250,
          }, {
            impid: 'test-requestId',
            cpm: 4.56,
            creative: 'test-ad',
            width: 728,
            height: 90,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          sizes: [[300, 250], [728, 90]],
          params: {
            networkId: 456,
          }
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(2);
      const prebidBids = bids.map(bid => Object.assign(createBid(CONSTANTS.STATUS.GOOD, request.bidRequests[0]), bid));
      expect(prebidBids[0].adId).to.not.equal(prebidBids[1].adId);
    });

    [{
      hasBidResponseLevelPafData: true,
      hasBidResponseBidLevelPafData: true,
      shouldContainsBidMetaPafData: true
    },
    {
      hasBidResponseLevelPafData: false,
      hasBidResponseBidLevelPafData: true,
      shouldContainsBidMetaPafData: false
    },
    {
      hasBidResponseLevelPafData: true,
      hasBidResponseBidLevelPafData: false,
      shouldContainsBidMetaPafData: false
    },
    {
      hasBidResponseLevelPafData: false,
      hasBidResponseBidLevelPafData: false,
      shouldContainsBidMetaPafData: false
    }].forEach(testCase => {
      const bidPafContentId = 'abcdef';
      const pafTransmission = {
        version: '12'
      };
      const response = {
        slots: [
          {
            width: 300,
            height: 250,
            cpm: 10,
            impid: 'adUnitId',
            ext: (testCase.hasBidResponseBidLevelPafData ? {
              paf: {
                content_id: bidPafContentId
              }
            } : undefined)
          }
        ],
        ext: (testCase.hasBidResponseLevelPafData ? {
          paf: {
            transmission: pafTransmission
          }
        } : undefined)
      };

      const request = {
        bidRequests: [{
          adUnitCode: 'adUnitId',
          sizes: [[300, 250]],
          params: {
            networkId: 456,
          }
        }]
      };

      const bids = spec.interpretResponse(response, request);

      expect(bids).to.have.lengthOf(1);

      const theoreticalBidMetaPafData = {
        paf: {
          content_id: bidPafContentId,
          transmission: pafTransmission
        }
      };

      if (testCase.shouldContainsBidMetaPafData) {
        expect(bids[0].meta).to.deep.equal(theoreticalBidMetaPafData);
      } else {
        expect(bids[0].meta).not.to.deep.equal(theoreticalBidMetaPafData);
      }
    });
  });

  describe('canFastBid', function () {
    it('should properly detect if can do fastbid', function () {
      const testCasesAndExpectedResult = [['none', false], ['', true], [undefined, true], [123, true]];
      testCasesAndExpectedResult.forEach(testCase => {
        const result = canFastBid(testCase[0]);
        expect(result).to.equal(testCase[1]);
      })
    });
  });

  describe('getFastBidUrl', function () {
    it('should properly detect the version of fastbid', function () {
      const testCasesAndExpectedResult = [
        ['', 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [undefined, 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [null, 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [NaN, 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [123, 'https://static.criteo.net/js/ld/publishertag.prebid.123.js'],
        ['123', 'https://static.criteo.net/js/ld/publishertag.prebid.123.js'],
        ['latest', 'https://static.criteo.net/js/ld/publishertag.prebid.js']
      ];
      testCasesAndExpectedResult.forEach(testCase => {
        const result = getFastBidUrl(testCase[0]);
        expect(result).to.equal(testCase[1]);
      })
    });
  });

  describe('tryGetCriteoFastBid', function () {
    const VALID_HASH = 'vBeD8Q7GU6lypFbzB07W8hLGj7NL+p7dI9ro2tCxkrmyv0F6stNuoNd75Us33iNKfEoW+cFWypelr6OJPXxki2MXWatRhJuUJZMcK4VBFnxi3Ro+3a0xEfxE4jJm4eGe98iC898M+/YFHfp+fEPEnS6pEyw124ONIFZFrcejpHU=';
    const INVALID_HASH = 'invalid';
    const VALID_PUBLISHER_TAG = 'test';
    const INVALID_PUBLISHER_TAG = 'test invalid';

    const FASTBID_LOCAL_STORAGE_KEY = 'criteo_fast_bid';

    it('should verify valid hash with valid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').once();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').never();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.equals('// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + INVALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').once();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + INVALID_HASH + '\n' + VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').once();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').once();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').never();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });
  });

  describe('when pubtag prebid adapter is not available', function () {
    it('should not warn if sendId is provided on required fields for native bidRequest', () => {
      const bidderRequest = {};
      const bidRequestsWithSendId = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { }
          },
          nativeParams: {
            image: {
              sendId: true
            },
            icon: {
              sendId: true
            },
            clickUrl: {
              sendId: true
            },
            displayUrl: {
              sendId: true
            },
            privacyLink: {
              sendId: true
            },
            privacyIcon: {
              sendId: true
            }
          }
        }
      ];

      utilsMock.expects('logWarn').withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)').never();
      const request = spec.buildRequests(bidRequestsWithSendId, bidderRequest);
      utilsMock.verify();
    });

    it('should warn only once if sendId is not provided on required fields for native bidRequest', () => {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { }
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-456',
          transactionId: 'transaction-456',
          sizes: [[728, 90]],
          params: {
            zoneId: 456,
            publisherSubId: '456',
            nativeCallback: function () { }
          },
        },
      ];

      const nativeParamsWithoutSendId = [
        {
          nativeParams: {
            image: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            icon: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            clickUrl: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            displayUrl: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            privacyLink: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            privacyIcon: {
              sendId: false
            },
          }
        }
      ];

      utilsMock.expects('logWarn')
        .withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)')
        .exactly(nativeParamsWithoutSendId.length * bidRequests.length);
      nativeParamsWithoutSendId.forEach(nativeParams => {
        let transformedBidRequests = { ...bidRequests };
        transformedBidRequests = [Object.assign(transformedBidRequests[0], nativeParams), Object.assign(transformedBidRequests[1], nativeParams)];
        spec.buildRequests(transformedBidRequests, bidderRequest);
      });
      utilsMock.verify();
    });
  });

  describe('when pubtag prebid adapter is available', function () {
    it('should forward response to pubtag when calling interpretResponse', () => {
      const response = {};
      const request = {};

      const adapter = { interpretResponse: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('interpretResponse').withExactArgs(response, request).once().returns('ok');
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(request).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      expect(spec.interpretResponse(response, request)).equal('ok');
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onBidWon', () => {
      const bid = { auctionId: 123 };

      const adapter = { handleBidWon: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleBidWon').withExactArgs(bid).once();
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(bid.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onBidWon(bid);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onSetTargeting', () => {
      const bid = { auctionId: 123 };

      const adapter = { handleSetTargeting: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleSetTargeting').withExactArgs(bid).once();
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(bid.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onSetTargeting(bid);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onTimeout', () => {
      const timeoutData = [{ auctionId: 123 }];

      const adapter = { handleBidTimeout: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleBidTimeout').once();
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(timeoutData[0].auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onTimeout(timeoutData);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should return a POST method with url & data from pubtag', () => {
      const bidRequests = {};
      const bidderRequest = {};

      const prebidAdapter = { buildCdbUrl: function () { }, buildCdbRequest: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('buildCdbUrl').once().returns('cdbUrl');
      prebidAdapterMock.expects('buildCdbRequest').once().returns('cdbRequest');

      const adapters = { Prebid: function () { } };
      const adaptersMock = sinon.mock(adapters);
      adaptersMock.expects('Prebid').withExactArgs(PROFILE_ID_PUBLISHERTAG, ADAPTER_VERSION, bidRequests, bidderRequest, '$prebid.version$').once().returns(prebidAdapter);

      global.Criteo = {
        PubTag: {
          Adapters: adapters
        }
      };

      const buildRequestsResult = spec.buildRequests(bidRequests, bidderRequest);
      expect(buildRequestsResult.method).equal('POST');
      expect(buildRequestsResult.url).equal('cdbUrl');
      expect(buildRequestsResult.data).equal('cdbRequest');

      adaptersMock.verify();
      prebidAdapterMock.verify();
    });
  });
});
