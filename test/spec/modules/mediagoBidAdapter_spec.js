import {
  expect
} from 'chai';
import {
  spec
} from 'modules/mediagoBidAdapter.js';

describe('mediago:BidAdapterTests', function() {
  let bidRequestData = {
    "bidderCode": "mediago",
    "auctionId": "7fae02a9-0195-472f-ba94-708d3bc2c0d9",
    "bidderRequestId": "4fec04e87ad785",
    "bids": [{
      "bidder": "mediago",
      "params": {
        "token": "85a6b01e41ac36d49744fad726e3655d"
      },
      "mediaTypes": {
        "banner": {
          "sizes": [
            [
              300,
              250
            ]
          ]
        }
      },
      "adUnitCode": "div-gpt-ad-1460505748561-0",
      "transactionId": "5e24a2ce-db03-4565-a8a3-75dbddca9377",
      "sizes": [
        [
          300,
          250
        ]
      ],
      "bidId": "54d73f19c9d47a",
      "bidderRequestId": "4fec04e87ad785",
      "auctionId": "7fae02a9-0195-472f-ba94-708d3bc2c0d9",
      "src": "client",
      "bidRequestsCount": 1,
      "bidderRequestsCount": 1,
      "bidderWinsCount": 0
    }]
  };
  let request = [];

  it('mediago:validate_pub_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'mediago',
        params: {
          token: ['85a6b01e41ac36d49744fad726e3655d']
        }
      })
    ).to.equal(true);
  });

  it('mediago:validate_generated_params', function() {
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    // console.log(request);
    let req_data = JSON.parse(request.data);
    expect(req_data.imp).to.have.lengthOf(1);
  });

  it('mediago:validate_response_params', function() {
    let serverResponse = {
      "body": {
        "id": "mgprebidjs_0b6572fc-ceba-418f-b6fd-33b41ad0ac8a",
        "seatbid": [{
          "bid": [{
            "id": "6706352e29016b27da84dd422e879369",
            "impid": "1",
            "price": 0.2,
            "adm": "\u003clink rel=\"stylesheet\" href=\"//cdn.mediago.io/js/style/style_banner_300*250.css\"\u003e\u003cdiv id=\"mgcontainer-50a1cceed7dcd3c99859e20a1d0a66ae\" class=\"mediago-placement imgTopTitleBottom\" style=\"position:relative;width:298px;height:248px;overflow:hidden\"\u003e\u003ca href=\"http://msn.gbudev.com/api/bidder/track?tn=85a6b01e41ac36d49744fad726e3655d\u0026price=ZQc-I4Br8_FTGtNXgAwbVteddoPtwJDcZdJPhEKrZQ8\u0026evt=102\u0026rid=6706352e29016b27da84dd422e879369\u0026campaignid=1001465\u0026impid=27-300x175-1\u0026offerid=1023545\u0026test=0\u0026time=1597646714\u0026cp=65zLqtxPkYHaZbMC9f8kvas6S6nFO8mGkTyb5LFppSc\u0026clickid=27_6706352e29016b27da84dd422e879369_27-300x175-1\u0026acid=1\u0026trackingid=50a1cceed7dcd3c99859e20a1d0a66ae\u0026uid=6dda6c6b70eb4e2d9ab3469d921f2c74\u0026jt=2\u0026url=vMENpLl3Ssfi5PyFJaLiifsd8Gd5IVxcoii1evTTiL5C3PvP27nLeCEESzIf4noyPKskwHpQIoejGPD5J0SEX6SPP55F94l7jcVPT_1vRxu2Zk43M8P4njPyzaXmASSVamprYOurCP3cCZzNOc-fSg\" target=\"_blank\"\u003e\u003cimg alt=\"platform_mobile_test\" src=\"https://d2cli4kgl5uxre.cloudfront.net/ML/3f21c1cc11eb691b6c3d99f7a1daf815__300x175.png\" style=\"height:70%;width:100%;border-width:0;border:none;\"\u003e\u003ch3 class=\"title\" style=\"font-size:16px;\"\u003eplatform_mobile_test\u003c/h3\u003e\u003c/a\u003e\u003cspan class=\"source\"\u003e\u003ca class=\"sourcename\" href=\"//www.mediago.io\" target=\"_blank\"\u003e\u003cspan\u003eAd\u003c/span\u003e \u003c/a\u003e\u003ca class=\"srcnameadslabelurl\" href=\"//www.mediago.io/privacy\" target=\"_blank\"\u003e\u003cspan\u003eAce\u003c/span\u003e\u003c/a\u003e\u003c/span\u003e\u003c/div\u003e\u003cscript\u003e!function(e){var t={};function n(o){if(t[o])return t[o].exports;var r=t[o]={i:o,l:!1,exports:{}};return e[o].call(r.exports,r,r.exports,n),r.l=!0,r.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){\"undefined\"!=typeof Symbol\u0026\u0026Symbol.toStringTag\u0026\u0026Object.defineProperty(e,Symbol.toStringTag,{value:\"Module\"}),Object.defineProperty(e,\"__esModule\",{value:!0})},n.t=function(e,t){if(1\u0026t\u0026\u0026(e=n(e)),8\u0026t)return e;if(4\u0026t\u0026\u0026\"object\"==typeof e\u0026\u0026e\u0026\u0026e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,\"default\",{enumerable:!0,value:e}),2\u0026t\u0026\u0026\"string\"!=typeof e)for(var r in e)n.d(o,r,function(t){return e[t]}.bind(null,r));return o},n.n=function(e){var t=e\u0026\u0026e.__esModule?function(){return e.default}:function(){return e};return n.d(t,\"a\",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p=\"\",n(n.s=24)}({24:function(e,t,n){\"use strict\";function o(e){var t=new Image;t.src=e,t.style=\"display:none;visibility:hidden\",t.width=0,t.height=0,document.body.appendChild(t)}o(\"http://msn.gbudev.com/api/bidder/track?tn=85a6b01e41ac36d49744fad726e3655d\u0026price=ZQc-I4Br8_FTGtNXgAwbVteddoPtwJDcZdJPhEKrZQ8\u0026evt=101\u0026rid=6706352e29016b27da84dd422e879369\u0026campaignid=1001465\u0026impid=27-300x175-1\u0026offerid=1023545\u0026test=0\u0026time=1597646714\u0026cp=65zLqtxPkYHaZbMC9f8kvas6S6nFO8mGkTyb5LFppSc\u0026acid=1\u0026trackingid=50a1cceed7dcd3c99859e20a1d0a66ae\u0026uid=6dda6c6b70eb4e2d9ab3469d921f2c74\");var r=document.getElementById(\"mgcontainer-50a1cceed7dcd3c99859e20a1d0a66ae\"),i=!1;!function e(){setTimeout((function(){var t,n;!i\u0026\u0026(t=r,n=window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight,(t.getBoundingClientRect()\u0026\u0026t.getBoundingClientRect().top)\u003c=n-.75*(t.offsetHeight||t.clientHeight))?(i=!0,o(\"http://msn.gbudev.com/api/bidder/track?tn=85a6b01e41ac36d49744fad726e3655d\u0026price=ZQc-I4Br8_FTGtNXgAwbVteddoPtwJDcZdJPhEKrZQ8\u0026evt=104\u0026rid=6706352e29016b27da84dd422e879369\u0026campaignid=1001465\u0026impid=27-300x175-1\u0026offerid=1023545\u0026test=0\u0026time=1597646714\u0026cp=65zLqtxPkYHaZbMC9f8kvas6S6nFO8mGkTyb5LFppSc\u0026acid=1\u0026trackingid=50a1cceed7dcd3c99859e20a1d0a66ae\u0026uid=6dda6c6b70eb4e2d9ab3469d921f2c74\u0026sid=4__11__12__13\u0026format=\u0026crid=3f21c1cc11eb691b6c3d99f7a1daf815\")):e()}),500)}()}});\u003c/script\u003e\u003cscript type=\"text/javascript\" src=\"http://msn.gbudev.com/api/track?tn=85a6b01e41ac36d49744fad726e3655d\u0026price=${AUCTION_PRICE}\u0026evt=5\u0026rid=6706352e29016b27da84dd422e879369\u0026impid=1\u0026offerid=\u0026tagid=\u0026test=0\u0026time=1597646714\u0026adp=g3tznPzjr9gfd3aQ0Sio53Dk4_QZkg1XuEWXR_Gw-CY\u0026dsp_id=23\u0026cp=${cp}\u0026url=\u0026type=script\"\u003e\u003c/script\u003e\u003cscript\u003edocument.addEventListener\u0026\u0026document.addEventListener(\"click\",function(){var a=document.createElement(\"script\");a.src=\"http://msn.gbudev.com/api/track?tn=85a6b01e41ac36d49744fad726e3655d\u0026price=${AUCTION_PRICE}\u0026evt=6\u0026rid=6706352e29016b27da84dd422e879369\u0026impid=1\u0026offerid=\u0026tagid=\u0026test=0\u0026time=1597646714\u0026adp=g3tznPzjr9gfd3aQ0Sio53Dk4_QZkg1XuEWXR_Gw-CY\u0026dsp_id=23\u0026cp=${cp}\u0026url=\u0026clickid=27_6706352e29016b27da84dd422e879369_1\";document.body.appendChild(a)});\u003c/script\u003e",
            "cid": "1001465",
            "crid": "3f21c1cc11eb691b6c3d99f7a1daf815",
            "w": 300,
            "h": 250
          }]
        }],
        "cur": "USD"
      }
    };

    let bids = spec.interpretResponse(serverResponse);
    // console.log({
    //   bids
    // });
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('3f21c1cc11eb691b6c3d99f7a1daf815');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });
});
