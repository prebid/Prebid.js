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
                adm: "<link rel=\"stylesheet\" href=\"https://cdn.mediago.io/js/style/style_banner_300*250.css\"><div id=\"mgcontainer-99afea272c2b0e8626489674ddb7a0bb\" class=\"mediago-placement imgTopTitleBottom\" style=\"position:relative;width:298px;height:248px;overflow:hidden\"><a href=\"https://trace.mediago.io/api/bidder/track?tn=39934c2bda4debbe4c680be1dd02f5d3&price=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&evt=102&rid=6e28cfaf115a354ea1ad8e1304d6d7b8&campaignid=1339145&impid=44-300x250-1&offerid=24054386&test=0&time=1660789795&cp=jZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM&clickid=44_6e28cfaf115a354ea1ad8e1304d6d7b8_44-300x250-1&acid=599&trackingid=99afea272c2b0e8626489674ddb7a0bb&uid=a865b9ae-fa9e-4c09-8204-2db99ac7c8f7&jt=2&url=oxZA2i2aUVY76Xy2t3HffaK_ZtBDsgFwFc_Nbnw-bz3yCxmoUyZvATKnFc9ZkUfT1eQizhtczCwDzjHwwwDgTehUnp1EwdY4g1LRcuOwlRpXnVTt3zPQdaVx5nVDw25by7lQ0q469LCv2eEFDTAv_FOuVT32WiOx_ArOIlxCnDGpjPLUNyxm3cTZFGOJn4B7&bm=2&la=en&cn=us&cid=3998296&info=Si3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk&sid=128__110__1__12__28__38__163__96__58__24__47__99&sp=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&scp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&acu=USD&scu=USD&sgcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&gprice=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&gcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&ah=&pb=&de=wjh.popin.cc&cat=&iv=0\" target=\"_blank\" class=\"mediago-placement-track\" style=\"display: inline-block;\"><img alt=\"Ranger's spot giant lion - vet is shocked when looking at the ultrasound\" src=\"https://d2cli4kgl5uxre.cloudfront.net/ML/ff32b6f9b3bbc45c00b78b6674a2952e__scv1__300x175.png\" style=\"height:70%;width:100%;border-width:0;border:none;\"><h3 class=\"title\" style=\"font-size:16px;\">Ranger's spot giant lion - vet is shocked when looking at the ultrasound</h3></a><span class=\"source\"><a class=\"sourcename\" href=\"//www.mediago.io\" target=\"_blank\"><span>Ad</span> </a><a class=\"mgmgsrcnameadslabelurl\" href=\"//www.mediago.io/privacy\" target=\"_blank\"><span>soo-healthy</span></a></span></div><script>!function(){\"use strict\";function f(t){return(f=\"function\"==typeof Symbol&&\"symbol\"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&\"function\"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?\"symbol\":typeof t})(t)}function l(t){var e=0<arguments.length&&void 0!==t?t:{};try{e.random_t=(new Date).getTime(),g(function(t){var e=1<arguments.length&&void 0!==arguments[1]?arguments[1]:\"\";if(\"object\"!==f(t))return e;var n=function(t){for(var e,n=[],o=0,i=Object.keys(t);o<i.length;o++)e=i[o],n.push(\"\".concat(e,\"=\").concat(t[e]));return n}(t).join(\"&\"),o=e.indexOf(\"#\"),i=e,t=\"\";return-1!==o&&(i=e.slice(0,o),t=e.slice(o)),n&&(i&&-1!==i.indexOf(\"?\")?i+=\"&\"+n:i+=\"?\"+n),i+t}(e,\"https://trace.mediago.io/api/log/track\"))}catch(t){}}function g(t,e,n){(t=t?t.split(\";;;\"):[]).map(function(t){try{0<=t.indexOf(\"/api/bidder/track\")&&n&&(t+=\"&inIframe=\".concat(!(!self.frameElement||\"IFRAME\"!=self.frameElement.tagName)||window.frames.length!=parent.frames.length||self!=top),t+=\"&pos_x=\".concat(n.left,\"&pos_y=\").concat(n.top,\"&page_w=\").concat(n.page_width,\"&page_h=\").concat(n.page_height))}catch(t){l({tn:s,winloss:1,fe:2,pos_err_c:1002,pos_err_m:t.toString()})}var e=new Image;e.src=t,e.style.display=\"none\",e.style.visibility=\"hidden\",e.width=0,e.height=0,document.body.appendChild(e)})}var d=[\"https://trace.mediago.io/api/bidder/track?tn=39934c2bda4debbe4c680be1dd02f5d3&price=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&evt=101&rid=6e28cfaf115a354ea1ad8e1304d6d7b8&campaignid=1339145&impid=44-300x250-1&offerid=24054386&test=0&time=1660789795&cp=jZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM&acid=599&trackingid=99afea272c2b0e8626489674ddb7a0bb&uid=a865b9ae-fa9e-4c09-8204-2db99ac7c8f7&bm=2&la=en&cn=us&cid=3998296&info=Si3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk&sid=128__110__1__12__28__38__163__96__58__24__47__99&sp=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&scp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&acu=USD&scu=USD&sgcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&gprice=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&gcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&ah=&de=wjh.popin.cc&iv=0\",\"${ITRACKER2}\",\"${ITRACKER3}\",\"${ITRACKER4}\",\"${ITRACKER5}\",\"${ITRACKER6}\"],p=[\"https://trace.mediago.io/api/bidder/track?tn=39934c2bda4debbe4c680be1dd02f5d3&price=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&evt=104&rid=6e28cfaf115a354ea1ad8e1304d6d7b8&campaignid=1339145&impid=44-300x250-1&offerid=24054386&test=0&time=1660789795&cp=jZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM&acid=599&trackingid=99afea272c2b0e8626489674ddb7a0bb&uid=a865b9ae-fa9e-4c09-8204-2db99ac7c8f7&sid=128__110__1__12__28__38__163__96__58__24__47__99&format=&crid=ff32b6f9b3bbc45c00b78b6674a2952e&bm=2&la=en&cn=us&cid=3998296&info=Si3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk&sp=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&scp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&acu=USD&scu=USD&sgcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&gprice=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&gcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&ah=&de=wjh.popin.cc&iv=0\",\"${VTRACKER2}\",\"${VTRACKER3}\",\"${VTRACKER4}\",\"${VTRACKER5}\",\"${VTRACKER6}\"],s=\"f9f2b1ef23fe2759c2cad0953029a94b\",n=document.getElementById(\"mgcontainer-99afea272c2b0e8626489674ddb7a0bb\");n&&function(){var a=n.getElementsByClassName(\"mediago-placement-track\");if(a&&a.length){var t,e=function(t){var e,n,o,i,c,r;\"object\"===f(r=a[t])&&(e=function(t){try{var e=t.getBoundingClientRect(),n=e&&e.top||-1,o=e&&e.left||-1,i=document.body.scrollWidth||-1,e=document.body.scrollHeight||-1;return{top:n.toFixed(0),left:o.toFixed(0),page_width:i,page_height:e}}catch(o){return l({tn:s,winloss:1,fe:2,pos_err_c:1001,pos_err_m:o.toString()}),{top:\"-1\",left:\"-1\",page_width:\"-1\",page_height:\"-1\"}}}(r),(n=d[t])&&g(n,0,e),o=p[t],i=!1,(c=function(){setTimeout(function(){var t,e;!i&&(t=r,e=window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight,(t.getBoundingClientRect()&&t.getBoundingClientRect().top)<=e-.75*(t.offsetHeight||t.clientHeight))?(i=!0,o&&g(o)):c()},500)})())};for(t in a)e(t)}}()}();</script>",
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
