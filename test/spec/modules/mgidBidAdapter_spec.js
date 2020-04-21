import {assert, expect} from 'chai';
import {spec} from 'modules/mgidBidAdapter.js';
import * as utils from '../../../src/utils.js';

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
  const utcOffset = (new Date()).getTimezoneOffset().toString();

  describe('isBidRequestValid', function () {
    let bid = {
      'adUnitCode': 'div',
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

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.adUnitCode = '';
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {accountId: 2, placementId: 1};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when adUnitCode not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.adUnitCode = '';
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {accountId: 2, placementId: 1};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when valid params are passed as nums', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.adUnitCode = 'div';
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {accountId: 2, placementId: 1};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.mediaTypes = {
        native: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {accountId: '0', placementId: '00'};
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

    it('should return true when valid params are passed as strings', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.adUnitCode = 'div';
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when valid mediaTypes.native is not object', function () {
      let bid = Object.assign({}, bid);
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        native: []
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.native is empty object', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        native: {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.native is invalid object', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        native: {
          image: {
            sizes: [80, 80]
          },
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.native has unsupported required asset', function () {
      let bid = Object.assign({}, bid);
      bid.params = {accountId: '2', placementId: '1'};
      bid.mediaTypes = {
        native: {
          title: {required: true},
          image: {required: false, sizes: [80, 80]},
          sponsored: {required: false},
        },
      };
      bid.nativeParams = {
        title: {required: true},
        image: {required: false, sizes: [80, 80]},
        sponsored: {required: false},
        unsupported: {required: true},
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when mediaTypes.native all assets needed', function () {
      let bid = Object.assign({}, bid);
      bid.adUnitCode = 'div';
      bid.params = {accountId: '2', placementId: '1'};
      bid.mediaTypes = {
        native: {
          title: {required: true},
          image: {required: false, sizes: [80, 80]},
          sponsored: {required: false},
        },
      };
      bid.nativeParams = {
        title: {required: true},
        image: {required: false, sizes: [80, 80]},
        sponsored: {required: false},
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
        bidUrl: 'https://newbidurl.com/',
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
      expect(request.url).to.include('https://newbidurl.com/1');
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
      expect(data.imp[0].bidfloor).to.deep.equal(1.1);
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
    it('should return undefined if no validBidRequests passed', function () {
      expect(spec.buildRequests([])).to.be.undefined;
    });

    let abid = {
      adUnitCode: 'div',
      bidder: 'mgid',
      params: {
        accountId: '1',
        placementId: '2',
      },
    };
    it('should return proper request url', function () {
      localStorage.setItem('mgMuidn', 'xxx');
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      let bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1?muid=xxx');
      localStorage.removeItem('mgMuidn')
    });
    it('should proper handle gdpr', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      let bidRequests = [bid];
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'gdpr', gdprApplies: true}});
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.user).deep.equal({ext: {consent: 'gdpr'}});
      expect(data.regs).deep.equal({ext: {gdpr: 1}});
    });
    it('should return proper banner imp', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      let bidRequests = [bid];
      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].banner).to.deep.equal({w: 300, h: 250});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\",\"page\":\"' + page + '\"},\"cur\":[\"USD\"],\"geo\":{\"utcoffset\":' + utcOffset + '},\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2/div\",\"secure\":' + secure + ',\"banner\":{\"w\":300,\"h\":250}}]}',
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
      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request).to.be.a('object');
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].native).is.a('object').and.to.deep.equal({'request': {'assets': [{'id': 1, 'required': 1, 'title': {'len': 80}}, {'id': 2, 'img': {'h': 80, 'type': 3, 'w': 80}, 'required': 0}, {'data': {'type': 1}, 'id': 11, 'required': 0}], 'plcmtcnt': 1}});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\",\"page\":\"' + page + '\"},\"cur\":[\"USD\"],\"geo\":{\"utcoffset\":' + utcOffset + '},\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2/div\",\"secure\":' + secure + ',\"native\":{\"request\":{\"plcmtcnt\":1,\"assets\":[{\"id\":1,\"required\":1,\"title\":{\"len\":80}},{\"id\":2,\"required\":0,\"img\":{\"type\":3,\"w\":80,\"h\":80}},{\"id\":11,\"required\":0,\"data\":{\"type\":1}}]}}}]}',
      });
    });
    it('should return proper native imp', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {wmin: 50, hmin: 50, required: true},
        icon: {},
        sponsored: { },
      };

      let bidRequests = [bid];
      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request).to.be.a('object');
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].native).is.a('object').and.to.deep.equal({'request': {'assets': [{'id': 1, 'required': 1, 'title': {'len': 80}}, {'id': 2, 'img': {'h': 328, hmin: 50, 'type': 3, 'w': 492, wmin: 50}, 'required': 1}, {'id': 3, 'img': {'h': 50, 'type': 1, 'w': 50}, 'required': 0}, {'data': {'type': 1}, 'id': 11, 'required': 0}], 'plcmtcnt': 1}});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\",\"page\":\"' + page + '\"},\"cur\":[\"USD\"],\"geo\":{\"utcoffset\":' + utcOffset + '},\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2/div\",\"secure\":' + secure + ',\"native\":{\"request\":{\"plcmtcnt\":1,\"assets\":[{\"id\":1,\"required\":1,\"title\":{\"len\":80}},{\"id\":2,\"required\":1,\"img\":{\"type\":3,\"w\":492,\"h\":328,\"wmin\":50,\"hmin\":50}},{\"id\":3,\"required\":0,\"img\":{\"type\":1,\"w\":50,\"h\":50}},{\"id\":11,\"required\":0,\"data\":{\"type\":1}}]}}}]}',
      });
    });
    it('should return proper native imp with sponsoredBy', function () {
      let bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {sizes: [80, 80]},
        sponsoredBy: { },
      };

      let bidRequests = [bid];
      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request).to.be.a('object');
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].native).is.a('object').and.to.deep.equal({'request': {'assets': [{'id': 1, 'required': 1, 'title': {'len': 80}}, {'id': 2, 'img': {'h': 80, 'type': 3, 'w': 80}, 'required': 0}, {'data': {'type': 1}, 'id': 4, 'required': 0}], 'plcmtcnt': 1}});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\",\"page\":\"' + page + '\"},\"cur\":[\"USD\"],\"geo\":{\"utcoffset\":' + utcOffset + '},\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2/div\",\"secure\":' + secure + ',\"native\":{\"request\":{\"plcmtcnt\":1,\"assets\":[{\"id\":1,\"required\":1,\"title\":{\"len\":80}},{\"id\":2,\"required\":0,\"img\":{\"type\":3,\"w\":80,\"h\":80}},{\"id\":4,\"required\":0,\"data\":{\"type\":1}}]}}}]}',
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

      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(ua);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].banner).to.deep.equal({w: 300, h: 600, format: [{w: 300, h: 600}, {w: 300, h: 250}]});
      expect(data.imp[0].secure).to.deep.equal(secure);

      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': '{\"site\":{\"domain\":\"' + domain + '\",\"page\":\"' + page + '\"},\"cur\":[\"USD\"],\"geo\":{\"utcoffset\":' + utcOffset + '},\"device\":{\"ua\":\"' + ua + '\",\"js\":1,\"dnt\":' + dnt + ',\"h\":' + screenHeight + ',\"w\":' + screenWidth + ',\"language\":\"' + lang + '\"},\"ext\":{\"mgid_ver\":\"' + mgid_ver + '\",\"prebid_ver\":\"' + prebid_ver + '\"},\"imp\":[{\"tagid\":\"2/div\",\"secure\":' + secure + ',\"banner\":{\"w\":300,\"h\":600,\"format\":[{\"w\":300,\"h\":600},{\"w\":300,\"h\":250}]}}]}',
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
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': '', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': 'html: adm', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2']}], 'seat': '44082'}]}
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
          'nurl': 'https nurl',
          'burl': 'https burl',
          'requestId': '61e40632c53fc2',
          'ttl': 300,
          'width': 300,
        }
      ]);
    });
  });
  describe('interpretResponse native', function () {
    it('should not push proper native bid response if adm is missing', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}}], 'seat': '44082'}]}
      };
      let bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([])
    });
    it('should not push proper native bid response if assets is empty', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"link_url\"},\"assets\":[],\"imptrackers\":[\"imptrackers1\"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}}], 'seat': '44082'}]}
      };
      let bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([])
    });
    it('should push proper native bid response', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"link_url\"},\"assets\":[{\"id\":1,\"required\":0,\"title\":{\"text\":\"title1\"}},{\"id\":2,\"required\":0,\"img\":{\"w\":80,\"h\":80,\"type\":3,\"url\":\"image_src\"}},{\"id\":3,\"required\":0,\"img\":{\"w\":50,\"h\":50,\"type\":1,\"url\":\"icon_src\"}},{\"id\":4,\"required\":0,\"data\":{\"type\":4,\"value\":\"sponsored\"}},{\"id\":5,\"required\":0,\"data\":{\"type\":6,\"value\":\"price1\"}},{\"id\":6,\"required\":0,\"data\":{\"type\":7,\"value\":\"price2\"}}],\"imptrackers\":[\"imptrackers1\"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}}], 'seat': '44082'}], ext: {'muidn': 'userid'}}
      };
      let bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([{
        'ad': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"link_url\"},\"assets\":[{\"id\":1,\"required\":0,\"title\":{\"text\":\"title1\"}},{\"id\":2,\"required\":0,\"img\":{\"w\":80,\"h\":80,\"type\":3,\"url\":\"image_src\"}},{\"id\":3,\"required\":0,\"img\":{\"w\":50,\"h\":50,\"type\":1,\"url\":\"icon_src\"}},{\"id\":4,\"required\":0,\"data\":{\"type\":4,\"value\":\"sponsored\"}},{\"id\":5,\"required\":0,\"data\":{\"type\":6,\"value\":\"price1\"}},{\"id\":6,\"required\":0,\"data\":{\"type\":7,\"value\":\"price2\"}}],\"imptrackers\":[\"imptrackers1\"]}}',
        'burl': 'https burl',
        'cpm': 1.5,
        'creativeId': '2898532/2419121/2592854/2499195',
        'currency': 'GBP',
        'dealId': '',
        'height': 0,
        'isBurl': true,
        'mediaType': 'native',
        'native': {
          'clickTrackers': [],
          'clickUrl': 'link_url',
          'data': 'price1',
          'icon': {
            'height': 50,
            'url': 'icon_src',
            'width': 50
          },
          'image': {
            'height': 80,
            'url': 'image_src',
            'width': 80
          },
          'impressionTrackers': [
            'imptrackers1'
          ],
          'jstracker': [],
          'sponsoredBy': 'sponsored',
          'title': 'title1'
        },
        'netRevenue': true,
        'nurl': 'https nurl',
        'requestId': '61e40632c53fc2',
        'ttl': 300,
        'width': 0
      }])
    });
    it('should push proper native bid response', function () {
      let resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"link_url\"},\"assets\":[{\"id\":1,\"required\":0,\"title\":{\"text\":\"title1\"}},{\"id\":2,\"required\":0,\"img\":{\"w\":80,\"h\":80,\"type\":3,\"url\":\"image_src\"}},{\"id\":3,\"required\":0,\"img\":{\"w\":50,\"h\":50,\"type\":1,\"url\":\"icon_src\"}}],\"imptrackers\":[\"imptrackers1\"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}}], 'seat': '44082'}]}
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
          'nurl': 'https nurl',
          'burl': 'https burl',
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

  describe('getUserSyncs', function () {
    it('should do nothing on getUserSyncs', function () {
      spec.getUserSyncs()
    });
  });
  describe('on bidWon', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('should replace nurl and burl for native', function () {
      const burl = 'burl&s=${' + 'AUCTION_PRICE}';
      const nurl = 'nurl&s=${' + 'AUCTION_PRICE}';
      const bid = {'bidderCode': 'mgid', 'width': 0, 'height': 0, 'statusMessage': 'Bid available', 'adId': '3d0b6ff1dda89', 'requestId': '2a423489e058a1', 'mediaType': 'native', 'source': 'client', 'ad': '{\"native\":{\"ver\":\"1.1\",\"link\":{\"url\":\"LinkURL\"},\"assets\":[{\"id\":1,\"required\":0,\"title\":{\"text\":\"TITLE\"}},{\"id\":2,\"required\":0,\"img\":{\"w\":80,\"h\":80,\"type\":3,\"url\":\"ImageURL\"}},{\"id\":3,\"required\":0,\"img\":{\"w\":50,\"h\":50,\"type\":1,\"url\":\"IconURL\"}},{\"id\":11,\"required\":0,\"data\":{\"type\":1,\"value\":\"sponsored\"}}],\"imptrackers\":[\"ImpTrackerURL\"]}}', 'cpm': 0.66, 'creativeId': '353538_591471', 'currency': 'USD', 'dealId': '', 'netRevenue': true, 'ttl': 300, 'nurl': nurl, 'burl': burl, 'isBurl': true, 'native': {'title': 'TITLE', 'image': {'url': 'ImageURL', 'height': 80, 'width': 80}, 'icon': {'url': 'IconURL', 'height': 50, 'width': 50}, 'sponsored': 'sponsored', 'clickUrl': 'LinkURL', 'clickTrackers': [], 'impressionTrackers': ['ImpTrackerURL'], 'jstracker': []}, 'auctionId': 'a92bffce-14d2-4f8f-a78a-7b9b5e4d28fa', 'responseTimestamp': 1556867386065, 'requestTimestamp': 1556867385916, 'bidder': 'mgid', 'adUnitCode': 'div-gpt-ad-1555415275793-0', 'timeToRespond': 149, 'pbLg': '0.50', 'pbMg': '0.60', 'pbHg': '0.66', 'pbAg': '0.65', 'pbDg': '0.66', 'pbCg': '', 'size': '0x0', 'adserverTargeting': {'hb_bidder': 'mgid', 'hb_adid': '3d0b6ff1dda89', 'hb_pb': '0.66', 'hb_size': '0x0', 'hb_source': 'client', 'hb_format': 'native', 'hb_native_title': 'TITLE', 'hb_native_image': 'hb_native_image:3d0b6ff1dda89', 'hb_native_icon': 'IconURL', 'hb_native_linkurl': 'hb_native_linkurl:3d0b6ff1dda89'}, 'status': 'targetingSet', 'params': [{'accountId': '184', 'placementId': '353538'}]};
      spec.onBidWon(bid);
      expect(bid.nurl).to.deep.equal('nurl&s=0.66');
      expect(bid.burl).to.deep.equal('burl&s=0.66');
    });
    it('should replace nurl and burl for banner', function () {
      const burl = 'burl&s=${' + 'AUCTION_PRICE}';
      const nurl = 'nurl&s=${' + 'AUCTION_PRICE}';
      const bid = {'bidderCode': 'mgid', 'width': 0, 'height': 0, 'statusMessage': 'Bid available', 'adId': '3d0b6ff1dda89', 'requestId': '2a423489e058a1', 'mediaType': 'banner', 'source': 'client', 'ad': burl, 'cpm': 0.66, 'creativeId': '353538_591471', 'currency': 'USD', 'dealId': '', 'netRevenue': true, 'ttl': 300, 'nurl': nurl, 'burl': burl, 'isBurl': true, 'auctionId': 'a92bffce-14d2-4f8f-a78a-7b9b5e4d28fa', 'responseTimestamp': 1556867386065, 'requestTimestamp': 1556867385916, 'bidder': 'mgid', 'adUnitCode': 'div-gpt-ad-1555415275793-0', 'timeToRespond': 149, 'pbLg': '0.50', 'pbMg': '0.60', 'pbHg': '0.66', 'pbAg': '0.65', 'pbDg': '0.66', 'pbCg': '', 'size': '0x0', 'adserverTargeting': {'hb_bidder': 'mgid', 'hb_adid': '3d0b6ff1dda89', 'hb_pb': '0.66', 'hb_size': '0x0', 'hb_source': 'client', 'hb_format': 'banner', 'hb_banner_title': 'TITLE', 'hb_banner_image': 'hb_banner_image:3d0b6ff1dda89', 'hb_banner_icon': 'IconURL', 'hb_banner_linkurl': 'hb_banner_linkurl:3d0b6ff1dda89'}, 'status': 'targetingSet', 'params': [{'accountId': '184', 'placementId': '353538'}]};
      spec.onBidWon(bid);
      expect(bid.nurl).to.deep.equal('nurl&s=0.66');
      expect(bid.burl).to.deep.equal(burl);
      expect(bid.ad).to.deep.equal('burl&s=0.66');
    });
  });
});
