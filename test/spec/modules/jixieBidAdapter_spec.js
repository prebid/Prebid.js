import { expect } from 'chai';
import { spec, internal as jixieaux, storage } from 'modules/jixieBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';

describe('jixie Adapter', function () {
  const pageurl_ = 'https://testdomain.com/testpage.html';
  const domain_ = 'https://testdomain.com';
  const device_ = 'desktop';
  const timeout_ = 1000;
  const currency_ = 'USD';
  const keywords_ = '';

  /**
   * Basic
   */
  const adapter = newBidder(spec);
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  /**
   * isBidRequestValid
   */
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'jixie',
      'params': {
        'unit': 'prebidsampleunit'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params obj does not exist', function () {
      let bid0 = Object.assign({}, bid);
      delete bid0.params;
      expect(spec.isBidRequestValid(bid0)).to.equal(false);
    });

    it('should return false when params obj does not contain unit property', function () {
      let bid1 = Object.assign({}, bid);
      bid1.params = { rubbish: '' };
      expect(spec.isBidRequestValid(bid1)).to.equal(false);
    });
  });// describe

  /**
   * buildRequests
   */
  describe('buildRequests', function () {
    const adUnitCode0_ = 'adunit-code-0';
    const adUnitCode1_ = 'adunit-code-1';
    const adUnitCode2_ = 'adunit-code-2';

    const bidId0_ = '22a9eb5004cf082';
    const bidId1_ = '230fceb12fd754f';
    const bidId2_ = '24dbe5c4fb80ed8';

    const bidderRequestId_ = '2131ce076eeaa1b';
    const auctionId_ = '26d68819-d6ce-4a2c-a4d3-f1a97b159d66';

    const clientIdTest1_ = '1aba6a40-f711-11e9-868c-53a2ae972xxx';
    const sessionIdTest1_ = '1594782644-1aba6a40-f711-11e9-868c-53a2ae972xxx';
    const jxtokoTest1_ = 'eyJJRCI6ImFiYyJ9';
    const jxifoTest1_ = 'fffffbbbbbcccccaaaaae890606aaaaa';
    const jxtdidTest1_ = '222223d1-1111-2222-3333-b9f129299999';
    const jxcompTest1_ = 'AAAAABBBBBCCCCCDDDDDEEEEEUkkZPQfifpkPnnlJhtsa4o+gf4nfqgN5qHiTVX73ymTSbLT9jz1nf+Q7QdxNh9nTad9UaN5pzfHMt/rs1woQw72c1ip+8heZXPfKGZtZP7ldJesYhlo3/0FVcL/wl9ZlAo1jYOEfHo7Y9zFzNXABbbbbb==';
    const ckname1Val_ = 'ckckname1';
    const ckname2Val_ = 'ckckname2';
    const refJxEids_ = {
      'pubid1': ckname1Val_,
      'pubid2': ckname2Val_,
      '_jxtoko': jxtokoTest1_,
      '_jxifo': jxifoTest1_,
      '_jxtdid': jxtdidTest1_,
      '_jxcomp': jxcompTest1_
    };

    // to serve as the object that prebid will call jixie buildRequest with: (param2)
    const bidderRequest_ = {
      refererInfo: {referer: pageurl_},
      auctionId: auctionId_,
      timeout: timeout_
    };
    // to serve as the object that prebid will call jixie buildRequest with: (param1)
    let bidRequests_ = [
      {
        'bidder': 'jixie',
        'params': {
          'unit': 'prebidsampleunit'
        },
        'sizes': [[300, 250], [300, 600]],
        'adUnitCode': adUnitCode0_,
        'bidId': bidId0_,
        'bidderRequestId': bidderRequestId_,
        'auctionId': auctionId_,
        'ortb2Imp': {
          'ext': {
            'gpid': 'SUPERNEWS#DESKTOP#div-gpt-ad-Top_1-1'
          }
        }
      },
      {
        'bidder': 'jixie',
        'params': {
          'unit': 'prebidsampleunit'
        },
        'sizes': [[300, 250]],
        'mediaTypes': {
          'video': {
            'playerSize': [640, 360]
          },
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': adUnitCode1_,
        'bidId': bidId1_,
        'bidderRequestId': bidderRequestId_,
        'auctionId': auctionId_,
        'ortb2Imp': {
          'ext': {
            'gpid': 'SUPERNEWS#DESKTOP#div-gpt-ad-Top_1-2'
          }
        }
      },
      {
        'bidder': 'jixie',
        'params': {
          'unit': 'prebidsampleunit'
        },
        'sizes': [[300, 250], [300, 600]],
        'mediaTypes': {
          'video': {
            'playerSize': [640, 360]
          },
          'banner': {
            'sizes': [[300, 250], [300, 600]]
          }
        },
        'adUnitCode': adUnitCode2_,
        'bidId': bidId2_,
        'bidderRequestId': bidderRequestId_,
        'auctionId': auctionId_,
        'ortb2Imp': {
          'ext': {
            'gpid': 'SUPERNEWS#DESKTOP#div-gpt-ad-Top_1-3'
          }
        }
      }
    ];

    // To serve as a reference to check against the bids array portion of the blob that the call to
    // buildRequest returns
    const refBids_ = [
      {
        'bidId': bidId0_,
        'adUnitCode': adUnitCode0_,
        'sizes': [[300, 250], [300, 600]],
        'params': {
          'unit': 'prebidsampleunit'
        },
        'gpid': 'SUPERNEWS#DESKTOP#div-gpt-ad-Top_1-1'
      },
      {
        'bidId': bidId1_,
        'adUnitCode': adUnitCode1_,
        'mediaTypes': {
          'video': {
            'playerSize': [640, 360]
          },
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'sizes': [[300, 250]],
        'params': {
          'unit': 'prebidsampleunit'
        },
        'gpid': 'SUPERNEWS#DESKTOP#div-gpt-ad-Top_1-2'
      },
      {
        'bidId': bidId2_,
        'adUnitCode': adUnitCode2_,
        'mediaTypes': {
          'video': {
            'playerSize': [640, 360]
          },
          'banner': {
            'sizes': [[300, 250], [300, 600]]
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'params': {
          'unit': 'prebidsampleunit'
        },
        'gpid': 'SUPERNEWS#DESKTOP#div-gpt-ad-Top_1-3'
      }
    ];

    const testJixieCfg_ = {
      genids: [
        { id: 'pubid1', ck: 'ckname1' },
        { id: 'pubid2', ck: 'ckname2' },
        { id: '_jxtoko' },
        { id: '_jxifo' },
        { id: '_jxtdid' },
        { id: '_jxcomp' }
      ]
    };

    it('should attach valid params to the adserver endpoint (1)', function () {
      // this one we do not intercept the cookie stuff so really don't know
      // what will be in there. so we do not check here (using expect)
      // The next next below we check
      const request = spec.buildRequests(bidRequests_, bidderRequest_);
      it('sends bid request to ENDPOINT via POST', function () {
        expect(request.method).to.equal('POST')
      })
      expect(request.data).to.be.an('string');
      const payload = JSON.parse(request.data);
      expect(payload).to.have.property('timeout', timeout_);
      expect(payload).to.have.property('currency', currency_);
      expect(payload).to.have.property('bids').that.deep.equals(refBids_);
    });// it

    it('should attach valid params to the adserver endpoint (2)', function () {
      // similar to above test case but here we force some clientid sessionid values
      // and domain, pageurl
      // get the interceptors ready:
      let getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.callsFake(function fakeFn(prop) {
        if (prop == 'jixie') {
          return testJixieCfg_;
        }
        return null;
      });

      let getCookieStub = sinon.stub(storage, 'getCookie');
      let getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      getCookieStub
        .withArgs('ckname1')
        .returns(ckname1Val_);
      getCookieStub
        .withArgs('ckname2')
        .returns(ckname2Val_);
      getCookieStub
        .withArgs('_jxtoko')
        .returns(jxtokoTest1_);
      getCookieStub
        .withArgs('_jxtoko')
        .returns(jxtokoTest1_);
      getCookieStub
        .withArgs('_jxifo')
        .returns(jxifoTest1_);
      getCookieStub
        .withArgs('_jxtdid')
        .returns(jxtdidTest1_);
      getCookieStub
        .withArgs('_jxcomp')
        .returns(jxcompTest1_);
      getCookieStub
        .withArgs('_jxx')
        .returns(clientIdTest1_);
      getCookieStub
        .withArgs('_jxxs')
        .returns(sessionIdTest1_);
      getLocalStorageStub
        .withArgs('_jxx')
        .returns(clientIdTest1_);
      getLocalStorageStub
        .withArgs('_jxxs')
        .returns(sessionIdTest1_
        );
      let miscDimsStub = sinon.stub(jixieaux, 'getMiscDims');
      miscDimsStub
        .returns({ device: device_, pageurl: pageurl_, domain: domain_, mkeywords: keywords_ });

      // actual api call:
      const request = spec.buildRequests(bidRequests_, bidderRequest_);
      it('sends bid request to ENDPOINT via POST', function () {
        expect(request.method).to.equal('POST')
      })

      expect(request.data).to.be.an('string');
      const payload = JSON.parse(request.data);
      expect(payload).to.have.property('client_id_c', clientIdTest1_);
      expect(payload).to.have.property('client_id_ls', clientIdTest1_);
      expect(payload).to.have.property('session_id_c', sessionIdTest1_);
      expect(payload).to.have.property('session_id_ls', sessionIdTest1_);
      expect(payload).to.have.property('jxeids').that.deep.equals(refJxEids_);
      expect(payload).to.have.property('device', device_);
      expect(payload).to.have.property('domain', domain_);
      expect(payload).to.have.property('pageurl', pageurl_);
      expect(payload).to.have.property('mkeywords', keywords_);
      expect(payload).to.have.property('timeout', timeout_);
      expect(payload).to.have.property('currency', currency_);
      expect(payload).to.have.property('bids').that.deep.equals(refBids_);

      // unwire interceptors
      getCookieStub.restore();
      getLocalStorageStub.restore();
      getConfigStub.restore();
      miscDimsStub.restore();
    });// it

    it('it should popular the pricegranularity when info is available', function () {
      let content = {
        'ranges': [{
          'max': 12,
          'increment': 0.5
        },
        {
          'max': 5,
          'increment': 0.1
        }],
        precision: 1
      };
      let getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.callsFake(function fakeFn(prop) {
        if (prop == 'priceGranularity') {
          return content;
        }
        return null;
      });

      const oneSpecialBidReq = Object.assign({}, bidRequests_[0]);
      const request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      const payload = JSON.parse(request.data);
      getConfigStub.restore();
      expect(payload.pricegranularity).to.deep.include(content);
    });

    it('it should popular the device info when it is available', function () {
      let getConfigStub = sinon.stub(config, 'getConfig');
      let content = {w: 500, h: 400};
      getConfigStub.callsFake(function fakeFn(prop) {
        if (prop == 'device') {
          return content;
        }
        return null;
      });
      const oneSpecialBidReq = Object.assign({}, bidRequests_[0]);
      const request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      const payload = JSON.parse(request.data);
      getConfigStub.restore();
      expect(payload.device).to.have.property('ua', navigator.userAgent);
      expect(payload.device).to.deep.include(content);
    });

    it('schain info should be accessible when available', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'ssp.test',
          sid: '00001',
          hp: 1
        }]
      };
      const oneSpecialBidReq = Object.assign({}, bidRequests_[0], { schain: schain });
      const request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      const payload = JSON.parse(request.data);
      expect(payload.schain).to.deep.equal(schain);
      expect(payload.schain).to.deep.include(schain);
    });

    it('it should populate the floor info when available', function () {
      let oneSpecialBidReq = deepClone(bidRequests_[0]);
      let request, payload = null;
      // 1 floor is not set
      request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      payload = JSON.parse(request.data);
      expect(payload.bids[0].bidFloor).to.not.exist;

      // 2 floor is set
      let getFloorResponse = { currency: 'USD', floor: 2.1 };
      oneSpecialBidReq.getFloor = () => getFloorResponse;
      request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      payload = JSON.parse(request.data);
      expect(payload.bids[0].bidFloor).to.exist.and.to.equal(2.1);
    });

    it('it should populate the aid field when available', function () {
      let oneSpecialBidReq = deepClone(bidRequests_[0]);
      // 1 aid is not set in the jixie config
      let request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      let payload = JSON.parse(request.data);
      expect(payload.aid).to.eql('');

      // 2 aid is set in the jixie config
      let getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.callsFake(function fakeFn(prop) {
        if (prop == 'jixie') {
          return { aid: '11223344556677889900' };
        }
        return null;
      });
      request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      payload = JSON.parse(request.data);
      expect(payload.aid).to.exist.and.to.equal('11223344556677889900');
      getConfigStub.restore();
    });

    it('should populate eids when supported userIds are available', function () {
      const oneSpecialBidReq = Object.assign({}, bidRequests_[0], {
        userIdAsEids: [
          {
            'source': 'adserver.org',
            'uids': [
              {
                'id': '11111111-2222-3333-4444-555555555555',
                'atype': 1,
                'ext': {
                  'rtiPartner': 'TDID'
                }
              }
            ]
          },
          {
            'source': 'uidapi.com',
            'uids': [
              {
                'id': 'AbCdEfGhIjKlMnO9qdQBW7qtMw8f1WTUvtkHe6u+fqLfhbtsqrJ697Z6YoI3IB9klGUv1wvlFIbwH7ELDlqQBGtj8AC1v7fMJ/Q45E7W90dts7UQLTDMLNmtHBRDXVb0Fpas4Vh3yN1jGVQNhzXC/RpGIVtZE8dCxcjfa7VfcTNcvxxxxx==',
                'atype': 3
              }
            ]
          },
          {
            'source': 'puburl1.com',
            'uids': [
              {
                'id': 'pubid1',
                'atype': 1,
                'ext': {
                  'stype': 'ppuid'
                }
              }
            ]
          },
          {
            'source': 'puburl2.com',
            'uids': [
              {
                'id': 'pubid2'
              }
            ]
          },
        ],
      });
      const request = spec.buildRequests([oneSpecialBidReq], bidderRequest_);
      const payload = JSON.parse(request.data);
      expect(payload.eids).to.eql(oneSpecialBidReq.userIdAsEids);
    });
  });// describe

  /**
   * interpretResponse:
   */
  const JX_OTHER_OUTSTREAM_RENDERER_URL = 'https://scripts.jixie.media/dummyscript.js';
  const JX_OUTSTREAM_RENDERER_URL = 'https://scripts.jixie.media/jxhbrenderer.1.1.min.js';

  const mockVastXml_ = `<?xml version="1.0" encoding="UTF-8"?><VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0"><Ad id="JXAD521"><InLine><AdSystem>JXADSERVER</AdSystem><AdTitle>Alway%20Live%20Prebid%20Creative</AdTitle><Description>Hybrid in-stream</Description><Error><![CDATA[https://demo.com?action=error&errorcode=[ERRORCODE]&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Error><Impression><![CDATA[https://demo.com?action=impression&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Impression><Creatives><Creative id="JXAD521" sequence="1"><Linear><Duration>00:00:10</Duration><TrackingEvents><Tracking event="start"><![CDATA[https://demo.com?action=start&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://demo.com?action=firstQuartile&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="midpoint"><![CDATA[https://demo.com?action=midpoint&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://demo.com?action=thirdQuartile&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="complete"><![CDATA[https://demo.com?action=complete&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="mute"><![CDATA[https://demo.com?action=mute&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="unmute"><![CDATA[https://demo.com?action=unmute&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="rewind"><![CDATA[https://demo.com?action=rewind&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="pause"><![CDATA[https://demo.com?action=pause&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="resume"><![CDATA[https://demo.com?action=resume&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="fullscreen"><![CDATA[https://demo.com?action=fullscreen&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking><Tracking event="creativeView"><![CDATA[https://demo.com?action=creativeView&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[https://toko-iot.com/search/?q=Sonos&utm_source=ivs&utm_medium=video&utm_campaign=promo&utm_content=sonos_category]]></ClickThrough><ClickTracking id="521"><![CDATA[https://demo.com?action=click&mediaurl=[ASSETURI]&abc=1&stackidx=0]]></ClickTracking></VideoClicks><MediaFiles><MediaFile apiFramework="VPAID" type="application/javascript"><![CDATA[https://creatives.b-cdn.net/js/jxvpaid_1_0.min.js]]></MediaFile></MediaFiles><AdParameters><![CDATA[{"embed":true,"videos":[{"url":"https://creative-ivstream.ivideosmart.com/3001004/954006/3001004-954006_240.mp4","bitrate":186,"mimetype":"video/mp4"},{"url":"https://creative-ivstream.ivideosmart.com/3001004/954006/3001004-954006_360.mp4","bitrate":229,"mimetype":"video/mp4"},{"url":"https://creative-ivstream.ivideosmart.com/3001004/954006/3001004-954006_480.mp4","bitrate":279,"mimetype":"video/mp4"},{"url":"https://creative-ivstream.ivideosmart.com/3001004/954006/3001004-954006_720.mp4","bitrate":325,"mimetype":"video/mp4"}],"countpos":"left","hotspots":[{"type":"direct_url","start":0,"duration":10,"position":"top-right","direct_url":"https://toko-iot.com/catalogue/category/audio_8/?utm_source=ivs&utm_medium=banner&utm_campaign=promo&utm_content=audio_category","thumbnail_url":"https://creatives.ivideosmart.com/hotspots/TokoIOT_1.gif","thumbnail_style":"full-height"}],"clickthru":"https://toko-iot.com/search/?q=Sonos&utm_source=ivs&utm_medium=video&utm_campaign=promo&utm_content=sonos_category","reporting":{},"skipoffset":5}]]></AdParameters><Icons><Icon program="AdChoices" width="20" height="20" xPosition="right" yPosition="top" offset="00:00:02"><StaticResource creativeType="image/png"><![CDATA[https://creatives.jixie.media/jxadchoice.png]]></StaticResource><IconClicks><IconClickThrough><![CDATA[https://www.jixie.io/privacy-policy]]></IconClickThrough></IconClicks></Icon></Icons></Linear></Creative><Creative sequence="1"/></Creatives></InLine></Ad></VAST>`;
  const responseBody_ = {
    'bids': [
      // video (vast tag url) returned here
      {
        'jxBidId': '62847e4c696edcb-028d5dee-2c83-44e3-bed1-b75002475cdf',
        'requestId': '62847e4c696edcb',
        'cpm': 2.19,
        'width': 640,
        'height': 360,
        'ttl': 300,
        'adUnitCode': 'demoslot3-div',
        'netRevenue': true,
        'currency': 'USD',
        'creativeId': 'jixie522',
        'meta': {
          'networkId': 123,
          'networkName': 'network123',
          'agencyId': 123,
          'agencyName': 'agency123',
          'advertiserId': 123,
          'advertiserName': 'advertiser123',
          'brandId': 123,
          'brandName': 'brand123',
          'primaryCatId': 1,
          'secondaryCatIds': [
            2,
            3,
            4
          ],
          'mediaType': 'VIDEO'
        },
        'vastUrl': 'https://ad.jixie.io/v1/video?creativeid=522'
      },
      // display ad returned here: This one there is advertiserDomains
      // in the response . Will be checked in the unit tests below
      {
        'jxBidId': '600c9ae6fda1acb-028d5dee-2c83-44e3-bed1-b75002475cdf',
        'requestId': '600c9ae6fda1acb',
        'cpm': 1.999,
        'width': 300,
        'height': 250,
        'ttl': 300,
        'adUnitCode': 'demoslot1-div',
        'netRevenue': true,
        'currency': 'USD',
        'creativeId': 'jixie520',
        'meta': {
          'networkId': 123,
          'networkName': 'network123',
          'agencyId': 123,
          'agencyName': 'agency123',
          'advertiserId': 123,
          'advertiserName': 'advertiser123',
          'advertiserDomains': [
            'advdom1',
            'advdom2',
            'advdom3'
          ],
          'brandId': 123,
          'brandName': 'brand123',
          'primaryCatId': 1,
          'secondaryCatIds': [
            2,
            3,
            4
          ],
          'mediaType': 'BANNER'
        },
        'ad': '<div id="jxoutstream" style="width: 100%;"> <script type="text/javascript" src="https://scripts.jixie.media/jxfriendly.1.3.min.js" defer=""></script> <script> var p ={ responsive: 1, nested: 1, maxwidth: 640,  container: "jxoutstream", creativeid: 520}; function jxdefer(p) { if (window.jxuniversal) { window.jxuniversal.init(p); } else { setTimeout(function() { jxdefer(p) }, 100); } } jxdefer(p); </script> </div>'
      },
      // outstream, jx non-default renderer specified:
      {
        'jxBidId': '99bc539c81b00ce-028d5dee-2c83-44e3-bed1-b75002475cdf',
        'requestId': '99bc539c81b00ce',
        'cpm': 2.99,
        'width': 640,
        'height': 360,
        'ttl': 300,
        'netRevenue': true,
        'currency': 'USD',
        'creativeId': 'jixie521',
        'adUnitCode': 'demoslot4-div',
        'osplayer': 'jixie',
        'osparams': {
          'script': JX_OTHER_OUTSTREAM_RENDERER_URL
        },
        'vastXml': mockVastXml_
      },
      // outstream, jx default renderer:
      {
        'jxBidId': '61bc539c81b00ce-028d5dee-2c83-44e3-bed1-b75002475cdf',
        'requestId': '61bc539c81b00ce',
        'cpm': 1.99,
        'width': 640,
        'height': 360,
        'ttl': 300,
        'netRevenue': true,
        'currency': 'USD',
        'creativeId': 'jixie521',
        'meta': {
          'networkId': 123,
          'networkName': 'network123',
          'agencyId': 123,
          'agencyName': 'agency123',
          'advertiserId': 123,
          'advertiserName': 'advertiser123',
          'brandId': 123,
          'brandName': 'brand123',
          'primaryCatId': 1,
          'secondaryCatIds': [
            2,
            3,
            4
          ],
          'mediaType': 'VIDEO'
        },
        'adUnitCode': 'demoslot2-div',
        'osplayer': 'jixie',
        'osparams': {},
        'vastXml': mockVastXml_
      }
    ],
    'setids': {
      'client_id': '43aacc10-f643-11ea-8a10-c5fe2d394e7e',
      'session_id': '1600057934-43aacc10-f643-11ea-8a10-c5fe2d394e7e'
    },
  };
  const requestObj_ =
  {
    'method': 'POST',
    'url': 'http://localhost:8080/v2/hbpost',
    'data': '{"auctionid":"028d5dee-2c83-44e3-bed1-b75002475cdf","timeout":1000,"currency":"USD","timestamp":1600057934665,"device":"desktop","domain":"mock.com","pageurl":"https://mock.com/tests/jxprebidtest_pbjs.html","bids":[{"bidId":"600c9ae6fda1acb","adUnitCode":"demoslot1-div","mediaTypes":{"banner":{"sizes":[[300,250],[300,600],[728,90]]}},"params":{"unit":"prebidsampleunit"}},{"bidId":"61bc539c81b00ce","adUnitCode":"demoslot2-div","mediaTypes":{"video":{"playerSize":[[640,360]],"context":"outstream"}},"params":{"unit":"prebidsampleunit"}},{"bidId":"99bc539c81b00ce","adUnitCode":"demoslot4-div","mediaTypes":{"video":{"playerSize":[[640,360]],"context":"outstream"}},"params":{"unit":"prebidsampleunit"}},{"bidId":"62847e4c696edcb","adUnitCode":"demoslot3-div","mediaTypes":{"video":{"playerSize":[[640,360]],"context":"instream"}},"params":{"unit":"prebidsampleunit"}},{"bidId":"6360235ab01d2cd","adUnitCode":"woo-div","mediaTypes":{"video":{"context":"outstream","playerSize":[[640,360]]}},"params":{"unit":"80b76fc951e161d7c019d21b6639e408"}},{"bidId":"64d9724c7a5e512","adUnitCode":"test-div","mediaTypes":{"video":{"context":"outstream","playerSize":[[300,250]]}},"params":{"unit":"80b76fc951e161d7c019d21b6639e408"}},{"bidId":"65bea7e80fed44b","adUnitCode":"test-div","mediaTypes":{"banner":{"sizes":[[300,250],[300,600],[728,90]]}},"params":{"unit":"7854f723e932b951b6c51fc80b23a410"}},{"bidId":"6642054c4ba1b7f","adUnitCode":"div-banner-native-1","mediaTypes":{"banner":{"sizes":[[640,360]]},"video":{"context":"outstream","sizes":[[640,361]],"playerSize":[[640,360]]},"native":{"type":"image"}},"params":{"unit":"632e7695f0910ce0fa74c19859060a04"}},{"bidId":"675ecf4b44db228","adUnitCode":"div-banner-native-2","mediaTypes":{"banner":{"sizes":[[300,250]]},"native":{"title":{"required":true},"image":{"required":true},"sponsoredBy":{"required":true}}},"params":{"unit":"1000008-b1Q2UMQfZx"}},{"bidId":"68f2dbf5dc23f94","adUnitCode":"div-Top-MediumRectangle","mediaTypes":{"banner":{"sizes":[[300,250],[300,100],[320,50]]}},"params":{"unit":"1000008-b1Q2UMQfZx"}},{"bidId":"6991cf107bb7f1a","adUnitCode":"div-Middle-MediumRectangle","mediaTypes":{"banner":{"sizes":[[300,250],[300,100],[320,50]]}},"params":{"unit":"1000008-b1Q2UMQfZx"}},{"bidId":"706be1b011eac83","adUnitCode":"div-Inside-MediumRectangle","mediaTypes":{"banner":{"sizes":[[300,600],[300,250],[300,100],[320,480]]}},"params":{"unit":"1000008-b1Q2UMQfZx"}}],"client_id_c":"ebd0dea0-f5c8-11ea-a2c7-a5b37aa7fe95","client_id_ls":"ebd0dea0-f5c8-11ea-a2c7-a5b37aa7fe95","session_id_c":"","session_id_ls":"1600005388-ebd0dea0-f5c8-11ea-a2c7-a5b37aa7fe95"}',
    'currency': 'USD'
  };

  describe('interpretResponse', function () {
    it('handles nobid responses', function () {
      expect(spec.interpretResponse({body: {}}, {validBidRequests: []}).length).to.equal(0)
      expect(spec.interpretResponse({body: []}, {validBidRequests: []}).length).to.equal(0)
    });

    it('should get correct bid response', function () {
      let setCookieSpy = sinon.spy(storage, 'setCookie');
      let setLocalStorageSpy = sinon.spy(storage, 'setDataInLocalStorage');
      const result = spec.interpretResponse({body: responseBody_}, requestObj_)
      expect(setLocalStorageSpy.calledWith('_jxx', '43aacc10-f643-11ea-8a10-c5fe2d394e7e')).to.equal(true);
      expect(setLocalStorageSpy.calledWith('_jxxs', '1600057934-43aacc10-f643-11ea-8a10-c5fe2d394e7e')).to.equal(true);
      expect(setCookieSpy.calledWith('_jxxs', '1600057934-43aacc10-f643-11ea-8a10-c5fe2d394e7e')).to.equal(true);
      expect(setCookieSpy.calledWith('_jxx', '43aacc10-f643-11ea-8a10-c5fe2d394e7e')).to.equal(true);

      // video ad with vastUrl returned by adserver
      expect(result[0].requestId).to.equal('62847e4c696edcb')
      expect(result[0].cpm).to.equal(2.19)
      expect(result[0].width).to.equal(640)
      expect(result[0].height).to.equal(360)
      expect(result[0].creativeId).to.equal('jixie522')
      expect(result[0].currency).to.equal('USD')
      expect(result[0].netRevenue).to.equal(true)
      expect(result[0].ttl).to.equal(300)
      expect(result[0].vastUrl).to.include('https://ad.jixie.io/v1/video?creativeid=')
      // We will always make sure the meta->advertiserDomains property is there
      // If no info it is an empty array.
      expect(result[0].meta.advertiserDomains.length).to.equal(0)

      // display ad
      expect(result[1].requestId).to.equal('600c9ae6fda1acb')
      expect(result[1].cpm).to.equal(1.999)
      expect(result[1].width).to.equal(300)
      expect(result[1].height).to.equal(250)
      expect(result[1].creativeId).to.equal('jixie520')
      expect(result[1].currency).to.equal('USD')
      expect(result[1].netRevenue).to.equal(true)
      expect(result[1].ttl).to.equal(300)
      expect(result[1].ad).to.include('jxoutstream')
      expect(result[1].meta.advertiserDomains.length).to.equal(3)

      // should pick up about using alternative outstream renderer
      expect(result[2].requestId).to.equal('99bc539c81b00ce')
      expect(result[2].cpm).to.equal(2.99)
      expect(result[2].width).to.equal(640)
      expect(result[2].height).to.equal(360)
      expect(result[2].creativeId).to.equal('jixie521')
      expect(result[2].currency).to.equal('USD')
      expect(result[2].netRevenue).to.equal(true)
      expect(result[2].ttl).to.equal(300)
      expect(result[2].vastXml).to.include('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result[2].renderer.id).to.equal('demoslot4-div')
      expect(result[2].meta.advertiserDomains.length).to.equal(0)
      expect(result[2].renderer.url).to.equal(JX_OTHER_OUTSTREAM_RENDERER_URL);

      // should know to use default outstream renderer
      expect(result[3].requestId).to.equal('61bc539c81b00ce')
      expect(result[3].cpm).to.equal(1.99)
      expect(result[3].width).to.equal(640)
      expect(result[3].height).to.equal(360)
      expect(result[3].creativeId).to.equal('jixie521')
      expect(result[3].currency).to.equal('USD')
      expect(result[3].netRevenue).to.equal(true)
      expect(result[3].ttl).to.equal(300)
      expect(result[3].vastXml).to.include('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result[3].renderer.id).to.equal('demoslot2-div')
      expect(result[3].meta.advertiserDomains.length).to.equal(0)
      expect(result[3].renderer.url).to.equal(JX_OUTSTREAM_RENDERER_URL)

      setLocalStorageSpy.restore();
      setCookieSpy.restore();
    });// it
  });// describe

  /**
   * onBidWon
   */
  describe('onBidWon', function() {
    let ajaxStub;
    let miscDimsStub;
    beforeEach(function() {
      miscDimsStub = sinon.stub(jixieaux, 'getMiscDims');
      ajaxStub = sinon.stub(jixieaux, 'ajax');

      miscDimsStub
        .returns({ device: device_, pageurl: pageurl_, domain: domain_, mkeywords: keywords_ });
    })

    afterEach(function() {
      miscDimsStub.restore();
      ajaxStub.restore();
    })

    let TRACKINGURL_ = 'https://abc.com/sync?action=bidwon';

    it('Should fire if the adserver trackingUrl flag says so', function() {
      spec.onBidWon({ trackingUrl: TRACKINGURL_ })
      expect(jixieaux.ajax.calledWith(TRACKINGURL_)).to.equal(true);
    })
  }); // describe

  describe('getUserSyncs', function () {
    it('it should favour iframe over pixel if publisher allows iframe usersync', function () {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': true,
      }
      const response = {
        'userSyncs': [
          {
            'uf': 'https://syncstuff.jixie.io/',
            'up': 'https://syncstuff.jixie.io/image.gif'
          },
          {
            'up': 'https://syncstuff.jixie.io/image1.gif'
          }
        ]
      }
      let result = spec.getUserSyncs(syncOptions, [{ body: response }]);
      expect(result[0].type).to.equal('iframe')
      expect(result[1].type).to.equal('image')
    })

    it('it should pick pixel if publisher not allow iframe', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': true,
      }
      const response = {
        'userSyncs': [
          {
            'uf': 'https://syncstuff.jixie.io/',
            'up': 'https://syncstuff.jixie.io/image.gif'
          },
          {
            'up': 'https://syncstuff.jixie.io/image1.gif'
          }
        ]
      }
      let result = spec.getUserSyncs(syncOptions, [{ body: response }]);
      expect(result[0].type).to.equal('image')
      expect(result[1].type).to.equal('image')
    })

    it('it should return nothing if pub only allow pixel but all usersyncs are iframe only', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': true,
      }
      const response = {
        'userSyncs': [
          {
            'uf': 'https://syncstuff.jixie.io/',
          },
          {
            'uf': 'https://syncstuff2.jixie.io/',
          }
        ]
      }
      let result = spec.getUserSyncs(syncOptions, [{ body: response }]);
      expect(result.length).to.equal(0)
    })
  })
});
