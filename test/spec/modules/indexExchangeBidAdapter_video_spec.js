import { expect } from 'chai';
import Adapter from 'modules/indexExchangeBidAdapter';
import bidmanager from 'src/bidmanager';
import adloader from 'src/adloader';
import * as url from 'src/url';

const PREBID_REQUEST = { 'bidderCode': 'indexExchange', 'requestId': '6f4cb846-1901-4fc4-a1a4-5daf58a26e71', 'bidderRequestId': '16940e979c42d4', 'bids': [{ 'bidder': 'indexExchange', 'params': { 'video': { 'siteID': 6, 'playerType': 'HTML5', 'protocols': ['VAST2', 'VAST3'], 'maxduration': 15 } }, 'placementCode': 'video1', 'mediaType': 'video', 'sizes': [640, 480], 'bidId': '2f4e1cc0f992f2', 'bidderRequestId': '16940e979c42d4', 'requestId': '6f4cb846-1901-4fc4-a1a4-5daf58a26e71' }], 'start': 1488236870659, 'auctionStart': 1488236870656, 'timeout': 3000 };

const CYGNUS_REQUEST_R_PARAM = { 'id': '16940e979c42d4', 'imp': [{ 'id': '2f4e1cc0f992f2', 'ext': { 'siteID': 6, 'sid': 'pr_1_1_s' }, 'video': { 'protocols': [2, 5, 3, 6], 'maxduration': 15, 'minduration': 0, 'startdelay': 0, 'linearity': 1, 'mimes': ['video/mp4', 'video/webm'], 'w': 640, 'h': 480 } }], 'site': { 'page': 'http://localhost:9876/' }};

const PREBID_RESPONSE = { 'bidderCode': 'indexExchange', 'width': 640, 'height': 480, 'statusMessage': 'Bid available', 'adId': '2f4e1cc0f992f2', 'code': 'indexExchange', 'cpm': 10, 'vastUrl': 'http://vast.url' };

const CYGNUS_RESPONSE = { 'seatbid': [{ 'bid': [{ 'crid': '1', 'adomain': ['vastdsp.com'], 'adid': '1', 'impid': '2f4e1cc0f992f2', 'cid': '1', 'id': '1', 'ext': { 'vasturl': 'http://vast.url', 'errorurl': 'http://error.url', 'dspid': 1, 'pricelevel': '_1000', 'advbrandid': 75, 'advbrand': 'Nacho Momma' } }], 'seat': '1' }], 'cur': 'USD', 'id': '16940e979c42d4' };

const EMPTY_MESSAGE = 'Bid returned empty or error response';
const ERROR_MESSAGE = 'Bid returned empty or error response';
const AVAILABLE_MESSAGE = 'Bid available';

const CYGNUS_REQUEST_BASE_URL_INSECURE = 'http://as.casalemedia.com/cygnus?v=8&fn=$$PREBID_GLOBAL$$.handleCygnusResponse&s=6&r=';

const CYGNUS_REQUEST_BASE_URL_SECURE = 'https://as-sec.casalemedia.com/cygnus?v=8&fn=$$PREBID_GLOBAL$$.handleCygnusResponse&s=6&r=';

const DEFAULT_MIMES_MAP = {
  FLASH: ['video/mp4', 'video/x-flv'],
  HTML5: ['video/mp4', 'video/webm']
};
const DEFAULT_VPAID_MIMES_MAP = {
  FLASH: ['application/x-shockwave-flash'],
  HTML5: ['application/javascript']
};
const SUPPORTED_API_MAP = {
  FLASH: [1, 2],
  HTML5: [2]
};

