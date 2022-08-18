import { expect } from 'chai';
import { spec } from 'modules/mediagoBidAdapter.js';

describe('mediago:BidAdapterTests', function () {
  let bidRequestData = {
    bidderCode: 'mediago',
    auctionId: '7fae02a9-0195-472f-ba94-708d3bc2c0d9',
    bidderRequestId: '4fec04e87ad785',
    bids: [
      {
        bidder: 'mediago',
        params: {
          token: '85a6b01e41ac36d49744fad726e3655d',
		  bidfloor: 0.01,
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        adUnitCode: 'regular_iframe',
        transactionId: '7b26fdae-96e6-4c35-a18b-218dda11397d',
        sizes: [[300, 250]],
        bidId: '54d73f19c9d47a', // todo
        bidderRequestId: '4fec04e87ad785', // todo
        auctionId: '883a346a-6d62-4adb-a600-0f3a869061d1',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
      },
    ],
  };
  let request = [];

  it('mediago:validate_pub_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'mediago',
        params: {
          token: ['85a6b01e41ac36d49744fad726e3655d'],
        },
      })
    ).to.equal(true);
  });

  it('mediago:validate_generated_params', function () {
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    let req_data = JSON.parse(request.data);
    expect(req_data.imp).to.have.lengthOf(1);
  });

  it('mediago:validate_response_params', function () {
    let serverResponse = {
      body: {
        id: 'mgprebidjs_0b6572fc-ceba-418f-b6fd-33b41ad0ac8a',
        seatbid: [
          {
            bid: [
              {
                id: '6e28cfaf115a354ea1ad8e1304d6d7b8',
                impid: '1',
                price: 0.087581,
                adm: "<link rel=\"stylesheet\" href=\"https://cdn.mediago.io/js/style/style_banner_300*250.css\"><div id=\"mgcontainer-99afea272c2b0e8626489674ddb7a0bb\" class=\"mediago-placement imgTopTitleBottom\" style=\"position:relative;width:298px;height:248px;overflow:hidden\"><a href=\"https://trace.mediago.io/api/bidder/track?tn=39934c2bda4debbe4c680be1dd02f5d3&price=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&evt=102&rid=6e28cfaf115a354ea1ad8e1304d6d7b8&campaignid=1339145&impid=44-300x250-1&offerid=24054386&test=0&time=1660789795&cp=jZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM&clickid=44_6e28cfaf115a354ea1ad8e1304d6d7b8_44-300x250-1&acid=599&trackingid=99afea272c2b0e8626489674ddb7a0bb&uid=a865b9ae-fa9e-4c09-8204-2db99ac7c8f7&jt=2&url=oxZA2i2aUVY76Xy2t3HffaK_ZtBDsgFwFc_Nbnw-bz3yCxmoUyZvATKnFc9ZkUfT1eQizhtczCwDzjHwwwDgTehUnp1EwdY4g1LRcuOwlRpXnVTt3zPQdaVx5nVDw25by7lQ0q469LCv2eEFDTAv_FOuVT32WiOx_ArOIlxCnDGpjPLUNyxm3cTZFGOJn4B7&bm=2&la=en&cn=us&cid=3998296&info=Si3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk&sid=128__110__1__12__28__38__163__96__58__24__47__99&sp=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&scp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&acu=USD&scu=USD&sgcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&gprice=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&gcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&ah=&pb=&de=wjh.popin.cc&cat=&iv=0\" target=\"_blank\" class=\"mediago-placement-track\" style=\"display: inline-block;\"><img alt=\"Ranger's spot giant lion - vet is shocked when looking at the ultrasound\" src=\"https://d2cli4kgl5uxre.cloudfront.net/ML/ff32b6f9b3bbc45c00b78b6674a2952e__scv1__300x175.png\" style=\"height:70%;width:100%;border-width:0;border:none;\"><h3 class=\"title\" style=\"font-size:16px;\">Ranger's spot giant lion - vet is shocked when looking at the ultrasound</h3></a><span class=\"source\"><a class=\"sourcename\" href=\"//www.mediago.io\" target=\"_blank\"><span>Ad</span> </a><a class=\"mgmgsrcnameadslabelurl\" href=\"//www.mediago.io/privacy\" target=\"_blank\"><span>soo-healthy</span></a></span></div>",
                cid: '1339145',
                crid: 'ff32b6f9b3bbc45c00b78b6674a2952e',
                w: 300,
                h: 250,
              },
            ],
          },
        ],
        cur: 'USD',
      },
    };

    let bids = spec.interpretResponse(serverResponse);
    // console.log({
    //   bids
    // });
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('ff32b6f9b3bbc45c00b78b6674a2952e');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });
});
