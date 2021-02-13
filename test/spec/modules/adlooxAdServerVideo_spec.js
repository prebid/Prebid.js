import adapterManager from 'src/adapterManager.js';
import analyticsAdapter from 'modules/adlooxAnalyticsAdapter.js';
import { buildVideoUrl } from 'modules/adlooxAdServerVideo.js';
import { expect } from 'chai';
import events from 'src/events.js';
import { server } from 'test/mocks/xhr.js';
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

  const creativeUrl = 'http://example.invalid/c';
  const vastHeaders = {
    'content-type': 'application/xml; charset=utf-8'
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

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]);

    adapterManager.enableAnalytics({
      provider: analyticsAdapterName,
      options: analyticsOptions
    });
    expect(analyticsAdapter.context).is.not.null;
  });

  afterEach(function () {
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
        sandbox.stub(targeting, 'getWinningBids').withArgs(adUnit.code).returns([ bid ]);

        const ret = buildVideoUrl({ url: vastUrl }, function () {});
        expect(ret).is.false;

        const retAdUnit = buildVideoUrl({ url: vastUrl, adUnit: adUnit }, function () {})
        expect(retAdUnit).is.true;

        const retBid = buildVideoUrl({ url: vastUrl, bid: bid }, function () {});
        expect(retBid).is.true;

        done();
      });

      it('should reject non-string options.url', function (done) {
        const ret = buildVideoUrl({ url: null, bid: bid }, function () {});

        expect(ret).is.false;

        done();
      });

      it('should reject non-boolean options.wrap', function (done) {
        const ret = buildVideoUrl({ wrap: null, url: vastUrl, bid: bid }, function () {});

        expect(ret).is.false;

        done();
      });

      it('should reject non-boolean options.blob', function (done) {
        const ret = buildVideoUrl({ blob: null, url: vastUrl, bid: bid }, function () {});

        expect(ret).is.false;

        done();
      });
    });

    describe('process VAST', function () {
      it('should return URL unchanged for non-VAST', function (done) {
        const ret = buildVideoUrl({ url: vastUrl, bid: bid }, function (url) {
          expect(url).is.equal(vastUrl);

          done();
        });
        expect(ret).is.true;

        const request = server.requests[0];
        expect(request.url).is.equal(vastUrl);
        request.respond(200, { 'content-type': 'application/octet-stream' }, 'notvast');
      });

      it('should return URL unchanged for empty VAST', function (done) {
        const ret = buildVideoUrl({ url: vastUrl, bid: bid }, function (url) {
          expect(url).is.equal(vastUrl);

          done();
        });
        expect(ret).is.true;

        const request = server.requests[0];
        expect(request.url).is.equal(vastUrl);
        request.respond(200, vastHeaders, '<?xml version="1.0" encoding="UTF-8" ?>\n<VAST version="3.0"/>');
      });

      it('should fetch, retry on withoutCredentials, follow and return a wrapped blob that expires', function (done) {
        const bidExpires = utils.deepClone(bid);
        bidExpires.responseTimestamp = utils.timestamp();
        bidExpires.ttl = 30;

        const clock = sandbox.useFakeTimers(bidExpires.responseTimestamp);

        const options = {
          url_vast: 'https://j.adlooxtracking.com/ads/vast/tag-dev.php',
          url: wrapperUrl,
          bid: bidExpires
        };
        const ret = buildVideoUrl(options, function (url) {
          expect(url.substr(0, options.url_vast.length)).is.equal(options.url_vast);

          const match = url.match(/[?&]vast=(blob%3A[^&]+)/);
          expect(match).is.not.null;

          let success = false;
          const blob = decodeURIComponent(match[1]);
          fetch(blob)
            .then(function(response) {
              expect(response.ok).is.true;
              expect(response.headers.get('content-type')).is.equals(vastHeaders['content-type']);

              success = true;

              clock.tick(bidExpires.ttl * 1000 + 10);

              return fetch(response.url);
            })
            .catch(function (error) {
              expect(error).is.not.undefined;
              expect(success).is.true;

              done();
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
          url_vast: 'https://j.adlooxtracking.com/ads/vast/tag-dev.php',
          url: wrapperUrl,
          bid: bid,
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
          bid: bid,
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
