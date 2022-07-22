import adapterManager from 'src/adapterManager.js';
import analyticsAdapter from 'modules/adlooxAnalyticsAdapter.js';
import { ajax } from 'src/ajax.js';
import { buildVideoUrl } from 'modules/adlooxAdServerVideo.js';
import { expect } from 'chai';
import * as events from 'src/events.js';
import { targeting } from 'src/targeting.js';
import * as utils from 'src/utils.js';

const analyticsAdapterName = 'adloox';

describe('Adloox Ad Server Video', function () {
  let sandbox;

  const adUnit = {
    code: 'ad-slot-1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [ 640, 480 ]
      }
    },
    bids: [
      {
        bidder: 'dummy'
      }
    ]
  };

  const bid = {
    bidder: adUnit.bids[0].bidder,
    adUnitCode: adUnit.code,
    mediaType: 'video'
  };

  const analyticsOptions = {
    js: 'https://j.adlooxtracking.com/ads/js/tfav_adl_%%clientid%%.js',
    client: 'adlooxtest',
    clientid: 127,
    platformid: 0,
    tagid: 0
  };

  const urlVAST = 'https://j.adlooxtracking.com/ads/vast/tag.php';

  const creativeUrl = 'http://example.invalid/c';
  const vastHeaders = {
    'content-type': 'application/xml;charset=utf-8'
  };

  const vastUrl = 'http://example.invalid/w';
  const vastContent =
`<?xml version="1.0" encoding="UTF-8" ?>
<VAST version="3.0">
  <Ad id="main" sequence="1">
    <InLine>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:05">
            <Duration>00:00:30</Duration>
            <MediaFiles>
              <MediaFile apiFramework="VPAID" type="application/javascript">http://example.invalid/v.js</MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
  <Ad id="fallback">
    <InLine>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:05">
            <Duration>00:00:30</Duration>
            <MediaFiles>
              <MediaFile width="640" height="480" bitrate="1000" scalable="true" maintainAspectRatio="true" type="video/mp4" delivery="progressive">${creativeUrl}</MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`

  const wrapperUrl = 'http://example.invalid/w';
  const wrapperContent =
