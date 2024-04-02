import {ortbConverter} from '../../../libraries/ortbConverter/converter.js';
import {BID_RESPONSE, IMP, REQUEST, RESPONSE} from '../../../src/pbjsORTB.js';

describe('pbjs-ortb converter', () => {
  const MOCK_BIDDER_REQUEST = {
    id: 'bidderRequest',
    bids: [
      {
        id: 111
      },
      {
        id: 112
      }
    ]
  }

  const MOCK_ORTB_RESPONSE = {
    id: 'response',
    seatbid: [
      {
        seat: 'mockBidder1',
        bid: [
          {
            impid: 'imp0'
          },
          {
            impid: 'imp1'
          }
        ]
      },
      {
        seat: 'mockBidder2',
        bid: [
          {
            impid: 'imp1'
          }
        ]
      }
    ]
  }

  let processors, reqCnt, impCnt;

  beforeEach(() => {
    reqCnt = 0;
    impCnt = 0;
    processors = {
      [REQUEST]: {
        req: {
          fn(ortbRequest, bidderRequest, context) {
            ortbRequest.id = `req${reqCnt++}`;
            if (context.ctx) {
              ortbRequest.ctx = context.ctx;
            }
          }
        }
      },
      [IMP]: {
        imp: {
          fn(imp, bidRequest, context) {
            imp.id = `imp${impCnt++}`;
            imp.bidId = bidRequest.id;
            if (context.ctx) {
              imp.ctx = context.ctx;
            }
            if (context.reqContext?.ctx) {
              imp.reqCtx = context.reqContext?.ctx;
            }
          }
        }
      },
      [BID_RESPONSE]: {
        resp: {
          fn(bidResponse, bid, context) {
            bidResponse.impid = bid.impid;
            bidResponse.bidId = context.imp.bidId;
            if (context.ctx) {
              bidResponse.ctx = context.ctx;
            }
            if (context.reqContext?.ctx) {
              bidResponse.reqCtx = context.reqContext?.ctx;
            }
          }
        }
      },
      [RESPONSE]: {
        resp: {
          fn(response, ortbResponse, context) {
            response.marker = true;
            if (context.ctx) {
              response.ctx = context.ctx;
            }
          }
        }
      }
    }
  });

  function makeConverter(options = {}) {
    options = Object.assign({
      processors: () => processors
    }, options);
    return ortbConverter(options);
  }

  it('runs each processor', () => {
    const cvt = makeConverter();
    const request = cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST});
    expect(request).to.eql({
      id: 'req0',
      imp: [
        {id: 'imp0', bidId: 111},
        {id: 'imp1', bidId: 112}
      ]
    });
    const response = cvt.fromORTB({request, response: MOCK_ORTB_RESPONSE});
    expect(response.bids).to.eql([{
      impid: 'imp0',
      bidId: 111
    }, {
      impid: 'imp1',
      bidId: 112
    }, {
      impid: 'imp1',
      bidId: 112
    }]);
    expect(response.marker).to.be.true;
  });

  it('fromORTB throws if request was not produced by the same converter', () => {
    expect(() => {
      makeConverter().fromORTB({
        request: {
          imp: [
            {
              id: 'imp0'
            }
          ]
        },
        response: MOCK_ORTB_RESPONSE
      })
    }).to.throw();
  });

  it('gives precedence to the bidRequests argument over bidderRequest.bids', () => {
    expect(makeConverter().toORTB({bidderRequest: MOCK_BIDDER_REQUEST, bidRequests: [MOCK_BIDDER_REQUEST.bids[0]]})).to.eql({
      id: 'req0',
      imp: [
        {
          id: 'imp0',
          bidId: 111
        }
      ]
    })
  });

  it('passes context to every processor', () => {
    const cvt = makeConverter();
    const request = cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST, context: {ctx: 'context'}});
    expect(request.ctx).to.equal('context');
    request.imp.forEach(imp => expect(imp.ctx).to.equal('context'));
    const response = cvt.fromORTB({request, response: MOCK_ORTB_RESPONSE});
    expect(response.ctx).to.eql('context');
    response.bids.forEach(bidResponse => expect(bidResponse.ctx).to.equal('context'));
  });

  it('passes request context to imp and bidResponse processors', () => {
    const cvt = makeConverter();
    const request = cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST, context: {ctx: 'context'}});
    expect(request.imp[0].reqCtx).to.eql('context');
    const response = cvt.fromORTB({request, response: MOCK_ORTB_RESPONSE});
    expect(response.bids[0].reqCtx).to.eql('context');
  });

  it('allows overriding of imp building with `imp`', () => {
    const cvt = makeConverter({
      imp: function (buildImp, bidRequest, context) {
        return Object.assign({
          extraArg: bidRequest.id,
          extraCtx: context.ctx
        }, buildImp(bidRequest, context));
      }
    });
    const request = cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST, context: {ctx: 'context'}});
    expect(request.imp.length).to.eql(2);
    request.imp.forEach(imp => {
      expect(imp.extraArg).to.eql(imp.bidId);
      expect(imp.extraCtx).to.eql('context');
    })
  });

  it('allows filtering imps with `imp`', () => {
    const cvt = makeConverter({
      imp(buildImp, bidRequest, context) {
        if (bidRequest.id === 112) {
          return buildImp(bidRequest, context);
        }
      }
    });
    expect(cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST}).imp.length).to.eql(1);
  });

  it('does not include imps that have no id', () => {
    const cvt = makeConverter({
      imp(buildImp, bidRequest, context) {
        const imp = buildImp(bidRequest, context);
        delete imp.id;
        return imp;
      }
    });
    expect(cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST}).imp.length).to.eql(0);
  })

  it('allows overriding of response building with bidResponse', () => {
    const cvt = makeConverter({
      bidResponse(buildResponse, bid, context) {
        return Object.assign({
          extraArg: context.bidRequest.id,
          extraCtx: context.ctx
        }, buildResponse(bid, context));
      }
    });
    const response = cvt.fromORTB({
      response: MOCK_ORTB_RESPONSE,
      request: cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST, context: {ctx: 'context'}})
    });

    expect(response.bids.length).to.equal(3);
    response.bids.forEach(response => {
      expect(response.extraArg).to.eql(response.bidId);
      expect(response.extraCtx).to.eql('context');
    });
  });

  it('allows filtering of responses with `bidResponse`', () => {
    const cvt = makeConverter({
      bidResponse(buildBidResponse, bid, context) {
        if (context.seatbid.seat === 'mockBidder1' && context.imp.id === 'imp0') {
          return buildBidResponse(bid, context);
        }
      }
    });
    expect(cvt.fromORTB({
      request: cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST}),
      response: MOCK_ORTB_RESPONSE
    }).bids.length).to.equal(1);
  });

  it('allows overriding of request building with `request`', () => {
    const cvt = makeConverter({
      request(buildRequest, imps, bidderRequest, context) {
        return {
          request: buildRequest(imps, bidderRequest, context),
          extraArg: bidderRequest.id,
          extraCtx: context.ctx
        }
      }
    });
    const req = cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST, context: {ctx: 'context'}});
    expect(req.extraArg).to.equal(MOCK_BIDDER_REQUEST.id);
    expect(req.extraCtx).to.equal('context');
    expect(req.request.imp.length).to.equal(2);
  });

  it('allows overriding of response building with `response`', () => {
    const cvt = makeConverter({
      response(buildResponse, bidResponses, ortbResponse, context) {
        return {
          response: buildResponse(bidResponses, ortbResponse, context),
          extraArg: ortbResponse.id,
          extraCtx: context.ctx
        }
      }
    });
    const resp = cvt.fromORTB({
      request: cvt.toORTB({bidderRequest: MOCK_BIDDER_REQUEST, context: {ctx: 'context'}}),
      response: MOCK_ORTB_RESPONSE,
    });
    expect(resp.extraArg).to.equal(MOCK_ORTB_RESPONSE.id);
    expect(resp.extraCtx).to.equal('context');
    expect(resp.response.bids.length).to.equal(3);
  })
})
