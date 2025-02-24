import { converter, spec } from 'modules/akceloBidAdapter.js';
import * as utils from '../../../src/utils.js';
import { deepClone } from '../../../src/utils.js';
import sinon from 'sinon';

describe('Akcelo bid adapter tests', () => {
  let sandBox;

  beforeEach(() => {
    sandBox = sinon.createSandbox();
    sandBox.stub(utils, 'logError');
  });

  afterEach(() => sandBox.restore());

  const DEFAULT_BANNER_BID_REQUESTS = [
    {
      adUnitCode: 'div-banner-id',
      bidId: 'bid-123',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600],
          ],
        },
      },
      bidder: 'akcelo',
      params: {
        siteId: 123,
        adUnitId: 456,
      },
      requestId: 'request-123',
    }
  ];

  const DEFAULT_BANNER_BIDDER_REQUEST = {
    bidderCode: 'akcelo',
    bids: DEFAULT_BANNER_BID_REQUESTS,
  };

  const SAMPLE_RESPONSE = {
    body: {
      id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
      seatbid: [
        {
          bid: [
            {
              id: '1bh7jku7-ko2g-8654-ab72-h268abcde271',
              impid: 'bid-123',
              price: 0.6565,
              adm: '<h1>AD</h1>',
              adomain: ['abc.com'],
              cid: '1242512',
              crid: '535231',
              w: 300,
              h: 600,
              mtype: 1,
              ext: {
                prebid: {
                  type: 'banner',
                }
              }
            },
          ],
          seat: '4212',
        },
      ],
      cur: 'EUR',
    },
  };

  describe('isBidRequestValid', () => {
    it('should return true if params.siteId and params.adUnitId are set', () => {
      const bidRequest = {
        params: {
          siteId: 123,
          adUnitId: 456,
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false if params.siteId is missing', () => {
      const bidRequest = {
        params: {
          adUnitId: 456,
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false if params.adUnitId is missing', () => {
      const bidRequest = {
        params: {
          siteId: 123,
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('should build correct requests using ORTB converter', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      );
      const dataFromConverter = converter.toORTB({
        bidderRequest: DEFAULT_BANNER_BIDDER_REQUEST,
        bidRequests: DEFAULT_BANNER_BID_REQUESTS,
      });
      expect(request[0]).to.deep.equal({
        data: { ...dataFromConverter, id: request[0].data.id },
        method: 'POST',
        url: 'https://s2s.sportslocalmedia.com/openrtb2/auction',
      });
    });

    it('should add site.publisher.ext.prebid.parentAccount to request object when siteId is defined', () => {
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      expect(request.data.site.publisher.ext.prebid.parentAccount).to.equal(123);
    });

    it('should not add site.publisher.ext.prebid.parentAccount to request object when siteId is not defined', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], params: { adUnitId: 456 } },
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.site.publisher.ext.prebid.parentAccount).to.be.undefined;
    });

    it('should add ext.akcelo to imp object when siteId and adUnitId are defined', () => {
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      expect(request.data.imp[0].ext.akcelo).to.deep.equal({
        siteId: 123,
        adUnitId: 456,
      });
    });

    it('should not add ext.akcelo.siteId to imp object when siteId is not defined', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], params: { adUnitId: 456 } },
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.akcelo.siteId).to.be.undefined;
      expect(utils.logError.calledOnce).to.equal(true);
      expect(utils.logError.args[0][0]).to.equal('Missing parameter : siteId')
    });

    it('should not add ext.akcelo.adUnitId to imp object when adUnitId is not defined', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], params: { siteId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.akcelo.adUnitId).to.be.undefined;
      expect(utils.logError.calledOnce).to.equal(true);
      expect(utils.logError.args[0][0]).to.equal('Missing parameter : adUnitId')
    });

    it('should add ext.akcelo.test=1 to imp object when param akcelo_demo is true', () => {
      sandBox.stub(utils, 'getParameterByName').callsFake(() => 'true');
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      expect(request.data.imp[0].ext.akcelo.test).to.equal(1);
    });

    it('should not add ext.akcelo.test to imp object when param akcelo_demo is not true', () => {
      sandBox.stub(utils, 'getParameterByName').callsFake(() => 'something_else');
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      expect(request.data.imp[0].ext.akcelo.test).to.be.undefined;
    });

    it('should not add ext.akcelo.test to imp object when param akcelo_demo is not defined', () => {
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      expect(request.data.imp[0].ext.akcelo.test).to.be.undefined;
    });
  });

  describe('interpretResponse', () => {
    it('should return data returned by ORTB converter', () => {
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      const bids = spec.interpretResponse(SAMPLE_RESPONSE, request);
      const responseFromConverter = converter.fromORTB({
        request: request.data,
        response: SAMPLE_RESPONSE.body,
      });
      expect(bids).to.deep.equal(responseFromConverter.bids);
    });

    it('should find the media type from bid.mtype if possible', () => {
      const serverResponse = deepClone(SAMPLE_RESPONSE);
      serverResponse.body.seatbid[0].bid[0].mtype = 2;
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids[0].mediaType).to.equal('video');
    });

    it('should find the media type from bid.ext.prebid.type if mtype is not defined', () => {
      const serverResponse = deepClone(SAMPLE_RESPONSE);
      delete serverResponse.body.seatbid[0].bid[0].mtype;
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids[0].mediaType).to.equal('banner');
    });

    it('should skip the bid if bid.mtype and bid.ext.prebid.type are not defined', () => {
      const serverResponse = deepClone(SAMPLE_RESPONSE);
      delete serverResponse.body.seatbid[0].bid[0].mtype;
      delete serverResponse.body.seatbid[0].bid[0].ext.prebid.type;
      const request = spec.buildRequests(DEFAULT_BANNER_BID_REQUESTS, DEFAULT_BANNER_BIDDER_REQUEST)[0];
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.empty;
    });
  });

  describe('getUserSyncs', () => {
    it('should return an empty array if iframe sync is not enabled', () => {
      const syncs = spec.getUserSyncs({}, [SAMPLE_RESPONSE], null, null);
      expect(syncs).to.deep.equal([]);
    });

    it('should return an array with iframe url', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [SAMPLE_RESPONSE], null, null);
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://ads.sportslocalmedia.com/load-cookie.html?endpoint=akcelo'
      }]);
    });

    it('should return an array with iframe URL and GDPR parameters', () => {
      const gdprConsent = { gdprApplies: true, consentString: 'the_gdpr_consent' };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [SAMPLE_RESPONSE], gdprConsent, null);
      expect(syncs[0].url).to.contain('?endpoint=akcelo&gdpr=1&gdpr_consent=the_gdpr_consent');
    });

    it('should return an array with iframe URL containing empty GDPR parameters when GDPR does not apply', () => {
      const gdprConsent = { gdprApplies: false };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [SAMPLE_RESPONSE], gdprConsent, null);
      expect(syncs[0].url).to.contain('?endpoint=akcelo&gdpr=0&gdpr_consent=');
    });

    it('should URI encode the GDPR consent string', () => {
      const gdprConsent = { gdprApplies: true, consentString: 'the_gdpr_consent==' };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [SAMPLE_RESPONSE], gdprConsent, null);
      expect(syncs[0].url).to.contain('?endpoint=akcelo&gdpr=1&gdpr_consent=the_gdpr_consent%3D%3D');
    });

    it('should return an array with iframe URL containing USP parameters when USP is defined', () => {
      const uspConsent = 'the_usp_consent';
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [SAMPLE_RESPONSE], null, uspConsent);
      expect(syncs[0].url).to.contain('?endpoint=akcelo&us_privacy=the_usp_consent');
    });

    it('should URI encode the USP consent string', () => {
      const uspConsent = 'the_usp_consent==';
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [SAMPLE_RESPONSE], null, uspConsent);
      expect(syncs[0].url).to.contain('?endpoint=akcelo&us_privacy=the_usp_consent%3D%3D');
    });
  });
});
