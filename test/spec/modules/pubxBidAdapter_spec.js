import {expect} from 'chai';
import {spec} from 'modules/pubxBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

describe('pubxAdapter', function () {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://api.primecaster.net/adlogue/api/slot/bid';

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'pubx',
      params: {
        sid: '12345abc'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        id: '26c1ee0038ac11',
        params: {
          sid: '12345abc'
        }
      }
    ];

    const data = {
      banner: {
        sid: '12345abc'
      }
    };

    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('should attach params to the banner request', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.data).to.deep.equal(data.banner);
    });
  });

  describe('getUserSyncs', function () {
    const sandbox = sinon.sandbox.create();

    const keywordsText = 'meta1,meta2,meta3,meta4,meta5';
    const descriptionText = 'description1description2description3description4description5description';

    let documentStubMeta;

    beforeEach(function () {
      documentStubMeta = sandbox.stub(document, 'getElementsByName');
      const metaElKeywords = document.createElement('meta');
      metaElKeywords.setAttribute('name', 'keywords');
      metaElKeywords.setAttribute('content', keywordsText);
      documentStubMeta.withArgs('keywords').returns([metaElKeywords]);

      const metaElDescription = document.createElement('meta');
      metaElDescription.setAttribute('name', 'description');
      metaElDescription.setAttribute('content', descriptionText);
      documentStubMeta.withArgs('description').returns([metaElDescription]);
    });

    afterEach(function () {
      documentStubMeta.restore();
    });

    let kwString = '';
    let kwEnc = '';
    let descContent = '';
    let descEnc = '';

    it('returns empty sync array when iframe is not enabled', function () {
      const syncOptions = {};
      expect(spec.getUserSyncs(syncOptions)).to.deep.equal([]);
    });

    it('returns kwEnc when there is kwTag with more than 20 length', function () {
      const kwArray = keywordsText.substr(0, 20).split(',');
      kwArray.pop();
      kwString = kwArray.join();
      kwEnc = encodeURIComponent(kwString);
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs[0].url).to.include(`pkw=${kwEnc}`);
    });

    it('returns kwEnc when there is kwTag with more than 60 length', function () {
      descContent = descContent.substr(0, 60);
      descEnc = encodeURIComponent(descContent);
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs[0].url).to.include(`pkw=${descEnc}`);
    });

    it('returns titleEnc when there is titleContent with more than 30 length', function () {
      let titleText = 'title1title2title3title4title5title';
      const documentStubTitle = sandbox.stub(document, 'title').value(titleText);

      if (titleText.length > 30) {
        titleText = titleText.substr(0, 30);
      }

      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs[0].url).to.include(`pt=${encodeURIComponent(titleText)}`);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        TTL: 300,
        adm: '<div>some creative</div>',
        cid: 'TKmB',
        cpm: 500,
        currency: 'JPY',
        height: 250,
        width: 300,
        adomains: [
          'test.com'
        ],
      }
    }

    const bidRequests = [
      {
        id: '26c1ee0038ac11',
        params: {
          sid: '12345abc'
        }
      }
    ];

    const bidResponses = [
      {
        requestId: '26c1ee0038ac11',
        cpm: 500,
        currency: 'JPY',
        width: 300,
        height: 250,
        creativeId: 'TKmB',
        netRevenue: true,
        ttl: 300,
        ad: '<div>some creative</div>',
        meta: {
          advertiserDomains: [
            'test.com'
          ]
        },
      }
    ];
    it('should return empty array when required param is empty', function () {
      const serverResponseWithCidEmpty = {
        body: {
          TTL: 300,
          adm: '<div>some creative</div>',
          cid: '',
          cpm: '',
          currency: 'JPY',
          height: 250,
          width: 300,
        }
      }
      const result = spec.interpretResponse(serverResponseWithCidEmpty, bidRequests[0]);
      expect(result).to.be.empty;
    });
    it('handles banner responses', function () {
      const result = spec.interpretResponse(serverResponse, bidRequests[0])[0];
      expect(result.requestId).to.equal(bidResponses[0].requestId);
      expect(result.width).to.equal(bidResponses[0].width);
      expect(result.height).to.equal(bidResponses[0].height);
      expect(result.creativeId).to.equal(bidResponses[0].creativeId);
      expect(result.currency).to.equal(bidResponses[0].currency);
      expect(result.netRevenue).to.equal(bidResponses[0].netRevenue);
      expect(result.ttl).to.equal(bidResponses[0].ttl);
      expect(result.ad).to.equal(bidResponses[0].ad);
      expect(result.meta.advertiserDomains).deep.to.equal(bidResponses[0].meta.advertiserDomains);
    });
  });
});
