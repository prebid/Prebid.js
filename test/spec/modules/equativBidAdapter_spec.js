import { BANNER } from 'src/mediaTypes.js';
import { getBidFloor } from 'libraries/equativUtils/equativUtils.js'
import { converter, spec, storage } from 'modules/equativBidAdapter.js';

describe('Equativ bid adapter tests', () => {
  const DEFAULT_BID_REQUESTS = [
    {
      adUnitCode: 'eqtv_42',
      bidId: 'abcd1234',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600],
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

    it('should pass ortb2.site.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BID_REQUESTS[0],
        ortb2: {
          site: {
            publisher: {
              id: 98,
            }
          }
        }
      }];
      delete bidRequests[0].params;
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.site.publisher.id).to.equal(98);
    });

    it('should pass networkId as site.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BID_REQUESTS[0],
        ortb2: {
          site: {
            publisher: {}
          }
        }
      }];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.site.publisher.id).to.equal(111);
    });

    it('should pass ortb2.app.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BID_REQUESTS[0],
        ortb2: {
          app: {
            publisher: {
              id: 27,
            }
          }
        }
      }];
      delete bidRequests[0].params;
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.app.publisher.id).to.equal(27);
    });

    it('should pass networkId as app.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BID_REQUESTS[0],
        ortb2: {
          app: {
            publisher: {}
          }
        }
      }];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.app.publisher.id).to.equal(111);
    });

    it('should pass ortb2.dooh.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BID_REQUESTS[0],
        ortb2: {
          dooh: {
            publisher: {
              id: 35,
            }
          }
        }
      }];
      delete bidRequests[0].params;
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.dooh.publisher.id).to.equal(35);
    });

    it('should pass networkId as dooh.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BID_REQUESTS[0],
        ortb2: {
          dooh: {
            publisher: {}
          }
        }
      }];
      const bidderRequest = { ...DEFAULT_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.dooh.publisher.id).to.equal(111);
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
      expect(request.data.imp[0]).to.have.property('secure').that.eq(1);
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

    it('should read and send pid as buyeruid', () => {
      const cookieData = {
        'eqt_pid': '7789746781'
      };
      const getCookieStub = sinon.stub(storage, 'getCookie');
      getCookieStub.callsFake(cookieName => cookieData[cookieName]);

      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );

      expect(request.data.user).to.have.property('buyeruid').that.eq(cookieData['eqt_pid']);

      getCookieStub.restore();
    });

    it('should not send buyeruid', () => {
      const getCookieStub = sinon.stub(storage, 'getCookie');
      getCookieStub.callsFake(() => null);

      const request = spec.buildRequests(
        DEFAULT_BID_REQUESTS,
        DEFAULT_BIDDER_REQUEST
      );

      expect(request.data).to.not.have.property('user');

      getCookieStub.restore();
    });

    it('should pass buyeruid defined in config', () => {
      const getCookieStub = sinon.stub(storage, 'getCookie');
      getCookieStub.callsFake(() => undefined);

      const bidRequest = {
        ...DEFAULT_BIDDER_REQUEST,
        ortb2: {
          user: {
            buyeruid: 'buyeruid-provided-by-publisher'
          }
        }
      };
      const request = spec.buildRequests([ DEFAULT_BID_REQUESTS[0] ], bidRequest);

      expect(request.data.user.buyeruid).to.deep.eq(bidRequest.ortb2.user.buyeruid);

      getCookieStub.restore();
    });
  });

  describe('getBidFloor', () => {
    it('should return floor of 0.0 if floor module not available', () => {
      const bid = {
        ...DEFAULT_BID_REQUESTS[0],
        getFloor: false,
      };
      expect(getBidFloor(bid)).to.deep.eq(0.0);
    });

    it('should return floor of 0.0 if mediaTypes not defined', () => {
      const bid = {
        getFloor: () => ({})
      };
      expect(bid.mediaTypes).to.be.undefined;
      expect(getBidFloor(bid)).to.deep.eq(0.0);
    });

    it('should return proper min floor', () => {
      const bid = {
        ...DEFAULT_BID_REQUESTS[0],
        getFloor: data => {
          if (data.size[0] === 300 && data.size[1] === 250) {
            return { floor: 1.13 };
          } else if (data.size[0] === 300 && data.size[1] === 600) {
            return { floor: 1.39 };
          } else {
            return { floor: 0.52 };
          }
        }
      };
      expect(getBidFloor(bid, 'USD', BANNER)).to.deep.eq(1.13);
    });

    it('should return global media type floor if no rule for size', () => {
      const bid = {
        ...DEFAULT_BID_REQUESTS[0],
        getFloor: data => {
          if (data.size[0] === 728 && data.size[1] === 90) {
            return { floor: 1.13 };
          } else if (data.size[0] === 300 && data.size[1] === 600) {
            return { floor: 1.36 };
          } else {
            return { floor: 0.34 };
          }
        }
      };
      expect(getBidFloor(bid, 'USD', BANNER)).to.deep.eq(0.34);
    });

    it('should return floor of 0 if no rule for size', () => {
      const bid = {
        ...DEFAULT_BID_REQUESTS[0],
        getFloor: data => {
          if (data.size[0] === 728 && data.size[1] === 90) {
            return { floor: 1.13 };
          } else if (data.size[0] === 300 && data.size[1] === 600) {
            return { floor: 1.36 };
          } else {
            return {};
          }
        }
      };
      expect(getBidFloor(bid, 'USD', BANNER)).to.deep.eq(0.0);
    });
  });

  describe('getUserSyncs', () => {
    let setCookieStub;

    beforeEach(() => setCookieStub = sinon.stub(storage, 'setCookie'));

    afterEach(() => setCookieStub.restore());

    it('should return empty array if iframe sync not enabled', () => {
      const syncs = spec.getUserSyncs({}, SAMPLE_RESPONSE);
      expect(syncs).to.deep.equal([]);
    });

    it('should retrieve and save user pid', (done) => {
      const userSyncs = spec.getUserSyncs(
        { iframeEnabled: true },
        SAMPLE_RESPONSE
      );

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          pid: '7767825890726'
        },
        origin: 'https://apps.smartadserver.com'
      }));

      const exp = new Date();
      exp.setTime(Date.now() + 31536000000);

      setTimeout(() => {
        expect(setCookieStub.calledOnce).to.be.true;
        expect(setCookieStub.calledWith('eqt_pid', '7767825890726', exp.toUTCString())).to.be.true;
        done();
      });
    });

    it('should not save user pid coming from not origin', (done) => {
      const userSyncs = spec.getUserSyncs(
        { iframeEnabled: true },
        SAMPLE_RESPONSE
      );

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          pid: '7767825890726'
        },
        origin: 'https://another-origin.com'
      }));

      setTimeout(() => {
        expect(setCookieStub.notCalled).to.be.true;
        done();
      });
    });

    it('should not save empty pid', (done) => {
      const userSyncs = spec.getUserSyncs(
        { iframeEnabled: true },
        SAMPLE_RESPONSE
      );

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          pid: ''
        },
        origin: 'https://apps.smartadserver.com'
      }));

      setTimeout(() => {
        expect(setCookieStub.notCalled).to.be.true;
        done();
      });
    });

    it('should return array including iframe cookie sync object', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        SAMPLE_RESPONSE
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.deep.equal({
        type: 'iframe',
        url: 'https://apps.smartadserver.com/diff/templates/asset/csync.html'
      });
    });
  });

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

    it('should return true if ortb2.site.publisher.id is set', () => {
      const bidRequest = {
        ortb2: {
          site: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2.app.publisher.id is set', () => {
      const bidRequest = {
        ortb2: {
          app: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2.dooh.publisher.id is set', () => {
      const bidRequest = {
        ortb2: {
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
