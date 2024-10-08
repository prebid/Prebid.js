import { spec, converter } from 'modules/equativBidAdapter.js';

describe('Equativ bid adapter tests', () => {
  const DEFAULT_BID_REQUESTS = [
    {
      adUnitCode: 'eqtv_42',
      bidId: 'abcd1234',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 200],
          ],
        },
      },
      bidder: 'equativ',
      params: {
        networkId: 111,
      },
      requestId: 'efgh5678',
      ortb2Imp: {
        ext: {
          tid: 'zsfgzzg',
        },
      },
    },
  ];

  const DEFAULT_BIDDER_REQUEST = {
    bidderCode: 'equativ',
    bids: DEFAULT_BID_REQUESTS,
  };

  const SAMPLE_RESPONSE = {
    body: {
      id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
      seatbid: [
        {
          bid: [
            {
              id: '1bh7jku7-ko2g-8654-ab72-h268shvwy271',
              impid: 'r12gwgf231',
              price: 0.6565,
              adm: '<h1>AD</h1>',
              adomain: ['abc.com'],
              cid: '1242512',
              crid: '535231',
              w: 300,
              h: 600,
              mtype: 1,
              cat: ['IAB19', 'IAB19-1'],
              cattax: 1,
            },
          ],
          seat: '4212',
        },
      ],
      cur: 'USD',
      statuscode: 0,
    },
  };

  // const RESPONSE_WITH_DSP_PIXELS = {
  //   ...SAMPLE_RESPONSE,
  //   body: {
  //     dspPixels: ['1st-pixel', '2nd-pixel', '3rd-pixel']
  //   }
  // };

  describe('buildRequests', () => {
    it('should build correct request using ORTB converter', () => {
      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );
      const dataFromConverter = converter.toORTB({
        bidderRequest: DEFAULT_BIDDER_REQUEST,
        bidRequests: DEFAULT_BID_REQUESTS,
      });
      expect(request).to.deep.equal({
        data: { ...dataFromConverter, id: request.data.id },
        method: 'POST',
        url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169',
      });
    });

    it('should add ext.bidder to imp object when siteId is defined', () => {
      const bidRequests = [
        { ...DEFAULT_BID_REQUESTS[0], params: { siteId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].ext.bidder).to.deep.equal({
        siteId: 123,
      });
    });

    it('should add ext.bidder to imp object when pageId is defined', () => {
      const bidRequests = [
        { ...DEFAULT_BID_REQUESTS[0], params: { pageId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].ext.bidder).to.deep.equal({
        pageId: 123,
      });
    });

    it('should add ext.bidder to imp object when formatId is defined', () => {
      const bidRequests = [
        { ...DEFAULT_BID_REQUESTS[0], params: { formatId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].ext.bidder).to.deep.equal({
        formatId: 123,
      });
    });

    it('should not add ext.bidder to imp object when siteId, pageId, formatId are not defined', () => {
      const bidRequests = [{ ...DEFAULT_BID_REQUESTS[0], params: {} }];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].ext.bidder).to.be.undefined;
    });

    it('should add site.publisher.id param', () => {
      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );
      expect(request.data.site.publisher.id).to.equal(111);
    });

    it('should send default floor of 0.0', () => {
      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );
      expect(request.data.imp[0]).to.have.property('bidfloor').that.eq(0.0);
    });

    it('should send secure connection', () => {
      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );
      expect(request.data.imp[0]).to.have.property('secure').that.within(0, 1);
    });

    it('should have tagid', () => {
      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );
      expect(request.data.imp[0]).to.have.property('tagid').that.eq(DEFAULT_BID_REQUESTS[0].adUnitCode);
    });

    it('should remove dt', () => {
      const bidRequests = [
        { ...DEFAULT_BID_REQUESTS[0], ortb2Imp: { dt: 1728377558235 } }
      ];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0]).to.not.have.property('dt');
    });
  });

  // describe('getUserSyncs', () => {
  //   it('should return empty array if no pixel sync not enabled', () => {
  //     const syncs = spec.getUserSyncs({}, RESPONSE_WITH_DSP_PIXELS);
  //     expect(syncs).to.deep.equal([]);
  //   });

  //   it('should return empty array if no pixels available', () => {
  //     const syncs = spec.getUserSyncs(
  //       { pixelEnabled: true },
  //       SAMPLE_RESPONSE
  //     );
  //     expect(syncs).to.deep.equal([]);
  //   });

  //   it('should register dsp pixels', () => {
  //     const syncs = spec.getUserSyncs(
  //       { pixelEnabled: true },
  //       RESPONSE_WITH_DSP_PIXELS
  //     );
  //     expect(syncs).to.have.lengthOf(3);
  //     expect(syncs[1]).to.deep.equal({
  //       type: 'image',
  //       url: '2nd-pixel',
  //     });
  //   });
  // });

  describe('interpretResponse', () => {
    it('should return data returned by ORTB converter', () => {
      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );
      const bids = spec.interpretResponse(SAMPLE_RESPONSE, request);
      expect(bids).to.deep.equal(
        converter.fromORTB({
          request: request.data,
          response: SAMPLE_RESPONSE.body,
        })
      );
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true if params.networkId is set', () => {
      const bidRequest = {
        params: {
          networkId: 123,
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2Imp.site.publisher.id is set', () => {
      const bidRequest = {
        ortb2Imp: {
          site: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2Imp.app.publisher.id is set', () => {
      const bidRequest = {
        ortb2Imp: {
          app: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2Imp.dooh.publisher.id is set', () => {
      const bidRequest = {
        ortb2Imp: {
          dooh: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false if networkId is not set', () => {
      const bidRequest = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });
});
