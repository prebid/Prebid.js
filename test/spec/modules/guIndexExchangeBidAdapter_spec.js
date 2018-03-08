import {expect} from 'chai';
import {spec} from 'modules/guIndexExchangeBidAdapter';

describe('Index Exchange adapter', () => {
  let bidRequests;
  let emptyBidResponse;
  let filledBidResponse;

  beforeEach(() => {
    bidRequests = [
      {
        bidder: 'indexExchange',
        params: {
          id: '185406',
          siteID: '208209'
        },
        sizes: [[300, 250], [300, 600]],
        bidId: '3c9408cdbf2f68',
      },
      {
        bidder: 'indexExchange',
        params: {
          id: '185406',
          siteID: '208209'
        },
        sizes: [[728, 90], [970, 250]],
        bidId: '23acc48ad47af5',
      }
    ];
    emptyBidResponse = {
      body: 'cygnus_index_parse_res({"id": "421803709"});'
    };
    filledBidResponse = {
      body: 'cygnus_index_parse_res({"seatbid": [{"bid": [{"crid": "7581330", "adomain": ["pagerduty.com"], "adid": "7581330", "impid": "1", "cid": "1704544", "id": "1", "ext": {"dspid": 105, "pricelevel": "_27", "advbrandid": 73381, "advbrand": "PagerDuty"}, "adm": "<iframe src=\\"https://a237.casalemedia.com/ifnotify?c=73AE92&r=4F11D0D2&t=5A8ED2B4&u=VnAubHJibFFKRW9BQUI2d1BPWUFBQUhH&m=7fdbf7ec81ed9b7ee7981354b93d7476&wp=1F&aid=B24DDD0076A411BE&tid=12663&s=32D51&cp=0.31&n=www.theguardian.com&pr=xx&sid=4678-4f09-5965-596d&epr=234566709\\" width=\\"0\\" height=\\"0\\" frameborder=\\"0\\" scrolling=\\"no\\" style=\\"display:none;\\" marginheight=\\"0\\" marginwidth=\\"0\\"></iframe><div style=\\"text-align: center;\\"><script type=\\"text/javascript\\">adroll_width = 300;adroll_height = 250;adroll_a_id = \\"SV2SF2P76NFIPN7N5SDPHX\\";adroll_s_id = \\"ISRFVJ4CYZEJLCRYPCOWW4\\";adroll_c_id = \\"YVO2VTI2LRAQRLJQBE4X4Q\\";adroll_render_link = false;adroll_ext_network = \\"index\\";adroll_subnetwork = \\"r\\";adroll_ad_payload = \\"__HIAfcBkwHaAeXIAeEAAbvHoMKyLdDJ2cUzyjHcJczDM8THI8DDy90vNEhqm1GYR6hTuGugc5irl493eIRrVICPqbnFNpMQUxdvN-8gLy8P55CAIGevYPcwX3Orcwwsuz7YrEjOz8nJTEktsjtttzMyT0TYNMH-FoOakYGhhYGhkWV8UmluQXxOfnl8UWpyal5yZXxqRUlRam5qfElqcYnbcSGmPZ--3Dp999KJ1XMaVjVf_vzsKZf3oZhzDHqyF0pnpZbqlgOV6RomVqwpKs3Ly8xLj7ewsDQ-07m5vLxcryQjNb00sSglMzFPLzk_98zsc1F9l7acWbAeXWIRw5kljmdOLU9OM0ozsUw5c_o4G8vEcwxKzJ1nzgCd8P_XybvPXxxq7O6FOeHMr-O8zI0rUssyU_Lz4kvOWs0483eqgZ6ZselZRuaFSWcZVRacZYo4x8BUEXOWKXJPcWFBaXp8mXm8RXxxQWZ2KrKHzzJFHT7LFAcOrbNMuecY-rKunWWqOsc4y_vGWaYTtxgUTNOMjIySLSxNE9NSjZJSjQxNTc0sTUwTU4zNDSwSUyzOMp1enlKZl5ibmXyW6dwdBuFMXYM0M3NTy1QLo9Qko7REU1Ojsyw-h8-yrlpdlFqSWJSeWgIMqbNsGUAHXrEDAKwo5VAwE90nifUBvic\\";adroll_url_macro = \\"theguardian.com\\";adroll_cpm_macro = \\"Wo7StAAAAACuVdpBZhq2_z2KMQOaaN7Cg73xcg\\";adroll_c_macro = \\"; adroll_imp_macros = undefined ; adroll_win_notif = \\"index-winners-eu-west-1-rtb.adroll.com/win/index?c=4T5DKFKRJJHCTPRCJSGVM7;bid=7174736223712920540023788164744034620;payload=__HIAs0AARWQua7rVABFn15JyRfwA76yHTs5Lp14HhMP8dBE9rGTXMfziadTPYmCji-gCQ0StIiKHiQkikd3BSV8APABhGI1u1jaWl88krd3n7FnmqYh4NjknNNpTlMsu-YYNslWGxIkGXikP336_se__3375Y-PP3_31YdvP__tn7_-_OQBf2A8VtAl3dE0ZeftnZ3mykdz87j-_o7OIU2sGIJmKYLintDgJR-IKUd3gnqBTdUO9_wlqRLc1MmE_l8e7dv7b04nReXPcHublITPQ5XPRZ5PR6Ux9cXIBI2GPl4KBWoQCybwFBUIwsKRoyVeu4qSI2d99QZ5uED2tS8ZbpWrTn9Ud_surSWrNQ_-nI0WAS7GAvYsu-NVOR-jPZzCld3DaUID3kS9WNgY1Jon3u6ouN_v2Fw80ossUyGkxk5ukXy9PrkFR-BX5XAIZ_tcl8AP2iUp2SUO587xSyep2O4slh2M6hS6crWPCWIltBzH6RoVmsmxOJ5PI0Z6fF418RULSrdIZFu3cdqVF_u4dprq2E2tjlbPu7NRbPIJCQeC3FTsaMywXw6FlZIkci-liaW9gW8nDmAEKYkrNwkM0mfBQHUm9lYWVWYbPmebZIORP7Hw1DAyGEU4zTrWqBpfdhnYn8IlHffhPHcbey3ZuWL2hA2wSvY-Qot_MjBzG-0AkQxY5d0lXscoL2NnSCQ3gPHRSWAcNcwMtr4Y2oEeansYSNskbEEVVsB5ig9BTOu9rmCsSYq3MSQe2n1qmUMOI6LXhzoIOhtBZjmNcpBE3n2--J5lm4W6uIY7WyJnuUWsucVhtjxIIs-fPJ_BluBOrr9g22ypvC71uGRf0ypcgnU2ZdtBMsPIJM2V5S3UwWi4w63ZOKJP2QVaJuIKiKUv26yUOjfQ3Dy4qGaXWkj2eSXsRYHXp4Y98pPIkfXr2d-Or_Bxf5y_vqNf4y8_fv8f;price_cpm_dollars=\\";</script><script type=\\"text/javascript\\">var _url_info =(\'https:\' == \'https:\' ? {adserver_hostname:\\"s.adroll.com\\", protocol:\\"https://\\"} : {adserver_hostname:\\"a.adroll.com\\", protocol:\\"http://\\"});(function () {document.write(\'<scr\'+\'ipt type=\\"text/javascript\\" src=\\"\' + _url_info.protocol + _url_info.adserver_hostname + \'/j/rolling.js\\"></scr\'+\'ipt>\');}());</script></div>"}], "seat": "1"}], "cur": "USD", "id": "234566709"});'
    }
  });

  describe('isBidRequestValid', () => {
    it('should accept valid bid', () => {
      const validBid = bidRequests[0];
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });
    it('should reject bid without ID', () => {
      let invalidBid = {
        bidder: 'indexExchange',
        params: {
          siteID: '208209'
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
    it('should reject bid without siteID', () => {
      let invalidBid = {
        bidder: 'indexExchange',
        params: {
          id: '185406'
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });
  describe('buildRequests', () => {
    it('should build correct number of bids', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests).to.be.lengthOf(2);
    });
    it('should use correct method', () => {
      const requests = spec.buildRequests(bidRequests);
      const method = requests[0].method;
      expect(method).to.equal('GET')
    });
    it('should build correct URL', () => {
      const requests = spec.buildRequests(bidRequests);
      const url = requests[0].url;
      const decodedUrl = decodeURI(url);
      expect(decodedUrl).to.match(/https:\/\/as-sec.casalemedia.com\/cygnus\?v=7&fn=cygnus_index_parse_res&s=208209&r={"id":"(\d+)","site":{"page":"http:\/\/localhost:9876\/\?id=(\d+)","ref":"http:\/\/localhost:9876\/\?id=(\d+)"},"imp":\[{"id":"1", "banner":{"w":300,"h":250,"topframe":1},"ext": {"sid":"185406_1","siteID":208209}},{"id":"2", "banner":{"w":300,"h":600,"topframe":1},"ext": {"sid":"185406_2","siteID":208209}}]}&pid=pb%24prebid.version%24/);
    });
    it('should have no data', () => {
      const requests = spec.buildRequests(bidRequests);
      const data = requests[0].data;
      expect(data).to.be.empty;
    });
    it('should encode URL', () => {
      const requests = spec.buildRequests(bidRequests);
      const url = requests[0].url;
      expect(url).to.not.have.string('{').and.not.have.string('}').and.not.have.string('"');
    });
  });
  describe('interpretResponse', () => {
    it('should interpret correct number of empty bid responses', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(1);
    });
    it('should interpret empty bid response status', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].statusMessage).to.equal('Bid returned empty or error response');
    });
    it('should interpret empty bid response request ID', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].requestId).to.equal(bidRequests[0].bidId);
    });
    it('should interpret empty bid response bidder code', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].bidderCode).to.equal('indexExchange');
    });
    it('should interpret empty bid response CPM', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].cpm).to.equal(0);
    });
    it('should interpret empty bid response width', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].width).to.equal(0);
    });
    it('should interpret empty bid response height', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].height).to.equal(0);
    });
    it('should interpret empty bid response ttl', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].ttl).to.equal(360);
    });
    it('should interpret empty bid response ad', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0]).to.not.have.property('ad');
    });
    it('should interpret empty bid response creative ID', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].creativeId).to.be.empty;
    });
    it('should interpret empty bid response net revenue flag', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].netRevenue).to.be.true;
    });
    it('should interpret empty bid response currency', () => {
      const bids = spec.interpretResponse(emptyBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].currency).to.equal('USD');
    });
    it('should interpret correct number of filled bid responses', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(1);
    });
    it('should interpret filled bid response status', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].statusMessage).to.equal('Bid available');
    });
    it('should interpret filled bid response request ID', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].requestId).to.equal(bidRequests[0].bidId);
    });
    it('should interpret empty bid response bidder code', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].bidderCode).to.equal('indexExchange');
    });
    it('should interpret filled bid response CPM', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].cpm).to.equal(0.27);
    });
    it('should interpret filled bid response width', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].width).to.equal(300);
    });
    it('should interpret filled bid response height', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].height).to.equal(250);
    });
    it('should interpret filled bid response ttl', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].ttl).to.equal(360);
    });
    it('should interpret filled bid response ad', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].ad).to.have.string('<iframe src="https://a237.casalemedia.com/ifnotify').and.to.have.string('</scr\'+\'ipt>\');}());</script></div>');
    });
    it('should interpret filled bid response creative ID', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].creativeId).to.equal('7581330');
    });
    it('should interpret filled bid response net revenue flag', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].netRevenue).to.be.true;
    });
    it('should interpret filled bid response currency', () => {
      const bids = spec.interpretResponse(filledBidResponse, {'bidRequest': bidRequests[0]});
      expect(bids[0].currency).to.equal('USD');
    });
  });
});
