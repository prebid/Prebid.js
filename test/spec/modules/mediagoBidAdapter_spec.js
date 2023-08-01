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
    let adm = "<link rel=\"stylesheet\" href=\"https://cdn.mediago.io/js/style/style_banner_300*250.css\"><div id=\"mgcontainer-99afea272c2b0e8626489674ddb7a0bb\" class=\"mediago-placement imgTopTitleBottom\" style=\"position:relative;width:298px;height:248px;overflow:hidden\"><a href=\"https://trace.mediago.io/api/bidder/track?tn=39934c2bda4debbe4c680be1dd02f5d3&price=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&evt=102&rid=6e28cfaf115a354ea1ad8e1304d6d7b8&campaignid=1339145&impid=44-300x250-1&offerid=24054386&test=0&time=1660789795&cp=jZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM&clickid=44_6e28cfaf115a354ea1ad8e1304d6d7b8_44-300x250-1&acid=599&trackingid=99afea272c2b0e8626489674ddb7a0bb&uid=a865b9ae-fa9e-4c09-8204-2db99ac7c8f7&jt=2&url=oxZA2i2aUVY76Xy2t3HffaK_ZtBDsgFwFc_Nbnw-bz3yCxmoUyZvATKnFc9ZkUfT1eQizhtczCwDzjHwwwDgTehUnp1EwdY4g1LRcuOwlRpXnVTt3zPQdaVx5nVDw25by7lQ0q469LCv2eEFDTAv_FOuVT32WiOx_ArOIlxCnDGpjPLUNyxm3cTZFGOJn4B7&bm=2&la=en&cn=us&cid=3998296&info=Si3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk&sid=128__110__1__12__28__38__163__96__58__24__47__99&sp=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&scp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&acu=USD&scu=USD&sgcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&gprice=djUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk&gcp=zK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg&ah=&pb=&de=wjh.popin.cc&cat=&iv=0\" target=\"_blank\" class=\"mediago-placement-track\" style=\"display: inline-block;\"><img alt=\"Ranger's spot giant lion - vet is shocked when looking at the ultrasound\" src=\"https://d2cli4kgl5uxre.cloudfront.net/ML/ff32b6f9b3bbc45c00b78b6674a2952e__scv1__300x175.png\" style=\"height:70%;width:100%;border-width:0;border:none;\"><h3 class=\"title\" style=\"font-size:16px;\">Ranger's spot giant lion - vet is shocked when looking at the ultrasound</h3></a><span class=\"source\"><a class=\"sourcename\" href=\"//www.mediago.io\" target=\"_blank\"><span>Ad</span> </a><a class=\"mgmgsrcnameadslabelurl\" href=\"//www.mediago.io/privacy\" target=\"_blank\"><span>soo-healthy</span></a></span></div>";
    let temp = '%3Cscr';
    temp += 'ipt%3E';
    temp += '!function()%7B%22use%20strict%22%3Bfunction%20f(t)%7Breturn(f%3D%22function%22%3D%3Dtypeof%20Symbol%26%26%22symbol%22%3D%3Dtypeof%20Symbol.iterator%3Ffunction(t)%7Breturn%20typeof%20t%7D%3Afunction(t)%7Breturn%20t%26%26%22function%22%3D%3Dtypeof%20Symbol%26%26t.constructor%3D%3D%3DSymbol%26%26t!%3D%3DSymbol.prototype%3F%22symbol%22%3Atypeof%20t%7D)(t)%7Dfunction%20l(t)%7Bvar%20e%3D0%3Carguments.length%26%26void%200!%3D%3Dt%3Ft%3A%7B%7D%3Btry%7Be.random_t%3D(new%20Date).getTime()%2Cg(function(t)%7Bvar%20e%3D1%3Carguments.length%26%26void%200!%3D%3Darguments%5B1%5D%3Farguments%5B1%5D%3A%22%22%3Bif(%22object%22!%3D%3Df(t))return%20e%3Bvar%20n%3Dfunction(t)%7Bfor(var%20e%2Cn%3D%5B%5D%2Co%3D0%2Ci%3DObject.keys(t)%3Bo%3Ci.length%3Bo%2B%2B)e%3Di%5Bo%5D%2Cn.push(%22%22.concat(e%2C%22%3D%22).concat(t%5Be%5D))%3Breturn%20n%7D(t).join(%22%26%22)%2Co%3De.indexOf(%22%23%22)%2Ci%3De%2Ct%3D%22%22%3Breturn-1!%3D%3Do%26%26(i%3De.slice(0%2Co)%2Ct%3De.slice(o))%2Cn%26%26(i%26%26-1!%3D%3Di.indexOf(%22%3F%22)%3Fi%2B%3D%22%26%22%2Bn%3Ai%2B%3D%22%3F%22%2Bn)%2Ci%2Bt%7D(e%2C%22https%3A%2F%2Ftrace.mediago.io%2Fapi%2Flog%2Ftrack%22))%7Dcatch(t)%7B%7D%7Dfunction%20g(t%2Ce%2Cn)%7B(t%3Dt%3Ft.split(%22%3B%3B%3B%22)%3A%5B%5D).map(function(t)%7Btry%7B0%3C%3Dt.indexOf(%22%2Fapi%2Fbidder%2Ftrack%22)%26%26n%26%26(t%2B%3D%22%26inIframe%3D%22.concat(!(!self.frameElement%7C%7C%22IFRAME%22!%3Dself.frameElement.tagName)%7C%7Cwindow.frames.length!%3Dparent.frames.length%7C%7Cself!%3Dtop)%2Ct%2B%3D%22%26pos_x%3D%22.concat(n.left%2C%22%26pos_y%3D%22).concat(n.top%2C%22%26page_w%3D%22).concat(n.page_width%2C%22%26page_h%3D%22).concat(n.page_height))%7Dcatch(t)%7Bl(%7Btn%3As%2Cwinloss%3A1%2Cfe%3A2%2Cpos_err_c%3A1002%2Cpos_err_m%3At.toString()%7D)%7Dvar%20e%3Dnew%20Image%3Be.src%3Dt%2Ce.style.display%3D%22none%22%2Ce.style.visibility%3D%22hidden%22%2Ce.width%3D0%2Ce.height%3D0%2Cdocument.body.appendChild(e)%7D)%7Dvar%20d%3D%5B%22https%3A%2F%2Ftrace.mediago.io%2Fapi%2Fbidder%2Ftrack%3Ftn%3D39934c2bda4debbe4c680be1dd02f5d3%26price%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26evt%3D101%26rid%3D6e28cfaf115a354ea1ad8e1304d6d7b8%26campaignid%3D1339145%26impid%3D44-300x250-1%26offerid%3D24054386%26test%3D0%26time%3D1660789795%26cp%3DjZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM%26acid%3D599%26trackingid%3D99afea272c2b0e8626489674ddb7a0bb%26uid%3Da865b9ae-fa9e-4c09-8204-2db99ac7c8f7%26bm%3D2%26la%3Den%26cn%3Dus%26cid%3D3998296%26info%3DSi3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk%26sid%3D128__110__1__12__28__38__163__96__58__24__47__99%26sp%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26scp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26acu%3DUSD%26scu%3DUSD%26sgcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26gprice%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26gcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26ah%3D%26de%3Dwjh.popin.cc%26iv%3D0%22%2C%22%24%7BITRACKER2%7D%22%2C%22%24%7BITRACKER3%7D%22%2C%22%24%7BITRACKER4%7D%22%2C%22%24%7BITRACKER5%7D%22%2C%22%24%7BITRACKER6%7D%22%5D%2Cp%3D%5B%22https%3A%2F%2Ftrace.mediago.io%2Fapi%2Fbidder%2Ftrack%3Ftn%3D39934c2bda4debbe4c680be1dd02f5d3%26price%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26evt%3D104%26rid%3D6e28cfaf115a354ea1ad8e1304d6d7b8%26campaignid%3D1339145%26impid%3D44-300x250-1%26offerid%3D24054386%26test%3D0%26time%3D1660789795%26cp%3DjZDh1xu6_QqJLlKVtCkiHIP_TER6gL9jeTrlHCBoxOM%26acid%3D599%26trackingid%3D99afea272c2b0e8626489674ddb7a0bb%26uid%3Da865b9ae-fa9e-4c09-8204-2db99ac7c8f7%26sid%3D128__110__1__12__28__38__163__96__58__24__47__99%26format%3D%26crid%3Dff32b6f9b3bbc45c00b78b6674a2952e%26bm%3D2%26la%3Den%26cn%3Dus%26cid%3D3998296%26info%3DSi3oM-qfCbw2iZRYs01BkUWyH6c5CQWHrA8CQLE0VHcXAcf4ljY9dyLzQ4vAlTWd6-j_ou4ySor3e70Ll7wlKiiauQKaUkZqNoTizHm73C4FK8DYJSTP3VkhJV8RzrYk%26sp%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26scp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26acu%3DUSD%26scu%3DUSD%26sgcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26gprice%3DdjUJcggeuWWfbm28q4WXHdgMFkO28DrGw49FnubQ0Bk%26gcp%3DzK0DRYY1UV-syqSpmcMYBpOebtoQJV9ZEJT0JFqbTQg%26ah%3D%26de%3Dwjh.popin.cc%26iv%3D0%22%2C%22%24%7BVTRACKER2%7D%22%2C%22%24%7BVTRACKER3%7D%22%2C%22%24%7BVTRACKER4%7D%22%2C%22%24%7BVTRACKER5%7D%22%2C%22%24%7BVTRACKER6%7D%22%5D%2Cs%3D%22f9f2b1ef23fe2759c2cad0953029a94b%22%2Cn%3Ddocument.getElementById(%22mgcontainer-99afea272c2b0e8626489674ddb7a0bb%22)%3Bn%26%26function()%7Bvar%20a%3Dn.getElementsByClassName(%22mediago-placement-track%22)%3Bif(a%26%26a.length)%7Bvar%20t%2Ce%3Dfunction(t)%7Bvar%20e%2Cn%2Co%2Ci%2Cc%2Cr%3B%22object%22%3D%3D%3Df(r%3Da%5Bt%5D)%26%26(e%3Dfunction(t)%7Btry%7Bvar%20e%3Dt.getBoundingClientRect()%2Cn%3De%26%26e.top%7C%7C-1%2Co%3De%26%26e.left%7C%7C-1%2Ci%3Ddocument.body.scrollWidth%7C%7C-1%2Ce%3Ddocument.body.scrollHeight%7C%7C-1%3Breturn%7Btop%3An.toFixed(0)%2Cleft%3Ao.toFixed(0)%2Cpage_width%3Ai%2Cpage_height%3Ae%7D%7Dcatch(o)%7Breturn%20l(%7Btn%3As%2Cwinloss%3A1%2Cfe%3A2%2Cpos_err_c%3A1001%2Cpos_err_m%3Ao.toString()%7D)%2C%7Btop%3A%22-1%22%2Cleft%3A%22-1%22%2Cpage_width%3A%22-1%22%2Cpage_height%3A%22-1%22%7D%7D%7D(r)%2C(n%3Dd%5Bt%5D)%26%26g(n%2C0%2Ce)%2Co%3Dp%5Bt%5D%2Ci%3D!1%2C(c%3Dfunction()%7BsetTimeout(function()%7Bvar%20t%2Ce%3B!i%26%26(t%3Dr%2Ce%3Dwindow.innerHeight%7C%7Cdocument.documentElement.clientHeight%7C%7Cdocument.body.clientHeight%2C(t.getBoundingClientRect()%26%26t.getBoundingClientRect().top)%3C%3De-.75*(t.offsetHeight%7C%7Ct.clientHeight))%3F(i%3D!0%2Co%26%26g(o))%3Ac()%7D%2C500)%7D)())%7D%3Bfor(t%20in%20a)e(t)%7D%7D()%7D()';
    temp += '%3B%3C%2Fscri';
    temp += 'pt%3E';
    adm += decodeURIComponent(temp);
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
                adm: adm,
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
