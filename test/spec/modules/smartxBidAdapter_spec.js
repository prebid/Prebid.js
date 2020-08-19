import {
  expect
} from 'chai';
import {
  spec
} from 'modules/smartXBidAdapter.js';

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

    it('should fail without bidfloor', function () {
      delete bid.params.bidfloor;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without bidfloorcur', function () {
      delete bid.params.bidfloorcur;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
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
      bid.mediaTypes.video.content = 'outstream';
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
      expect(request.data.imp.id).to.match(/\d+/);
      expect(request.data.imp.secure).to.equal(0);

      expect(request.data.imp.video).to.deep.equal({
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
        content: 'content',
        id: '__name__',
        page: 'prebid.js',
        cat: '',
        domain: '',
        publisher: {
          id: '__name__'
        }
      });
    });

    it('should change request parameters based on options sent', function () {
      var request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.video.ext).to.deep.equal({
        sdk_name: 'Prebid 1+'
      });

      expect(request.data.imp.video).to.contain({
        placement: 1
      });

      bid.params = {
        outstream_options: {
          foo: 'bar'
        },
        outstream_function: '987',
        mimes: 'foo',
        linearity: '2',
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
        cur: ['FOO'],
        user: {
          data: [{
            id: 'emq',
            name: 'emq',
            segment: [{
              name: 'ang_cntp',
              value: 'foo'
            }]
          }]
        }
      };

      bid.crumbs = {
        pubcid: 'pubcid_1'
      };

      bid.mediaTypes.video.context = 'outstream';

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.video).to.contain({
        minduration: 5,
        maxduration: 10
      });

      expect(request.data.imp.video.ext).to.deep.equal({
        sdk_name: 'Prebid 1+'
      });

      expect(request.data.imp.video).to.contain({
        placement: 3
      });

      expect(request.data.user.ext).to.contain({
        fpc: 'pubcid_1'
      });

      expect(request.data.imp.video.startdelay).to.equal(1);

      expect(request.data.imp.bidfloor).to.equal(55);

      expect(request.data.user.data).to.deep.equal([{
        id: 'emq',
        name: 'emq',
        segment: {
          name: 'emq',
          value: 'foo'
        }
      }]);
    });
  });
})
