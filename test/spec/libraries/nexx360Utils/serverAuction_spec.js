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

describe('nexx360Utils server auction extraction', () => {
  it('attaches ext.serverAuction to every produced bid response', () => {
    const responses = interpretResponse(responseWith(SERVER_AUCTION, { bidCount: 2 }));
    expect(responses).to.have.length(2);
    responses.forEach((response) => {
      expect(response.serverAuctionData).to.deep.equal(SERVER_AUCTION);
    });
  });

  it('attaches nothing when ext.serverAuction is absent', () => {
    const responses = interpretResponse(responseWith(null));
    expect(responses).to.have.length(1);
    expect(responses[0]).to.not.have.property('serverAuctionData');
  });

  it('ignores ext.serverAuction that has no auctionId', () => {
    const responses = interpretResponse(responseWith({ timestamp: 1 }));
    expect(responses).to.have.length(1);
    expect(responses[0]).to.not.have.property('serverAuctionData');
  });

  it('returns [] when the response has no seatbid', () => {
    const responses = interpretResponse(responseWith(SERVER_AUCTION, { bidCount: 0 }));
    expect(responses).to.deep.equal([]);
  });

  it('returns [] when the response body is missing', () => {
    const responses = interpretResponse({});
    expect(responses).to.deep.equal([]);
  });
});
