import { expect } from 'chai';
import { spec } from 'modules/trustxBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';

describe('TrustXAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'trustx',
      'params': {
        'uid': '44'
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

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'uid': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    function parseRequest(data) {
      return JSON.parse(data);
    }
    const bidderRequest = {
      refererInfo: {referer: 'https://example.com'},
      bidderRequestId: '22edbae2733bf6',
      auctionId: '9e2dfbfe-00c7-4f5e-9850-4044df3229c7',
      timeout: 3000
    };
    const referrer = encodeURIComponent(bidderRequest.refererInfo.referer);

    let bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '43',
          'bidFloor': 1.25,
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250], [300, 600]]
          }
        },
        'bidId': '42dbe3a7168a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '9e2dfbfe-00c7-4f5e-9850-4044df3229c7',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '44',
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '9e2dfbfe-00c7-4f5e-9850-4044df3229c7',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '45',
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'mediaTypes': {
          'video': {
            'playerSize': [[400, 600]],
            'mimes': ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg']
          }
        },
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '9e2dfbfe-00c7-4f5e-9850-4044df3229c7',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '41',
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'mediaTypes': {
          'video': {
            'playerSize': [[400, 600]],
            'protocols': [1, 2, 3]
          },
          'banner': {
            'sizes': [[728, 90]]
          }
        },
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '9e2dfbfe-00c7-4f5e-9850-4044df3229c7',
      }
    ];

    it('should attach valid params to the tag', function () {
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.deep.equal({
        'id': bidderRequest.bidderRequestId,
        'site': {
          'page': referrer
        },
        'tmax': bidderRequest.timeout,
        'source': {
          'tid': bidderRequest.auctionId,
          'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
        },
        'imp': [{
          'id': bidRequests[0].bidId,
          'tagid': bidRequests[0].params.uid,
          'ext': {'divid': bidRequests[0].adUnitCode},
          'bidfloor': bidRequests[0].params.bidFloor,
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }]
      });
    });

    it('make possible to process request without mediaTypes', function () {
      const request = spec.buildRequests([bidRequests[0], bidRequests[1]], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.deep.equal({
        'id': bidderRequest.bidderRequestId,
        'site': {
          'page': referrer
        },
        'tmax': bidderRequest.timeout,
        'source': {
          'tid': bidderRequest.auctionId,
          'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
        },
        'imp': [{
          'id': bidRequests[0].bidId,
          'tagid': bidRequests[0].params.uid,
          'ext': {'divid': bidRequests[0].adUnitCode},
          'bidfloor': bidRequests[0].params.bidFloor,
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }, {
          'id': bidRequests[1].bidId,
          'tagid': bidRequests[1].params.uid,
          'ext': {'divid': bidRequests[1].adUnitCode},
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }]
      });
    });

    it('should attach valid params to the video tag', function () {
      const request = spec.buildRequests(bidRequests.slice(0, 3), bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.deep.equal({
        'id': bidderRequest.bidderRequestId,
        'site': {
          'page': referrer
        },
        'tmax': bidderRequest.timeout,
        'source': {
          'tid': bidderRequest.auctionId,
          'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
        },
        'imp': [{
          'id': bidRequests[0].bidId,
          'tagid': bidRequests[0].params.uid,
          'ext': {'divid': bidRequests[0].adUnitCode},
          'bidfloor': bidRequests[0].params.bidFloor,
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }, {
          'id': bidRequests[1].bidId,
          'tagid': bidRequests[1].params.uid,
          'ext': {'divid': bidRequests[1].adUnitCode},
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }, {
          'id': bidRequests[2].bidId,
          'tagid': bidRequests[2].params.uid,
          'ext': {'divid': bidRequests[2].adUnitCode},
          'video': {
            'w': 400,
            'h': 600,
            'mimes': ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg']
          }
        }]
      });
    });

    it('should support mixed mediaTypes', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.deep.equal({
        'id': bidderRequest.bidderRequestId,
        'site': {
          'page': referrer
        },
        'tmax': bidderRequest.timeout,
        'source': {
          'tid': bidderRequest.auctionId,
          'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
        },
        'imp': [{
          'id': bidRequests[0].bidId,
          'tagid': bidRequests[0].params.uid,
          'ext': {'divid': bidRequests[0].adUnitCode},
          'bidfloor': bidRequests[0].params.bidFloor,
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }, {
          'id': bidRequests[1].bidId,
          'tagid': bidRequests[1].params.uid,
          'ext': {'divid': bidRequests[1].adUnitCode},
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }, {
          'id': bidRequests[2].bidId,
          'tagid': bidRequests[2].params.uid,
          'ext': {'divid': bidRequests[2].adUnitCode},
          'video': {
            'w': 400,
            'h': 600,
            'mimes': ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg'],
          }
        }, {
          'id': bidRequests[3].bidId,
          'tagid': bidRequests[3].params.uid,
          'ext': {'divid': bidRequests[3].adUnitCode},
          'banner': {
            'w': 728,
            'h': 90,
            'format': [{'w': 728, 'h': 90}]
          },
          'video': {
            'w': 400,
            'h': 600,
            'protocols': [1, 2, 3]
          }
        }]
      });
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const gdprBidderRequest = Object.assign({gdprConsent: {consentString: 'AAA', gdprApplies: true}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, gdprBidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('user');
      expect(payload.user).to.have.property('ext');
      expect(payload.user.ext).to.have.property('consent', 'AAA');
      expect(payload).to.have.property('regs');
      expect(payload.regs).to.have.property('ext');
      expect(payload.regs.ext).to.have.property('gdpr', 1);
    });

    it('if usPrivacy is present payload must have us_privacy param', function () {
      const bidderRequestWithUSP = Object.assign({uspConsent: '1YNN'}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithUSP);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('regs');
      expect(payload.regs).to.have.property('ext');
      expect(payload.regs.ext).to.have.property('us_privacy', '1YNN');
    });

    it('if userId is present payload must have user.ext param with right keys', function () {
      const eids = [
        {
          source: 'pubcid.org',
          uids: [{
            id: 'some-random-id-value',
            atype: 1
          }]
        },
        {
          source: 'adserver.org',
          uids: [{
            id: 'some-random-id-value',
            atype: 1,
            ext: {
              rtiPartner: 'TDID'
            }
          }]
        }
      ];
      const bidRequestsWithUserIds = bidRequests.map((bid) => {
        return Object.assign({
          userIdAsEids: eids
        }, bid);
      });
      const request = spec.buildRequests(bidRequestsWithUserIds, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('user');
      expect(payload.user).to.have.property('ext');
      expect(payload.user.ext.eids).to.deep.equal(eids);
    });

    it('if schain is present payload must have source.ext.schain param', function () {
      const schain = {
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1
          }
        ]
      };
      const bidRequestsWithSChain = bidRequests.map((bid) => {
        return Object.assign({
          schain: schain
        }, bid);
      });
      const request = spec.buildRequests(bidRequestsWithSChain, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('source');
      expect(payload.source).to.have.property('ext');
      expect(payload.source.ext).to.have.property('schain');
      expect(payload.source.ext.schain).to.deep.equal(schain);
    });

    it('if content and segment is present in jwTargeting, payload must have right params', function () {
      const jsContent = {id: 'test_jw_content_id'};
      const jsSegments = ['test_seg_1', 'test_seg_2'];
      const bidRequestsWithJwTargeting = bidRequests.map((bid) => {
        return Object.assign({
          rtd: {
            jwplayer: {
              targeting: {
                segments: jsSegments,
                content: jsContent
              }
            }
          }
        }, bid);
      });
      const request = spec.buildRequests(bidRequestsWithJwTargeting, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('user');
      expect(payload.user.data).to.deep.equal([{
        name: 'iow_labs_pub_data',
        segment: [
          {name: 'jwpseg', value: jsSegments[0]},
          {name: 'jwpseg', value: jsSegments[1]}
        ]
      }]);
      expect(payload).to.have.property('site');
      expect(payload.site.content).to.deep.equal(jsContent);
    });

    it('should have user.data filled from config ortb2.user.data', function () {
      const userData = [
        {
          name: 'someName',
          segment: [1, 2, { anyKey: 'anyVal' }, 'segVal', { id: 'segId' }, { value: 'segValue' }, { id: 'segId2', name: 'segName' }]
        },
        {
          name: 'permutive.com',
          segment: [1, 2, 'segVal', { id: 'segId' }, { anyKey: 'anyVal' }, { value: 'segValue' }, { id: 'segId2', name: 'segName' }]
        },
        {
          someKey: 'another data'
        }
      ];

      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'ortb2.user.data' ? userData : null);
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      const payload = parseRequest(request.data);
      expect(payload.user.data).to.deep.equal(userData);
      getConfigStub.restore();
    });

    it('should have right value in user.data when jwpsegments are present', function () {
      const userData = [
        {
          name: 'someName',
          segment: [1, 2, { anyKey: 'anyVal' }, 'segVal', { id: 'segId' }, { value: 'segValue' }, { id: 'segId2', name: 'segName' }]
        },
        {
          name: 'permutive.com',
          segment: [1, 2, 'segVal', { id: 'segId' }, { anyKey: 'anyVal' }, { value: 'segValue' }, { id: 'segId2', name: 'segName' }]
        },
        {
          someKey: 'another data'
        }
      ];
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'ortb2.user.data' ? userData : null);

      const jsContent = {id: 'test_jw_content_id'};
      const jsSegments = ['test_seg_1', 'test_seg_2'];
      const bidRequestsWithJwTargeting = Object.assign({}, bidRequests[0], {
        rtd: {
          jwplayer: {
            targeting: {
              segments: jsSegments,
              content: jsContent
            }
          }
        }
      });
      const request = spec.buildRequests([bidRequestsWithJwTargeting], bidderRequest);
      const payload = parseRequest(request.data);
      expect(payload.user.data).to.deep.equal([{
        name: 'iow_labs_pub_data',
        segment: [
          {name: 'jwpseg', value: jsSegments[0]},
          {name: 'jwpseg', value: jsSegments[1]}
        ]
      }, ...userData]);
      getConfigStub.restore();
    });

    it('should contain the keyword values if it present in ortb2.(site/user)', function () {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'ortb2.user' ? {'keywords': 'foo,any'} : (arg === 'ortb2.site' ? {'keywords': 'bar'} : null));
      const keywords = {
        'site': {
          'somePublisher': [
            {
              'name': 'someName',
              'brandsafety': ['disaster'],
              'topic': ['stress', 'fear']
            }
          ]
        },
        'user': {
          'formatedPublisher': [
            {
              'name': 'fomatedName',
              'segments': [
                { 'name': 'segName1', 'value': 'segVal1' },
                { 'name': 'segName2', 'value': 'segVal2' }
              ]
            }
          ]
        }
      };
      const bidRequestWithKW = { ...bidRequests[0], params: { ...bidRequests[0].params, keywords } }
      const request = spec.buildRequests([bidRequestWithKW], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload.ext.keywords).to.deep.equal({
        'site': {
          'somePublisher': [
            {
              'name': 'someName',
              'segments': [
                { 'name': 'brandsafety', 'value': 'disaster' },
                { 'name': 'topic', 'value': 'stress' },
                { 'name': 'topic', 'value': 'fear' }
              ]
            }
          ],
          'ortb2': [
            {
              'name': 'keywords',
              'segments': [
                { 'name': 'keywords', 'value': 'bar' }
              ]
            }
          ]
        },
        'user': {
          'formatedPublisher': [
            {
              'name': 'fomatedName',
              'segments': [
                { 'name': 'segName1', 'value': 'segVal1' },
                { 'name': 'segName2', 'value': 'segVal2' }
              ]
            }
          ],
          'ortb2': [
            {
              'name': 'keywords',
              'segments': [
                { 'name': 'keywords', 'value': 'foo' },
                { 'name': 'keywords', 'value': 'any' }
              ]
            }
          ]
        }
      });
      getConfigStub.restore();
    });

    it('should be right tmax when timeout in config is less then timeout in bidderRequest', function() {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'bidderTimeout' ? 2000 : null);
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload.tmax).to.equal(2000);
      getConfigStub.restore();
    });
    it('should be right tmax when timeout in bidderRequest is less then timeout in config', function() {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'bidderTimeout' ? 5000 : null);
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload.tmax).to.equal(3000);
      getConfigStub.restore();
    });
    it('should contain imp[].ext.data.adserver if available', function() {
      const ortb2Imp = [{
        ext: {
          data: {
            adserver: {
              name: 'ad_server_name',
              adslot: '/111111/slot'
            },
            pbadslot: '/111111/slot'
          }
        }
      }, {
        ext: {
          data: {
            adserver: {
              name: 'ad_server_name',
              adslot: '/222222/slot'
            },
            pbadslot: '/222222/slot'
          }
        }
      }];
      const bidRequestsWithOrtb2Imp = bidRequests.slice(0, 3).map((bid, ind) => {
        return Object.assign(ortb2Imp[ind] ? { ortb2Imp: ortb2Imp[ind] } : {}, bid);
      });
      const request = spec.buildRequests(bidRequestsWithOrtb2Imp, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload.imp[0].ext).to.deep.equal({
        divid: bidRequests[0].adUnitCode,
        data: ortb2Imp[0].ext.data,
        gpid: ortb2Imp[0].ext.data.adserver.adslot
      });
      expect(payload.imp[1].ext).to.deep.equal({
        divid: bidRequests[1].adUnitCode,
        data: ortb2Imp[1].ext.data,
        gpid: ortb2Imp[1].ext.data.adserver.adslot
      });
      expect(payload.imp[2].ext).to.deep.equal({
        divid: bidRequests[2].adUnitCode
      });
    });
    it('should contain imp[].instl if available', function() {
      const ortb2Imp = [{
        instl: 1
      }, {
        instl: 2,
        ext: {
          data: {
            adserver: {
              name: 'ad_server_name',
              adslot: '/222222/slot'
            },
            pbadslot: '/222222/slot'
          }
        }
      }];
      const bidRequestsWithOrtb2Imp = bidRequests.slice(0, 3).map((bid, ind) => {
        return Object.assign(ortb2Imp[ind] ? { ortb2Imp: ortb2Imp[ind] } : {}, bid);
      });
      const request = spec.buildRequests(bidRequestsWithOrtb2Imp, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload.imp[0].instl).to.equal(1);
      expect(payload.imp[1].ext).to.deep.equal({
        divid: bidRequests[1].adUnitCode,
        data: ortb2Imp[1].ext.data,
        gpid: ortb2Imp[1].ext.data.adserver.adslot
      });
      expect(payload.imp[1].instl).to.equal(2);
      expect(payload.imp[2].ext).to.deep.equal({
        divid: bidRequests[2].adUnitCode
      });
      expect(payload.imp[2].instl).to.be.undefined;
    });
    it('all id like request fields must be a string', function () {
      const bidderRequestWithNumId = Object.assign({}, bidderRequest, { bidderRequestId: 123123, auctionId: 345345543 });

      let bidRequestWithNumId = {
        'bidder': 'trustx',
        'params': {
          'uid': 43,
        },
        'adUnitCode': 111111,
        'sizes': [[300, 250], [300, 600]],
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250], [300, 600]]
          }
        },
        'bidId': 23423423,
        'bidderRequestId': 123123,
        'auctionId': 345345543,
      };

      const request = spec.buildRequests([bidRequestWithNumId], bidderRequestWithNumId);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.deep.equal({
        'id': '123123',
        'site': {
          'page': referrer
        },
        'tmax': bidderRequest.timeout,
        'source': {
          'tid': '345345543',
          'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
        },
        'imp': [{
          'id': '23423423',
          'tagid': '43',
          'ext': {'divid': '111111'},
          'banner': {
            'w': 300,
            'h': 250,
            'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]
          }
        }]
      });
    });

    describe('floorModule', function () {
      const floorTestData = {
        'currency': 'USD',
        'floor': 1.50
      };
      const bidRequest = Object.assign({
        getFloor: (_) => {
          return floorTestData;
        }
      }, bidRequests[1]);
      it('should return the value from getFloor if present', function () {
        const request = spec.buildRequests([bidRequest], bidderRequest);
        expect(request.data).to.be.an('string');
        const payload = parseRequest(request.data);
        expect(payload.imp[0].bidfloor).to.equal(floorTestData.floor);
      });
      it('should return the getFloor.floor value if it is greater than bidfloor', function () {
        const bidfloor = 0.80;
        const bidRequestsWithFloor = { ...bidRequest };
        bidRequestsWithFloor.params = Object.assign({bidFloor: bidfloor}, bidRequestsWithFloor.params);
        const request = spec.buildRequests([bidRequestsWithFloor], bidderRequest);
        expect(request.data).to.be.an('string');
        const payload = parseRequest(request.data);
        expect(payload.imp[0].bidfloor).to.equal(floorTestData.floor);
      });
      it('should return the bidfloor value if it is greater than getFloor.floor', function () {
        const bidfloor = 1.80;
        const bidRequestsWithFloor = { ...bidRequest };
        bidRequestsWithFloor.params = Object.assign({bidFloor: bidfloor}, bidRequestsWithFloor.params);
        const request = spec.buildRequests([bidRequestsWithFloor], bidderRequest);
        expect(request.data).to.be.an('string');
        const payload = parseRequest(request.data);
        expect(payload.imp[0].bidfloor).to.equal(bidfloor);
      });
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'impid': '659423fff799cb', 'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300, 'adomain': ['somedomain.com']}], 'seat': '1'},
      {'bid': [{'impid': '4dff80cc4ee346', 'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 44, 'h': 600, 'w': 300}], 'seat': '1'},
      {'bid': [{'impid': '5703af74d0472a', 'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 43, 'h': 90, 'w': 728}], 'seat': '1'},
      {'bid': [{'impid': '659423faac49cb', 'price': 0, 'auid': 45, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 5</div>', 'h': 250, 'w': 300}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', function () {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['somedomain.com']
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct multi bid response', function () {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '5703af74d0472a',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['somedomain.com']
          },
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 44,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 0.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(0, 3)}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles wrong and nobid responses', function () {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '45'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '46'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '50'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '300bfeb0d7183bb',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(3)}}, request);
      expect(result.length).to.equal(0);
    });

    it('complicated case', function () {
      const fullResponse = [
        {'bid': [{'impid': '2164be6358b9', 'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
        {'bid': [{'impid': '4e111f1b66e4', 'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 44, 'h': 600, 'w': 300}], 'seat': '1'},
        {'bid': [{'impid': '26d6f897b516', 'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 43, 'h': 90, 'w': 728}], 'seat': '1'},
        {'bid': [{'impid': '326bde7fbf69', 'price': 0.15, 'adm': '<div>test content 4</div>', 'auid': 43, 'h': 600, 'w': 300}], 'seat': '1'},
        {'bid': [{'impid': '1751cd90161', 'price': 0.5, 'adm': '<div>test content 5</div>', 'auid': 44, 'h': 600, 'w': 350}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2164be6358b9',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '326bde7fbf69',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4e111f1b66e4',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '26d6f897b516',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '1751cd90161',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '2164be6358b9',
          'cpm': 1.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        },
        {
          'requestId': '4e111f1b66e4',
          'cpm': 0.5,
          'creativeId': 44,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        },
        {
          'requestId': '26d6f897b516',
          'cpm': 0.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        },
        {
          'requestId': '326bde7fbf69',
          'cpm': 0.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 4</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        },
        {
          'requestId': '1751cd90161',
          'cpm': 0.5,
          'creativeId': 44,
          'dealId': undefined,
          'width': 350,
          'height': 600,
          'ad': '<div>test content 5</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('dublicate uids and sizes in one slot', function () {
      const fullResponse = [
        {'bid': [{'impid': '5126e301f4be', 'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
        {'bid': [{'impid': '57b2ebe70e16', 'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '5126e301f4be',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '57b2ebe70e16',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '225fcd44b18c',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '5126e301f4be',
          'cpm': 1.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        },
        {
          'requestId': '57b2ebe70e16',
          'cpm': 0.5,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 2</div>',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
          'meta': {
            'advertiserDomains': []
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });
  });

  it('should get correct video bid response', function () {
    const bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '50'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '57dfefb80eca',
        'bidderRequestId': '20394420a762a2',
        'auctionId': '140132d07b031',
        'mediaTypes': {
          'video': {
            'context': 'instream'
          }
        }
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '51'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'e893c787c22dd',
        'bidderRequestId': '20394420a762a2',
        'auctionId': '140132d07b031',
        'mediaTypes': {
          'video': {
            'context': 'instream'
          }
        }
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '52'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '23312a43bc42',
        'bidderRequestId': '20394420a762a2',
        'auctionId': '140132d07b031',
        'mediaTypes': {
          'video': {
            'context': 'instream'
          }
        }
      }
    ];
    const response = [
      {'bid': [{'impid': '57dfefb80eca', 'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'auid': 50, content_type: 'video', w: 300, h: 600}], 'seat': '2'},
      {'bid': [{'impid': '5126e301f4be', 'price': 1.00, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>', 'auid': 51, content_type: 'video'}], 'seat': '2'},
      {'bid': [{'impid': '23312a43bc42', 'price': 2.00, 'nurl': 'https://some_test_vast_url.com', 'auid': 52, content_type: 'video', w: 300, h: 600}], 'seat': '2'},
    ];
    const request = spec.buildRequests(bidRequests);
    const expectedResponse = [
      {
        'requestId': '57dfefb80eca',
        'cpm': 1.15,
        'creativeId': 50,
        'dealId': undefined,
        'width': 300,
        'height': 600,
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': false,
        'ttl': 360,
        'meta': {
          'advertiserDomains': []
        },
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>'
        }
      },
      {
        'requestId': '23312a43bc42',
        'cpm': 2.00,
        'creativeId': 52,
        'dealId': undefined,
        'width': 300,
        'height': 600,
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': false,
        'ttl': 360,
        'meta': {
          'advertiserDomains': []
        },
        'vastUrl': 'https://some_test_vast_url.com',
      },
    ];

    const result = spec.interpretResponse({'body': {'seatbid': response}}, request);
    expect(result).to.deep.equal(expectedResponse);
  });

  it('should have right renderer in the bid response', function () {
    const spySetRenderer = sinon.spy();
    const stubRenderer = {
      setRender: spySetRenderer
    };
    const spyRendererInstall = sinon.spy(function() { return stubRenderer; });
    const stubRendererConst = {
      install: spyRendererInstall
    };
    const bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '50'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'e6e65553fc8',
        'bidderRequestId': '1380f393215dc7',
        'auctionId': '10b8d2f3c697e3',
        'mediaTypes': {
          'video': {
            'context': 'outstream'
          }
        }
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '51'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c8fdcb3f269f',
        'bidderRequestId': '1380f393215dc7',
        'auctionId': '10b8d2f3c697e3'
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '52'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '1de036c37685',
        'bidderRequestId': '1380f393215dc7',
        'auctionId': '10b8d2f3c697e3',
        'renderer': {}
      }
    ];
    const response = [
      {'bid': [{'impid': 'e6e65553fc8', 'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'auid': 50, content_type: 'video', w: 300, h: 600}], 'seat': '2'},
      {'bid': [{'impid': 'c8fdcb3f269f', 'price': 1.00, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>', 'auid': 51, content_type: 'video', w: 300, h: 250}], 'seat': '2'},
      {'bid': [{'impid': '1de036c37685', 'price': 1.20, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21376532\"><\/Ad>\n<\/VAST>', 'auid': 52, content_type: 'video', w: 300, h: 250}], 'seat': '2'}
    ];
    const request = spec.buildRequests(bidRequests);
    const expectedResponse = [
      {
        'requestId': 'e6e65553fc8',
        'cpm': 1.15,
        'creativeId': 50,
        'dealId': undefined,
        'width': 300,
        'height': 600,
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': false,
        'ttl': 360,
        'meta': {
          'advertiserDomains': []
        },
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>'
        },
        'renderer': stubRenderer
      },
      {
        'requestId': 'c8fdcb3f269f',
        'cpm': 1.00,
        'creativeId': 51,
        'dealId': undefined,
        'width': 300,
        'height': 250,
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': false,
        'ttl': 360,
        'meta': {
          'advertiserDomains': []
        },
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>'
        },
        'renderer': stubRenderer
      },
      {
        'requestId': '1de036c37685',
        'cpm': 1.20,
        'creativeId': 52,
        'dealId': undefined,
        'width': 300,
        'height': 250,
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': false,
        'ttl': 360,
        'meta': {
          'advertiserDomains': []
        },
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21376532\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21376532\"><\/Ad>\n<\/VAST>'
        }
      }
    ];

    const result = spec.interpretResponse({'body': {'seatbid': response}}, request, stubRendererConst);

    expect(spySetRenderer.calledTwice).to.equal(true);
    expect(spySetRenderer.getCall(0).args[0]).to.be.a('function');
    expect(spySetRenderer.getCall(1).args[0]).to.be.a('function');

    expect(spyRendererInstall.calledTwice).to.equal(true);
    expect(spyRendererInstall.getCall(0).args[0]).to.deep.equal({
      id: 'e6e65553fc8',
      url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
      loaded: false
    });
    expect(spyRendererInstall.getCall(1).args[0]).to.deep.equal({
      id: 'c8fdcb3f269f',
      url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
      loaded: false
    });

    expect(result).to.deep.equal(expectedResponse);
  });
});
