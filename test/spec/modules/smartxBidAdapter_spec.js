import {
  expect
} from 'chai';
import {
  spec
} from 'modules/smartxBidAdapter.js';

describe('The smartx adapter', function () {
  function getValidBidObject() {
    return {
      bidId: 123,
      mediaTypes: {
        video: {
          // context: 'outstream',
          playerSize: [
            ['640', '360']
          ]
        }
      },
      params: {
        tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
        publisherId: '__name__',
        siteId: '__name__',
        bidfloor: 0.3,
        bidfloorcur: 'EUR',
        // user: {
        // data: ''
        // }
        // outstream_options: {
        //    slot: 'yourelementid'
        // }
      }

    };
  };

  describe('isBidRequestValid', function () {
    var bid;

    beforeEach(function () {
      bid = getValidBidObject();
    });

    it('should fail validation if the bid isn\'t defined or not an object', function () {
      var result = spec.isBidRequestValid();

      expect(result).to.equal(false);

      result = spec.isBidRequestValid('not an object');

      expect(result).to.equal(false);
    });

    it('should succeed validation with all the right parameters', function () {
      expect(spec.isBidRequestValid(getValidBidObject())).to.equal(true);
    });

    it('should succeed validation with mediaType and outstream_function or outstream_options', function () {
      bid.mediaType = 'video';
      bid.params.outstream_function = 'outstream_func';

      expect(spec.isBidRequestValid(bid)).to.equal(true);

      delete bid.params.outstream_function;
      bid.params.outstream_options = {
        slot: 'yourelementid'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should succeed with ad_unit outstream and outstream function set', function () {
      bid.params.ad_unit = 'outstream';
      bid.params.outstream_function = function () {};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should succeed with mediaTypes_video_context outstream, options set for outstream and slot provided', function () {
      bid.mediaTypes.video.context = 'outstream';
      bid.params.outstream_options = {
        slot: 'yourelementid'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should fail without video', function () {
      delete bid.mediaTypes.video;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without playerSize', function () {
      delete bid.mediaTypes.video.playerSize;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without tagId', function () {
      delete bid.params.tagId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without publisherId', function () {
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without siteId', function () {
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should succeed with floor Module set', function () {
      delete bid.params.bidfloor;
      delete bid.params.bidfloorcur;
      bid.floors = {
        currency: 'EUR'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should fail with context outstream but no options set for outstream', function () {
      bid.mediaTypes.video.context = 'outstream';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail with context outstream, options set for outstream but no slot provided', function () {
      bid.mediaTypes.video.context = 'outstream';
      bid.params.outstream_options = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should succeed with context outstream, options set for outstream but no outstream_function is set', function () {
      bid.mediaTypes.video.context = 'outstream';
      bid.params.outstream_options = {
        slot: 'yourelementid'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    var bid,
      bidRequestObj;

    beforeEach(function () {
      bid = getValidBidObject();
      bidRequestObj = {
        refererInfo: {
          referer: 'prebid.js'
        }
      };
    });

    it('should build a very basic request', function () {
      var request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bid.sxp.smartclip.net/bid/1000');
      expect(request.bidRequest).to.equal(bidRequestObj);
      expect(request.data.imp[0].id).to.match(/\d+/);
      expect(request.data.imp[0].secure).to.equal(0);

      expect(request.data.imp[0].video).to.deep.equal({
        ext: {
          sdk_name: 'Prebid 1+'
        },
        h: '360',
        w: '640',
        mimes: [
          'application/javascript', 'video/mp4', 'video/webm'
        ],
        api: [2],
        delivery: [2],
        linearity: 1,
        maxbitrate: 3500,
        maxduration: 500,
        minbitrate: 0,
        minduration: 0,
        protocols: [
          2, 3, 5, 6
        ],
        startdelay: 0,
        placement: 1,
        pos: 1
      });

      expect(request.data.site).to.deep.equal({
        id: '__name__',
        page: 'prebid.js',
        cat: [''],
        domain: '',
        publisher: {
          id: '__name__'
        },
        content: {
          ext: {
            prebid: {
              name: 'pbjs',
              version: '$prebid.version$'
            }
          }
        }
      });
    });

    it('should change request parameters based on options sent', function () {
      var request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp[0].video.ext).to.deep.equal({
        sdk_name: 'Prebid 1+'
      });

      expect(request.data.imp[0].video).to.contain({
        placement: 1
      });

      bid.mediaTypes.video.context = 'outstream';

      bid.params = {
        outstream_options: {
          foo: 'bar'
        },
        outstream_function: '987',
        mimes: 'foo',
        linearity: 2,
        minduration: 5,
        maxduration: 10,
        startdelay: 1,
        minbitrate: 50,
        maxbitrate: 500,
        delivery: [1],
        pos: 2,
        api: [1],
        protocols: [
          2, 3, 5
        ],
        bidfloor: 55,
        bidfloorcur: 'foo',
        at: 1,
        cur: ['FOO']
      };

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp[0].video.ext).to.deep.equal({
        sdk_name: 'Prebid 1+'
      });

      expect(request.data.imp[0].video).to.contain({
        minduration: 5,
        maxduration: 10
      });

      expect(request.data.imp[0].video.startdelay).to.equal(1);

      expect(request.data.imp[0].video).to.contain({
        placement: 3
      });

      expect(request.data.imp[0].bidfloor).to.equal(55);

      expect(request.data.imp[0].bidfloorcur).to.equal('foo');

      expect(request.data.imp[0].video.linearity).to.equal(2);

      expect(request.data.imp[0].video.minbitrate).to.equal(50);

      expect(request.data.imp[0].video.maxbitrate).to.equal(500);
    });

    it('should pass GDPR params', function () {
      var request;

      bidRequestObj.gdprConsent = {
        gdprApplies: true,
        consentString: 'foo'
      }

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.be.an('string');
      expect(request.data.user.ext.consent).to.equal('foo');
    });

    it('should pass emq params', function () {
      var request;

      bid.params.user = {
        data: [{
          id: 'emq',
          name: 'emq',
          segment: [{
            name: 'emq',
            value: 'foo'
          }]
        }]
      }

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.user.data).to.deep.equal([{
        id: 'emq',
        name: 'emq',
        segment: {
          name: 'emq',
          value: 'foo'
        }
      }]);
    });

    it('should pass crumbs params', function () {
      var request;

      bid.crumbs = {
        pubcid: 'pubcid_1'
      };

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.user.ext).to.contain({
        fpc: 'pubcid_1'
      });
    });

    it('should pass linearity params', function () {
      var request;

      bid.params.linearity = 3

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp[0].video.linearity).to.equal(3);
    });

    it('should pass min and max duration params', function () {
      var request;

      bid.params.minduration = 3
      bid.params.maxduration = 15

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp[0].video.minduration).to.equal(3);
      expect(request.data.imp[0].video.maxduration).to.equal(15);
    });
  });

  describe('interpretResponse', function () {
    var serverResponse, bidderRequestObj;

    beforeEach(function () {
      bidderRequestObj = {
        bidRequest: {
          bids: [{
            mediaTypes: {
              video: {
                playerSize: [
                  ['400', '300']
                ]
              }
            },
            bidId: 123,
            params: {
              player_width: 400,
              player_height: 300,
              content_page_url: 'prebid.js',
              ad_mute: 1,
              outstream_options: {
                foo: 'bar'
              },
              outstream_function: 'function',
            }
          }, {
            mediaTypes: {
              video: {
                playerSize: [
                  ['200', '100']
                ]
              }
            },
            bidId: 124,
            params: {
              player_width: 200,
              player_height: 100,
              content_page_url: 'prebid.js',
              ad_mute: 1,
              outstream_options: {
                foo: 'bar'
              },
              outstream_function: 'function'
            }
          }]
        }
      };

      serverResponse = {
        body: {
          id: 12345,
          seatbid: [{
            bid: [{
              impid: 123,
              cur: 'USD',
              price: 12,
              adomain: ['abc.com'],
              crid: 321,
              w: 400,
              h: 300,
              ext: {
                slot: 'slot123'
              }
            }, {
              impid: 124,
              cur: 'USD',
              price: 13,
              adomain: ['def.com'],
              crid: 654,
              w: 200,
              h: 100,
              ext: {
                slot: 'slot124'
              }
            }]
          }]
        }
      };
    });

    it('should return an array of bid responses', function () {
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);
      expect(responses).to.be.an('array').with.length(2);
      expect(bidderRequestObj).to.be.an('Object');
      expect(bidderRequestObj.bidRequest.bids).to.be.an('array').with.length(2);
      expect(responses[0].meta.advertiserDomains[0]).to.equal('abc.com');
      expect(responses[0].requestId).to.equal(123);
      expect(responses[0].currency).to.equal('USD');
      expect(responses[0].cpm).to.equal(12);
      expect(responses[0].creativeId).to.equal(321);
      expect(responses[0].ttl).to.equal(360);
      expect(responses[0].netRevenue).to.equal(true);
      expect(responses[0].mediaType).to.equal('video');
      expect(responses[0].width).to.equal(400);
      expect(responses[0].height).to.equal(300);
      expect(responses[1].meta.advertiserDomains[0]).to.equal('def.com');
      expect(responses[1].requestId).to.equal(124);
      expect(responses[1].currency).to.equal('USD');
      expect(responses[1].cpm).to.equal(13);
      expect(responses[1].creativeId).to.equal(654);
      expect(responses[1].ttl).to.equal(360);
      expect(responses[1].netRevenue).to.equal(true);
      expect(responses[1].mediaType).to.equal('video');
      expect(responses[1].width).to.equal(200);
      expect(responses[1].height).to.equal(100);
    });
  });

  describe('oustreamRender', function () {
    var serverResponse, bidderRequestObj;

    beforeEach(function () {
      bidderRequestObj = {
        bidRequest: {
          bids: [{
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [
                  ['400', '300']
                ]
              }
            },
            bidId: 123,
            params: {
              player_width: 400,
              player_height: 300,
              content_page_url: 'prebid.js',
              ad_mute: 1,
              outstream_options: {
                slot: 'slot123'
              },
              outstream_function: 'function',
            }
          }]
        }
      };

      serverResponse = {
        body: {
          id: 12345,
          seatbid: [{
            bid: [{
              impid: 123,
              cur: 'USD',
              price: 12,
              adomain: ['abc.com'],
              crid: 321,
              w: 400,
              h: 300,
              ext: {
                slot: 'slot123'
              }
            }]
          }]
        }
      };
    });

    it('should attempt to insert the script without outstream config options set', function () {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        appendChild: sinon.stub().callsFake(function (script) {
          scriptTag = script
        })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(responses[0].renderer.url).to.equal('https://dco.smartclip.net/?plc=7777778');

      window.document.getElementById.restore();
    });

    it('should attempt to insert the script with outstream config options set', function () {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        appendChild: sinon.stub().callsFake(function (script) {
          scriptTag = script
        })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      bidderRequestObj.bidRequest.bids[0].params.outstream_options.startOpen = 'true';
      bidderRequestObj.bidRequest.bids[0].params.outstream_options.endingScreen = 'true';
      bidderRequestObj.bidRequest.bids[0].params.outstream_options.title = 'abc';
      bidderRequestObj.bidRequest.bids[0].params.outstream_options.skipOffset = 2;
      bidderRequestObj.bidRequest.bids[0].params.outstream_options.desiredBitrate = 123;
      bidderRequestObj.bidRequest.bids[0].params.outstream_options.visibilityThreshold = 30;

      responses[0].renderer.render(responses[0]);

      bidderRequestObj.bidRequest.bids[0].params.outstream_options.startOpen = 'false';
      bidderRequestObj.bidRequest.bids[0].params.outstream_options.endingScreen = 'false';

      responses[0].renderer.render(responses[0]);

      expect(responses[0].renderer.url).to.equal('https://dco.smartclip.net/?plc=7777778');

      window.document.getElementById.restore();
    });

    it('should attempt to insert the script without defined slot', function () {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        appendChild: sinon.stub().callsFake(function (script) {
          scriptTag = script
        })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      delete bidderRequestObj.bidRequest.bids[0].params.outstream_options.slot;

      responses[0].renderer.render(responses[0]);

      expect(responses[0].renderer.url).to.equal('https://dco.smartclip.net/?plc=7777778');

      window.document.getElementById.restore();
    });
  });

  describe('price floor module', function () {
    var bid,
      bidRequestObj;

    beforeEach(function () {
      bid = getValidBidObject();
      bidRequestObj = {
        refererInfo: {
          referer: 'prebid.js'
        }
      };
      delete bid.params.bidfloor;
    });

    it('obtain floor from getFloor', function () {
      bid.getFloor = () => {
        return {
          currency: 'EUR',
          floor: 3.21
        };
      };

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloor', 3.21);
    });

    it('obtain floor from params', function () {
      bid.getFloor = () => {
        return {
          currency: 'EUR',
          floor: 3.21
        };
      };
      bid.params.bidfloor = 0.64;

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloor', 0.64);
    });

    it('check currency USD', function () {
      bid.getFloor = () => {
        return {
          currency: 'USD',
          floor: 1.23
        };
      };
      bid.params.bidfloorcur = 'USD'

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloorcur', 'USD');
      expect(payload.data.imp[0]).to.have.property('bidfloor', 1.23);
    });

    it('check defaut currency EUR', function () {
      delete bid.params.bidfloorcur;

      bid.getFloor = () => {
        return {
          currency: 'EUR',
          floor: 4.56
        };
      };

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloorcur', 'EUR');
      expect(payload.data.imp[0]).to.have.property('bidfloor', 4.56);
    });

    it('bad floor value', function () {
      bid.getFloor = () => {
        return {
          currency: 'EUR',
          floor: 'bad'
        };
      };

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloor', 0);
    });

    it('empty floor object', function () {
      bid.getFloor = () => {
        return {};
      };

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloor', 0);
    });

    it('undefined floor result', function () {
      bid.getFloor = () => {};

      const payload = spec.buildRequests([bid], bidRequestObj)[0];
      expect(payload.data.imp[0]).to.have.property('bidfloor', 0);
    });
  });
})
