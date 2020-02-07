import { expect } from 'chai';
import { spec } from 'modules/imonomyBidAdapter';

describe('Imonomy Adapter Tests', function () {
  const bidsRequest = [
    {
      bidder: 'imonomy',
      params: {
        placementId: '170577',
        hbid: '14567718624',
      },
      placementCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '9f801c02-bbe8-4683-8ed4-bc816ea186bb',
      sizes: [
        [300, 250]
      ],
      bidId: '2faedf1095f815',
      bidderRequestId: '18065867f8ae39',
      auctionId: '529e1518-b872-45cf-807c-2d41dfa5bcd3'
    },
    {
      bidder: 'imonomy',
      params: {
        placementId: '281277',
        hbid: '14567718624',
        floorPrice: 0.5
      },
      placementCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '9f801c02-bbe8-4683-8ed4-bc816ea186bb',
      sizes: [
        [728, 90]
      ],
      bidId: '3c34e2367a3f59',
      bidderRequestId: '18065867f8ae39',
      auctionId: '529e1518-b872-45cf-807c-2d41dfa5bcd3'
    }];

  const bidsResponse = {
    body: {
      bids: [
        {
          placementid: '170577',
          uuid: '2faedf1095f815',
          width: 300,
          height: 250,
          cpm: 0.51,
          creative: '<script type="text/javascript" src="https://creative.com/pathToNiceCreative"></script>',
          ttl: 360,
          currency: 'USD',
          netRevenue: true,
          creativeId: 'd30b58c2ba'
        }
      ]
    }
  };

  it('Verifies imonomyAdapter bidder code', function () {
    expect(spec.code).to.equal('imonomy');
  });

  it('Verifies imonomyAdapter bid request validation', function () {
    expect(spec.isBidRequestValid(bidsRequest[0])).to.equal(true);
    expect(spec.isBidRequestValid(bidsRequest[1])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { hbid: 12345 } })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { placementid: 12345 } })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { hbid: 12345, placementId: 67890 } })).to.equal(true);
    expect(spec.isBidRequestValid({ params: { hbid: 12345, placementId: 67890, floorPrice: 0.8 } })).to.equal(true);
  });

  it('Verify imonomyAdapter build request', function () {
    var startTime = new Date().getTime();

    const request = spec.buildRequests(bidsRequest);
    expect(request.url).to.equal('https://b.imonomy.com/openrtb/hb/14567718624');
    expect(request.method).to.equal('POST');
    const requestData = JSON.parse(request.data);

    // bids object
    let bids = requestData.bids;
    expect(bids).to.have.lengthOf(2);

    // first bid request: no floor price
    expect(bids[0].uuid).to.equal('2faedf1095f815');
    expect(bids[0].floorprice).to.be.undefined;
    expect(bids[0].placementid).to.equal('170577');
    expect(bids[0].hbid).to.equal('14567718624');
    expect(bids[0].trid).to.equal('9f801c02-bbe8-4683-8ed4-bc816ea186bb');
    expect(bids[0].sizes).to.have.lengthOf(1);
    expect(bids[0].sizes[0][0]).to.equal(300);
    expect(bids[0].sizes[0][1]).to.equal(250);

    // second bid request: with floor price
    expect(bids[1].uuid).to.equal('3c34e2367a3f59');
    expect(bids[1].floorprice).to.equal(0.5);
    expect(bids[1].placementid).to.equal('281277');
    expect(bids[1].hbid).to.equal('14567718624');
    expect(bids[1].trid).to.equal('9f801c02-bbe8-4683-8ed4-bc816ea186bb');
    expect(bids[1]).to.have.property('sizes')
      .that.is.an('array')
      .of.length(1)
      .that.deep.equals([[728, 90]]);

    // kbConf object
    let kbConf = requestData.kbConf;
    expect(kbConf.hdbdid).to.equal(bids[0].hbid);
    expect(kbConf.hdbdid).to.equal(bids[1].hbid);
    expect(kbConf.encode_bid).to.be.undefined;
    // kbConf timezone and cb
    expect(kbConf.cb).not.to.be.undefined;
    expect(kbConf.ts_as).to.be.above(startTime - 1);
    expect(kbConf.tz).to.equal(new Date().getTimezoneOffset());
    // kbConf bid ids
    expect(kbConf.hb_placement_bidids)
      .to.have.property(bids[0].placementid)
      .that.equal(bids[0].uuid);
    expect(kbConf.hb_placement_bidids)
      .to.have.property(bids[1].placementid)
      .that.equal(bids[1].uuid);
    // kbConf floor price
    expect(kbConf.hb_floors).not.to.have.property(bids[0].placementid)
    expect(kbConf.hb_floors).to.have.property(bids[1].placementid).that.equal(bids[1].floorprice);
    // kbConf placement ids
    expect(kbConf.hb_placements).to.have.lengthOf(2);
    expect(kbConf.hb_placements[0]).to.equal(bids[0].placementid);
    expect(kbConf.hb_placements[1]).to.equal(bids[1].placementid);
  });

  it('Verify imonomyAdapter build response', function () {
    const request = spec.buildRequests(bidsRequest);
    const bids = spec.interpretResponse(bidsResponse, request);

    // 'server' return single bid
    expect(bids).to.have.lengthOf(1);

    // verify bid object
    const bid = bids[0];
    const responseBids = bidsResponse.body.bids;

    expect(bid.cpm).to.equal(responseBids[0].cpm);
    expect(bid.ad).to.equal(responseBids[0].creative);
    expect(bid.requestId).equal(responseBids[0].uuid);
    expect(bid.uuid).equal(responseBids[0].uuid);
    expect(bid.width).to.equal(responseBids[0].width);
    expect(bid.height).to.equal(responseBids[0].height);
    expect(bid.ttl).to.equal(responseBids[0].ttl);
    expect(bid.currency).to.equal('USD');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.creativeId).to.equal(responseBids[0].creativeId);
  });

  it('Verifies imonomyAdapter sync options', function () {
    // user sync disabled
    expect(spec.getUserSyncs({})).to.be.undefined;
    expect(spec.getUserSyncs({ iframeEnabled: false })).to.be.undefined;
    // user sync enabled
    const options = spec.getUserSyncs({ iframeEnabled: true });
    expect(options).to.not.be.undefined;
    expect(options).to.have.lengthOf(1);
    expect(options[0].type).to.equal('iframe');
    expect(options[0].url).to.equal('https://b.imonomy.com/UserMatching/b/');
  });
});
