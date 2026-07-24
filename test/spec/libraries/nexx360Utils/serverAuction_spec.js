import { expect } from 'chai';
import {
  interpretResponse,
  getLastServerAuctionData,
  clearLastServerAuctionData,
} from '../../../../libraries/nexx360Utils/index.js';

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

// A minimal valid ORTB banner response so interpretResponse produces a bid.
function responseWith(serverAuction, { withBid = true } = {}) {
  const body = {
    cur: 'USD',
    ext: serverAuction ? { serverAuction } : {},
    seatbid: withBid
      ? [{
          bid: [{
            impid: 'imp-1',
            price: 1.5,
            w: 300,
            h: 250,
            crid: 'c-1',
            adm: '<div></div>',
            adomain: ['nexx360.io'],
            ext: { mediaType: 'banner', ssp: 'test' },
          }],
        }]
      : [],
  };
  return { body };
}

describe('nexx360Utils server auction extraction', () => {
  beforeEach(() => {
    clearLastServerAuctionData();
  });

  afterEach(() => {
    clearLastServerAuctionData();
  });

  it('stores ext.serverAuction when the response produces bids, then clears it', () => {
    const responses = interpretResponse(responseWith(SERVER_AUCTION));
    expect(responses).to.have.length(1);
    expect(getLastServerAuctionData()).to.deep.equal(SERVER_AUCTION);

    clearLastServerAuctionData();
    expect(getLastServerAuctionData()).to.equal(null);
  });

  it('ignores ext.serverAuction that has no auctionId', () => {
    interpretResponse(responseWith({ timestamp: 1 }));
    expect(getLastServerAuctionData()).to.equal(null);
  });

  it('clears any stored server-auction when a response produces no bids', () => {
    // First, store data from a response that has bids.
    interpretResponse(responseWith(SERVER_AUCTION));
    expect(getLastServerAuctionData()).to.deep.equal(SERVER_AUCTION);

    // A later Nexx360 response with server-auction data but no bids must not
    // leave the previous value around to leak into an unrelated auction.
    const responses = interpretResponse(responseWith(SERVER_AUCTION, { withBid: false }));
    expect(responses).to.deep.equal([]);
    expect(getLastServerAuctionData()).to.equal(null);
  });

  it('returns [] and stores nothing when the response body is missing', () => {
    const responses = interpretResponse({});
    expect(responses).to.deep.equal([]);
    expect(getLastServerAuctionData()).to.equal(null);
  });
});
