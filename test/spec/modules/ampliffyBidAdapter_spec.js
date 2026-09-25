import {
  parseXML,
  isAllowedToBidUp,
  spec,
  getDefaultParams,
  mergeParams,
  paramsToQueryString, setCurrentURL
} from 'modules/ampliffyBidAdapter.js';
import { expect } from 'chai';
import { BANNER, VIDEO } from 'src/mediaTypes';
import { newBidder } from 'src/adapters/bidderFactory';

describe('Ampliffy bid adapter Test', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });
  // Global definitions for all tests
  const xmlStr = `<?xml version="1.0" encoding="UTF-8"?>
                  <Ads type="video">
                    <Companion id="138316138683">
                      <HTMLResource><![CDATA[
                              <ad cpmMap=\'{"ES":".23","MX":".13"}\'
                                  cpmCurrency=\'USD\'
                                  creativeMap=\'{"https://bidder.ampliffy.com/gampad/ads?adName=6463aa7b7f147.xml":["ES","MX"]}\'
                                  domainMap=\'["testSports.com","sports.com"]\'
                                  excludedURLs=\'["www.no-allowed.com/busqueda/sexo/sexo"]\' />
                              ]]>
                      </HTMLResource>
                    </Companion>
                    <VASTAdTagURI><![CDATA[http://localhost:8080?adurl=https://es.ampliffy.com/%3FgeoData%26ct%3DES%26st%3D%26city%3D0%26dma%3D0%26zp%3D08192%26bw%3D4]]></VASTAdTagURI>
                    <Extensions><Extension type="geo"><Country>ES</Country></Extension></Extensions>
                  </Ads>`;
  const xml = new window.DOMParser().parseFromString(xmlStr, 'text/xml');
  const companion = xml.getElementsByTagName('Companion')[0];
  const htmlResource = companion.getElementsByTagName('HTMLResource')[0];
  const htmlContent = document.implementation.createHTMLDocument('');
  htmlContent.documentElement.innerHTML = htmlResource.textContent;

  describe('Is allowed to bid up', function () {
    it('Should return true using a URL that is in domainMap', () => {
      const allowedToBidUp = isAllowedToBidUp(htmlContent, 'https://testSports.com?id=131313&text=aaaaa&foo=foo');
      expect(allowedToBidUp).to.be.true;
    });

    it('Should return false using an url that is not in domainMap', () => {
      const allowedToBidUp = isAllowedToBidUp(htmlContent, 'https://test.com');
      expect(allowedToBidUp).to.be.false;
    });

    it('Should return false using an url that is excluded.', () => {
      const allowedToBidUp = isAllowedToBidUp(htmlContent, 'https://www.no-allowed.com/busqueda/sexo/sexo?test=1#item1');
      expect(allowedToBidUp).to.be.false;
    });
  });

  describe('Helper functions', function () {
    it('Should default params not to be null', () => {
      const defaultParams = getDefaultParams();

      expect(defaultParams).not.to.be.null;
    });
    it('Should the merge two object params into a new object', () => {
      const params1 = {
        'hello': 'world',
        'ampTest': 'this will be replaced'
      };
      const params2 = {
        'test': 1,
        'ampTest': 'This will be replace the param with the same name in other array'
      };
      const allParams = mergeParams(params1, params2);

      const paramsComplete =
        {
          'hello': 'world',
          'ampTest': 'This will be replace the param with the same name in other array',
          'test': 1,
        };
      expect(allParams).not.to.be.null;
      expect(JSON.stringify(allParams)).to.equal(JSON.stringify(paramsComplete));
    });
    it('Params to QueryString', () => {
      const params = {
        'test': 1,
        'ampTest': 'ret',
        'empty': null,
        'quoteMark': '?',
        'test1': undefined
      };
      const queryString = paramsToQueryString(params);

      expect(queryString).not.to.be.null;
      expect(queryString).to.equal('test=1&ampTest=ret&empty&quoteMark=%3F');
    });
  });

  describe('isBidRequestValid', function () {
    it('Should return true when required params found', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'all'
        },
        mediaTypes: {
          banner: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });
    it('Should return false when param format is display but mediaTypes are for video', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'display'
        },
        mediaTypes: {
          video: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
    it('Should return false when param format is video but mediaTypes are for banner', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'video'
        },
        mediaTypes: {
          banner: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
    it('Should return true when param format is video and mediaTypes are for video', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'video'
        },
        mediaTypes: {
          video: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });
    it('Should return true when param format is display and mediaTypes are for banner', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'display'
        },
        mediaTypes: {
          banner: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });
    it('Should return true when param format is all and mediaTypes are for banner', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'all'
        },
        mediaTypes: {
          banner: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });
    it('Should return true when param format is all and mediaTypes are for video', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {
          server: 'bidder.ampliffy.com',
          placementId: 1235465798,
          format: 'all'
        },
        mediaTypes: {
          video: {
            sizes: [1, 1]
          }
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });
    it('Should return false without placementId param', function () {
      const bidRequest = {
        bidder: 'ampliffy',
        params: {}
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
    it('Should return false without param object', function () {
      const bidRequest = {
        bidder: 'ampliffy',
      };
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('Build request function', function () {
    const bidderRequest = {
      'bidderCode': 'ampliffy',
      'auctionId': 'c4a771bf-1791-4513-82b3-96c48d19ddff',
      'bidderRequestId': '1134bdcbe47f25',
      'bids': [{
        'bidder': 'ampliffy',
        'params': {
          'placementId': 1235465798,
          'type': 'bidder.',
          'region': 'alan-development.k8s.',
          'adnetwork': 'ampliffy.com',
          'SERVER': 'bidder.ampliffy.com'
        },
        'crumbs': { 'pubcid': '29844d69-c4e5-4b00-8602-6dd09815363a' },
        'ortb2Imp': { 'ext': { 'data': { 'pbadslot': 'video1' } } },
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [[640, 480]],
            'mimes': ['video/mp4'],
            'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
            'playbackmethod': [2],
            'skip': 1
          }
        },
        'adUnitCode': 'video1',
        'transactionId': 'f85c1b10-bad3-4c3f-a2bb-2c484c405bc9',
        'sizes': [[640, 480]],
        'bidId': '2bc71d9c058842',
        'bidderRequestId': '1134bdcbe47f25',
        'auctionId': 'c4a771bf-1791-4513-82b3-96c48d19ddff',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }],
      'auctionStart': 1644029483655,
      'timeout': 3000,
      'refererInfo': {
        'referer': 'http://localhost:9999/integrationExamples/gpt/hello_world_video.html?pbjs_debug=true',
        'reachedTop': true,
        'isAmp': false,
        'numIframes': 0,
        'stack': ['http://localhost:9999/integrationExamples/gpt/hello_world_video.html?pbjs_debug=true'],
        'canonicalUrl': null
      },
      'start': 1644029483708
    };
    const validBidRequests = [
      {
        'bidder': 'ampliffy',
        'params': {
          'placementId': 1235465798,
          'type': 'bidder.',
          'region': 'alan-development.k8s.',
          'adnetwork': 'ampliffy.com',
          'SERVER': 'bidder.ampliffy.com'
        },
        'crumbs': { 'pubcid': '29844d69-c4e5-4b00-8602-6dd09815363a' },
        'ortb2Imp': { 'ext': { 'data': { 'pbadslot': 'video1' } } },
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [[640, 480]],
            'mimes': ['video/mp4'],
            'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
            'playbackmethod': [2],
            'skip': 1
          }
        },
        'adUnitCode': 'video1',
        'transactionId': 'f85c1b10-bad3-4c3f-a2bb-2c484c405bc9',
        'sizes': [[640, 480]],
        'bidId': '2bc71d9c058842',
        'bidderRequestId': '1134bdcbe47f25',
        'auctionId': 'c4a771bf-1791-4513-82b3-96c48d19ddff',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ];
    it('Should return one or more bid requests', function () {
      expect(spec.buildRequests(validBidRequests, bidderRequest).length).to.be.greaterThan(0);
    });
  });
  describe('Interpret response', function () {
    // Set by markup under test, below, and read back from the global scope an
    // inline handler would run in. Cleared here so it cannot outlive its test
    // even on a path that never reaches the test's own cleanup.
    const INERT_MARKER = '__ampliffyInertParseProbe';
    afterEach(() => { delete window[INERT_MARKER]; });

    const bidRequest = {
      bidRequest: {
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        auctionId: '469bb2e2-351f-4d01-b782-cdbca5e3e0ed',
        bidId: '2d40b8dcd02ade',
        bidRequestsCount: 1,
        bidder: 'ampliffy',
        bidderRequestId: '128c07edc4680f',
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        crumbs: {
          pubcid: '29844d69-c4e5-4b00-8602-6dd09815363a'
        },
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600]
            ]
          }
        },
        ortb2Imp: { ext: {} },
        params: { placementId: 13144370 },
        sizes: [
          [300, 250],
          [300, 600]
        ],
        src: 'client',
        transactionId: '103b2b58-6ed1-45e9-9486-c942d6042e3'
      },
      data: { bidId: '2d40b8dcd02ade' },
      method: 'GET',
      url: 'https://test.com',
    };

    it('Should extract a CPM and currency from the xml', () => {
      const cpmData = parseXML(xml);
      expect(cpmData).to.not.be.a('null');
      expect(cpmData.cpm).to.equal('.23');
      expect(cpmData.currency).to.equal('USD');
    });

    it('Should extract from a payload wrapped in html/head/body', () => {
      // HTMLResource payloads generally carry their own document wrapper, so the
      // parse has to handle one. This is a characterization test: extraction is
      // unaffected by the wrapper and it passes against the pre-change module too.
      // The unclosed <div> is deliberate - legal HTML and a fatal XML error - so
      // this also pins that the parse stays lenient.
      const xmlStrWrapped = `<?xml version="1.0" encoding="UTF-8"?>
                  <Ads type="video">
                    <Companion id="138316138683">
                      <HTMLResource><![CDATA[<!doctype html>
                              <html><head></head>
                                <body>
                                  <div class="GoogleActiveViewInnerContainer"></div>
                                  <div cpmMap=\'{"ES":".42"}\' cpmCurrency=\'GBP\'
                                       creativeMap=\'{"https://bidder.ampliffy.com/gampad/ads?adName=wrapped.xml":["ES"]}\'>
                                </body>
                              </html>]]>
                      </HTMLResource>
                    </Companion>
                    <Extensions><Extension type="geo"><Country>ES</Country></Extension></Extensions>
                  </Ads>`;
      const xmlWrapped = new window.DOMParser().parseFromString(xmlStrWrapped, 'text/xml');
      const cpmData = parseXML(xmlWrapped, { width: 300, height: 250 });

      expect(cpmData.cpm).to.equal('.42');
      expect(cpmData.currency).to.equal('GBP');
      expect(cpmData.creativeURL).to.equal('https://bidder.ampliffy.com/gampad/ads?adName=wrapped.xml');
    });

    it('Should read the first attribute in document order, not one the parse invented', () => {
      // Every extractor takes querySelectorAll('[attr]')[0], so a parse that
      // surfaces an earlier match changes which element is read. An attribute on
      // the payload's own <html> tag is the case that separates the inert parsers:
      // a full document parse exposes it and it wins, ahead of the real values.
      const xmlStrDecoy = `<?xml version="1.0" encoding="UTF-8"?>
                  <Ads type="video">
                    <Companion id="138316138683">
                      <HTMLResource><![CDATA[<!doctype html>
                              <html cpmMap=\'{"ES":"9.99"}\' cpmCurrency=\'USD\'>
                                <body>
                                  <div cpmMap=\'{"ES":".42"}\' cpmCurrency=\'GBP\'></div>
                                </body>
                              </html>]]>
                      </HTMLResource>
                    </Companion>
                    <Extensions><Extension type="geo"><Country>ES</Country></Extension></Extensions>
                  </Ads>`;
      const xmlDecoy = new window.DOMParser().parseFromString(xmlStrDecoy, 'text/xml');
      const cpmData = parseXML(xmlDecoy, { width: 300, height: 250 });

      expect(cpmData.cpm).to.equal('.42');
      expect(cpmData.currency).to.equal('GBP');
    });

    it('Should not run event handlers declared in the response markup', (done) => {
      // The markup below is parsed, not rendered. Parsed into a document with
      // scripting enabled, the onerror content attribute becomes a live handler
      // and runs when the deliberately undecodable image fails.
      const marker = INERT_MARKER;
      const undecodableImage = 'data:image/png;base64,not-a-png';
      const cleanUp = () => { delete window[marker]; };
      window[marker] = false;
      try {
        const xmlStrHandler = `<?xml version="1.0" encoding="UTF-8"?>
                  <Ads type="video">
                    <Companion id="138316138683">
                      <HTMLResource><![CDATA[
                              <img src="${undecodableImage}" onerror="window.${marker} = true"
                                   cpmMap=\'{"ES":".77"}\' cpmCurrency=\'CHF\'>
                              ]]>
                      </HTMLResource>
                    </Companion>
                    <Extensions><Extension type="geo"><Country>ES</Country></Extension></Extensions>
                  </Ads>`;
        const xmlHandler = new window.DOMParser().parseFromString(xmlStrHandler, 'text/xml');
        const cpmData = parseXML(xmlHandler);

        // Guards against passing vacuously. These attributes sit on the same
        // element as the handler, so reading them back proves that this element
        // survived the parse - a strategy that dropped or stripped it could not
        // reach here and then claim inertness.
        expect(cpmData.cpm).to.equal('.77');
        expect(cpmData.currency).to.equal('CHF');

        // A compiled handler fires from the image's error task, which lands well
        // under a millisecond after the parse. Poll to a deadline orders of
        // magnitude beyond that: fail the moment the marker flips, pass only once
        // the deadline has gone by without it flipping.
        //
        // The deadline is elapsed time, not a tick count. Timer delivery is not
        // guaranteed to keep to the interval - a browser throttles timers hard in
        // a backgrounded page - and counting ticks would turn that into a mocha
        // timeout on a correct module.
        //
        // Waiting on a second image's error event instead does not work, however
        // much tidier it looks. The two error tasks are queued sub-millisecond
        // apart and nothing orders them, so that version passes against a module
        // that does run the handler about half the time.
        const deadlineMs = 500;
        const startedAt = Date.now();
        const poll = setInterval(() => {
          const fired = window[marker];
          if (!fired && Date.now() - startedAt < deadlineMs) return;
          clearInterval(poll);
          cleanUp();
          done(fired ? new Error('an onerror handler from the response markup ran during parsing') : undefined);
        }, 10);
      } catch (e) {
        cleanUp();
        throw e;
      }
    });

    it('It should return no ads when the CPM is less than zero.', () => {
      const xmlStr1 = `<?xml version="1.0" encoding="UTF-8"?>
                      <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
                      <Ad id="1">
                       <Wrapper>
                        <Companion id="138316138683" width="1" height="1">
                          <HTMLResource>
                            <![CDATA[<!doctype html>
                              <html><head></head>
                                <body>
                                  <div class="GoogleActiveViewInnerContainer"></div>
                                  <div>
                                    <div data-vidco-metrics="0"
                                    data-taxonomy-ampliffy="AMPP---000017"
                                    data-taxonomy-creator=""
                                    cpmMap=\'{"ES":"-1","MX":"0.0"}\'
                                    cpmCurrency=\'{"ES":"USD","MX":"MXN"}\'></div>
                                  </div>
                                </body>
                              </html>
                            ]]>
                          </HTMLResource>
                        </Companion>
                        <VASTAdTagURI><![CDATA[http://localhost:8080?adurl=https://es.ampliffy.com/%3FgeoData%26ct%3DES%26st%3D%26city%3D0%26dma%3D0%26zp%3D08192%26bw%3D4]]></VASTAdTagURI>
                        <Extensions><Extension type="geo"><Country>ES</Country></Extension></Extensions>
                        </Wrapper>
                       </Ad>
                      </VAST>`;
      const serverResponse = {
        'body': xmlStr1,
      };
      const bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(0);
    });

    it('It should return no ads when the creative url is not in the xml', () => {
      const xmlStr1 = `<?xml version="1.0" encoding="UTF-8"?>
                        <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
                         <Ad id="1">
                          <Wrapper>
                            <Companion id="138316138683" width="1" height="1">
                            <HTMLResource>
                              <![CDATA[<!doctype html><html>
                                <head></head>
                                <body>
                                  <div class="GoogleActiveViewInnerContainer"></div>
                                  <div style="display:inline">
                                    <div data-title="Bidder test"
                                    cpmMap=\'{"ES":".10","MX":"0"}\'
                                    cpmCurrency=\'{"ES":"USD","MX":"MXN"}\'>
                                  </div>
                                </body>
                              </html>]]>
                            </HTMLResource>
                          </Companion>
                          <Extensions><Extension type="geo"><Country>ES</Country></Extension></Extensions>
                          </Wrapper>
                         </Ad>
                        </VAST>`;
      const serverResponse = {
        'body': xmlStr1,
      };
      const bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(0);
    });
    it('It should return a banner ad.', () => {
      const serverResponse = {
        'body': xmlStr,
      };
      setCurrentURL('https://www.sports.com');
      const bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).greaterThan(0);
      expect(bidResponses[0].mediaType).to.be.equal(BANNER);
      expect(bidResponses[0].ad).not.to.be.null;
    });
    it('It should return a video ad.', () => {
      const serverResponse = {
        'body': xmlStr,
      };
      setCurrentURL('https://www.sports.com');
      bidRequest.bidRequest.mediaTypes = {
        video: {
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }
      };
      const bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).greaterThan(0);
      expect(bidResponses[0].mediaType).to.be.equal(VIDEO);
      expect(bidResponses[0].vastUrl).not.to.be.null;
    });
  });
});
