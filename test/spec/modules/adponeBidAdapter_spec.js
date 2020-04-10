import { expect } from 'chai';
import { spec } from 'modules/adponeBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

const EMPTY_ARRAY = [];
describe('adponeBidAdapter', function () {
  let bid = {
    bidder: 'adpone',
    adUnitCode: 'adunit-code',
    sizes: [[300, 250]],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    params: {
      placementId: '1',
    }
  };

  describe('build requests', () => {
    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests([
        {
          bidder: 'adpone',
          adUnitCode: 'adunit-code',
          sizes: [[300, 250]],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          params: {
            placementId: '1',
          }
        }
      ]);
      expect(request[0].method).to.equal('POST');
    });
    it('sends bid request to adpone endpoint', function () {
      const request = spec.buildRequests([
        {
          bidder: 'adpone',
          adUnitCode: 'adunit-code',
          sizes: [[300, 250]],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          params: {
            placementId: '1',
          }
        }
      ]);
      expect(request[0].url).to.equal('https://rtb.adpone.com/bid-request?pid=1');
    });
  });

  describe('inherited functions', () => {
    const adapter = newBidder(spec);
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when necessary information is found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when necessary information is not found', function () {
      // empty bid
      expect(spec.isBidRequestValid({bidId: '', params: {}})).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty placementId
      bid.bidId = '30b31c1838de1e';
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      bid.adUnitCode = 'adunit-code';
    });

    it('returns false when bidder not set to "adpone"', function() {
      const invalidBid = {
        bidder: 'enopda',
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        params: {
          placementId: '1',
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('returns false when placementId is not set in params', function() {
      const invalidBid = {
        bidder: 'adpone',
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        params: {
        }
      };

      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });
});

describe('interpretResponse', function () {
  let serverResponse;
  let bidRequest = { data: {id: '1234'} };

  beforeEach(function () {
    serverResponse = {
      body: {
        id: '2579e20c0bb89',
        seatbid: [
          {
            bid: [
              {
                id: '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
                impid: '2579e20c0bb89_0',
                price: 1,
                adm: '<html><a href="https://www.adpone.com" target="_blank"><img src ="https://placehold.it/300x250" /></a></html>',
                adomain: [
                  'www.addomain.com'
                ],
                iurl: 'https://localhost11',
                crid: 'creative111',
                h: 250,
                w: 300,
                ext: {
                  dspid: 6
                }
              }
            ],
            seat: 'adpone'
          }
        ],
        cur: 'USD'
      },
    };
  });

  it('validate_response_params', function() {
    const newResponse = spec.interpretResponse(serverResponse, bidRequest);
    expect(newResponse[0].id).to.be.equal('613673EF-A07C-4486-8EE9-3FC71A7DC73D');
    expect(newResponse[0].requestId).to.be.equal('1234');
    expect(newResponse[0].cpm).to.be.equal(1);
    expect(newResponse[0].width).to.be.equal(300);
    expect(newResponse[0].height).to.be.equal(250);
    expect(newResponse[0].currency).to.be.equal('USD');
    expect(newResponse[0].netRevenue).to.be.equal(true);
    expect(newResponse[0].ttl).to.be.equal(300);
    expect(newResponse[0].ad).to.be.equal('<html><a href="https://www.adpone.com" target="_blank"><img src ="https://placehold.it/300x250" /></a></html>');
  });

  it('should correctly reorder the server response', function () {
    const newResponse = spec.interpretResponse(serverResponse, bidRequest);
    expect(newResponse.length).to.be.equal(1);
    expect(newResponse[0]).to.deep.equal({
      id: '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
      requestId: '1234',
      cpm: 1,
      width: 300,
      height: 250,
      creativeId: 'creative111',
      currency: 'USD',
      netRevenue: true,
      ttl: 300,
      ad: '<html><a href="https://www.adpone.com" target="_blank"><img src ="https://placehold.it/300x250" /></a></html>'
    });
  });

  it('should not add responses if the cpm is 0 or null', function () {
    serverResponse.body.seatbid[0].bid[0].price = 0;
    let response = spec.interpretResponse(serverResponse, bidRequest);
    expect(response).to.deep.equal([]);

    serverResponse.body.seatbid[0].bid[0].price = null;
    response = spec.interpretResponse(serverResponse, bidRequest);
    expect(response).to.deep.equal([])
  });
  it('should add responses if the cpm is valid', function () {
    serverResponse.body.seatbid[0].bid[0].price = 0.5;
    let response = spec.interpretResponse(serverResponse, bidRequest);
    expect(response).to.not.deep.equal([]);
  });
});

describe('getUserSyncs', function () {
  it('Verifies that getUserSyncs is a function', function () {
    expect((typeof (spec.getUserSyncs)).should.equals('function'));
  });
  it('Verifies getUserSyncs returns expected result', function () {
    expect((typeof (spec.getUserSyncs)).should.equals('function'));
    expect(spec.getUserSyncs({iframeEnabled: true})).to.deep.equal({
      type: 'iframe',
      url: 'https://eu-ads.adpone.com'
    });
  });
  it('Verifies that iframeEnabled: false returns an empty array', function () {
    expect(spec.getUserSyncs({iframeEnabled: false})).to.deep.equal(EMPTY_ARRAY);
  });
  it('Verifies that iframeEnabled: null returns an empty array', function () {
    expect(spec.getUserSyncs(null)).to.deep.equal(EMPTY_ARRAY);
  });
});

describe('test onBidWon function', function () {
  beforeEach(function() {
    sinon.stub(utils, 'triggerPixel');
  });
  afterEach(function() {
    utils.triggerPixel.restore();
  });
  it('exists and is a function', () => {
    expect(spec.onBidWon).to.exist.and.to.be.a('function');
  });
  it('should return nothing', function () {
    var response = spec.onBidWon({});
    expect(response).to.be.an('undefined')
    expect(utils.triggerPixel.called).to.equal(true);
  });
});