describe('indexExchange adapter - Video', () => {
  let adapter;

  beforeEach(() => adapter = new Adapter());

  describe('request to prebid', () => {
    let prebidRequest;

    beforeEach(() => {
      prebidRequest = JSON.parse(JSON.stringify(PREBID_REQUEST));
      sinon.stub(adloader, 'loadScript');
    });

    afterEach(() => {
      adloader.loadScript.restore();
    });

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('should make request with specified values', () => {
      let insecureExpectedUrl = url.parse(CYGNUS_REQUEST_BASE_URL_INSECURE.concat(encodeURIComponent(JSON.stringify(CYGNUS_REQUEST_R_PARAM))));

      let secureExpectedUrl = url.parse(CYGNUS_REQUEST_BASE_URL_SECURE.concat(encodeURIComponent(JSON.stringify(CYGNUS_REQUEST_R_PARAM))));

      it('when valid HTML5 required bid request parameters are present', () => {
        adapter.callBids(prebidRequest);
        sinon.assert.calledOnce(adloader.loadScript);
        let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
        cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

        expect(cygnusRequestUrl.protocol).to.equal(insecureExpectedUrl.protocol);
        expect(cygnusRequestUrl.hostname).to.equal(insecureExpectedUrl.hostname);
        expect(cygnusRequestUrl.port).to.equal(insecureExpectedUrl.port);
        expect(cygnusRequestUrl.pathname).to.equal(insecureExpectedUrl.pathname);

        expect(cygnusRequestUrl.search.v).to.equal(insecureExpectedUrl.search.v);
        expect(cygnusRequestUrl.search.s).to.equal(insecureExpectedUrl.search.s);
        expect(cygnusRequestUrl.search.fn).to.equal(insecureExpectedUrl.search.fn);
        expect(cygnusRequestUrl.search.r).to.exist;

        expect(cygnusRequestUrl.search.r.id).to.equal(prebidRequest.bidderRequestId);

        expect(cygnusRequestUrl.search.r.site.page).to.have.string(CYGNUS_REQUEST_R_PARAM.site.page);

        expect(cygnusRequestUrl.search.r.imp).to.be.a('array');
        expect(cygnusRequestUrl.search.r.imp[0]).to.have.all.keys(Object.keys(CYGNUS_REQUEST_R_PARAM.imp[0]));

        expect(cygnusRequestUrl.search.r.imp[0].id).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].id);

        expect(cygnusRequestUrl.search.r.imp[0].ext.siteID).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].ext.siteID);
        expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);

        expect(cygnusRequestUrl.search.r.imp[0].video.protocols).to.deep.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.protocols);
        expect(cygnusRequestUrl.search.r.imp[0].video.maxduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.maxduration);
        expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.minduration);
        expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
        expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.linearity);
        expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(DEFAULT_MIMES_MAP.HTML5);
        expect(cygnusRequestUrl.search.r.imp[0].video.w).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.w);
        expect(cygnusRequestUrl.search.r.imp[0].video.h).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.h);
      });

      it('when valid FLASH required bid request parameters are present', () => {
        prebidRequest.bids[0].params.video.playerType = 'FLASH';
        adapter.callBids(prebidRequest);
        sinon.assert.calledOnce(adloader.loadScript);
        let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
        cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

        expect(cygnusRequestUrl.protocol).to.equal(insecureExpectedUrl.protocol);
        expect(cygnusRequestUrl.hostname).to.equal(insecureExpectedUrl.hostname);
        expect(cygnusRequestUrl.port).to.equal(insecureExpectedUrl.port);
        expect(cygnusRequestUrl.pathname).to.equal(insecureExpectedUrl.pathname);

        expect(cygnusRequestUrl.search.v).to.equal(insecureExpectedUrl.search.v);
        expect(cygnusRequestUrl.search.s).to.equal(insecureExpectedUrl.search.s);
        expect(cygnusRequestUrl.search.fn).to.equal(insecureExpectedUrl.search.fn);
        expect(cygnusRequestUrl.search.r).to.exist;

        expect(cygnusRequestUrl.search.r.id).to.equal(prebidRequest.bidderRequestId);

        expect(cygnusRequestUrl.search.r.site.page).to.have.string(CYGNUS_REQUEST_R_PARAM.site.page);

        expect(cygnusRequestUrl.search.r.imp).to.be.a('array');
        expect(cygnusRequestUrl.search.r.imp[0]).to.have.all.keys(Object.keys(CYGNUS_REQUEST_R_PARAM.imp[0]));

        expect(cygnusRequestUrl.search.r.imp[0].id).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].id);

        expect(cygnusRequestUrl.search.r.imp[0].ext.siteID).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].ext.siteID);
        expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);

        expect(cygnusRequestUrl.search.r.imp[0].video.protocols).to.deep.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.protocols);
        expect(cygnusRequestUrl.search.r.imp[0].video.maxduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.maxduration);
        expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.minduration);
        expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
        expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.linearity);
        expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(DEFAULT_MIMES_MAP.FLASH);
        expect(cygnusRequestUrl.search.r.imp[0].video.w).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.w);
        expect(cygnusRequestUrl.search.r.imp[0].video.h).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.h);
      });

      it('when required field site ID is a numeric string', () => {
        prebidRequest.bids[0].params.video.siteID = '6';
        adapter.callBids(prebidRequest);
        sinon.assert.calledOnce(adloader.loadScript);
        let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
        cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

        expect(cygnusRequestUrl.search.s).to.equal(insecureExpectedUrl.search.s);
        expect(cygnusRequestUrl.search.r).to.exist;

        expect(cygnusRequestUrl.search.r.imp[0].ext.siteID).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].ext.siteID);
      });

      it('when required field maxduration is a numeric string', () => {
        prebidRequest.bids[0].params.video.maxduration = '15';
        adapter.callBids(prebidRequest);
        sinon.assert.calledOnce(adloader.loadScript);
        let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
        cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

        expect(cygnusRequestUrl.search.r.imp[0].video.maxduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.maxduration);
      });

      describe('when optional field minduration', () => {
        it('is valid number', () => {
          prebidRequest.bids[0].params.video.minduration = 5;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(prebidRequest.bids[0].params.video.minduration);
        });

        it('is valid number string', () => {
          prebidRequest.bids[0].params.video.minduration = '5';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(prebidRequest.bids[0].params.video.minduration);
        });
      });

      describe('when optional field startdelay', () => {
        it('is valid string', () => {
          prebidRequest.bids[0].params.video.startdelay = 'midroll';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(prebidRequest.bids[0].params.video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string('m_1_1_s');
        });

        it('is valid number string', () => {
          prebidRequest.bids[0].params.video.startdelay = '5';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(prebidRequest.bids[0].params.video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string('m_1_1_s');
        });

        it('is valid midroll number', () => {
          prebidRequest.bids[0].params.video.startdelay = 5;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(prebidRequest.bids[0].params.video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string('m_1_1_s');
        });

        it('is valid preroll number', () => {
          prebidRequest.bids[0].params.video.startdelay = 0;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(prebidRequest.bids[0].params.video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string('pr_1_1_s');
        });
      });

      describe('when optional field linearity', () => {
        it('is valid string', () => {
          prebidRequest.bids[0].params.video.linearity = 'nonlinear';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(2);
        });
      });

      describe('when optional field mimes', () => {
        it('is valid mime', () => {
          prebidRequest.bids[0].params.video.mimes = ['a/b'];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(prebidRequest.bids[0].params.video.mimes);
        });
      });

      describe('when optional field API list', () => {
        it('is valid array', () => {
          prebidRequest.bids[0].params.video.apiList = [2];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.include.members([2]);
        });
      });

      describe('when optional field allowVPAID', () => {
        it('is valid boolean', () => {
          prebidRequest.bids[0].params.video.allowVPAID = true;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.include.members(DEFAULT_VPAID_MIMES_MAP.HTML5);
          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.include.members(SUPPORTED_API_MAP.HTML5);
        });
      });
    });

    describe('should make request with default values', () => {
      describe('when optional field minduration', () => {
        it('is invalid string', () => {
          prebidRequest.bids[0].params.video.minduration = 'a';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.minduration);
        });

        it('is empty object', () => {
          prebidRequest.bids[0].params.video.minduration = {};
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.minduration);
        });

        it('is empty array', () => {
          prebidRequest.bids[0].params.video.minduration = [];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.minduration);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.minduration = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.minduration).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.minduration);
        });
      });

      describe('when optional field startdelay', () => {
        it('is invalid string', () => {
          prebidRequest.bids[0].params.video.startdelay = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);
        });

        it('is invalid number string', () => {
          prebidRequest.bids[0].params.video.startdelay = '-5';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);
        });

        it('is invalid number', () => {
          prebidRequest.bids[0].params.video.startdelay = -5;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);
        });

        it('is empty object', () => {
          prebidRequest.bids[0].params.video.startdelay = {};
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);
        });

        it('is empty array', () => {
          prebidRequest.bids[0].params.video.startdelay = [];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.startdelay = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.startdelay).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.startdelay);
          expect(cygnusRequestUrl.search.r.imp[0].ext.sid).to.have.string(CYGNUS_REQUEST_R_PARAM.imp[0].ext.sid);
        });
      });

      describe('when optional field linearity', () => {
        it('is invalid string', () => {
          prebidRequest.bids[0].params.video.linearity = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.linearity);
        });

        it('is empty object', () => {
          prebidRequest.bids[0].params.video.linearity = {};
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.linearity);
        });

        it('is empty array', () => {
          prebidRequest.bids[0].params.video.linearity = [];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.linearity);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.linearity = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.linearity).to.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.linearity);
        });
      });

      describe('when optional field mimes', () => {
        it('is invalid mime string', () => {
          prebidRequest.bids[0].params.video.mimes = 'a';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
        });

        it('is empty object', () => {
          prebidRequest.bids[0].params.video.mimes = {};
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
        });

        it('is empty array', () => {
          prebidRequest.bids[0].params.video.mimes = [];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.mimes = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.deep.equal(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
        });
      });

      describe('when optional field API list', () => {
        it('is invalid array', () => {
          prebidRequest.bids[0].params.video.apiList = ['cucumber'];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is empty array', () => {
          prebidRequest.bids[0].params.video.apiList = [];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is empty object', () => {
          prebidRequest.bids[0].params.video.apiList = {};
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is string', () => {
          prebidRequest.bids[0].params.video.apiList = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.apiList = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });
      });

      describe('when optional field allowVPAID', () => {
        it('is not boolean', () => {
          prebidRequest.bids[0].params.video.allowVPAID = 'a';
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.have.members(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is empty object', () => {
          prebidRequest.bids[0].params.video.allowVPAID = {};
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.have.members(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is empty array', () => {
          prebidRequest.bids[0].params.video.allowVPAID = [];
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.have.members(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.allowVPAID = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.calledOnce(adloader.loadScript);
          let cygnusRequestUrl = url.parse(encodeURIComponent(adloader.loadScript.firstCall.args[0]));
          cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

          expect(cygnusRequestUrl.search.r.imp[0].video.mimes).to.have.members(CYGNUS_REQUEST_R_PARAM.imp[0].video.mimes);
          expect(cygnusRequestUrl.search.r.imp[0].video.apiList).to.not.exist;
        });
      });
    })

    describe('should not make request', () => {
      describe('when request', () => {
        it('is empty', () => {
          adapter.callBids({});
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is for no bids', () => {
          adapter.callBids({ bids: [] });
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is undefined', () => {
          adapter.callBids(undefined);
          sinon.assert.notCalled(adloader.loadScript);
        });
      });

      describe('when request site ID', () => {
        it('is negative number', () => {
          prebidRequest.bids[0].params.video.siteID = -5;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is negative number string', () => {
          prebidRequest.bids[0].params.video.siteID = '-5';
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is invalid string', () => {
          prebidRequest.bids[0].params.video.siteID = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.siteID = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });
      });

      describe('when request player type', () => {
        it('is invalid string', () => {
          prebidRequest.bids[0].params.video.playerType = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is number', () => {
          prebidRequest.bids[0].params.video.playerType = 1;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.playerType = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });
      });

      describe('when request protocols', () => {
        it('is empty array', () => {
          prebidRequest.bids[0].params.video.protocols = [];
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is a string', () => {
          prebidRequest.bids[0].params.video.protocols = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is an invalid array', () => {
          prebidRequest.bids[0].params.video.protocols = ['cucumber'];
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.protocols = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });
      });

      describe('when request maxduration', () => {
        it('is a non-numeric string', () => {
          prebidRequest.bids[0].params.video.maxduration = 'cucumber';
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is a negative number', () => {
          prebidRequest.bids[0].params.video.maxduration = -1;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is a negative number string', () => {
          prebidRequest.bids[0].params.video.maxduration = '-1';
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });

        it('is undefined', () => {
          prebidRequest.bids[0].params.video.maxduration = undefined;
          adapter.callBids(prebidRequest);
          sinon.assert.notCalled(adloader.loadScript);
        });
      });
    });
  });

  describe('response from cygnus', () => {
    let response;
    let request;
    let width;
    let height;

    beforeEach(() => {
      sinon.stub(bidmanager, 'addBidResponse');

      [width, height] = PREBID_REQUEST.bids[0].sizes;

      request = JSON.parse(JSON.stringify(PREBID_REQUEST));
      response = JSON.parse(JSON.stringify(CYGNUS_RESPONSE));
    });

    afterEach(() => {
      bidmanager.addBidResponse.restore();
    });

    describe('should add empty bid', () => {
      describe('when response', () => {
        beforeEach(() => {
          adapter.callBids(request);
        });

        it('is empty object', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse({});
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is empty array', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse({});
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is undefined', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse(undefined);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is number', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse(1);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is string', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse('cucumber');
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is explicit pass', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse({ id: CYGNUS_RESPONSE.id });
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', EMPTY_MESSAGE);
        });
      });

      describe('when impid', () => {
        beforeEach(() => {
          adapter.callBids(request);
        });

        it('is mismatched', () => {
          response.seatbid[0].bid[0].impid = 'cucumber';
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is undefined', () => {
          response.seatbid[0].bid[0].impid = undefined;
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is array', () => {
          response.seatbid[0].bid[0].impid = [];
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is object', () => {
          response.seatbid[0].bid[0].impid = {};
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is string', () => {
          response.seatbid[0].bid[0].impid = {};
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });
      });

      describe('when price level', () => {
        beforeEach(() => {
          adapter.callBids(request);
        });

        it('is string', () => {
          response.seatbid[0].bid[0].ext.pricelevel = 'cucumber';
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is undefined', () => {
          response.seatbid[0].bid[0].ext.pricelevel = undefined;
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is array', () => {
          response.seatbid[0].bid[0].ext.pricelevel = [];
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is object', () => {
          response.seatbid[0].bid[0].ext.pricelevel = {};
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });
      });

      describe('when vasturl', () => {
        beforeEach(() => {
          adapter.callBids(request);
        });

        it('is undefined', () => {
          response.seatbid[0].bid[0].ext.vasturl = undefined;
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is number', () => {
          response.seatbid[0].bid[0].ext.vasturl = 1;
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });

        it('is not a url', () => {
          response.seatbid[0].bid[0].ext.vasturl = 'cucumber';
          $$PREBID_GLOBAL$$.handleCygnusResponse(response);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
          expect(bidResponse).to.have.property('code', PREBID_RESPONSE.code);
          expect(bidResponse).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(bidResponse).to.have.property('statusMessage', EMPTY_MESSAGE);
        });
      });
    });

    describe('should add available bid', () => {
      describe('when response', () => {
        beforeEach(() => {
          adapter.callBids(request);
        });

        it('is success', () => {
          $$PREBID_GLOBAL$$.handleCygnusResponse(CYGNUS_RESPONSE);
          sinon.assert.calledOnce(bidmanager.addBidResponse);

          const response = bidmanager.addBidResponse.firstCall.args[1];
          expect(response).to.have.property('code', PREBID_RESPONSE.code);
          expect(response).to.have.property('bidderCode', PREBID_RESPONSE.bidderCode);
          expect(response).to.have.property('statusMessage', PREBID_RESPONSE.statusMessage);
          expect(response).to.have.property('cpm', PREBID_RESPONSE.cpm);
          expect(response).to.have.property('vastUrl', PREBID_RESPONSE.vastUrl);
          expect(response).to.have.property('width', PREBID_RESPONSE.width);
          expect(response).to.have.property('height', PREBID_RESPONSE.height);
        });
      });
    });
  });
});
