import {expect} from 'chai';
import {spec} from 'modules/rtbsapeBidAdapter.js';
import * as utils from 'src/utils.js';
import {executeRenderer, Renderer} from 'src/Renderer.js';

describe('rtbsapeBidAdapterTests', function () {
  describe('isBidRequestValid', function () {
    it('valid', function () {
      expect(spec.isBidRequestValid({bidder: 'rtbsape', mediaTypes: {banner: true}, params: {placeId: 4321}})).to.equal(true);
      expect(spec.isBidRequestValid({bidder: 'rtbsape', mediaTypes: {video: true}, params: {placeId: 4321}})).to.equal(true);
    });

    it('invalid', function () {
      expect(spec.isBidRequestValid({bidder: 'rtbsape', mediaTypes: {banner: true}, params: {}})).to.equal(false);
      expect(spec.isBidRequestValid({bidder: 'rtbsape', params: {placeId: 4321}})).to.equal(false);
    });
  });

  it('buildRequests', function () {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'rtbsape',
      params: {placeId: 4321},
      sizes: [[240, 400]]
    }];
    let bidderRequest = {
      auctionId: '2e208334-cafe-4c2c-b06b-f055ff876852',
      bidderRequestId: '1392d0aa613366',
      refererInfo: {}
    };
    let request = spec.buildRequests(bidRequestData, bidderRequest);
    expect(request.data.auctionId).to.equal('2e208334-cafe-4c2c-b06b-f055ff876852');
    expect(request.data.requestId).to.equal('1392d0aa613366');
    expect(request.data.bids[0].bidId).to.equal('bid1234');
    expect(request.data.timezone).to.not.equal(undefined);
  });

  describe('interpretResponse', function () {
    it('banner', function () {
      let serverResponse = {
        body: {
          bids: [{
            requestId: 'bid1234',
            cpm: 2.21,
            currency: 'RUB',
            width: 240,
            height: 400,
            netRevenue: true,
            ad: 'Ad html'
          }]
        }
      };
      let bids = spec.interpretResponse(serverResponse, {data: {bids: [{mediaTypes: {banner: true}}]}});
      expect(bids).to.have.lengthOf(1);
      let bid = bids[0];
      expect(bid.cpm).to.equal(2.21);
      expect(bid.currency).to.equal('RUB');
      expect(bid.width).to.equal(240);
      expect(bid.height).to.equal(400);
      expect(bid.netRevenue).to.equal(true);
      expect(bid.requestId).to.equal('bid1234');
      expect(bid.ad).to.equal('Ad html');
    });

    describe('video (outstream)', function () {
      let bid;

      before(() => {
        let serverResponse = {
          body: {
            bids: [{
              requestId: 'bid1234',
              adUnitCode: 'ad-bid1234',
              cpm: 3.32,
              currency: 'RUB',
              width: 600,
              height: 340,
              netRevenue: true,
              vastUrl: 'https://cdn-rtb.sape.ru/vast/4321.xml',
              meta: {
                mediaType: 'video'
              }
            }]
          }
        };
        let serverRequest = {
          data: {
            bids: [{
              bidId: 'bid1234',
              adUnitCode: 'ad-bid1234',
              mediaTypes: {
                video: {
                  context: 'outstream'
                }
              },
              params: {
                placeId: 4321,
                video: {
                  playerMuted: false
                }
              }
            }]
          }
        };
        let bids = spec.interpretResponse(serverResponse, serverRequest);
        expect(bids).to.have.lengthOf(1);
        bid = bids[0];
      });

      it('should add renderer', () => {
        expect(bid).to.have.own.property('renderer');
        expect(bid.renderer).to.be.instanceof(Renderer);
        expect(bid.renderer.url).to.equal('https://cdn-rtb.sape.ru/js/player.js');
        expect(bid.playerMuted).to.equal(false);
      });

      it('should create player instance', () => {
        let spy = false;

        window.sapeRtbPlayerHandler = function (id, w, h, m) {
          const player = {addSlot: () => [id, w, h, m]}
          expect(spy).to.equal(false);
          spy = sinon.spy(player, 'addSlot');
          return player;
        };

        executeRenderer(bid.renderer, bid);
        expect(spy).to.not.equal(false);
        expect(spy.called).to.be.true;

        const spyCall = spy.getCall(0);
        expect(spyCall.args[0].url).to.be.equal('https://cdn-rtb.sape.ru/vast/4321.xml');
        expect(spyCall.returnValue[0]).to.be.equal('ad-bid1234');
        expect(spyCall.returnValue[1]).to.be.equal(600);
        expect(spyCall.returnValue[2]).to.be.equal(340);
        expect(spyCall.returnValue[3]).to.be.equal(false);
      });
    });
  });

  it('getUserSyncs', function () {
    const syncs = spec.getUserSyncs({iframeEnabled: true});
    expect(syncs).to.be.an('array').that.to.have.lengthOf(1);
    expect(syncs[0]).to.deep.equal({type: 'iframe', url: 'https://www.acint.net/mc/?dp=141'});
  });

  describe('onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('called once', function () {
      spec.onBidWon({cpm: '2.21', nurl: 'https://ssp-rtb.sape.ru/track?event=win'});
      expect(utils.triggerPixel.calledOnce).to.equal(true);
    });

    it('called false', function () {
      spec.onBidWon({cpm: '2.21'});
      expect(utils.triggerPixel.called).to.equal(false);
    });
  });
});
