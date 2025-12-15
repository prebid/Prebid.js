import {expect} from 'chai';
import {spec} from 'modules/conversantBidAdapter.js';
import * as utils from 'src/utils.js';
import {deepAccess} from 'src/utils';
// load modules that register ORTB processors
import 'src/prebid.js'
import 'modules/currency.js';
import 'modules/userId/index.js'; // handles eids
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import {hook} from '../../../src/hook.js'
import {BANNER} from '../../../src/mediaTypes.js';

describe('Conversant adapter tests', function() {
  const siteId = '108060';
  const versionPattern = /^\d+\.\d+\.\d+(.)*$/;
  const bidRequests = [
    // banner with single size
    {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        position: 1,
        tag_id: 'tagid-1',
        bidfloor: 0.5
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        }
      },
      placementCode: 'pcode000',
      transactionId: 'tx000',
      bidId: 'bid000',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    },

    // banner with sizes in mediaTypes.banner.sizes
    {
      bidder: 'conversant',
      params: {
        site_id: siteId
      },
      mediaTypes: {
        banner: {
          sizes: [[728, 90], [468, 60]]
        }
      },
      placementCode: 'pcode001',
      transactionId: 'tx001',
      bidId: 'bid001',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    },
    // banner with tag id and position
    {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        position: 2,
        tag_id: ''
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 600], [160, 600]],
        }
      },
      placementCode: 'pcode002',
      transactionId: 'tx002',
      bidId: 'bid002',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    },
    // video with single size
    {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        api: [2],
        protocols: [1, 2],
        mimes: ['video/mp4', 'video/x-flv'],
        maxduration: 30
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [632, 499],
          pos: 3
        }
      },
      placementCode: 'pcode003',
      transactionId: 'tx003',
      bidId: 'bid003',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    },
    // video with playerSize
    {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        maxduration: 30,
        api: [2, 3]
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [1024, 768],
          api: [1, 2],
          protocols: [1, 2, 3],
          mimes: ['video/mp4', 'video/x-flv']
        }
      },
      placementCode: 'pcode004',
      transactionId: 'tx004',
      bidId: 'bid004',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    },
    // video without sizes
    {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        position: 2,
      },
      mediaTypes: {
        video: {
          context: 'instream',
          mimes: ['video/mp4', 'video/x-flv'],
          pos: 7,
        }
      },
      placementCode: 'pcode005',
      transactionId: 'tx005',
      bidId: 'bid005',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    },
    // banner with first party data
    {
      bidder: 'conversant',
      params: {
        site_id: siteId
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 600], [160, 600]],
        }
      },
      ortb2Imp: {
        instl: 1,
        ext: {
          data: {
            pbadslot: 'homepage-top-rect'
          }
        }
      },
      placementCode: 'pcode006',
      transactionId: 'tx006',
      bidId: 'bid006',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    }
  ];

  const bidResponses = {
    body: {
      id: 'req000',
      seatbid: [{
        bid: [{
          nurl: 'notify000',
          adm: 'markup000',
          crid: '1000',
          impid: 'bid000',
          price: 0.99,
          w: 300,
          h: 250,
          adomain: ['https://example.com'],
          id: 'bid000'
        }, {
          impid: 'bid001',
          price: 0.00000,
          id: 'bid001'
        }, {
          nurl: 'notify002',
          adm: 'markup002',
          crid: '1002',
          impid: 'bid002',
          price: 2.99,
          w: 300,
          h: 600,
          adomain: ['https://example.com'],
          id: 'bid002'
        }, {
          nurl: 'notify003',
          adm: 'markup003',
          crid: '1003',
          impid: 'bid003',
          price: 3.99,
          adomain: ['https://example.com'],
          id: 'bid003'
        }, {
          nurl: 'notify004',
          adm: '<?xml><VAST></VAST>',
          crid: '1004',
          impid: 'bid004',
          price: 4.99,
          adomain: ['https://example.com'],
          id: 'bid004'
        }]
      }]
    },
    headers: {}
  };

  before(() => {
    // ortbConverter depends on other modules to be setup to work as expected so run hook.ready to register some
    // submodules so functions like setOrtbSourceExtSchain and setOrtbUserExtEids are available
    hook.ready();
  });

  it('Verify basic properties', function() {
    expect(spec.code).to.equal('conversant');
    expect(spec.aliases).to.be.an('array').with.lengthOf(2);
    expect(spec.aliases[0]).to.equal('cnvr');
    expect(spec.aliases[1]).to.equal('epsilon');
    expect(spec.supportedMediaTypes).to.be.an('array').with.lengthOf(3);
    expect(spec.supportedMediaTypes[1]).to.equal('video');
  });

  it('Verify isBidRequestValid', function() {
    expect(spec.isBidRequestValid({})).to.be.false;
    expect(spec.isBidRequestValid({params: {}})).to.be.false;
    expect(spec.isBidRequestValid({params: {site_id: '123'}})).to.be.true;
    bidRequests.forEach((bid) => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    const simpleVideo = JSON.parse(JSON.stringify(bidRequests[3]));
    simpleVideo.params.site_id = 123;
    expect(spec.isBidRequestValid(simpleVideo)).to.be.false;
    simpleVideo.params.site_id = siteId;
    simpleVideo.params.mimes = [1, 2, 3];
    expect(spec.isBidRequestValid(simpleVideo)).to.be.false;
    simpleVideo.params.mimes = 'bad type';
    expect(spec.isBidRequestValid(simpleVideo)).to.be.false;
    delete simpleVideo.params.mimes;
    expect(spec.isBidRequestValid(simpleVideo)).to.be.true;
  });

  describe('Verify buildRequest', function() {
    let page, bidderRequest, request, payload;
    before(() => {
      page = 'http://test.com?a=b&c=123';
      // ortbConverter uses the site/device information from the ortb2 object passed in the bidderRequest object
      bidderRequest = {
        refererInfo: {
          page: page
        },
        ortb2: {
          source: {
            tid: 'tid000'
          },
          site: {
            mobile: 0,
            page: page,
          },
          device: {
            w: screen.width,
            h: screen.height,
            dnt: 0,
            ua: navigator.userAgent
          }
        }
      };
      request = spec.buildRequests(bidRequests, bidderRequest);
      payload = request.data;
    });

    it('Verify common elements', function() {
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://web.hb.ad.cpe.dotomi.com/cvx/client/hb/ortb/25');

      expect(payload).to.have.property('id');
      expect(payload.source).to.have.property('tid', 'tid000');
      expect(payload).to.have.property('at', 1);
      expect(payload).to.have.property('imp');
      expect(payload.imp).to.be.an('array').with.lengthOf(bidRequests.length);

      expect(payload).to.have.property('site');
      expect(payload.site).to.have.property('id', siteId);
      expect(payload.site).to.have.property('mobile').that.is.oneOf([0, 1]);

      expect(payload.site).to.have.property('page', page);

      expect(payload).to.have.property('device');
      expect(payload.device).to.have.property('w', screen.width);
      expect(payload.device).to.have.property('h', screen.height);
      expect(payload.device).to.have.property('dnt').that.is.oneOf([0, 1]);
      expect(payload.device).to.have.property('ua', navigator.userAgent);

      expect(payload).to.not.have.property('user'); // there should be no user by default
      expect(payload).to.not.have.property('tmax'); // there should be no user by default
    });

    it('Simple banner', () => {
      expect(payload.imp[0]).to.have.property('id', 'bid000');
      expect(payload.imp[0]).to.have.property('secure', 1);
      expect(payload.imp[0]).to.have.property('bidfloor', 0.5);
      expect(payload.imp[0]).to.have.property('displaymanager', 'Prebid.js');
      expect(payload.imp[0]).to.have.property('displaymanagerver').that.matches(versionPattern);
      expect(payload.imp[0]).to.have.property('tagid', 'tagid-1');
      expect(payload.imp[0]).to.have.property('banner');
      expect(payload.imp[0].banner).to.have.property('pos', 1);
      expect(payload.imp[0].banner).to.have.property('format');
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}]);
      expect(payload.imp[0]).to.not.have.property('video');
    });

    it('Banner multiple sizes', () => {
      expect(payload.imp[1]).to.have.property('id', 'bid001');
      expect(payload.imp[1]).to.have.property('secure', 1);
      expect(payload.imp[1]).to.have.property('bidfloor', 0);
      expect(payload.imp[1]).to.have.property('displaymanager', 'Prebid.js');
      expect(payload.imp[1]).to.have.property('displaymanagerver').that.matches(versionPattern);
      expect(payload.imp[1]).to.not.have.property('tagid');
      expect(payload.imp[1]).to.have.property('banner');
      expect(payload.imp[1].banner).to.not.have.property('pos');
      expect(payload.imp[1].banner).to.have.property('format');
      expect(payload.imp[1].banner.format).to.deep.equal([{w: 728, h: 90}, {w: 468, h: 60}]);
    });

    it('Banner with tagid and position', () => {
      expect(payload.imp[2]).to.have.property('id', 'bid002');
      expect(payload.imp[2]).to.have.property('secure', 1);
      expect(payload.imp[2]).to.have.property('bidfloor', 0);
      expect(payload.imp[2]).to.have.property('displaymanager', 'Prebid.js');
      expect(payload.imp[2]).to.have.property('displaymanagerver').that.matches(versionPattern);
      expect(payload.imp[2]).to.have.property('banner');
      expect(payload.imp[2].banner).to.have.property('pos', 2);
      expect(payload.imp[2].banner).to.have.property('format');
      expect(payload.imp[2].banner.format).to.deep.equal([{w: 300, h: 600}, {w: 160, h: 600}]);
    });

    if (FEATURES.VIDEO) {
      it('Simple video', () => {
        expect(payload.imp[3]).to.have.property('id', 'bid003');
        expect(payload.imp[3]).to.have.property('secure', 1);
        expect(payload.imp[3]).to.have.property('bidfloor', 0);
        expect(payload.imp[3]).to.have.property('displaymanager', 'Prebid.js');
        expect(payload.imp[3]).to.have.property('displaymanagerver').that.matches(versionPattern);
        expect(payload.imp[3]).to.not.have.property('tagid');
        expect(payload.imp[3]).to.have.property('video');
        expect(payload.imp[3].video).to.have.property('pos', 3);
        expect(payload.imp[3].video).to.have.property('w', 632);
        expect(payload.imp[3].video).to.have.property('h', 499);
        expect(payload.imp[3].video).to.have.property('mimes');
        expect(payload.imp[3].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
        expect(payload.imp[3].video).to.have.property('protocols');
        expect(payload.imp[3].video.protocols).to.deep.equal([1, 2]);
        expect(payload.imp[3].video).to.have.property('api');
        expect(payload.imp[3].video.api).to.deep.equal([2]);
        expect(payload.imp[3].video).to.have.property('maxduration', 30);
        expect(payload.imp[3]).to.not.have.property('banner');
      });

      it('Video with playerSize', () => {
        expect(payload.imp[4]).to.have.property('id', 'bid004');
        expect(payload.imp[4]).to.have.property('secure', 1);
        expect(payload.imp[4]).to.have.property('bidfloor', 0);
        expect(payload.imp[4]).to.have.property('displaymanager', 'Prebid.js');
        expect(payload.imp[4]).to.have.property('displaymanagerver').that.matches(versionPattern);
        expect(payload.imp[4]).to.not.have.property('tagid');
        expect(payload.imp[4]).to.have.property('video');
        expect(payload.imp[4].video).to.not.have.property('pos');
        expect(payload.imp[4].video).to.have.property('w', 1024);
        expect(payload.imp[4].video).to.have.property('h', 768);
        expect(payload.imp[4].video).to.have.property('mimes');
        expect(payload.imp[4].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
        expect(payload.imp[4].video).to.have.property('protocols');
        expect(payload.imp[4].video.protocols).to.deep.equal([1, 2, 3]);
        expect(payload.imp[4].video).to.have.property('api');
        expect(payload.imp[4].video.api).to.deep.equal([1, 2, 3]);
        expect(payload.imp[4].video).to.have.property('maxduration', 30);
      });

      it('Video without sizes', () => {
        expect(payload.imp[5]).to.have.property('id', 'bid005');
        expect(payload.imp[5]).to.have.property('secure', 1);
        expect(payload.imp[5]).to.have.property('bidfloor', 0);
        expect(payload.imp[5]).to.have.property('displaymanager', 'Prebid.js');
        expect(payload.imp[5]).to.have.property('displaymanagerver').that.matches(versionPattern);
        expect(payload.imp[5]).to.not.have.property('tagid');
        expect(payload.imp[5]).to.have.property('video');
        expect(payload.imp[5].video).to.have.property('pos', 2);
        expect(payload.imp[5].video).to.not.have.property('w');
        expect(payload.imp[5].video).to.not.have.property('h');
        expect(payload.imp[5].video).to.have.property('mimes');
        expect(payload.imp[5].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
        expect(payload.imp[5].video).to.not.have.property('protocols');
        expect(payload.imp[5].video).to.not.have.property('api');
        expect(payload.imp[5].video).to.not.have.property('maxduration');
        expect(payload.imp[5]).to.not.have.property('banner');
      });
    }

    it('With FPD', () => {
      expect(payload.imp[6]).to.have.property('id', 'bid006');
      expect(payload.imp[6]).to.have.property('banner');
      expect(payload.imp[6]).to.not.have.property('video');
      expect(payload.imp[6]).to.have.property('instl');
      expect(payload.imp[6]).to.have.property('ext');
      expect(payload.imp[6].ext).to.have.property('data');
      expect(payload.imp[6].ext.data).to.have.property('pbadslot');
    });
  });

  it('Verify timeout', () => {
    const bidderRequest = { timeout: 9999 };
    const request = spec.buildRequests(bidRequests, bidderRequest);
    const payload = request.data;
    expect(payload.tmax).equals(bidderRequest.timeout);
  });

  it('Verify first party data', () => {
    const bidderRequest = {
      refererInfo: {page: 'http://test.com?a=b&c=123'},
      ortb2: {site: {content: {series: 'MySeries', season: 'MySeason', episode: 3, title: 'MyTitle'}}}
    };
    const request = spec.buildRequests(bidRequests, bidderRequest);
    const payload = request.data;
    expect(payload.site).to.have.property('content');
    expect(payload.site.content).to.have.property('series');
    expect(payload.site.content).to.have.property('season');
    expect(payload.site.content).to.have.property('episode');
    expect(payload.site.content).to.have.property('title');
  });

  it('Verify currency', () => {
    const bidderRequest = { timeout: 9999, ortb2: {cur: ['EUR']} };
    const request = spec.buildRequests(bidRequests, bidderRequest);
    const payload = request.data;
    expect(payload.cur).deep.equal(['USD']);
  })

  it('Verify supply chain data', () => {
    const bidderRequest = {refererInfo: {page: 'http://test.com?a=b&c=123'}};
    const schain = {complete: 1, ver: '1.0', nodes: [{asi: 'bidderA.com', sid: '00001', hp: 1}]};

    // Add schain to bidderRequest
    bidderRequest.ortb2 = {
      source: {
        ext: {schain: schain}
      }
    };

    const bidsWithSchain = bidRequests.map((bid) => {
      return Object.assign({
        ortb2: {
          source: {
            ext: {schain: schain}
          }
        }
      }, bid);
    });
    const request = spec.buildRequests(bidsWithSchain, bidderRequest);
    const payload = request.data;
    expect(deepAccess(payload, 'source.ext.schain.nodes')).to.exist;
    expect(payload.source.ext.schain.nodes[0].asi).equals(schain.nodes[0].asi);
  });

  it('Verify override url', function() {
    const testUrl = 'https://someurl?name=value';
    const request = spec.buildRequests([{params: {white_label_url: testUrl}}], {});
    expect(request.url).to.equal(testUrl);
  });

  describe('Verify interpretResponse', function() {
    let bid, request, response;

    before(() => {
      request = spec.buildRequests(bidRequests, {});
      response = spec.interpretResponse(bidResponses, request).bids;
    });

    it('Banner', function() {
      expect(response).to.be.an('array').with.lengthOf(4);
      bid = response[0];
      expect(bid).to.have.property('requestId', 'bid000');
      expect(bid).to.have.property('cpm', 0.99);
      expect(bid).to.have.property('creativeId', '1000');
      expect(bid).to.have.property('width', 300);
      expect(bid).to.have.property('height', 250);
      expect(bid.meta.advertiserDomains).to.deep.equal(['https://example.com']);
      expect(bid).to.have.property('ad', '<div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="notify000"></div>markup000');
      expect(bid).to.have.property('ttl', 300);
      expect(bid).to.have.property('netRevenue', true);
    });

    // There is no bid001 because cpm is $0

    it('Banner multiple sizes', function() {
      bid = response[1];
      expect(bid).to.have.property('requestId', 'bid002');
      expect(bid).to.have.property('cpm', 2.99);
      expect(bid).to.have.property('creativeId', '1002');
      expect(bid).to.have.property('width', 300);
      expect(bid).to.have.property('height', 600);
      expect(bid).to.have.property('ad', '<div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="notify002"></div>markup002');
      expect(bid).to.have.property('ttl', 300);
      expect(bid).to.have.property('netRevenue', true);
    });

    if (FEATURES.VIDEO) {
      it('Video', function () {
        bid = response[2];
        expect(bid).to.have.property('requestId', 'bid003');
        expect(bid).to.have.property('cpm', 3.99);
        expect(bid).to.have.property('creativeId', '1003');
        expect(bid).to.have.property('playerWidth', 632);
        expect(bid).to.have.property('playerHeight', 499);
        expect(bid).to.have.property('vastUrl', 'notify003');
        expect(bid).to.have.property('vastXml', 'markup003');
        expect(bid).to.have.property('mediaType', 'video');
        expect(bid).to.have.property('ttl', 300);
        expect(bid).to.have.property('netRevenue', true);
      });

      it('Empty Video', function() {
        bid = response[3];
        expect(bid).to.have.property('vastXml', '<?xml><VAST></VAST>');
      });
    }
  });

  describe('Verify Native Ads', function () {
    let request, response;

    const nativeOrtbRequest = {
      ver: '1.2',
      assets: [
        { id: 1, required: 1, title: { len: 80 } }]
    };
    const nativeBidRequests = [{
      bidder: 'conversant',
      params: {
        site_id: 10806
      },
      adUnitCode: 'adunit',
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        native: {
          ...nativeOrtbRequest
        },
      },
      nativeOrtbRequest,
      bidId: '0',
      bidderRequestId: 'requestId',
    }];

    const nativeMarkup = JSON.stringify({
      native: {
        assets: [
          {id: 1, title: {text: 'TextValue!'}},
          {id: 5, data: {value: 'Epsilon'}},
        ],
        link: { url: 'https://www.epsilon.com/us', }, }
    });

    const nativeBidResponse = {
      body: {
        bidId: 'requestId',
        seatbid: [{
          bid: [{
            impid: '0',
            price: 0.25,
            mtype: 4,
            adm: nativeMarkup
          }]
        }],
        cur: 'USD'
      }
    };

    if (FEATURES.NATIVE) {
      it('Request', function () {
        request = spec.buildRequests(nativeBidRequests, {});
        const payload = request.data;
        const native = JSON.parse(payload.imp[0].native.request);
        expect(native).to.deep.equal(nativeBidRequests[0].nativeOrtbRequest);
      });
      it('Response', function () {
        response = spec.interpretResponse(nativeBidResponse, request);
        const result = response.bids[0];
        expect(result.ad).to.equal(nativeMarkup);
        expect(result.mediaType).to.equal(BANNER);
        expect(result.cpm).to.equal(nativeBidResponse.body.seatbid[0].bid[0].price);
      });
    }
  })

  describe('Extended ID', function() {
    it('Verify unifiedid and liveramp', function() {
      // clone bidRequests
      const requests = utils.deepClone(bidRequests);

      const eidArray = [{'source': 'pubcid.org', 'uids': [{'id': '112233', 'atype': 1}]}, {'source': 'liveramp.com', 'uids': [{'id': '334455', 'atype': 3}]}];

      //  construct http post payload
      const payload = spec.buildRequests(requests, {ortb2: {user: {ext: {eids: eidArray}}}}).data;
      expect(payload).to.have.deep.nested.property('user.ext.eids', [
        {source: 'pubcid.org', uids: [{id: '112233', atype: 1}]},
        {source: 'liveramp.com', uids: [{id: '334455', atype: 3}]}
      ]);
    });
  });

  describe('price floor module', function() {
    let bidRequest;
    beforeEach(function() {
      bidRequest = [utils.deepClone(bidRequests[0])];
      delete bidRequest[0].params.bidfloor;
    });

    it('obtain floor from getFloor', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 3.21
        };
      };

      const payload = spec.buildRequests(bidRequest, {}).data;
      expect(payload.imp[0]).to.have.property('bidfloor', 3.21);
    });

    it('obtain floor from params', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 3.21
        };
      };
      bidRequest[0].params.bidfloor = 0.6;

      const payload = spec.buildRequests(bidRequest, {}).data;
      expect(payload.imp[0]).to.have.property('bidfloor', 0.6);
    });

    it('unsupported currency', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'EUR',
          floor: 1.23
        };
      };

      const payload = spec.buildRequests(bidRequest, {}).data;
      expect(payload.imp[0]).to.have.property('bidfloor', 0);
    });

    it('bad floor value', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 'test'
        };
      };

      const payload = spec.buildRequests(bidRequest, {}).data;
      expect(payload.imp[0]).to.have.property('bidfloor', 0);
    });

    it('empty floor object', function() {
      bidRequest[0].getFloor = () => {
        return {};
      };

      const payload = spec.buildRequests(bidRequest, {}).data;
      expect(payload.imp[0]).to.have.property('bidfloor', 0);
    });

    it('undefined floor result', function() {
      bidRequest[0].getFloor = () => {};

      const payload = spec.buildRequests(bidRequest, {}).data;
      expect(payload.imp[0]).to.have.property('bidfloor', 0);
    });
  });

  describe('getUserSyncs', function() {
    const syncurl_iframe = 'https://sync.dotomi.com:8080/iframe';
    const syncurl_image = 'https://sync.dotomi.com:8080/pixel';
    const cnvrResponse = {ext: {psyncs: [syncurl_image], fsyncs: [syncurl_iframe]}};
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
    });
    afterEach(function() {
      sandbox.restore();
    });

    it('empty params', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [], undefined, undefined))
        .to.deep.equal([]);
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{body: {ext: {}}}], undefined, undefined))
        .to.deep.equal([]);
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{body: cnvrResponse}], undefined, undefined))
        .to.deep.equal([{ type: 'iframe', url: syncurl_iframe }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, [{body: cnvrResponse}], undefined, undefined))
        .to.deep.equal([{ type: 'image', url: syncurl_image }]);
      expect(spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [{body: cnvrResponse}], undefined, undefined))
        .to.deep.equal([{type: 'iframe', url: syncurl_iframe}, {type: 'image', url: syncurl_image}]);
    });

    it('URL building', function() {
      expect(spec.getUserSyncs({pixelEnabled: true}, [{body: {ext: {psyncs: [`${syncurl_image}?sid=1234`]}}}], undefined, undefined))
        .to.deep.equal([{type: 'image', url: `${syncurl_image}?sid=1234`}]);
      expect(spec.getUserSyncs({pixelEnabled: true}, [{body: {ext: {psyncs: [`${syncurl_image}?sid=1234`]}}}], undefined, '1NYN'))
        .to.deep.equal([{type: 'image', url: `${syncurl_image}?sid=1234&us_privacy=1NYN`}]);
    });

    it('GDPR', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{body: cnvrResponse}], {gdprApplies: true, consentString: 'consentstring'}, undefined))
        .to.deep.equal([{ type: 'iframe', url: `${syncurl_iframe}?gdpr=1&gdpr_consent=consentstring` }]);
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{body: cnvrResponse}], {gdprApplies: false, consentString: 'consentstring'}, undefined))
        .to.deep.equal([{ type: 'iframe', url: `${syncurl_iframe}?gdpr=0&gdpr_consent=consentstring` }]);
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{body: cnvrResponse}], {gdprApplies: true, consentString: undefined}, undefined))
        .to.deep.equal([{ type: 'iframe', url: `${syncurl_iframe}?gdpr=1&gdpr_consent=` }]);

      expect(spec.getUserSyncs({ pixelEnabled: true }, [{body: cnvrResponse}], {gdprApplies: true, consentString: 'consentstring'}, undefined))
        .to.deep.equal([{ type: 'image', url: `${syncurl_image}?gdpr=1&gdpr_consent=consentstring` }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, [{body: cnvrResponse}], {gdprApplies: false, consentString: 'consentstring'}, undefined))
        .to.deep.equal([{ type: 'image', url: `${syncurl_image}?gdpr=0&gdpr_consent=consentstring` }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, [{body: cnvrResponse}], {gdprApplies: true, consentString: undefined}, undefined))
        .to.deep.equal([{ type: 'image', url: `${syncurl_image}?gdpr=1&gdpr_consent=` }]);
    });

    it('US_Privacy', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{body: cnvrResponse}], undefined, '1NYN'))
        .to.deep.equal([{ type: 'iframe', url: `${syncurl_iframe}?us_privacy=1NYN` }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, [{body: cnvrResponse}], undefined, '1NYN'))
        .to.deep.equal([{ type: 'image', url: `${syncurl_image}?us_privacy=1NYN` }]);
    });
  });
});
