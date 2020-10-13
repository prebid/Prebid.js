import {
  expect
} from 'chai';
import {
  spec
} from 'modules/mediagoBidAdapter.js';

describe('mediago:BidAdapterTests', function() {
  let bidRequestData = {
    'bidderCode': 'mediago',
    'auctionId': '7fae02a9-0195-472f-ba94-708d3bc2c0d9',
    'bidderRequestId': '4fec04e87ad785',
    'bids': [{
      'bidder': 'mediago',
      'params': {
        'token': '85a6b01e41ac36d49744fad726e3655d'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              300,
              250
            ]
          ]
        }
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': '5e24a2ce-db03-4565-a8a3-75dbddca9377',
      'sizes': [
        [
          300,
          250
        ]
      ],
      'bidId': '54d73f19c9d47a',
      'bidderRequestId': '4fec04e87ad785',
      'auctionId': '7fae02a9-0195-472f-ba94-708d3bc2c0d9',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
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
      body: {
        'id': '7244645c-a81a-4760-8fd6-9d908d2c4a44',
        'seatbid': [{
          'bid': [{
            'id': 'aa86796a857ebedda9a2d7128a87dab1',
            'impid': '1',
            'price': 0.05,
            'nurl': 'http://d21uzv52i0cqie.cloudfront.net/api/winnotice?tn=341443089c0cb829164455a42d216ee3\u0026winloss=1\u0026id=aa86796a857ebedda9a2d7128a87dab1\u0026seat_id=${AUCTION_SEAT_ID}\u0026currency=${AUCTION_CURRENCY}\u0026bid_id=${AUCTION_BID_ID}\u0026ad_id=${AUCTION_AD_ID}\u0026loss=${AUCTION_LOSS}\u0026imp_id=1\u0026price=${AUCTION_PRICE}\u0026test=0\u0026time=1597714943\u0026adp=Dtnz0O4U8sdAU-XGGijCAgMbjDIeMGyCLXeSg1laXxM\u0026dsp_id=22\u0026url=-BFDu2NYtc4PYTplFW_2JcnDSRVLOOfaERbwJABjFyG6NUB4ywA3dUaXt5zPlyCUpBCOxjH9gk4E6yWTshzuSfQSx7g_TxvcXYUgh7YtY9NQZxx14InmNCTsezqID5UztV7llz8SXWHQ-ZsutH1nJIZzl1jH3i2uCPi91shqIZLN1bLJ5guAr5O4WyxVeOqIKyD_GiVcY9Olm51iI_3wgwFyDEN_dIDv-ObgNxpbPD0L11-62bjhGw3__7RuEo6XLdox-g46Fcqk6i0zayfsPM4QeMAhWJ4lsg-xswSI0YAfzyoOIeTWB78mdpt_GmN5PKZZPqyO7VkbwHEasn-mTyYTddbz5v2fzEkRO0AQZtAZx96PANGrNvcOHnRVmCdkzN96b5Ur1_8ipdyzHOFRtJ-z_KmKaxig6himvMCePozZvrvihiGhigP4RGiFT7ytVYKHyUGAV2PF5SwtgnB0uGCltd7o1CLhZyZEQNgE7LSESyGztZ5kM9N_VZV9gPZVhvlJDfYFNRW9i6D2pZxV0Gd63rA9gpeUJ3mhbkj-B27VRKrNTBSrwIAU7P0RPD5_opl3G8nPD1Ce2vKuQK8qynHWQblfeA61nDok-fRezSKbzwepqi8oxXadFrCmN7KxP_mPqA794xYzIw5-mS64NA',
            'burl': 'http://d21uzv52i0cqie.cloudfront.net/api/winnotice?tn=341443089c0cb829164455a42d216ee3\u0026winloss=2\u0026id=aa86796a857ebedda9a2d7128a87dab1\u0026seat_id=${AUCTION_SEAT_ID}\u0026currency=${AUCTION_CURRENCY}\u0026bid_id=${AUCTION_BID_ID}\u0026ad_id=${AUCTION_AD_ID}\u0026loss=${AUCTION_LOSS}\u0026imp_id=1\u0026price=${AUCTION_PRICE}\u0026test=0\u0026time=1597714943\u0026adp=Dtnz0O4U8sdAU-XGGijCAgMbjDIeMGyCLXeSg1laXxM\u0026dsp_id=22\u0026url=dXerAvyp4zYQzsQ56eGB4JtiA4yFaYlTqcHffccrvCg',
            'lurl': 'http://d21uzv52i0cqie.cloudfront.net/api/winnotice?tn=341443089c0cb829164455a42d216ee3\u0026winloss=0\u0026id=aa86796a857ebedda9a2d7128a87dab1\u0026seat_id=${AUCTION_SEAT_ID}\u0026currency=${AUCTION_CURRENCY}\u0026bid_id=${AUCTION_BID_ID}\u0026ad_id=${AUCTION_AD_ID}\u0026loss=${AUCTION_LOSS}\u0026imp_id=1\u0026price=${AUCTION_PRICE}\u0026test=0\u0026time=1597714943\u0026adp=Dtnz0O4U8sdAU-XGGijCAgMbjDIeMGyCLXeSg1laXxM\u0026dsp_id=22\u0026url=ptSxg_vR7-fdx-WAkkUADJb__BntE5a6-RSeYdUewvk',
            'adm': '\u003clink rel=\"stylesheet\" href=\"//cdn.mediago.io/js/style/style_banner_300*250.css\"\u003e\u003cdiv id=\"mgcontainer-583ce3286b442001205b2fb9a5488efc\" class=\"mediago-placement imgTopTitleBottom\" style=\"position:relative;width:298px;height:248px;overflow:hidden\"\u003e\u003ca href=\"http://trace.mediago.io/api/bidder/track?tn=341443089c0cb829164455a42d216ee3\u0026price=PRMC8pCHtH55ipgXubUs8jlsKTBxWRSEweH8Mee_aUQ\u0026evt=102\u0026rid=aa86796a857ebedda9a2d7128a87dab1\u0026campaignid=1003540\u0026impid=25-300x175-1\u0026offerid=1107782\u0026test=0\u0026time=1597714943\u0026cp=GJA03gjm-ugPTmN7prOpvhfu1aA04IgpTcW4oRX22Lg\u0026clickid=25_aa86796a857ebedda9a2d7128a87dab1_25-300x175-1\u0026acid=164\u0026trackingid=583ce3286b442001205b2fb9a5488efc\u0026uid=6dda6c6b70eb4e2d9ab3469d921f2c74\u0026jt=2\u0026url=PQFFci337KgCVkx7KTgRItClLaWH0lgTcIlgBRTpfKngVJES4uKLfxXz9mjLcDWIbWQcEVVk_gfTcIaK8oKO2YyVG5lc3hjZeZr0VaIDHbWggPJaqtfDK9T0HZIKvrpe\" target=\"_blank\"\u003e\u003cimg alt=\"Robert Vowed To Keep Silent, But Decided To Put The People First And Speak\" src=\"https://d2cli4kgl5uxre.cloudfront.net/ML/b5e361889beef5eaf69987384b7a56e8__300x175.png\" style=\"height:70%;width:100%;border-width:0;border:none;\"\u003e\u003ch3 class=\"title\" style=\"font-size:16px;\"\u003eRobert Vowed To Keep Silent, But Decided To Put The People First And Speak\u003c/h3\u003e\u003c/a\u003e\u003cspan class=\"source\"\u003e\u003ca class=\"sourcename\" href=\"//www.mediago.io\" target=\"_blank\"\u003e\u003cspan\u003eAd\u003c/span\u003e \u003c/a\u003e\u003ca class=\"srcnameadslabelurl\" href=\"//www.mediago.io/privacy\" target=\"_blank\"\u003e\u003cspan\u003eViral Net News\u003c/span\u003e\u003c/a\u003e\u003c/span\u003e\u003c/div\u003e\u003cscript\u003e!function(e){var t={};function n(o){if(t[o])return t[o].exports;var r=t[o]={i:o,l:!1,exports:{}};return e[o].call(r.exports,r,r.exports,n),r.l=!0,r.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){\"undefined\"!=typeof Symbol\u0026\u0026Symbol.toStringTag\u0026\u0026Object.defineProperty(e,Symbol.toStringTag,{value:\"Module\"}),Object.defineProperty(e,\"__esModule\",{value:!0})},n.t=function(e,t){if(1\u0026t\u0026\u0026(e=n(e)),8\u0026t)return e;if(4\u0026t\u0026\u0026\"object\"==typeof e\u0026\u0026e\u0026\u0026e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,\"default\",{enumerable:!0,value:e}),2\u0026t\u0026\u0026\"string\"!=typeof e)for(var r in e)n.d(o,r,function(t){return e[t]}.bind(null,r));return o},n.n=function(e){var t=e\u0026\u0026e.__esModule?function(){return e.default}:function(){return e};return n.d(t,\"a\",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p=\"\",n(n.s=24)}({24:function(e,t,n){\"use strict\";function o(e){var t=new Image;t.src=e,t.style=\"display:none;visibility:hidden\",t.width=0,t.height=0,document.body.appendChild(t)}o(\"http://d21uzv52i0cqie.cloudfront.net/api/bidder/track?tn=341443089c0cb829164455a42d216ee3\u0026price=PRMC8pCHtH55ipgXubUs8jlsKTBxWRSEweH8Mee_aUQ\u0026evt=101\u0026rid=aa86796a857ebedda9a2d7128a87dab1\u0026campaignid=1003540\u0026impid=25-300x175-1\u0026offerid=1107782\u0026test=0\u0026time=1597714943\u0026cp=GJA03gjm-ugPTmN7prOpvhfu1aA04IgpTcW4oRX22Lg\u0026acid=164\u0026trackingid=583ce3286b442001205b2fb9a5488efc\u0026uid=6dda6c6b70eb4e2d9ab3469d921f2c74\");var r=document.getElementById(\"mgcontainer-583ce3286b442001205b2fb9a5488efc\"),i=!1;!function e(){setTimeout((function(){var t,n;!i\u0026\u0026(t=r,n=window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight,(t.getBoundingClientRect()\u0026\u0026t.getBoundingClientRect().top)\u003c=n-.75*(t.offsetHeight||t.clientHeight))?(i=!0,o(\"http://d21uzv52i0cqie.cloudfront.net/api/bidder/track?tn=341443089c0cb829164455a42d216ee3\u0026price=PRMC8pCHtH55ipgXubUs8jlsKTBxWRSEweH8Mee_aUQ\u0026evt=104\u0026rid=aa86796a857ebedda9a2d7128a87dab1\u0026campaignid=1003540\u0026impid=25-300x175-1\u0026offerid=1107782\u0026test=0\u0026time=1597714943\u0026cp=GJA03gjm-ugPTmN7prOpvhfu1aA04IgpTcW4oRX22Lg\u0026acid=164\u0026trackingid=583ce3286b442001205b2fb9a5488efc\u0026uid=6dda6c6b70eb4e2d9ab3469d921f2c74\u0026sid=16__11__13\u0026format=\u0026crid=b5e361889beef5eaf69987384b7a56e8\")):e()}),500)}()}});\u003c/script\u003e\u003cscript type=\"text/javascript\" src=\"http://d21uzv52i0cqie.cloudfront.net/api/track?tn=341443089c0cb829164455a42d216ee3\u0026price=${AUCTION_PRICE}\u0026evt=5\u0026rid=aa86796a857ebedda9a2d7128a87dab1\u0026impid=1\u0026offerid=\u0026tagid=\u0026test=0\u0026time=1597714943\u0026adp=5zrCZ2rC-WLafYkNpeTnzA72tDqVZUlOA3Js6_eJjYU\u0026dsp_id=22\u0026cp=${cp}\u0026url=\u0026type=script\"\u003e\u003c/script\u003e\u003cscript\u003edocument.addEventListener\u0026\u0026document.addEventListener(\"click\",function(){var a=document.createElement(\"script\");a.src=\"http://d21uzv52i0cqie.cloudfront.net/api/track?tn=341443089c0cb829164455a42d216ee3\u0026price=${AUCTION_PRICE}\u0026evt=6\u0026rid=aa86796a857ebedda9a2d7128a87dab1\u0026impid=1\u0026offerid=\u0026tagid=\u0026test=0\u0026time=1597714943\u0026adp=5zrCZ2rC-WLafYkNpeTnzA72tDqVZUlOA3Js6_eJjYU\u0026dsp_id=22\u0026cp=${cp}\u0026url=\u0026clickid=25_aa86796a857ebedda9a2d7128a87dab1_1\";document.body.appendChild(a)});\u003c/script\u003e',
            'cid': '1003540',
            'crid': 'b5e361889beef5eaf69987384b7a56e8',
            'w': 300,
            'h': 250
          }]
        }],
        'cur': 'USD'
      }
    };

    let bids = spec.interpretResponse(serverResponse);
    // console.log({
    //   bids
    // });
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('b5e361889beef5eaf69987384b7a56e8');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });
});