`<?xml version="1.0" encoding="UTF-8" ?>
<VAST version="2.0">
  <Ad id="Test">
    <Wrapper>
      <VASTAdTagURI><![CDATA[${vastUrl}]]></VASTAdTagURI>
    </Wrapper>
  </Ad>
</VAST>`;

  adapterManager.registerAnalyticsAdapter({
    code: analyticsAdapterName,
    adapter: analyticsAdapter
  });

  before(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]);

    adapterManager.enableAnalytics({
      provider: analyticsAdapterName,
      options: analyticsOptions
    });
    expect(analyticsAdapter.context).is.not.null;
  });

  after(function () {
    analyticsAdapter.disableAnalytics();
    expect(analyticsAdapter.context).is.null;

    sandbox.restore();
    sandbox = undefined;
  });

  describe('buildVideoUrl', function () {
    describe('invalid arguments', function () {
      it('should require callback', function (done) {
        const ret = buildVideoUrl();

        expect(ret).is.false;

        done();
      });

      it('should require options', function (done) {
        const ret = buildVideoUrl(undefined, function () {});

        expect(ret).is.false;

        done();
      });

      it('should reject non-string options.url_vast', function (done) {
        const ret = buildVideoUrl({ url_vast: null }, function () {});

        expect(ret).is.false;

        done();
      });

      it('should require options.adUnit or options.bid', function (done) {
        let BID = utils.deepClone(bid);

        let getWinningBidsStub = sinon.stub(targeting, 'getWinningBids')
        getWinningBidsStub.withArgs(adUnit.code).returns([ BID ]);

        const ret = buildVideoUrl({ url: vastUrl }, function () {});
        expect(ret).is.false;

        const retAdUnit = buildVideoUrl({ url: vastUrl, adUnit: utils.deepClone(adUnit) }, function () {})
        expect(retAdUnit).is.true;

        const retBid = buildVideoUrl({ url: vastUrl, bid: BID }, function () {});
        expect(retBid).is.true;

        getWinningBidsStub.restore();

        done();
      });

      it('should reject non-string options.url', function (done) {
        const ret = buildVideoUrl({ url: null, bid: utils.deepClone(bid) }, function () {});

        expect(ret).is.false;

        done();
      });

      it('should reject non-boolean options.wrap', function (done) {
        const ret = buildVideoUrl({ wrap: null, url: vastUrl, bid: utils.deepClone(bid) }, function () {});

        expect(ret).is.false;

        done();
      });

      it('should reject non-boolean options.blob', function (done) {
        const ret = buildVideoUrl({ blob: null, url: vastUrl, bid: utils.deepClone(bid) }, function () {});

        expect(ret).is.false;

        done();
      });
    });

    describe('process VAST', function () {
      let server = null;
      let BID = null;
      let getWinningBidsStub;
      beforeEach(function () {
        server = sinon.createFakeServer();
        BID = utils.deepClone(bid);
        getWinningBidsStub = sinon.stub(targeting, 'getWinningBids')
        getWinningBidsStub.withArgs(adUnit.code).returns([ BID ]);
      });
      afterEach(function () {
        getWinningBidsStub.restore();
        getWinningBidsStub = undefined;
        BID = null;
        server.restore();
        server = null;
      });

      it('should return URL unchanged for non-VAST', function (done) {
        const ret = buildVideoUrl({ url: vastUrl, bid: BID }, function (url) {
          expect(url).is.equal(vastUrl);

          done();
        });
        expect(ret).is.true;

        const request = server.requests[0];
        expect(request.url).is.equal(vastUrl);
        request.respond(200, { 'content-type': 'application/octet-stream' }, 'notvast');
      });

      it('should return URL unchanged for empty VAST', function (done) {
        const ret = buildVideoUrl({ url: vastUrl, bid: BID }, function (url) {
          expect(url).is.equal(vastUrl);

          done();
        });
        expect(ret).is.true;

        const request = server.requests[0];
        expect(request.url).is.equal(vastUrl);
        request.respond(200, vastHeaders, '<?xml version="1.0" encoding="UTF-8" ?>\n<VAST version="3.0"/>');
      });

      it('should fetch, retry on withoutCredentials, follow and return a wrapped blob that expires', function (done) {
        BID.responseTimestamp = utils.timestamp();
        BID.ttl = 30;

        const clock = sandbox.useFakeTimers(BID.responseTimestamp);

        const options = {
          url_vast: urlVAST,
          url: wrapperUrl,
          bid: BID
        };
        const ret = buildVideoUrl(options, function (url) {
          expect(url.substr(0, options.url_vast.length)).is.equal(options.url_vast);

          const match = url.match(/[?&]vast=(blob%3A[^&]+)/);
          expect(match).is.not.null;

          const blob = decodeURIComponent(match[1]);

          const xfr = sandbox.useFakeXMLHttpRequest();
          xfr.useFilters = true;
          xfr.addFilter(x => true);	// there is no network traffic for Blob URLs here

          ajax(blob, {
            success: (responseText, q) => {
              expect(q.status).is.equal(200);
              expect(q.getResponseHeader('content-type')).is.equal(vastHeaders['content-type']);

              clock.runAll();

              ajax(blob, {
                success: (responseText, q) => {
                  xfr.useFilters = false;		// .restore() does not really work
                  if (q.status == 0) return done();
                  done(new Error('Blob should have expired'));
                },
                error: (statusText, q) => {
                  xfr.useFilters = false;
                  done();
                }
              });
            },
            error: (statusText, q) => {
              xfr.useFilters = false;
              done(new Error(statusText));
            }
          });
        });
        expect(ret).is.true;

        const wrapperRequestCORS = server.requests[0];
        expect(wrapperRequestCORS.url).is.equal(wrapperUrl);
        expect(wrapperRequestCORS.withCredentials).is.true;
        wrapperRequestCORS.respond(0);

        const wrapperRequest = server.requests[1];
        expect(wrapperRequest.url).is.equal(wrapperUrl);
        expect(wrapperRequest.withCredentials).is.false;
        wrapperRequest.respond(200, vastHeaders, wrapperContent);

        const vastRequest = server.requests[2];
        expect(vastRequest.url).is.equal(vastUrl);
        vastRequest.respond(200, vastHeaders, vastContent);
      });

      it('should fetch, follow and return a wrapped non-blob', function (done) {
        const options = {
          url_vast: urlVAST,
          url: wrapperUrl,
          bid: BID,
          blob: false
        };
        const ret = buildVideoUrl(options, function (url) {
          expect(url.substr(0, options.url_vast.length)).is.equal(options.url_vast);
          expect(/[?&]vast=blob%3/.test(url)).is.false;

          done();
        });
        expect(ret).is.true;

        const wrapperRequest = server.requests[0];
        expect(wrapperRequest.url).is.equal(wrapperUrl);
        wrapperRequest.respond(200, vastHeaders, wrapperContent);

        const vastRequest = server.requests[1];
        expect(vastRequest.url).is.equal(vastUrl);
        vastRequest.respond(200, vastHeaders, vastContent);
      });

      it('should not follow and return URL unchanged for non-wrap', function (done) {
        const options = {
          url: wrapperUrl,
          bid: BID,
          wrap: false
        };
        const ret = buildVideoUrl(options, function (url) {
          expect(url).is.equal(options.url);

          done();
        });
        expect(ret).is.true;
      });
    });
  });
});
