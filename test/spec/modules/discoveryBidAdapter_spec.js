import { expect } from 'chai';
import { spec } from 'modules/discoveryBidAdapter.js';

describe('DiscoveryDSP:BidAdapterTests', function () {
  let bidRequestData = {
    bidderCode: 'DiscoveryDSP',
    auctionId: 'ff66e39e-4075-4d18-9854-56fde9b879ac',
    bidderRequestId: '4fec04e87ad785',
    bids: [
      {
        bidder: 'DiscoveryDSP',
        params: {
          token: 'd0f4902b616cc5c38cbe0a08676d0ed9',
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        adUnitCode: 'regular_iframe',
        transactionId: 'd163f9e2-7ecd-4c2c-a3bd-28ceb52a60ee',
        sizes: [[300, 250]],
        bidId: '276092a19e05eb',
        bidderRequestId: '1fadae168708b',
        auctionId: 'ff66e39e-4075-4d18-9854-56fde9b879ac',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
      },
    ],
  };
  let request = [];

  it('DiscoveryDSP:validate_pub_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'DiscoveryDSP',
        params: {
          token: ['d0f4902b616cc5c38cbe0a08676d0ed9'],
          media: ['test_media']
        },
      })
    ).to.equal(true);
  });

  it('DiscoveryDSP:validate_generated_params', function () {
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    let req_data = JSON.parse(request.data);
    expect(req_data.imp).to.have.lengthOf(1);
  });

  it('DiscoveryDSP:validate_response_params', function () {
    let tempAdm = '<link rel=\"stylesheet\" href=\"https://cdn.mediago.io/js/style/style_banner_336x280_standard.css\"><div id=\"mgcontainer-e1746bcc817beaba9d63bd4254aad533\" class=\"mediago-placement_46ee9c c336x280_standard_46ee9c mediago-placement c336x280_standard\" style=\"width:336px;height:280px;overflow:hidden\"><a class=\"mediago-placement-track_46ee9c mediago-placement-track\" title=\"秘密のしかけのネックレスをプレゼントした男性。2年後に彼女は中身に気付いて悲鳴を上げた\" href=\"https://trace.mediago.cc/api/bidder/track?tn=d0f4902b616cc5c38cbe0a08676d0ed9&price=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&evt=102&rid=3f6700b5e61e1476bed629b6ea6c7a4d&campaignid=1366258&impid=50-3663.infoseek.co.jp.336x280-1&offerid=28316825&test=0&time=1660811542&cp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&clickid=50_3f6700b5e61e1476bed629b6ea6c7a4d_50-3663.infoseek.co.jp.336x280-1&acid=1120&trackingid=e1746bcc817beaba9d63bd4254aad533&uid=7544198412013119947&jt=2&url=O7fi1nLA9qLQjcPq7rIDvxMyybMbcc2iUh-TuaqiVSD1Dj4cKrR82gRYdWy1Ao22yhq2FoY79tmyI3X_bsO3CusXggmpW8bZvwTlHPxfOxekArClcRSpWmkVorlnMSYf7yM6QBVTuTLCCP-cK8eXMZnQVR7PdOImYZGJis6q9Xx9MToxvPkWRVa13OaCtKVeqzGdglYH3G2mqo1qLP1RCCZJHE1Fq8fgCYmLJ0Xli-nLvFZjt3g0HIui_IvyZi6YtXS97p9ohgfgDJnqcGH6l053AP0cO7ZQDHtS2_9P9UqgaA47gmltDVEDkSThX7js&bm=50&la=ja&cn=jp&cid=4215873&info=x_ME1qzmB7TY6hTSn_XUw5s6N-EkBgxcE4qJ0fd9amgsJzO3-Gtm2Nja777SyGlpkF6k_tSzbcLYYecYQlHncOAAIyuNaT2rvqrhxrQPfC7opZUGQ8WMx4Rwkx8R2k0nDiBI8xnegLWYTvY-Fc99Rw&sid=38__149__12__24__144__163__47__1__99&sp=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&scp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&acu=JPY&scu=USD&sgcp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&gprice=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&gcp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&ah=&pb=m&de=infoseek.co.jp&cat=&iv=0\" target=\"_blank\"><div class=\"mediago-placement-top_46ee9c mediago-placement-top\" style=\"background-image:url(https://d2cli4kgl5uxre.cloudfront.net/ML/d8e9b4aa20fae1739d2aad8c926d3f15__scv1__306x304.png)\"></div></a><div class=\"mediago-placement-bottom_46ee9c mediago-placement-bottom\"><div class=\"mediago-middle_46ee9c mediago-middle\"><a class=\"mediago-placement-track_46ee9c mediago-placement-track\" title=\"秘密のしかけのネックレスをプレゼントした男性。2年後に彼女は中身に気付いて悲鳴を上げた\" href=\"https://trace.mediago.cc/api/bidder/track?tn=d0f4902b616cc5c38cbe0a08676d0ed9&price=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&evt=102&rid=3f6700b5e61e1476bed629b6ea6c7a4d&campaignid=1366258&impid=50-3663.infoseek.co.jp.336x280-1&offerid=28316825&test=0&time=1660811542&cp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&clickid=50_3f6700b5e61e1476bed629b6ea6c7a4d_50-3663.infoseek.co.jp.336x280-1&acid=1120&trackingid=e1746bcc817beaba9d63bd4254aad533&uid=7544198412013119947&jt=2&url=O7fi1nLA9qLQjcPq7rIDvxMyybMbcc2iUh-TuaqiVSD1Dj4cKrR82gRYdWy1Ao22yhq2FoY79tmyI3X_bsO3CusXggmpW8bZvwTlHPxfOxekArClcRSpWmkVorlnMSYf7yM6QBVTuTLCCP-cK8eXMZnQVR7PdOImYZGJis6q9Xx9MToxvPkWRVa13OaCtKVeqzGdglYH3G2mqo1qLP1RCCZJHE1Fq8fgCYmLJ0Xli-nLvFZjt3g0HIui_IvyZi6YtXS97p9ohgfgDJnqcGH6l053AP0cO7ZQDHtS2_9P9UqgaA47gmltDVEDkSThX7js&bm=50&la=ja&cn=jp&cid=4215873&info=x_ME1qzmB7TY6hTSn_XUw5s6N-EkBgxcE4qJ0fd9amgsJzO3-Gtm2Nja777SyGlpkF6k_tSzbcLYYecYQlHncOAAIyuNaT2rvqrhxrQPfC7opZUGQ8WMx4Rwkx8R2k0nDiBI8xnegLWYTvY-Fc99Rw&sid=38__149__12__24__144__163__47__1__99&sp=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&scp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&acu=JPY&scu=USD&sgcp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&gprice=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&gcp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&ah=&pb=m&de=infoseek.co.jp&cat=&iv=0\" target=\"_blank\"><div class=\"mediago-title_46ee9c mediago-title\">秘密のしかけのネックレスをプレゼントした男性。2年後に彼女は中身に気付いて悲鳴を上げた</div></a><div style=\"margin-top:10px;\"><a class=\"mediago-ad-icon_46ee9c mediago-ad-icon\" title=\"ad\" href=\"//www.mediago.io/privacy\" target=\"_blank\">AD</a> <a class=\"mediago-placement-track_46ee9c mediago-placement-track\" title=\"秘密のしかけのネックレスをプレゼントした男性。2年後に彼女は中身に気付いて悲鳴を上げた\" href=\"https://trace.mediago.cc/api/bidder/track?tn=d0f4902b616cc5c38cbe0a08676d0ed9&price=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&evt=102&rid=3f6700b5e61e1476bed629b6ea6c7a4d&campaignid=1366258&impid=50-3663.infoseek.co.jp.336x280-1&offerid=28316825&test=0&time=1660811542&cp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&clickid=50_3f6700b5e61e1476bed629b6ea6c7a4d_50-3663.infoseek.co.jp.336x280-1&acid=1120&trackingid=e1746bcc817beaba9d63bd4254aad533&uid=7544198412013119947&jt=2&url=O7fi1nLA9qLQjcPq7rIDvxMyybMbcc2iUh-TuaqiVSD1Dj4cKrR82gRYdWy1Ao22yhq2FoY79tmyI3X_bsO3CusXggmpW8bZvwTlHPxfOxekArClcRSpWmkVorlnMSYf7yM6QBVTuTLCCP-cK8eXMZnQVR7PdOImYZGJis6q9Xx9MToxvPkWRVa13OaCtKVeqzGdglYH3G2mqo1qLP1RCCZJHE1Fq8fgCYmLJ0Xli-nLvFZjt3g0HIui_IvyZi6YtXS97p9ohgfgDJnqcGH6l053AP0cO7ZQDHtS2_9P9UqgaA47gmltDVEDkSThX7js&bm=50&la=ja&cn=jp&cid=4215873&info=x_ME1qzmB7TY6hTSn_XUw5s6N-EkBgxcE4qJ0fd9amgsJzO3-Gtm2Nja777SyGlpkF6k_tSzbcLYYecYQlHncOAAIyuNaT2rvqrhxrQPfC7opZUGQ8WMx4Rwkx8R2k0nDiBI8xnegLWYTvY-Fc99Rw&sid=38__149__12__24__144__163__47__1__99&sp=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&scp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&acu=JPY&scu=USD&sgcp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&gprice=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&gcp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&ah=&pb=m&de=infoseek.co.jp&cat=&iv=0\" target=\"_blank\"><div class=\"mediago-brand-name_46ee9c mediago-brand-name\">Factable</div></a></div></div></div></div>'
    tempAdm += '%3Cscr';
    tempAdm += 'ipt%3E';
    tempAdm += '!function(){\"use strict\";function f(t){return(f=\"function\"==typeof Symbol&&\"symbol\"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&\"function\"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?\"symbol\":typeof t})(t)}function l(t){var e=0<arguments.length&&void 0!==t?t:{};try{e.random_t=(new Date).getTime(),g(function(t){var e=1<arguments.length&&void 0!==arguments[1]?arguments[1]:\"\";if(\"object\"!==f(t))return e;var n=function(t){for(var e,n=[],o=0,i=Object.keys(t);o<i.length;o++)e=i[o],n.push(\"\".concat(e,\"=\").concat(t[e]));return n}(t).join(\"&\"),o=e.indexOf(\"#\"),i=e,t=\"\";return-1!==o&&(i=e.slice(0,o),t=e.slice(o)),n&&(i&&-1!==i.indexOf(\"?\")?i+=\"&\"+n:i+=\"?\"+n),i+t}(e,\"https://trace.mediago.io/api/log/track\"))}catch(e){}}function g(t,e,n){(t=t?t.split(\";;;\"):[]).map(function(t){try{0<=t.indexOf(\"/api/bidder/track\")&&n&&(t+=\"&inIframe=\".concat(!(!self.frameElement||\"IFRAME\"!=self.frameElement.tagName)||window.frames.length!=parent.frames.length||self!=top),t+=\"&pos_x=\".concat(n.left,\"&pos_y=\").concat(n.top,\"&page_w=\").concat(n.page_width,\"&page_h=\").concat(n.page_height))}catch(t){l({tn:p,winloss:1,fe:2,pos_err_c:1002,pos_err_m:t.toString()})}var e=new Image;e.src=t,e.style.display=\"none\",e.style.visibility=\"hidden\",e.width=0,e.height=0,document.body.appendChild(e)})}var d=[\"https://trace.mediago.cc/api/bidder/track?tn=d0f4902b616cc5c38cbe0a08676d0ed9&price=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&evt=101&rid=3f6700b5e61e1476bed629b6ea6c7a4d&campaignid=1366258&impid=50-3663.infoseek.co.jp.336x280-1&offerid=28316825&test=0&time=1660811542&cp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&acid=1120&trackingid=e1746bcc817beaba9d63bd4254aad533&uid=7544198412013119947&bm=50&la=ja&cn=jp&cid=4215873&info=x_ME1qzmB7TY6hTSn_XUw5s6N-EkBgxcE4qJ0fd9amgsJzO3-Gtm2Nja777SyGlpkF6k_tSzbcLYYecYQlHncOAAIyuNaT2rvqrhxrQPfC7opZUGQ8WMx4Rwkx8R2k0nDiBI8xnegLWYTvY-Fc99Rw&sid=38__149__12__24__144__163__47__1__99&sp=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&scp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&acu=JPY&scu=USD&sgcp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&gprice=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&gcp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&ah=&de=infoseek.co.jp&iv=0\",\"${ITRACKER2}\",\"${ITRACKER3}\",\"${ITRACKER4}\",\"${ITRACKER5}\",\"${ITRACKER6}\"],u=[\"https://trace.mediago.cc/api/bidder/track?tn=d0f4902b616cc5c38cbe0a08676d0ed9&price=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&evt=104&rid=3f6700b5e61e1476bed629b6ea6c7a4d&campaignid=1366258&impid=50-3663.infoseek.co.jp.336x280-1&offerid=28316825&test=0&time=1660811542&cp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&acid=1120&trackingid=e1746bcc817beaba9d63bd4254aad533&uid=7544198412013119947&sid=38__149__12__24__144__163__47__1__99&format=&crid=d8e9b4aa20fae1739d2aad8c926d3f15&bm=50&la=ja&cn=jp&cid=4215873&info=x_ME1qzmB7TY6hTSn_XUw5s6N-EkBgxcE4qJ0fd9amgsJzO3-Gtm2Nja777SyGlpkF6k_tSzbcLYYecYQlHncOAAIyuNaT2rvqrhxrQPfC7opZUGQ8WMx4Rwkx8R2k0nDiBI8xnegLWYTvY-Fc99Rw&sp=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&scp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&acu=JPY&scu=USD&sgcp=mMrvLk32jGlArvPzkLzohkmMOOp6YSaVPquxpJIAub4&gprice=zM_t6HbCS8OclsiLiZUjtAqxHOGHkHjKXNZ9_buiV_s&gcp=WDWnWmVvDyEauBe8AfxyP7vfEVRzDMzzKOeztgGoSWY&ah=&de=infoseek.co.jp&iv=0\",\"${VTRACKER2}\",\"${VTRACKER3}\",\"${VTRACKER4}\",\"${VTRACKER5}\",\"${VTRACKER6}\"],p=\"f9f2b1ef23fe2759c2cad0953029a94b\",n=document.getElementById(\"mgcontainer-e1746bcc817beaba9d63bd4254aad533\");n&&function(){var a=n.getElementsByClassName(\"mediago-placement-track\");if(a&&a.length){var t,e=function(t){var e,n,o,i,c,r;\"object\"===f(r=a[t])&&(e=function(t){try{var e=t.getBoundingClientRect(),n=e&&e.top||-1,o=e&&e.left||-1,i=document.body.scrollWidth||-1,c=document.body.scrollHeight||-1;return{top:n.toFixed(0),left:o.toFixed(0),page_width:i,page_height:c}}catch(t){return l({tn:p,winloss:1,fe:2,pos_err_c:1001,pos_err_m:t.toString()}),{top:\"-1\",left:\"-1\",page_width:\"-1\",page_height:\"-1\"}}}(r),(n=d[t])&&g(n,0,e),o=u[t],c=!(i=function(){o&&g(o)}),function n(){setTimeout(function(){var t,e;!c&&(t=r,e=window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight,(t.getBoundingClientRect()&&t.getBoundingClientRect().top)<=e-.75*(t.offsetHeight||t.clientHeight))?(c=!0,i()):n()},500)}())};for(t in a)e(t)}}()}();'
    let serverResponse = {
      body: {
        id: 'pp_hbjs_2405029787417735524',
        seatbid: [
          {
            bid: [
              {
                id: '3f6700b5e61e1476bed629b6ea6c7a4d',
                impid: '1',
                price: 0.2,
                adm: tempAdm,
                cid: '1366258',
                adid: '373310507',
                nurl: 'https://trace.mediago.cc/api/log/winnotice?tn=d0f4902b616cc5c38cbe0a08676d0ed9&winloss=1&id=3f6700b5e61e1476bed629b6ea6c7a4d&seat_id=${AUCTION_SEAT_ID}&currency=${AUCTION_CURRENCY}&bid_id=${AUCTION_BID_ID}&ad_id=${AUCTION_AD_ID}&loss=&imp_id=1&price=${AUCTION_PRICE}&test=0&time=1660811542&dp=wvO7WSz-cc9cIMKfTKLEV4Wxq2bmfn3b7m1-eCXRY1g&dsp_id=22&url=GDlAk_HBNSXBOzdKhhvt8xajglRd4lKSZa1p6n_jRygw27m5Zfp-B5yN7ofsn9N-9LkOtOK9HmnrRW-rhROSzRkQdNNrbPQDXeiO2eRi_gVHuZ0AXrxvU4hnGLTR8qeXxFVQkDpzI1_GRaZgcHjPXyhf_Thj5s6oTdKWCPj5Bui8R-ED5NNPv0KH8jhaA_LFXaaa89e8yoi04RX7ouASR_JB6LKofkZEpl2333zEMxl_FatV9NKzCWyZeYMR7m9VVRtkvNv-TUpN61y5cUGMVBfBHPe47sN773IM2Lys3iWP-p-dY1sE0bMrgEFiXHL_E5Y2kydBncLHV9cjzLsjnDtHUd5ourda_bzVApcQYtJn58m_3-_hz_04vjAqLuL1A4dVlorZq65NCWzR6vTN-xemSRp1D4ZQAR2nRU3YVNyubFAeSFyBgUBEx2t8u76oKLz_luOXvFm1I81mRqI-HhDEg827PW51xmrJT9TpLU3i16ULlbcKfoKk3C4RrFLNsC8fLGWcqky0T7Ese0o2BMcGBVXBxlnbkvabzFN6h4Y0-vYDvVRWWm_G3YzfApqhCnTgcaGCDsyLIptJuX36N4GltCTBcpQvhprn5VA_kZop5G8uhHGOE2oJ8g4HyVF5N752EZMFSe5H6Wz2pvH2gmm0KpYOdcGR1PopuJ-M9NaneEl6_cKiCtizBUxdSnxa-WADwkTJ-WwnTP2acy4M0r9puv1rk6myLl32TFmcCgd-6BtT7m9QRZiVOhlvxfWIHbyNgdb-BZ0GHwiKOVd5jMDj4hsDWqNq4hEtBlKDDpYXbdgpB-mK3z24wS_VgsgB1vnMw0yLekWK5_yDqqb_n8VEV6N7LLHyb-Ry5X-0EyRQw-IlXLjjfC7MqZwfMCTTElx2lt9Xd1DYbWM43q2EVEI0j6Vn8pITBBIfg-ygthG26htPBxgIDh8qXQaTkbldLyX_don-BYhs7U3TPv9u2FYE6ACLjvo9iUnMj_8MSD4&sp=wvO7WSz-cc9cIMKfTKLEV4Wxq2bmfn3b7m1-eCXRY1g',
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

    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.creativeId).to.equal('1366258');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });
});
