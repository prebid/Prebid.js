import {expect} from 'chai';
import { spec, storage } from 'modules/mgidBidAdapter.js';
import { version } from 'package.json';
import * as utils from '../../../src/utils.js';
import { getDNT } from 'libraries/dnt/index.js';
import {USERSYNC_DEFAULT_CONFIG} from '../../../src/userSync.js';
import {config} from '../../../src/config.js';

describe('Mgid bid adapter', function () {
  let sandbox;
  let logErrorSpy;
  let logWarnSpy;
  beforeEach(function () {
    sandbox = sinon.createSandbox();
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
  });

  afterEach(function () {
    sandbox.restore();
    utils.logError.restore();
    utils.logWarn.restore();
  });
  const screenHeight = screen.height;
  const screenWidth = screen.width;
  const dnt = getDNT() ? 1 : 0;
  const language = navigator.language ? 'language' : 'userLanguage';
  let lang = navigator[language].split('-')[0];
  if (lang.length !== 2 && lang.length !== 3) {
    lang = '';
  }
  const secure = window.location.protocol === 'https:' ? 1 : 0;
  const mgid_ver = spec.VERSION;
  const utcOffset = (new Date()).getTimezoneOffset().toString();

  it('should expose gvlid', function() {
    expect(spec.gvlid).to.equal(358)
  });

  describe('isBidRequestValid', function () {
    const sbid = {
      'adUnitCode': 'div',
      'bidder': 'mgid',
      'params': {
        'property': '10433394',
        'zone': 'zone'
      },
    };

    it('should not accept bid without required params', function () {
      const isValid = spec.isBidRequestValid(sbid);
      expect(isValid).to.equal(false);
    });

    it('should return false when params are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {accountId: '', placementId: ''};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes.banner are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes.banner.sizes are not passed', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        sizes: []
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid mediaTypes.banner.sizes are not valid', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        sizes: [300, 250]
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when valid params are passed as strings', function () {
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        native: []
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.native is empty object', function () {
      const bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {accountId: '1', placementId: '1'};
      bid.mediaTypes = {
        native: {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.native is invalid object', function () {
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
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
      const bid = Object.assign({}, sbid);
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
    const sbid = {
      bidder: 'mgid',
      params: {
        accountId: '1',
        placementId: '2',
      },
    };
    it('should return object', function () {
      const bid = Object.assign({}, sbid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request).to.exist.and.to.be.a('object');
    });

    it('should return overwrite default bidurl', function () {
      const bid = Object.assign({}, sbid);
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
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.include('https://newbidurl.com/1');
    });
    it('should return overwrite default bidFloor', function () {
      const bid = Object.assign({}, sbid);
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
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request.data).to.be.a('string');
      const data = JSON.parse(request.data);
      expect(data).to.be.a('object');
      expect(data.imp).to.be.a('array');
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].bidfloor).to.deep.equal(1.1);
    });
    it('should return overwrite default currency', function () {
      const bid = Object.assign({}, sbid);
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
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request.data).to.be.a('string');
      const data = JSON.parse(request.data);
      expect(data).to.be.a('object');
      expect(data.cur).to.deep.equal(['GBP']);
    });
  });

  describe('buildRequests', function () {
    const abid = {
      adUnitCode: 'div',
      bidder: 'mgid',
      ortb2Imp: {
        ext: {
          gpid: '/1111/gpid',
          data: {
            pbadslot: '/1111/gpid',
          }
        }
      },
      params: {
        accountId: '1',
        placementId: '2',
      },
    };
    afterEach(function () {
      config.setConfig({coppa: undefined})
    })

    it('should return undefined if no validBidRequests passed', function () {
      expect(spec.buildRequests([])).to.be.undefined;
    });
    it('should return request url with muid', function () {
      const getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      getDataFromLocalStorageStub.withArgs('mgMuidn').returns('xxx');

      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1?muid=xxx');

      getDataFromLocalStorageStub.restore();
    });
    it('should proper handle gdpr', function () {
      config.setConfig({coppa: 1})
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'gdpr', gdprApplies: true}, uspConsent: 'usp', gppConsent: {gppString: 'gpp'}});
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.user).deep.equal({ext: {consent: 'gdpr'}});
      expect(data.regs).deep.equal({ext: {gdpr: 1, us_privacy: 'usp'}, gpp: 'gpp', coppa: 1});
    });
    it('should handle refererInfo', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];
      const domain = 'site.com'
      const page = `http://${domain}/site.html`
      const ref = 'http://ref.com/ref.html'
      const request = spec.buildRequests(bidRequests, {refererInfo: {page, ref}});
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.site.ref).to.deep.equal(ref);
    });
    it('should handle schain', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.ortb2 = bid.ortb2 || {};
      bid.ortb2.source = bid.ortb2.source || {};
      bid.ortb2.source.ext = bid.ortb2.source.ext || {};
      bid.ortb2.source.ext.schain = ['schain1', 'schain2'];
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      const data = JSON.parse(request.data);
      expect(data.source).to.deep.equal({ext: {schain: bid.ortb2.source.ext.schain}});
    });
    it('should handle userId', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];
      const bidderRequest = {userId: 'userid'};
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.user.id).to.deep.equal(bidderRequest.userId);
    });
    it('should handle eids', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.userIdAsEids = ['eid1', 'eid2']
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      const data = JSON.parse(request.data);
      expect(data.user.ext.eids).to.deep.equal(bid.userIdAsEids);
    });
    it('should return proper banner imp', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];
      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      const request = spec.buildRequests(bidRequests);
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(navigator.userAgent);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].ext.gpid).to.deep.equal('/1111/gpid');
      expect(data.imp[0].banner).to.deep.equal({w: 300, h: 250});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': `{"site":{"domain":"${domain}","page":"${page}"},"cur":["USD"],"geo":{"utcoffset":${utcOffset}},"device":{"ua":"${navigator.userAgent}","js":1,"dnt":${dnt},"h":${screenHeight},"w":${screenWidth},"language":"${lang}"},"ext":{"mgid_ver":"${mgid_ver}","prebid_ver":"${version}"},"imp":[{"tagid":"2/div","secure":${secure},"ext":{"gpid":"/1111/gpid"},"banner":{"w":300,"h":250}}],"tmax":3000}`,
      });
    });
    it('should not return native imp if minimum asset list not requested', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {sizes: [80, 80]},
      };
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);
      expect(request).to.be.undefined;
    });
    it('should return proper native imp', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {sizes: [80, 80]},
        sponsored: { },
      };

      const bidRequests = [bid];
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
      expect(data.device.ua).to.deep.equal(navigator.userAgent);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].ext.gpid).to.deep.equal('/1111/gpid');
      expect(data.imp[0].native).is.a('object').and.to.deep.equal({'request': {'assets': [{'id': 1, 'required': 1, 'title': {'len': 80}}, {'id': 2, 'img': {'h': 80, 'type': 3, 'w': 80}, 'required': 0}, {'data': {'type': 1}, 'id': 11, 'required': 0}], 'plcmtcnt': 1}});
      expect(data.imp[0].secure).to.deep.equal(secure);
      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': `{"site":{"domain":"${domain}","page":"${page}"},"cur":["USD"],"geo":{"utcoffset":${utcOffset}},"device":{"ua":"${navigator.userAgent}","js":1,"dnt":${dnt},"h":${screenHeight},"w":${screenWidth},"language":"${lang}"},"ext":{"mgid_ver":"${mgid_ver}","prebid_ver":"${version}"},"imp":[{"tagid":"2/div","secure":${secure},"ext":{"gpid":"/1111/gpid"},"native":{"request":{"plcmtcnt":1,"assets":[{"id":1,"required":1,"title":{"len":80}},{"id":2,"required":0,"img":{"type":3,"w":80,"h":80}},{"id":11,"required":0,"data":{"type":1}}]}}}],"tmax":3000}`,
      });
    });
    it('should return proper native imp with image altered', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {wmin: 50, hmin: 50, required: true},
        icon: {},
        sponsored: { },
      };

      const bidRequests = [bid];
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
      expect(data.device.ua).to.deep.equal(navigator.userAgent);
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
        'data': `{"site":{"domain":"${domain}","page":"${page}"},"cur":["USD"],"geo":{"utcoffset":${utcOffset}},"device":{"ua":"${navigator.userAgent}","js":1,"dnt":${dnt},"h":${screenHeight},"w":${screenWidth},"language":"${lang}"},"ext":{"mgid_ver":"${mgid_ver}","prebid_ver":"${version}"},"imp":[{"tagid":"2/div","secure":${secure},"ext":{"gpid":"/1111/gpid"},"native":{"request":{"plcmtcnt":1,"assets":[{"id":1,"required":1,"title":{"len":80}},{"id":2,"required":1,"img":{"type":3,"w":492,"h":328,"wmin":50,"hmin":50}},{"id":3,"required":0,"img":{"type":1,"w":50,"h":50}},{"id":11,"required":0,"data":{"type":1}}]}}}],"tmax":3000}`,
      });
    });
    it('should return proper native imp with sponsoredBy', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        native: '',
      };
      bid.nativeParams = {
        title: {required: true},
        image: {sizes: [80, 80]},
        sponsoredBy: { },
      };

      const bidRequests = [bid];
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
      expect(data.device.ua).to.deep.equal(navigator.userAgent);
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
        'data': `{"site":{"domain":"${domain}","page":"${page}"},"cur":["USD"],"geo":{"utcoffset":${utcOffset}},"device":{"ua":"${navigator.userAgent}","js":1,"dnt":${dnt},"h":${screenHeight},"w":${screenWidth},"language":"${lang}"},"ext":{"mgid_ver":"${mgid_ver}","prebid_ver":"${version}"},"imp":[{"tagid":"2/div","secure":${secure},"ext":{"gpid":"/1111/gpid"},"native":{"request":{"plcmtcnt":1,"assets":[{"id":1,"required":1,"title":{"len":80}},{"id":2,"required":0,"img":{"type":3,"w":80,"h":80}},{"id":4,"required":0,"data":{"type":1}}]}}}],"tmax":3000}`,
      });
    });
    it('should return proper banner request', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 600], [300, 250]],
          pos: 1,
        },
      };
      const bidRequests = [bid];
      const request = spec.buildRequests(bidRequests);

      const page = top.location.href;
      const domain = utils.parseUrl(page).hostname;
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.site.domain).to.deep.equal(domain);
      expect(data.site.page).to.deep.equal(page);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.device.ua).to.deep.equal(navigator.userAgent);
      expect(data.device.dnt).equal(dnt);
      expect(data.device.h).equal(screenHeight);
      expect(data.device.w).equal(screenWidth);
      expect(data.device.language).to.deep.equal(lang);
      expect(data.imp[0].tagid).to.deep.equal('2/div');
      expect(data.imp[0].banner).to.deep.equal({w: 300, h: 600, format: [{w: 300, h: 600}, {w: 300, h: 250}], pos: 1});
      expect(data.imp[0].secure).to.deep.equal(secure);

      expect(request).to.deep.equal({
        'method': 'POST',
        'url': 'https://prebid.mgid.com/prebid/1',
        'data': `{"site":{"domain":"${domain}","page":"${page}"},"cur":["USD"],"geo":{"utcoffset":${utcOffset}},"device":{"ua":"${navigator.userAgent}","js":1,"dnt":${dnt},"h":${screenHeight},"w":${screenWidth},"language":"${lang}"},"ext":{"mgid_ver":"${mgid_ver}","prebid_ver":"${version}"},"imp":[{"tagid":"2/div","secure":${secure},"ext":{"gpid":"/1111/gpid"},"banner":{"w":300,"h":600,"format":[{"w":300,"h":600},{"w":300,"h":250}],"pos":1}}],"tmax":3000}`,
      });
    });
    it('should proper handle ortb2 data', function () {
      const bid = Object.assign({}, abid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidRequests = [bid];

      const bidderRequest = {
        gdprConsent: {
          consentString: 'consent1',
          gdprApplies: false,
        },
        ortb2: {
          bcat: ['bcat1', 'bcat2'],
          badv: ['badv1.com', 'badv2.com'],
          wlang: ['l1', 'l2'],
          site: {
            content: {
              data: [{
                name: 'mgid.com',
                ext: {
                  segtax: 1,
                },
                segment: [
                  {id: '123'},
                  {id: '456'},
                ],
              }]
            }
          },
          user: {
            ext: {
              consent: 'consent2 ',
            },
            data: [{
              name: 'mgid.com',
              ext: {
                segtax: 2,
              },
              segment: [
                {'id': '789'},
                {'id': '987'},
              ],
            }]
          },
          regs: {
            ext: {
              gdpr: 1,
            }
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).deep.equal('https://prebid.mgid.com/prebid/1');
      expect(request.method).deep.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.bcat).deep.equal(bidderRequest.ortb2.bcat);
      expect(data.badv).deep.equal(bidderRequest.ortb2.badv);
      expect(data.wlang).deep.equal(bidderRequest.ortb2.wlang);
      expect(data.site.content).deep.equal(bidderRequest.ortb2.site.content);
      expect(data.regs).deep.equal(bidderRequest.ortb2.regs);
      expect(data.user.data).deep.equal(bidderRequest.ortb2.user.data);
      expect(data.user.ext).deep.equal(bidderRequest.ortb2.user.ext);
    });
  });

  describe('interpretResponse', function () {
    it('should not push proper native bid response if adm is missing', function () {
      const resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}, 'adomain': ['test.com']}], 'seat': '44082'}]}
      };
      const bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([])
    });
    it('should not push proper native bid response if assets is empty', function () {
      const resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': '{"native":{"ver":"1.1","link":{"url":"link_url"},"assets":[],"imptrackers":["imptrackers1"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}, 'adomain': ['test.com']}], 'seat': '44082'}]}
      };
      const bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([])
    });
    it('should push proper native bid response, assets1', function () {
      const resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': '{"native":{"ver":"1.1","link":{"url":"link_url"},"assets":[{"id":1,"required":0,"title":{"text":"title1"}},{"id":2,"required":0,"img":{"w":80,"h":80,"type":3,"url":"image_src"}},{"id":3,"required":0,"img":{"w":50,"h":50,"type":1,"url":"icon_src"}},{"id":4,"required":0,"data":{"type":4,"value":"sponsored"}},{"id":5,"required":0,"data":{"type":6,"value":"price1"}},{"id":6,"required":0,"data":{"type":7,"value":"price2"}}],"imptrackers":["imptrackers1"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}, 'adomain': ['test.com']}], 'seat': '44082'}], ext: {'muidn': 'userid'}}
      };
      const bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([{
        'ad': '{"native":{"ver":"1.1","link":{"url":"link_url"},"assets":[{"id":1,"required":0,"title":{"text":"title1"}},{"id":2,"required":0,"img":{"w":80,"h":80,"type":3,"url":"image_src"}},{"id":3,"required":0,"img":{"w":50,"h":50,"type":1,"url":"icon_src"}},{"id":4,"required":0,"data":{"type":4,"value":"sponsored"}},{"id":5,"required":0,"data":{"type":6,"value":"price1"}},{"id":6,"required":0,"data":{"type":7,"value":"price2"}}],"imptrackers":["imptrackers1"]}}',
        'burl': 'https burl',
        'cpm': 1.5,
        'creativeId': '2898532/2419121/2592854/2499195',
        'currency': 'GBP',
        'dealId': '',
        'height': 0,
        'isBurl': true,
        'mediaType': 'native',
        'meta': {'advertiserDomains': ['test.com']},
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
    it('should push proper native bid response, assets2', function () {
      const resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': 'GBP', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': '{"native":{"ver":"1.1","link":{"url":"link_url"},"assets":[{"id":1,"required":0,"title":{"text":"title1"}},{"id":2,"required":0,"img":{"w":80,"h":80,"type":3,"url":"image_src"}},{"id":3,"required":0,"img":{"w":50,"h":50,"type":1,"url":"icon_src"}}],"imptrackers":["imptrackers1"]}}', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'ext': {'place': 0, 'crtype': 'native'}, 'adomain': ['test.com']}], 'seat': '44082'}]}
      };
      const bids = spec.interpretResponse(resp);
      expect(bids).to.deep.equal([
        {
          'ad': '{"native":{"ver":"1.1","link":{"url":"link_url"},"assets":[{"id":1,"required":0,"title":{"text":"title1"}},{"id":2,"required":0,"img":{"w":80,"h":80,"type":3,"url":"image_src"}},{"id":3,"required":0,"img":{"w":50,"h":50,"type":1,"url":"icon_src"}}],"imptrackers":["imptrackers1"]}}',
          'cpm': 1.5,
          'creativeId': '2898532/2419121/2592854/2499195',
          'currency': 'GBP',
          'dealId': '',
          'height': 0,
          'isBurl': true,
          'mediaType': 'native',
          'meta': {'advertiserDomains': ['test.com']},
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

    it('should not push bid response', function () {
      const bids = spec.interpretResponse();
      expect(bids).to.be.undefined;
    });
    it('should push proper banner bid response', function () {
      const resp = {
        body: {'id': '57c0c2b1b732ca', 'bidid': '57c0c2b1b732ca', 'cur': '', 'seatbid': [{'bid': [{'price': 1.5, 'h': 600, 'w': 300, 'id': '1', 'impid': '61e40632c53fc2', 'adid': '2898532/2419121/2592854/2499195', 'nurl': 'https nurl', 'burl': 'https burl', 'adm': 'html: adm', 'cid': '44082', 'crid': '2898532/2419121/2592854/2499195', 'cat': ['IAB7', 'IAB14', 'IAB18-3', 'IAB1-2'], 'adomain': ['test.com']}], 'seat': '44082'}]}
      };
      const bids = spec.interpretResponse(resp);
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
          'meta': {'advertiserDomains': ['test.com']},
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

  describe('getUserSyncs', function () {
    afterEach(function() {
      config.setConfig({userSync: {syncsPerBidder: USERSYNC_DEFAULT_CONFIG.syncsPerBidder}});
    });
    it('should do nothing on getUserSyncs without inputs', function () {
      expect(spec.getUserSyncs()).to.equal(undefined)
    });
    it('should return frame object with empty consents', function () {
      const sync = spec.getUserSyncs({iframeEnabled: true})
      expect(sync).to.have.length(1)
      expect(sync[0]).to.have.property('type', 'iframe')
      expect(sync[0]).to.have.property('url').match(/https:\/\/cm\.mgid\.com\/i\.html\?cbuster=\d+&gdpr_consent=&gdpr=0/)
    });
    it('should return frame object with gdpr consent', function () {
      const sync = spec.getUserSyncs({iframeEnabled: true}, undefined, {consentString: 'consent', gdprApplies: true})
      expect(sync).to.have.length(1)
      expect(sync[0]).to.have.property('type', 'iframe')
      expect(sync[0]).to.have.property('url').match(/https:\/\/cm\.mgid\.com\/i\.html\?cbuster=\d+&gdpr_consent=consent&gdpr=1/)
    });
    it('should return frame object with gdpr + usp', function () {
      const sync = spec.getUserSyncs({iframeEnabled: true}, undefined, {consentString: 'consent1', gdprApplies: true}, {'consentString': 'consent2'})
      expect(sync).to.have.length(1)
      expect(sync[0]).to.have.property('type', 'iframe')
      expect(sync[0]).to.have.property('url').match(/https:\/\/cm\.mgid\.com\/i\.html\?cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2/)
    });
    it('should return img object with gdpr + usp', function () {
      config.setConfig({userSync: {syncsPerBidder: undefined}});
      const sync = spec.getUserSyncs({pixelEnabled: true}, undefined, {consentString: 'consent1', gdprApplies: true}, {'consentString': 'consent2'})
      expect(sync).to.have.length(USERSYNC_DEFAULT_CONFIG.syncsPerBidder)
      for (let i = 0; i < USERSYNC_DEFAULT_CONFIG.syncsPerBidder; i++) {
        expect(sync[i]).to.have.property('type', 'image')
        expect(sync[i]).to.have.property('url').match(/https:\/\/cm\.mgid\.com\/i\.gif\?cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2/)
      }
    });
    it('should return frame object with gdpr + usp', function () {
      const sync = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, undefined, {consentString: 'consent1', gdprApplies: true}, {'consentString': 'consent2'})
      expect(sync).to.have.length(1)
      expect(sync[0]).to.have.property('type', 'iframe')
      expect(sync[0]).to.have.property('url').match(/https:\/\/cm\.mgid\.com\/i\.html\?cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2/)
    });
    it('should return img (pixels) objects with gdpr + usp', function () {
      const response = [{body: {ext: {cm: ['http://cm.mgid.com/i.gif?cdsp=1111', 'http://cm.mgid.com/i.gif']}}}]
      const sync = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, response, {consentString: 'consent1', gdprApplies: true}, {'consentString': 'consent2'})
      expect(sync).to.have.length(2)
      expect(sync[0]).to.have.property('type', 'image')
      expect(sync[0]).to.have.property('url').match(/http:\/\/cm\.mgid\.com\/i\.gif\?cdsp=1111&cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2/)
      expect(sync[1]).to.have.property('type', 'image')
      expect(sync[1]).to.have.property('url').match(/http:\/\/cm\.mgid\.com\/i\.gif\?cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2/)
    });
  });

  describe('getUserSyncs with img from ext.cm and gdpr + usp + coppa + gpp', function () {
    afterEach(function() {
      config.setConfig({coppa: undefined})
    });
    it('should return img (pixels) objects with gdpr + usp + coppa + gpp', function () {
      config.setConfig({coppa: 1});
      const response = [{body: {ext: {cm: ['http://cm.mgid.com/i.gif?cdsp=1111', 'http://cm.mgid.com/i.gif']}}}]
      const sync = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, response, {consentString: 'consent1', gdprApplies: true}, {'consentString': 'consent2'}, {gppString: 'gpp'})
      expect(sync).to.have.length(2)
      expect(sync[0]).to.have.property('type', 'image')
      expect(sync[0]).to.have.property('url').match(/http:\/\/cm\.mgid\.com\/i\.gif\?cdsp=1111&cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2&gppString=gpp&coppa=1/)
      expect(sync[1]).to.have.property('type', 'image')
      expect(sync[1]).to.have.property('url').match(/http:\/\/cm\.mgid\.com\/i\.gif\?cbuster=\d+&gdpr_consent=consent1&gdpr=1&us_privacy=consent2&gppString=gpp&coppa=1/)
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
      const bid = {'bidderCode': 'mgid', 'width': 0, 'height': 0, 'statusMessage': 'Bid available', 'adId': '3d0b6ff1dda89', 'requestId': '2a423489e058a1', 'mediaType': 'native', 'source': 'client', 'ad': '{"native":{"ver":"1.1","link":{"url":"LinkURL"},"assets":[{"id":1,"required":0,"title":{"text":"TITLE"}},{"id":2,"required":0,"img":{"w":80,"h":80,"type":3,"url":"ImageURL"}},{"id":3,"required":0,"img":{"w":50,"h":50,"type":1,"url":"IconURL"}},{"id":11,"required":0,"data":{"type":1,"value":"sponsored"}}],"imptrackers":["ImpTrackerURL"]}}', 'cpm': 0.66, 'creativeId': '353538_591471', 'currency': 'USD', 'dealId': '', 'netRevenue': true, 'ttl': 300, 'nurl': nurl, 'burl': burl, 'isBurl': true, 'native': {'title': 'TITLE', 'image': {'url': 'ImageURL', 'height': 80, 'width': 80}, 'icon': {'url': 'IconURL', 'height': 50, 'width': 50}, 'sponsored': 'sponsored', 'clickUrl': 'LinkURL', 'clickTrackers': [], 'impressionTrackers': ['ImpTrackerURL'], 'jstracker': []}, 'auctionId': 'a92bffce-14d2-4f8f-a78a-7b9b5e4d28fa', 'responseTimestamp': 1556867386065, 'requestTimestamp': 1556867385916, 'bidder': 'mgid', 'adUnitCode': 'div-gpt-ad-1555415275793-0', 'timeToRespond': 149, 'pbLg': '0.50', 'pbMg': '0.60', 'pbHg': '0.66', 'pbAg': '0.65', 'pbDg': '0.66', 'pbCg': '', 'size': '0x0', 'adserverTargeting': {'hb_bidder': 'mgid', 'hb_adid': '3d0b6ff1dda89', 'hb_pb': '0.66', 'hb_size': '0x0', 'hb_source': 'client', 'hb_format': 'native', 'hb_native_title': 'TITLE', 'hb_native_image': 'hb_native_image:3d0b6ff1dda89', 'hb_native_icon': 'IconURL', 'hb_native_linkurl': 'hb_native_linkurl:3d0b6ff1dda89'}, 'status': 'targetingSet', 'params': [{'accountId': '184', 'placementId': '353538'}]};
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

  describe('price floor module', function() {
    let bidRequest;
    const bidRequests0 = {
      adUnitCode: 'div',
      bidder: 'mgid',
      params: {
        accountId: '1',
        placementId: '2',
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      sizes: [[300, 250]],
    }
    beforeEach(function() {
      bidRequest = [utils.deepClone(bidRequests0)];
    });

    it('obtain floor from getFloor', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 1.23
        };
      };

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.have.property('bidfloor', 1.23);
      expect(payload.imp[0]).to.not.have.property('bidfloorcur');
    });
    it('obtain floor from params', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 1.23
        };
      };
      bidRequest[0].params.bidfloor = 0.1;

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.have.property('bidfloor', 0.1);
      expect(payload.imp[0]).to.not.have.property('bidfloorcur');
    });

    it('undefined currency -> USD', function() {
      bidRequest[0].params.currency = 'EUR'
      bidRequest[0].getFloor = () => {
        return {
          floor: 1.23
        };
      };

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.have.property('bidfloor', 1.23);
      expect(payload.imp[0]).to.have.property('bidfloorcur', 'USD');
    });
    it('altered currency', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'EUR',
          floor: 1.23
        };
      };

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.have.property('bidfloor', 1.23);
      expect(payload.imp[0]).to.have.property('bidfloorcur', 'EUR');
    });
    it('altered currency, same as in request', function() {
      bidRequest[0].params.cur = 'EUR'
      bidRequest[0].getFloor = () => {
        return {
          currency: 'EUR',
          floor: 1.23
        };
      };

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.have.property('bidfloor', 1.23);
      expect(payload.imp[0]).to.not.have.property('bidfloorcur');
    });

    it('bad floor value', function() {
      bidRequest[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 'test'
        };
      };

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.not.have.property('bidfloor');
      expect(payload.imp[0]).to.not.have.property('bidfloorcur');
    });

    it('empty floor object', function() {
      bidRequest[0].getFloor = () => {
        return {};
      };

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.not.have.property('bidfloor');
      expect(payload.imp[0]).to.not.have.property('bidfloorcur');
    });

    it('undefined floor result', function() {
      bidRequest[0].getFloor = () => {};

      const payload = JSON.parse(spec.buildRequests(bidRequest).data);
      expect(payload.imp[0]).to.not.have.property('bidfloor');
      expect(payload.imp[0]).to.not.have.property('bidfloorcur');
    });
  });
});
