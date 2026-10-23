import { expect } from 'chai';
import { interpretResponse } from '../../../../libraries/nexx360Utils/index.js';

const SERVER_AUCTION = {
  auctionId: 'srv-real-1',
  timestamp: 1700000000000,
  impressions: [],
  totalImpressions: 0,
  totalSspsCalled: 0,
  totalBidsReceived: 0,
  totalTimeouts: 0,
  totalErrors: 0,
  auctionTimeMs: 42,
};

// A minimal valid ORTB banner response so interpretResponse produces bids.
function responseWith(serverAuction, { bidCount = 1 } = {}) {
  const bid = {
    impid: 'imp-1',
    price: 1.5,
    w: 300,
    h: 250,
    crid: 'c-1',
    adm: '<div></div>',
    adomain: ['nexx360.io'],
    ext: { mediaType: 'banner', ssp: 'test' },
  };
  const body = {
    cur: 'USD',
    ext: serverAuction ? { serverAuction } : {},
    seatbid: bidCount > 0
      ? [{ bid: Array.from({ length: bidCount }, () => ({ ...bid })) }]
      : [],
  };
  return { body };
}

// interpretResponse receives back the request built by buildRequests, which carries the bidderRequest.
function requestFor(bidderRequest) {
  return { method: 'POST', url: 'https://fast.nexx360.io/booster', data: {}, bidderRequest };
}

describe('nexx360Utils server auction extraction', () => {
  it('stores ext.serverAuction on the bidderRequest carried by the request', () => {
    const bidderRequest = {};
    const responses = interpretResponse(responseWith(SERVER_AUCTION, { bidCount: 2 }), requestFor(bidderRequest));
    expect(responses).to.have.length(2);
    expect(bidderRequest.serverAuctionData).to.deep.equal(SERVER_AUCTION);
  });

  it('stores ext.serverAuction even when the response has no seatbid', () => {
    const bidderRequest = {};
    const responses = interpretResponse(responseWith(SERVER_AUCTION, { bidCount: 0 }), requestFor(bidderRequest));
    expect(responses).to.deep.equal([]);
    expect(bidderRequest.serverAuctionData).to.deep.equal(SERVER_AUCTION);
  });

  it('does not attach the server auction to bid responses', () => {
    const responses = interpretResponse(responseWith(SERVER_AUCTION), requestFor({}));
    expect(responses).to.have.length(1);
    expect(responses[0]).to.not.have.property('serverAuctionData');
  });

  it('stores nothing when ext.serverAuction is absent', () => {
    const bidderRequest = {};
    interpretResponse(responseWith(null), requestFor(bidderRequest));
    expect(bidderRequest).to.not.have.property('serverAuctionData');
  });

  it('ignores ext.serverAuction that has no auctionId', () => {
    const bidderRequest = {};
    interpretResponse(responseWith({ timestamp: 1 }), requestFor(bidderRequest));
    expect(bidderRequest).to.not.have.property('serverAuctionData');
  });

  it('still interprets bids when called without a request (adapters sharing interpretResponse)', () => {
    expect(interpretResponse(responseWith(SERVER_AUCTION))).to.have.length(1);
    expect(interpretResponse(responseWith(SERVER_AUCTION), { method: 'POST', url: 'u', data: {} })).to.have.length(1);
  });

  it('returns [] when the response body is missing', () => {
    const responses = interpretResponse({});
    expect(responses).to.deep.equal([]);
  });
});
