import {assert, expect} from 'chai';
import {spec} from 'modules/mgidBidAdapter';
import * as utils from '../../../src/utils';
import * as urlUtils from '../../../src/url';

describe('Mgid bid adapter', function () {
  let sandbox;
  let logErrorSpy;
  let logWarnSpy;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
  });

  afterEach(function () {
    sandbox.restore();
    utils.logError.restore();
    utils.logWarn.restore();
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
    it('should return overwrite default bidFloor', function () {
      let bid = Object.assign({}, bid);
      bid.params = {
        bidFloor: 1.1,
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
      expect(request.data).to.be.a('string');
      const data = JSON.parse(request.data);
      expect(data).to.be.a('object');
      expect(data.imp).to.be.a('array');
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].bidFloor).to.deep.equal(1.1);
    });
    it('should return overwrite default currency', function () {
      let bid = Object.assign({}, bid);
      bid.params = {
        cur: 'GBP',
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
      expect(request.data).to.be.a('string');
      const data = JSON.parse(request.data);
      expect(data).to.be.a('object');
      expect(data.cur).to.deep.equal(['GBP']);
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
    it('should return proper banner imp', function () {
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
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
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
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\"},\"cur\":[\"USD\"],\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"user\":{},\"regs\":{},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2\",\"secure\":' + secure + ',\"banner\":{\"w\":300,\"h\":250,\"format\":[]}}]}',
      });
    });
    it('should not return native imp if minimum asset list not requested', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {sizes: [80, 80]},
      };
      let bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request).to.be.undefined;
    });
    it('should return proper native imp', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {sizes: [80, 80]},
        sponsored: { },
      };

      let bidRequests = [bid];
      const referer = utils.deepAccess(bidRequests, 'refererInfo.referer');
      const domain = urlUtils.parse(referer).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request).to.be.a('object');
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
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
      expect(data.imp[0].native).is.a('object').and.to.deep.equal({'request': {'assets': [{'id': 1, 'required': 1, 'title': {'len': 80}}, {'id': 2, 'img': {'h': 80, 'type': 3, 'w': 80}, 'required': 0}, {'data': {'type': 1}, 'id': 11, 'required': 0}], 'plcmtcnt': 1}});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\"},\"cur\":[\"USD\"],\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"user\":{},\"regs\":{},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2\",\"secure\":' + secure + ',\"native\":{\"request\":{\"plcmtcnt\":1,\"assets\":[{\"id\":1,\"required\":1,\"title\":{\"len\":80}},{\"id\":2,\"required\":0,\"img\":{\"type\":3,\"w\":80,\"h\":80}},{\"id\":11,\"required\":0,\"data\":{\"type\":1}}]}}}]}',
      });
    });
    it('should return proper banner request', function () {
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
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
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
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\"},\"cur\":[\"USD\"],\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"user\":{},\"regs\":{},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2\",\"secure\":' + secure + ',\"banner\":{\"w\":300,\"h\":600,\"format\":[{\"w\":300,\"h\":600},{\"w\":300,\"h\":250}]}}]}',
      });
    });
  });
  describe('interpretResponse banner', function () {
    it('should not push bid response', function () {
      let bids = spec.interpretResponse();
      expect(bids).to.be.undefined;
    });
    it('should push proper banner bid response', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'USD', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'http: nurl', 'burl': 'http: burl', 'adm': 'html: adm', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2']}], 'seat': '44082'}]}
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
          'burl': 'http: burl',
          'requestId': '61e40632c53fc2',
          'ttl': 300,
          'width': 300,
        }
      ]);
    });
  });
  describe('interpretResponse native', function () {
    it('should push proper native bid response', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'http: nurl', 'burl': 'http: burl', 'adm': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"link_url\"},\"assets\":[{\"id\":1,\"required\":0,\"title\":{\"text\":\"title1\"}},{\"id\":2,\"required\":0,\"img\":{\"w\":80,\"h\":80,\"type\":3,\"url\":\"image_src\"}},{\"id\":3,\"required\":0,\"img\":{\"w\":50,\"h\":50,\"type\":1,\"url\":\"icon_src\"}}],\"imptrackers\":[\"imptrackers1\"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}}], 'seat': '44082'}]}
      };
      let bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([
        {
          'ad': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"link_url\"},\"assets\":[{\"id\":1,\"required\":0,\"title\":{\"text\":\"title1\"}},{\"id\":2,\"required\":0,\"img\":{\"w\":80,\"h\":80,\"type\":3,\"url\":\"image_src\"}},{\"id\":3,\"required\":0,\"img\":{\"w\":50,\"h\":50,\"type\":1,\"url\":\"icon_src\"}}],\"imptrackers\":[\"imptrackers1\"]}}',
          'cpm': 1.5,
          'creativeId': '2898532/2419121/2592854/2499195',
          'currency': 'GBP',
          'dealId': '',
          'height': 0,
          'isBurl': true,
          'mediaType': 'native',
          'netRevenue': true,
          'nurl': 'http: nurl',
          'burl': 'http: burl',
          'requestId': '61e40632c53fc2',
          'ttl': 300,
          'width': 0,
          'native': {
            clickTrackers: [],
            title: 'title1',
            image: {
              url: 'image_src',
              width: 80,
              height: 80,
            },
            icon: {
              url: 'icon_src',
              width: 50,
              height: 50,
            },
            impressionTrackers: ['imptrackers1'],
            jstracker: [],
            clickUrl: 'link_url',
          }
        }
      ]);
    });
  });
});
