import { expect } from 'chai';
import { spec } from 'modules/dsp_genieeBidAdapter.js';
import { config } from 'src/config';
import { setConfig as setCurrencyConfig } from '../../../modules/currency';
import { addFPDToBidderRequest } from '../../helpers/fpd';

describe('Geniee adapter tests', () => {
  const validBidderRequest = {
    code: 'sample_request',
    bids: [{
      bidId: 'bid-id',
      bidder: 'dsp_geniee',
      params: {
        test: 1
      }
    }],
    gdprConsent: {
      gdprApplies: false
    },
    uspConsent: '1YNY'
  };

  describe('isBidRequestValid function test', () => {
    it('valid', () => {
      expect(spec.isBidRequestValid(validBidderRequest.bids[0])).equal(true);
    });
  });
  describe('buildRequests function test', () => {
    it('auction', () => {
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      const auction_id = request.data.id;
      expect(request).deep.equal({
        method: 'POST',
        url: 'https://rt.gsspat.jp/prebid_auction',
        data: {
          at: 1,
          id: auction_id,
          imp: [
            {
              ext: {
                test: 1
              },
              id: 'bid-id',
              secure: 1
            }
          ],
          test: 1
        },
      });
    });
    it('uncomfortable (gdpr)', () => {
      validBidderRequest.gdprConsent.gdprApplies = true;
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
      validBidderRequest.gdprConsent.gdprApplies = false;
    });
    it('uncomfortable (usp)', () => {
      validBidderRequest.uspConsent = '1YYY';
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
      validBidderRequest.uspConsent = '1YNY';
    });
    it('uncomfortable (coppa)', () => {
      config.setConfig({ coppa: true });
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
      config.resetConfig();
    });
    it('uncomfortable (currency)', () => {
      setCurrencyConfig({ adServerCurrency: 'TWD' });
      return addFPDToBidderRequest(validBidderRequest).then(res => {
        const request = spec.buildRequests(validBidderRequest.bids, res);
        expect(request).deep.equal({
          method: 'GET',
          url: 'https://rt.gsspat.jp/prebid_uncomfortable',
        });
        setCurrencyConfig({});
        config.resetConfig();
      });
    });
  });
  describe('interpretResponse function test', () => {
    it('sample bid', () => {
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      const auction_id = request.data.id;
      const adm = "<script type=\"text/javascript\">\ndocument.write('<span id=\"banner-1855322083\" style=\"border:none;margin:0;padding:0;position:relative;display:inline-block\">\\n<a href=\"https://rt.gsspat.jp/c?c=&amp;y=0&amp;p=firstprice&amp;do=https%3A%2F%2Fgeniee.co.jp%2F&amp;vs=RxDOvFcIFzFPYJ8ElZ_45u7UY3yp1S9pO7dcBAzxwv_m99E1iHIGCmCaRsaXGFiNsYrcsH6-uySE3CH8ezAm0a-CMemKmP7aXusy95z0NQiheDDukZJ4V3FhOl9VNNVGKTiJIc98Ha6Gj9dH_6e_xrFK6Uxu1StCTGRr9ttKI18RbiXMGziOeK9iJAspcPOt5a9-DiPOMSwNl4cPCCUlRc1ryzxDtNu0i6_FAV1hI-Q7GFKVTtmyl1pnXFgcK6VTIsaWX_uGJCpekJU-9j1sWJOTX42hoR4HvviiEj2CN_kItq_UtAu6jNAqC8nluWB97JYfhVl6_06yLYGWw3Qk9mEJUg531zuBFyrhtvgjNutdGRbOo6CyUWd2DsehC0l_nQKEpgwXkFR4Fu4OkodGm10Wau_nOQzAmv38yXKQY1NDZq_M6x6Seq6_qa08Qj1hfSbHBrPg03uKdTh0k-12P9k8hsD10ASIiTU3oSvy_sBDmyywZuoaij2ILD6iFSYdiikJ54VLuLWHN_PSvDct6gYOFfW3O3gk5jA9EaUMuTIq_iu0wJ2129T_v9ZchC1irYGzxfVOrbdxAzLRxEdzjnWKbkPAStsUV7wpl5xC-VRbUqSOr_PcMKE3AH5MA7BKPfdE3zjFmrT7xzzzISzxAUWxOX-yxpnHq9LtSw_Z4FvOscBCoMd8uvw815pGlDj-GTZJWozzNmbXVAFcyczagw\" style=\"border:none;margin:0;padding:0;\" target=\"_top\" >\\n');\n(function(){var scheme = (location.protocol=='https:' ? 'https:' : 'http:');document.write(\"<img src=\\\"\" + scheme + \"//img.gsspat.jp/e/068c8e1eafbf0cb6ac1ee95c36152bd2/04f4bd4e6b71f978d343d84ecede3877.png\\\" height='250' width='300' style='border:none;margin:0;padding:0;left:0;top:0;position:relative;display:inline;'>\\n\");})();document.write('</a></span>\\n');\n</script>\n<script type=\"text/javascript\">\nvar Optout_IXaeJoo6aeniaboo;\n(function(k){function g(c,d){return function(){var e=document.getElementById(c),h=document.getElementById(d),g=e.style.display;e.style.display=h.style.display;h.style.display=g}}k.addOptoutInfoIcons=function(c,d,e,h,k,f,n,l){var m=document.getElementById(c),b=document.createElement(\"img\");b.src=\"https://img.gsspat.jp/e/optout/img/opt_icon.png\";b.style.width=\"15px\";b.style.height=\"15px\";var a=String(+d-15);e=c+\"-icon\";b.id=e;b.style.position=\"absolute\";b.style.top=\"0px\";b.style.left=a+\"px\";b.style.margin=\"0px\";\nb.style.padding=\"0px\";b.style.border=\"none\";b.style.opacity=\"0.8\";a=document.createElement(\"a\");c+=\"-optout-link\";a.id=c;a.style.position=\"absolute\";a.style.top=\"0px\";a.style.left=+d-75+\"px\";a.style.display=\"none\";a.style.border=\"none\";a.style.margin=\"0px\";a.style.padding=\"0px\";d=k.replace(\"{USER_ID}\",h);d=d.replace(\"{OPTOUT}\",String(f));d=d.replace(\"{TYPE}\",String(n));a.href=d;a.target=\"_blank\";f=document.createElement(\"img\");f.src=\"https://img.gsspat.jp/e/optout/img/opt_icon_text.png\";f.style.width=\"75px\";\nf.style.height=\"15px\";f.style.border=\"none\";f.style.opacity=\"0.8\";m.appendChild(b);a.appendChild(f);m.appendChild(a);l?document.getElementById(e).onclick=g(e,c):(l=document.getElementById(e),f=document.getElementById(c),l.onmouseover=g(e,c),f.onmouseout=g(e,c))}})(Optout_IXaeJoo6aeniaboo||(Optout_IXaeJoo6aeniaboo={}));\nOptout_IXaeJoo6aeniaboo.addOptoutInfoIcons(\"banner-1855322083\",300,250,\"3567cfcf0d705c1519293e147970841a\",\"https://geniee.co.jp/optout.html?id={USER_ID}&optout={OPTOUT}&type={TYPE}\",0,0,false);</script><script type=\"text/javascript\">(function(){var scheme = (location.protocol=='https:' ? 'https:' : 'http:');document.write(\"<img src=\\\"\" + scheme + \"//rt.gsspat.jp/b?p=firstprice&amp;y=0&amp;v=RxDOvFcIFzFPYJ8ElZ_45u7UY3yp1S9pO7dcBAzxwv_m99E1iHIGCmCaRsaXGFiNsYrcsH6-uySE3CH8ezAm0a-CMemKmP7aXusy95z0NQiheDDukZJ4V3FhOl9VNNVGKTiJIc98Ha7TwRtio8v0oH6GuqAv7sq5exHnn9VgRPkeS4fjg7nrNL6dKH1tC_DlX7nl5MBPq4Hq4I6Y94mgxg6FOd-oxppjr2IkCylw863lr34OI84xLO8-JO-bp9a9zWvLPEO027SLr8UBXWEj5DsYUpVO2bKXWmdcWBwrpVMixpZf-4YkKl6QlT72PWxYk5NfjaGhHge--KISPYI3-Qi2r9S0C7qM0CoLyeW5YH3slh-FWXr_TrItgZbDdCT2YQlSDnfXO4EXKuG2-CM2610ZFs6joLJRZ3YOx6ELSX-dAoSmDBeQVHgW7g6Sh0abXRZq7-c5DMCa_fzJcpBjU0Nmr8zrHpJ6rr-prTxCPWF9JscGs-DTe4p1OHST7XY_2TyGwPXQBIiJNTehK_L-wCnrNSvWV5QIhzfz0rw3LeoGDhX1tzt4JOYwPRGlDLkyKv4rtMCdtdvU_7_WXIQtYq2Bs8X1Tq23cQMy0cRHc451im5DwErbFFe8KZecQvlUW1Kkjq_z3DChNwB-TAOwSj33RN84xZq0-8c88yEs8QFFsTl_ssaZx6vS7UsP2eBbzrHAQqDHfLqvdyKxHNH0TkeItMbPzF8pc_BFdLlYw1q0sNJURZcOR4UiQR0CUyP_HfQlKBqdlGMusz6cBHUFzvHaIXV0UN3S\\\" height='1' width='1' style='display: none;'>\");})();</script>";
      const serverResponse = {
        body: {
          id: auction_id,
          cur: 'JPY',
          seatbid: [{
            bid: [{
              id: '7b77235d599e06d289e58ddfa9390443e22d7071',
              impid: 'bid-id',
              price: 0.6666000000000001,
              adid: '8405715',
              adm: adm,
              adomain: ['geniee.co.jp'],
              iurl: 'http://img.gsspat.jp/e/068c8e1eafbf0cb6ac1ee95c36152bd2/04f4bd4e6b71f978d343d84ecede3877.png',
              cid: '8405715',
              crid: '1383823',
              cat: ['IAB1'],
              w: 300,
              h: 250,
              mtype: 1
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).deep.equal([{
        ad: adm,
        cpm: 0.6666000000000001,
        creativeId: '1383823',
        creative_id: '1383823',
        height: 250,
        width: 300,
        currency: 'JPY',
        mediaType: 'banner',
        meta: {
          advertiserDomains: ['geniee.co.jp'],
          primaryCatId: 'IAB1',
          secondaryCatIds: []
        },
        netRevenue: true,
        requestId: 'bid-id',
        seatBidId: '7b77235d599e06d289e58ddfa9390443e22d7071',
        ttl: 300
      }]);
    });
    it('no bid', () => {
      const serverResponse = {};
      const bids = spec.interpretResponse(serverResponse, validBidderRequest);
      expect(bids).deep.equal([]);
    });
  });
  describe('getUserSyncs function test', () => {
    it('sync enabled', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const serverResponses = [];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).deep.equal([{
        type: 'image',
        url: 'https://rt.gsspat.jp/prebid_cs'
      }]);
    });
    it('sync disabled (option false)', () => {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false
      };
      const serverResponses = [];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).deep.equal([]);
    });
    it('sync disabled (gdpr)', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const serverResponses = [];
      const gdprConsent = {
        gdprApplies: true
      };
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(syncs).deep.equal([]);
    });
  });
});
