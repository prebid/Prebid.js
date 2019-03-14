import {expect} from 'chai';
import {spec} from 'modules/mgidBidAdapter';
import * as utils from '../../../src/utils';
import * as urlUtils from '../../../src/url';

describe('Mgid bid adapter', function () {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });
  const ua = navigator.userAgent;
  const screenHeight = screen.height;
  const screenWidth = screen.width;
  const dnt = (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0;
  const language = navigator.language ? 'language' : 'userLanguage';
  let lang = navigator[language].split('-')[0];
  if (lang.length != 2 && lang.length != 3) {
    lang = '';
  }
  const secure = window.location.protocol === 'https:' ? 1 : 0;
  const mgid_ver = spec.VERSION;
  const prebid_ver = $$PREBID_GLOBAL$$.version;

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'mgid',
      'params': {
        'property': '10433394',
        'zone': 'zone'
      },
    };

    it('should not accept bid without required params', function () {
      let isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return false when params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '', placementId: ''};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes.banner are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes.banner.sizes are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        sizes: []
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes.banner.sizes are not valid', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        sizes: [300, 250]
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when valid params are passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('override defaults', function () {
    let bid = {
      bidder: 'mgid',
      params: {
        accountId: '1',
        placementId: '2',
      },
    };
    it('should return object', function () {
      let bid = Object.assign({}, bid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      let bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request).to.exist.and.to.be.a('object');
    });

    it('should return overwrite default bidurl', function () {
      let bid = Object.assign({}, bid);
      bid.params = {
        bidUrl: '//newbidurl.com/',
        accountId: '1',
        placementId: '2',
      };
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      let bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.include('//newbidurl.com/1');
    });
  });

  describe('buildRequests', function () {
    let abid = {
      bidder: 'mgid',
      params: {
        accountId: '1',
        placementId: '2',
      },
    };
    it('should return proper imp', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      let bidRequests = [bid];
      const referer = utils.deepAccess(bidRequests, 'refererInfo.referer');
      const domain = urlUtils.parse(referer).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request.url).deep.equal('//dsp.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2');
      expect(data.imp[0].banner).to.deep.equal({w: 300, h: 250, format: []});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': '//dsp.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\"},\"cur\":[\"USD\"],\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"user\":{},\"regs\":{},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2\",\"banner\":{\"w\":300,\"h\":250,\"format\":[]},\"secure\":' + secure + '}]}',
      });
    });
    it('should return proper request', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 600], [300, 250]],
        }
      };
      let bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);

      const referer = utils.deepAccess(bidRequests, 'refererInfo.referer');
      const domain = urlUtils.parse(referer).hostname;
      expect(request.url).deep.equal('//dsp.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2');
      expect(data.imp[0].banner).to.deep.equal({w: 300, h: 600, format: [{w: 300, h: 600}, {w: 300, h: 250}]});
      expect(data.imp[0].secure).to.deep.equal(secure);

      expect(request).to.deep.equal({
        'method': 'POST',
        'url': '//dsp.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\"},\"cur\":[\"USD\"],\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"user\":{},\"regs\":{},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2\",\"banner\":{\"w\":300,\"h\":600,\"format\":[{\"w\":300,\"h\":600},{\"w\":300,\"h\":250}]},\"secure\":' + secure + '}]}',
      });
    });
  });
  describe('interpretResponse', function () {
    it('should not push bid response', function () {
      let bids = spec.interpretResponse();
      expect(bids).to.deep.equal([]);
    });
    it('should push proper bid response', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'USD', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'http: nurl', 'burl': 'http: nurl', 'adm': 'html: adm', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2']}], 'seat': '44082'}]}
      };
      let bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([
        {
          'ad': 'html: adm',
          'cpm': 1.5,
          'creativeId': '2898532/2419121/2592854/2499195',
          'currency': 'USD',
          'dealId': '',
          'height': 600,
          'isBurl': true,
          'mediaType': 'banner',
          'netRevenue': true,
          'nurl': 'http: nurl',
          'requestId': '61e40632c53fc2',
          'ttl': 300,
          'width': 300,
        }
      ]);
    });
  });
});
