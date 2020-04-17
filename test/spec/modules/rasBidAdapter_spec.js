import { expect } from 'chai';
import { spec } from 'modules/rasBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const CSR_ENDPOINT = 'https://csr.onet.pl/_s/csr-006/csr.json?';

describe('rasBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid = {
        sizes: [[300, 250], [300, 600]],
        bidder: 'ringieraxelspringer',
        params: {
          area: 'NOWASG',
          site: 'GLOWNA',
          network: '1746213'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params not found', function () {
      const failBid = {
        sizes: [[300, 250], [300, 300]],
        bidder: 'ringieraxelspringer',
        params: {
          site: 'GLOWNA',
          network: '1746213'
        }
      };
      expect(spec.isBidRequestValid(failBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bid = {
      sizes: [[300, 250], [300, 600]],
      bidder: 'ringieraxelspringer',
      params: {
        slot: 'test',
        area: 'NOWASG',
        site: 'GLOWNA',
        network: '1746213'
      }
    };
    it('should parse bids to request', function () {
      const requests = spec.buildRequests([bid]);
      expect(requests[0].url).to.have.string(CSR_ENDPOINT);
      expect(requests[0].url).to.have.string('slot0=test');
      expect(requests[0].url).to.have.string('nid=1746213');
      expect(requests[0].url).to.have.string('site=GLOWNA');
      expect(requests[0].url).to.have.string('area=NOWASG');
      expect(requests[0].url).to.have.string('cre_format=html');
      expect(requests[0].url).to.have.string('system=das');
      expect(requests[0].url).to.have.string('is_ems=1');
      expect(requests[0].url).to.have.string('ecpm=1');
      expect(requests[0].url).to.have.string('kvIR=');
    });
  });
  describe('interpretResponse', function () {
    const response = {
      'adsCheck': 'ok',
      'geoloc': {},
      'ir': '92effd60-0c84-4dac-817e-763ea7b8ac65',
      'ads': [
        {
          'id': 'flat-belkagorna',
          'slot': 'flat-belkagorna',
          'prio': 10,
          'type': 'html',
          'adid': 'das,50463,152276',
          'id_3': '12734',
          'html': '<script type=\"text/javascript\">!function () {\"use strict\";var a = window.sfAPI || window.$sf, b = !a && window.inDapIF, c = document;if (b ? (c = parent.document, parent.onetAds ||(parent.onetAds = { no_gemius: 1, mode: \"l\" }),window.onetAds = parent.onetAds) : window.onetAds = window.onetAds ||{ no_gemius: 1, mode: \"l\" },(window.onetAds.cmd = window.onetAds.cmd || []).push(function (a){a.renderAd({\"meta\":{\"adid\":\"das,50463,152276\",\"slot\":\"flat-belkagorna\",\"width\":1,\"height\":1,\"adclick\":\"https://csr.onet.pl/1746213/clk/das,50463,152276?gctx=eJyrVgpWslIKcQ0OUdJRcgQyHYNcHaHcYE8XoEBaTmKJblJqTnZien5RXiJQ3DMAKGxkYGRgYGxoaWhsbGJiZm5mbGZsYmZqYACSD8Mv7wIy19DI3NhER8k7LCcxqwSoHiThHVZcnANkGyrVAgAPJyQ2&at=1584621286&uuid=d4c475b834fb3e968fb179a8dcd6f96a&URL=\",\"inIFrame\":false,\"autoscale\":false,\"actioncount\":\"https://csr.onet.pl/eclk/das,50463,152276/LU=201911261216110659107930/IP=202003191334467636346500/IV=202003191334467636346500/NID=1746213/S=TEST/A=AREATEST/SID=flat-belkagorna/AID=4649de07815ce64de3813f64ff64882f/\",\"container_wrapper\":\"\"},\"fields\":{\"gde_id\":null,\"infoText\":\"SPONSOR SERWISU\",\"gde_fastid\":null,\"gde_stparam\":null,\"impression1\":null,\"impression2\":null,\"stickyClick\":\"https://noizz.pl\",\"stickyImage\":\"https://ocdn.eu/lps/1746213/B_INT-creative/000/000152/000152276/b220237611e37fc3b0516c9f2e7c3d57.jpg\",\"expandButton\":\"https://ocdn.eu/lps/1746213/B_INT-creative/000/000152/000152276/e01fb7418910fa39b7ad0471659e7d9b.png\",\"expandedHtml\":\"https://ocdn.eu/aops/mip/m/maspex/20190911/1920x500/Lubella_Mlekolaki_Bez_1920x500_v1.html\",\"gde_inscreen\":null,\"impressionJs\":null,\"infoTextShow\":\"text-all\",\"expandedImage\":null,\"gde_subdomena\":\"onet\",\"infoTextColor\":\"#000\",\"collapseButton\":\"https://ocdn.eu/lps/1746213/B_INT-creative/000/000152/000152276/Lubella_Mlekolaki_sponsoring_zwin.png\",\"collapsedClick\":\"https://noizz.pl\",\"collapsedImage\":\"https://ocdn.eu/lps/1746213/B_INT-creative/000/000152/000152276/b220237611e37fc3b0516c9f2e7c3d57.jpg\",\"expandedClick1\":\"https://noizz.pl/\",\"presets_config\":null,\"actionCountExpand\":null,\"infoTextBackground\":\"transparent\",\"actionCountCollapse\":null,\"impressionActiveview\":null},\"tplCode\":\"1746213/Sponsoring-Universal\"}, window, c), window, c)}),\n                                    \"l\" === window.onetAds.mode)\n                                { window.onetAds.mode = \"adtpl\"; var d = c.createElement(\"script\");\n                                    d.src = \"//lib.onet.pl/s.csr/init/init.js\", b && d.setAttribute(\"async\", \"true\");\n                                    var e = c.getElementsByTagName(\"script\")[0]; e.parentNode.insertBefore(d, e) }\n                                \n                                }();\n                        </script>'
        }
      ],
      'iv': '202003191334467636346500'
    };
    it('should get correct bid response', function () {
      const resp = spec.interpretResponse({ body: response }, {});
      expect(resp[0]).to.have.all.keys('cpm', 'currency', 'netRevenue', 'requestId', 'ttl', 'width', 'height', 'creativeId', 'dealId', 'ad', 'mediaType');
    });
    it('should handle empty ad', function () {
      let res = {
        'ads': [{
          type: 'empty'
        }]
      };
      const resp = spec.interpretResponse({ body: res }, {});
      expect(resp[0]).to.deep.equal({});
    });
  });
});
