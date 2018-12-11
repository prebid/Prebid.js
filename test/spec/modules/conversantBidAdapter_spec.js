import {expect} from 'chai';
import {spec} from 'modules/conversantBidAdapter';
import * as utils from 'src/utils';

var Adapter = require('modules/conversantBidAdapter');

describe('Conversant adapter tests', function() {
  const siteId = '108060';

  const bidRequests = [
    {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        position: 1,
        tag_id: 'tagid-1',
        secure: false,
        bidfloor: 0.5
      },
      placementCode: 'pcode000',
      transactionId: 'tx000',
      sizes: [[300, 250]],
      bidId: 'bid000',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    }, {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        secure: false
      },
      placementCode: 'pcode001',
      transactionId: 'tx001',
      sizes: [[468, 60]],
      bidId: 'bid001',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    }, {
      bidder: 'conversant',
      params: {
        site_id: siteId,
        position: 2,
        tag_id: '',
        secure: false
      },
      placementCode: 'pcode002',
      transactionId: 'tx002',
      sizes: [[300, 600], [160, 600]],
      bidId: 'bid002',
      bidderRequestId: '117d765b87bed38',
      auctionId: 'req000'
    }, {
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
    const request = spec.buildRequests(bidRequests);
    expect(request.method).to.equal('POST');
    expect(request.url).to.equal('//web.hb.ad.cpe.dotomi.com/s2s/header/24');
    const payload = request.data;

    expect(payload).to.have.property('id', 'req000');
    expect(payload).to.have.property('at', 1);
    expect(payload).to.have.property('imp');
    expect(payload.imp).to.be.an('array').with.lengthOf(4);

    expect(payload.imp[0]).to.have.property('id', 'bid000');
    expect(payload.imp[0]).to.have.property('secure', 0);
    expect(payload.imp[0]).to.have.property('bidfloor', 0.5);
    expect(payload.imp[0]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[0]).to.have.property('displaymanagerver').that.matches(/^\d+\.\d+\.\d+$/);
    expect(payload.imp[0]).to.have.property('tagid', 'tagid-1');
    expect(payload.imp[0]).to.have.property('banner');
    expect(payload.imp[0].banner).to.have.property('pos', 1);
    expect(payload.imp[0].banner).to.have.property('format');
    expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}]);
    expect(payload.imp[0]).to.not.have.property('video');

    expect(payload.imp[1]).to.have.property('id', 'bid001');
    expect(payload.imp[1]).to.have.property('secure', 0);
    expect(payload.imp[1]).to.have.property('bidfloor', 0);
    expect(payload.imp[1]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[0]).to.have.property('displaymanagerver').that.matches(/^\d+\.\d+\.\d+$/);
    expect(payload.imp[1]).to.not.have.property('tagid');
    expect(payload.imp[1]).to.have.property('banner');
    expect(payload.imp[1].banner).to.not.have.property('pos');
    expect(payload.imp[1].banner).to.have.property('format');
    expect(payload.imp[1].banner.format).to.deep.equal([{w: 468, h: 60}]);

    expect(payload.imp[2]).to.have.property('id', 'bid002');
    expect(payload.imp[2]).to.have.property('secure', 0);
    expect(payload.imp[2]).to.have.property('bidfloor', 0);
    expect(payload.imp[2]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[0]).to.have.property('displaymanagerver').that.matches(/^\d+\.\d+\.\d+$/);
    expect(payload.imp[2]).to.have.property('banner');
    expect(payload.imp[2].banner).to.have.property('pos', 2);
    expect(payload.imp[2].banner).to.have.property('format');
    expect(payload.imp[2].banner.format).to.deep.equal([{w: 300, h: 600}, {w: 160, h: 600}]);

    expect(payload.imp[3]).to.have.property('id', 'bid003');
    expect(payload.imp[3]).to.have.property('secure', 0);
    expect(payload.imp[3]).to.have.property('bidfloor', 0);
    expect(payload.imp[3]).to.have.property('displaymanager', 'Prebid.js');
    expect(payload.imp[0]).to.have.property('displaymanagerver').that.matches(/^\d+\.\d+\.\d+$/);
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

    expect(payload).to.have.property('site');
    expect(payload.site).to.have.property('id', siteId);
    expect(payload.site).to.have.property('mobile').that.is.oneOf([0, 1]);
    const loc = utils.getTopWindowLocation();
    const page = loc.href;
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
    let requests = utils.deepClone(bidRequests)

    // add pubcid to every entry
    requests.forEach((unit) => {
      Object.assign(unit, {crumbs: {pubcid: 12345}});
    });
    //  construct http post payload
    const payload = spec.buildRequests(requests).data;
    expect(payload).to.have.deep.property('user.ext.fpc', 12345);
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
    expect(payload).to.have.deep.property('user.ext.consent', 'BOJObISOJObISAABAAENAA4AAAAAoAAA');
    expect(payload).to.have.deep.property('regs.ext.gdpr', 1);
  });

  it('Verify GDPR bid request without gdprApplies', function() {
    // add gdpr info
    const bidRequest = {
      gdprConsent: {
        consentString: ''
      }
    };

    const payload = spec.buildRequests(bidRequests, bidRequest).data;
    expect(payload).to.have.deep.property('user.ext.consent', '');
    expect(payload).to.not.have.deep.property('regs.ext.gdpr');
  });
})
