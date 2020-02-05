import { expect } from 'chai';
import * as utils from 'src/utils';
import { spec, resetUserSync } from 'modules/aardvarkBidAdapter';

describe('aardvarkAdapterTest', function () {
  describe('forming valid bidRequests', function () {
    it('should accept valid bidRequests', function () {
      expect(spec.isBidRequestValid({
        bidder: 'aardvark',
        params: {
          ai: 'xiby',
          sc: 'TdAx',
        },
        sizes: [[300, 250]]
      })).to.equal(true);
    });

    it('should reject invalid bidRequests', function () {
      expect(spec.isBidRequestValid({
        bidder: 'aardvark',
        params: {
          ai: 'xiby',
        },
        sizes: [[300, 250]]
      })).to.equal(false);
    });
  });

  describe('executing network requests', function () {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      userId: { tdid: 'eff98622-b5fd-44fa-9a49-6e846922d532' }
    },
    {
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'RAZd',
        host: 'adzone.pub.com'
      },
      adUnitCode: 'bbb',
      transactionId: '193995b4-7122-4739-959b-2463282a138b',
      sizes: [[800, 600]],
      bidId: '22aidtbx5eabd9',
      bidderRequestId: '70deaff71c281d',
      auctionId: 'e97cafd0-ebfc-4f5c-b7c9-baa0fd335a4a'
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    it('should use HTTP GET method', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('should call the correct bidRequest url', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.match(new RegExp('^https:\/\/adzone.pub.com/xiby/TdAx_RAZd/aardvark\?'));
    });

    it('should have correct data', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.version).to.equal(1);
      expect(requests[0].data.jsonp).to.equal(false);
      expect(requests[0].data.TdAx).to.equal('1abgs362e0x48a8');
      expect(requests[0].data.rtkreferer).to.not.be.undefined;
      expect(requests[0].data.RAZd).to.equal('22aidtbx5eabd9');
    });

    it('should have tdid, it is available in bidRequest', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        expect(requestItem.data.tdid).to.equal('eff98622-b5fd-44fa-9a49-6e846922d532');
      });
    });
  });

  describe('splitting multi-auction ad units into own requests', function () {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'Toby',
        sc: 'TdAx',
        categories: ['cat1', 'cat2']
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    },
    {
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'RAZd',
        host: 'adzone.pub.com'
      },
      adUnitCode: 'bbb',
      transactionId: '193995b4-7122-4739-959b-2463282a138b',
      sizes: [[800, 600]],
      bidId: '22aidtbx5eabd9',
      bidderRequestId: '70deaff71c281d',
      auctionId: 'e97cafd0-ebfc-4f5c-b7c9-baa0fd335a4a'
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    it('should use HTTP GET method', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('should call the correct bidRequest urls for each auction', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.match(new RegExp('^https:\/\/bidder.rtk.io/Toby/TdAx/aardvark\?'));
      expect(requests[0].data.categories.length).to.equal(2);
      expect(requests[1].url).to.match(new RegExp('^https:\/\/adzone.pub.com/xiby/RAZd/aardvark\?'));
    });

    it('should have correct data', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(2);
      expect(requests[0].data.version).to.equal(1);
      expect(requests[0].data.jsonp).to.equal(false);
      expect(requests[0].data.TdAx).to.equal('1abgs362e0x48a8');
      expect(requests[0].data.rtkreferer).to.not.be.undefined;
      expect(requests[0].data.RAZd).to.be.undefined;
      expect(requests[1].data.version).to.equal(1);
      expect(requests[1].data.jsonp).to.equal(false);
      expect(requests[1].data.TdAx).to.be.undefined;
      expect(requests[1].data.rtkreferer).to.not.be.undefined;
      expect(requests[1].data.RAZd).to.equal('22aidtbx5eabd9');
    });

    it('should have no tdid, it is not available in bidRequest', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        expect(requestItem.data.tdid).to.be.undefined;
      });
    });
  });

  describe('GDPR conformity', function () {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    const bidderRequest = {
      gdprConsent: {
        consentString: 'awefasdfwefasdfasd',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    it('should transmit correct data', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.gdpr).to.equal(true);
      expect(requests[0].data.consent).to.equal('awefasdfwefasdfasd');
    });
  });

  describe('GDPR absence conformity', function () {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    const bidderRequest = {
      gdprConsent: undefined,
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    it('should transmit correct data', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.gdpr).to.be.undefined;
      expect(requests[0].data.consent).to.be.undefined;
    });
  });

  describe('CCPA conformity', function () {
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337'
    }];

    it('should transmit us_privacy data', function () {
      const usp = '1NY-';
      const bidderRequest = {
        gdprConsent: {
          consentString: 'awefasdfwefasdfasd',
          gdprApplies: true
        },
        refererInfo: {
          referer: 'http://example.com'
        },
        uspConsent: usp
      };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.gdpr).to.equal(true);
      expect(requests[0].data.consent).to.equal('awefasdfwefasdfasd');
      expect(requests[0].data.us_privacy).to.equal(usp);
    });

    it('should not send us_privacy', function () {
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com'
        }
      };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests.length).to.equal(1);
      expect(requests[0].data.gdpr).to.be.undefined;
      expect(requests[0].data.consent).to.be.undefined;
      expect(requests[0].data.us_privacy).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    it('should handle bid responses', function () {
      const serverResponse = {
        body: [
          {
            media: 'banner',
            nurl: 'https://www.nurl.com/0',
            cpm: 0.09,
            width: 300,
            height: 250,
            cid: '22aidtbx5eabd9',
            adm: '</tag1>',
            dealId: 'dealing',
            ttl: 200,
          },
          {
            media: 'banner',
            nurl: 'https://www.nurl.com/1',
            cpm: 0.19,
            width: 300,
            height: 250,
            cid: '1abgs362e0x48a8',
            adm: '</tag2>',
            ttl: 200,
            ex: 'extraproperty'
          }
        ],
        headers: {}
      };

      const result = spec.interpretResponse(serverResponse, {});
      expect(result.length).to.equal(2);

      expect(result[0].requestId).to.equal('22aidtbx5eabd9');
      expect(result[0].cpm).to.equal(0.09);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].ttl).to.equal(200);
      expect(result[0].dealId).to.equal('dealing');
      expect(result[0].ex).to.be.undefined;
      expect(result[0].ad).to.not.be.undefined;

      expect(result[1].requestId).to.equal('1abgs362e0x48a8');
      expect(result[1].cpm).to.equal(0.19);
      expect(result[1].width).to.equal(300);
      expect(result[1].height).to.equal(250);
      expect(result[1].currency).to.equal('USD');
      expect(result[1].ttl).to.equal(200);
      expect(result[1].ad).to.not.be.undefined;
      expect(result[1].ex).to.equal('extraproperty');
    });

    it('should handle nobid responses', function () {
      var emptyResponse = [{
        nurl: '',
        cid: '9e5a09319e18f1',
        media: 'banner',
        error: 'No bids received for 9DgF',
        adm: '',
        id: '9DgF',
        cpm: 0.00
      }];

      var result = spec.interpretResponse({ body: emptyResponse }, {});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const syncOptions = {
      iframeEnabled: true
    };

    it('should produce sync url', function () {
      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://sync.rtk.io/cs');
    });

    it('should return empty, as we sync only once', function () {
      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs.length).to.equal(0);
    });

    it('should reset hasSynced flag, allowing another sync', function () {
      resetUserSync();

      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs.length).to.equal(1);
    });

    it('should return empty when iframe disallowed', function () {
      resetUserSync();

      const noIframeOptions = { iframeEnabled: false };
      const syncs = spec.getUserSyncs(noIframeOptions);
      expect(syncs.length).to.equal(0);
    });

    it('should produce sync url with gdpr params', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA'
      };

      resetUserSync();

      const syncs = spec.getUserSyncs(syncOptions, null, gdprConsent);
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://sync.rtk.io/cs?g=1&c=BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
    });

    it('should produce sync url with ccpa params', function () {
      resetUserSync();

      const syncs = spec.getUserSyncs(syncOptions, null, {}, '1YYN');
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://sync.rtk.io/cs?us_privacy=1YYN');
    });
  });

  describe('reading window.top properties', function () {
    const bidCategories = ['bcat1', 'bcat2', 'bcat3'];
    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
        host: 'adzone.pub.com',
        categories: bidCategories
      },
      adUnitCode: 'RTK_aaaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      userId: { tdid: 'eff98622-b5fd-44fa-9a49-6e846922d532' }
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    const topWin = {
      innerWidth: 1366,
      innerHeight: 768,
      rtkcategories: ['cat1', 'cat2', 'cat3']
    };

    let sandbox;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should have window.top dimensions', function () {
      sandbox.stub(utils, 'getWindowTop').returns(topWin);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        expect(requestItem.data.w).to.equal(topWin.innerWidth);
        expect(requestItem.data.h).to.equal(topWin.innerHeight);
      });
    });

    it('should have window dimensions, as backup', function () {
      sandbox.stub(utils, 'getWindowTop').returns(undefined);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        expect(requestItem.data.w).to.equal(window.innerWidth);
        expect(requestItem.data.h).to.equal(window.innerHeight);
      });
    });

    it('should have window.top & bid categories', function () {
      sandbox.stub(utils, 'getWindowTop').returns(topWin);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      requests.forEach(function (requestItem) {
        utils._each(topWin.categories, function (cat) {
          expect(requestItem.data.categories).to.contain(cat);
        });
        utils._each(bidCategories, function (cat) {
          expect(requestItem.data.categories).to.contain(cat);
        });
      });
    });
  });

  describe('schain support', function() {
    const nodePropsOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
    let schainConfig = {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'rtk.io',
          sid: '1234',
          hp: 1,
          rid: 'bid-request-1',
          name: 'first pub',
          domain: 'first.com'
        },
        {
          asi: 'rtk.io',
          sid: '5678',
          hp: 1,
          rid: 'bid-request-2',
          name: 'second pub',
          domain: 'second.com'
        }
      ]
    };

    const bidRequests = [{
      bidder: 'aardvark',
      params: {
        ai: 'xiby',
        sc: 'TdAx',
      },
      adUnitCode: 'aaa',
      transactionId: '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      sizes: [300, 250],
      bidId: '1abgs362e0x48a8',
      bidderRequestId: '70deaff71c281d',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      schain: schainConfig,
    }];

    const bidderRequest = {
      gdprConsent: undefined,
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    it('should properly serialize schain object with correct delimiters', () => {
      const results = spec.buildRequests(bidRequests, bidderRequest);
      const numNodes = schainConfig.nodes.length;

      const schain = results[0].data.schain;

      // each node serialization should start with an !
      expect(schain.match(/!/g).length).to.equal(numNodes);

      // 5 commas per node plus 1 for version
      expect(schain.match(/,/g).length).to.equal(numNodes * 5 + 1);
    });

    it('should send the proper version for the schain', () => {
      const results = spec.buildRequests(bidRequests, bidderRequest);
      const schain = decodeURIComponent(results[0].data.schain).split('!');
      const version = schain.shift().split(',')[0];
      expect(version).to.equal(bidRequests[0].schain.ver);
    });

    it('should send the correct value for complete in schain', () => {
      const results = spec.buildRequests(bidRequests, bidderRequest);
      const schain = decodeURIComponent(results[0].data.schain).split('!');
      const complete = schain.shift().split(',')[1];
      expect(complete).to.equal(String(bidRequests[0].schain.complete));
    });

    it('should send available params in the right order', () => {
      const results = spec.buildRequests(bidRequests, bidderRequest);
      const schain = decodeURIComponent(results[0].data.schain).split('!');
      schain.shift();

      schain.forEach((serializeNode, nodeIndex) => {
        const nodeProps = serializeNode.split(',');
        nodeProps.forEach((nodeProp, propIndex) => {
          const node = schainConfig.nodes[nodeIndex];
          const key = nodePropsOrder[propIndex];
          expect(nodeProp).to.equal(node[key] ? String(node[key]) : '');
        });
      });
    });
  });
});
