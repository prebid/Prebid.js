import {expect} from 'chai';
import {spec} from 'modules/conversantBidAdapter';
import * as utils from 'src/utils';

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
      placementCode: 'pcode000',
      transactionId: 'tx000',
      sizes: [[300, 250]],
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
      placementCode: 'pcode002',
      transactionId: 'tx002',
      sizes: [[300, 600], [160, 600]],
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
        }
      },
      placementCode: 'pcode003',
      transactionId: 'tx003',
      sizes: [640, 480],
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
        site_id: siteId
      },
      mediaTypes: {
        video: {
          context: 'instream',
          mimes: ['video/mp4', 'video/x-flv']
        }
      },
      placementCode: 'pcode005',
      transactionId: 'tx005',
      bidId: 'bid005',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    }];

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
        }]
      }]
    },
    headers: {}};

  it('Verify basic properties', function() {
    expect(spec.code).to.equal('conversant');
    expect(spec.aliases).to.be.an('array').with.lengthOf(1);
    expect(spec.aliases[0]).to.equal('cnvr');
    expect(spec.supportedMediaTypes).to.be.an('array').with.lengthOf(2);
    expect(spec.supportedMediaTypes[1]).to.equal('video');
  });

  it('Verify isBidRequestValid', function() {
    expect(spec.isBidRequestValid({})).to.be.false;
    expect(spec.isBidRequestValid({params: {}})).to.be.false;
    expect(spec.isBidRequestValid({params: {site_id: '123'}})).to.be.true;
    expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
    expect(spec.isBidRequestValid(bidRequests[1])).to.be.true;
    expect(spec.isBidRequestValid(bidRequests[2])).to.be.true;
    expect(spec.isBidRequestValid(bidRequests[3])).to.be.true;
    expect(spec.isBidRequestValid(bidRequests[4])).to.be.true;
    expect(spec.isBidRequestValid(bidRequests[5])).to.be.true;

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

  it('Verify buildRequest', function() {
    const page = 'http://test.com?a=b&c=123';
    const bidderRequest = {
      refererInfo: {
        referer: page
      }
    };
    const request = spec.buildRequests(bidRequests, bidderRequest);
    expect(request.method).to.equal('POST');
    expect(request.url).to.equal('https://web.hb.ad.cpe.dotomi.com/s2s/header/24');
    const payload = request.data;

    expect(payload).to.have.property('id', 'req000');
    expect(payload).to.have.property('at', 1);
    expect(payload).to.have.property('imp');
    expect(payload.imp).to.be.an('array').with.lengthOf(6);

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

    expect(payload.imp[2]).to.have.property('id', 'bid002');
    expect(payload.imp[2]).to.have.property('secure', 1);
    expect(payload.imp[2]).to.have.property('bidfloor', 0);
    expect(payload.imp[2]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[2]).to.have.property('displaymanagerver').that.matches(versionPattern);
    expect(payload.imp[2]).to.have.property('banner');
    expect(payload.imp[2].banner).to.have.property('pos', 2);
    expect(payload.imp[2].banner).to.have.property('format');
    expect(payload.imp[2].banner.format).to.deep.equal([{w: 300, h: 600}, {w: 160, h: 600}]);

    expect(payload.imp[3]).to.have.property('id', 'bid003');
    expect(payload.imp[3]).to.have.property('secure', 1);
    expect(payload.imp[3]).to.have.property('bidfloor', 0);
    expect(payload.imp[3]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[3]).to.have.property('displaymanagerver').that.matches(versionPattern);
    expect(payload.imp[3]).to.not.have.property('tagid');
    expect(payload.imp[3]).to.have.property('video');
    expect(payload.imp[3].video).to.not.have.property('pos');
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
    expect(payload.imp[4].video.api).to.deep.equal([2, 3]);
    expect(payload.imp[4].video).to.have.property('maxduration', 30);
    expect(payload.imp[4]).to.not.have.property('banner');

    expect(payload.imp[5]).to.have.property('id', 'bid005');
    expect(payload.imp[5]).to.have.property('secure', 1);
    expect(payload.imp[5]).to.have.property('bidfloor', 0);
    expect(payload.imp[5]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[5]).to.have.property('displaymanagerver').that.matches(versionPattern);
    expect(payload.imp[5]).to.not.have.property('tagid');
    expect(payload.imp[5]).to.have.property('video');
    expect(payload.imp[5].video).to.not.have.property('pos');
    expect(payload.imp[5].video).to.not.have.property('w');
    expect(payload.imp[5].video).to.not.have.property('h');
    expect(payload.imp[5].video).to.have.property('mimes');
    expect(payload.imp[5].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
    expect(payload.imp[5].video).to.not.have.property('protocols');
    expect(payload.imp[5].video).to.not.have.property('api');
    expect(payload.imp[5].video).to.not.have.property('maxduration');
    expect(payload.imp[5]).to.not.have.property('banner');

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
  });

  it('Verify interpretResponse', function() {
    const request = spec.buildRequests(bidRequests);
    const response = spec.interpretResponse(bidResponses, request);
    expect(response).to.be.an('array').with.lengthOf(3);

    let bid = response[0];
    expect(bid).to.have.property('requestId', 'bid000');
    expect(bid).to.have.property('currency', 'USD');
    expect(bid).to.have.property('cpm', 0.99);
    expect(bid).to.have.property('creativeId', '1000');
    expect(bid).to.have.property('width', 300);
    expect(bid).to.have.property('height', 250);
    expect(bid).to.have.property('ad', 'markup000<img src="notify000" />');
    expect(bid).to.have.property('ttl', 300);
    expect(bid).to.have.property('netRevenue', true);

    // There is no bid001 because cpm is $0

    bid = response[1];
    expect(bid).to.have.property('requestId', 'bid002');
    expect(bid).to.have.property('currency', 'USD');
    expect(bid).to.have.property('cpm', 2.99);
    expect(bid).to.have.property('creativeId', '1002');
    expect(bid).to.have.property('width', 300);
    expect(bid).to.have.property('height', 600);
    expect(bid).to.have.property('ad', 'markup002<img src="notify002" />');
    expect(bid).to.have.property('ttl', 300);
    expect(bid).to.have.property('netRevenue', true);

    bid = response[2];
    expect(bid).to.have.property('requestId', 'bid003');
    expect(bid).to.have.property('currency', 'USD');
    expect(bid).to.have.property('cpm', 3.99);
    expect(bid).to.have.property('creativeId', '1003');
    expect(bid).to.have.property('width', 632);
    expect(bid).to.have.property('height', 499);
    expect(bid).to.have.property('vastUrl', 'markup003');
    expect(bid).to.have.property('mediaType', 'video');
    expect(bid).to.have.property('ttl', 300);
    expect(bid).to.have.property('netRevenue', true);
  });

  it('Verify handling of bad responses', function() {
    let response = spec.interpretResponse({}, {});
    expect(response).to.be.an('array').with.lengthOf(0);
    response = spec.interpretResponse({id: '123'}, {});
    expect(response).to.be.an('array').with.lengthOf(0);
    response = spec.interpretResponse({id: '123', seatbid: []}, {});
    expect(response).to.be.an('array').with.lengthOf(0);
  });

  it('Verify publisher commond id support', function() {
    // clone bidRequests
    let requests = utils.deepClone(bidRequests);

    // add pubcid to every entry
    requests.forEach((unit) => {
      Object.assign(unit, {crumbs: {pubcid: 12345}});
    });
    //  construct http post payload
    const payload = spec.buildRequests(requests).data;
    expect(payload).to.have.deep.nested.property('user.ext.fpc', 12345);
  });

  it('Verify User ID publisher commond id support', function() {
    // clone bidRequests
    let requests = utils.deepClone(bidRequests);

    // add pubcid to every entry
    requests.forEach((unit) => {
      Object.assign(unit, {userId: {pubcid: 67890}});
    });
    //  construct http post payload
    const payload = spec.buildRequests(requests).data;
    expect(payload).to.have.deep.nested.property('user.ext.fpc', 67890);
  });

  it('Verify GDPR bid request', function() {
    // add gdpr info
    const bidRequest = {
      gdprConsent: {
        consentString: 'BOJObISOJObISAABAAENAA4AAAAAoAAA',
        gdprApplies: true
      }
    };

    const payload = spec.buildRequests(bidRequests, bidRequest).data;
    expect(payload).to.have.deep.nested.property('user.ext.consent', 'BOJObISOJObISAABAAENAA4AAAAAoAAA');
    expect(payload).to.have.deep.nested.property('regs.ext.gdpr', 1);
  });

  it('Verify GDPR bid request without gdprApplies', function() {
    // add gdpr info
    const bidRequest = {
      gdprConsent: {
        consentString: ''
      }
    };

    const payload = spec.buildRequests(bidRequests, bidRequest).data;
    expect(payload).to.have.deep.nested.property('user.ext.consent', '');
    expect(payload).to.not.have.deep.nested.property('regs.ext.gdpr');
  });
});
