import { expect } from 'chai';
import { spec } from 'modules/operaadsBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('Opera Ads Bid Adapter', function () {
  describe('Test isBidRequestValid', function () {
    it('undefined bid should return false', function () {
      expect(spec.isBidRequestValid()).to.be.false;
    });

    it('null bid should return false', function () {
      expect(spec.isBidRequestValid(null)).to.be.false;
    });

    it('bid.params should be set', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('bid.params.placementId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { endpointId: 'ep12345678', publisherId: 'pub12345678' }
      })).to.be.false;
    });

    it('bid.params.publisherId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { placementId: 'ep12345678', endpointId: 'pub12345678' }
      })).to.be.false;
    });

    it('valid bid should return true', function () {
      expect(spec.isBidRequestValid({
        params: { placementId: 'ep12345678', endpointId: 'pub12345678', publisherId: 'pub12345678' }
      })).to.be.true;
    });
  });

  describe('Test buildRequests', function () {
    const bidderRequest = {
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      auctionStart: Date.now(),
      bidderCode: 'myBidderCode',
      bidderRequestId: '15246a574e859f',
      refererInfo: {
        referer: 'http://example.com',
        stack: ['http://example.com']
      },
      userId: {
        'shareId': 'b06c5141-fe8f-4cdf-9d7d-54415490a917'
      }
    };

    it('build request object', function () {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'operaads',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {banner: {sizes: [[300, 250]]}},
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678'
          }
        }
      ];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      expect(reqs).to.be.an('array');

      for (const req of reqs) {
        expect(req.method).to.equal('POST');
        expect(req.url).to.equal('https://s.adx.opera.com/ortb/v2/pub12345678?ep=ep12345678');

        expect(req.options).to.be.an('object');
        expect(req.options.contentType).to.contain('application/json');
        expect(req.options.customHeaders).to.be.an('object');
        expect(req.options.customHeaders['x-openrtb-version']).to.equal(2.5);

        expect(req.data).to.be.a('string');
      }
    });

    it('currency in params should be used', function () {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          mediaTypes: {banner: {sizes: [[300, 250]]}},
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678',
            currency: 'RMB'
          }
        }
      ];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      expect(reqs).to.be.an('array');

      for (const req of reqs) {
        let data;
        try {
          data = JSON.parse(req.data);
        } catch (e) {
          data = {};
        }

        expect(data.cur).to.be.an('array').that.includes('RMB');
      }
    });

    it('bcat in params should be used', function() {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          mediaTypes: {banner: {sizes: [[300, 250]]}},
          params: {
            placementId: 's12345678',
            publisherId: 'pub12345678',
            endpointId: 'ep12345678',
            bcat: ['IAB1-1']
          }
        }
      ];

      const reqs = spec.buildRequests(bidRequests, bidderRequest);

      expect(reqs).to.be.an('array');

      for (const req of reqs) {
        let data;
        try {
          data = JSON.parse(req.data);
        } catch (e) {
          data = {};
        }

        expect(data.bcat).to.be.an('array').that.includes('IAB1-1');
      }
    });
  });

  describe('Test adapter request', function () {
    const adapter = newBidder(spec);

    it('adapter.callBids exists and is a function', function () {
      expect(adapter.callBids).to.be.a('function');
    });
  });

  describe('Test response interpretResponse', function () {
    const serverResponse = {
      body: {
        'id': 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        'seatbid': [
          {
            'bid': [
              {
                'id': '003004d9c05c6bc7fec0',
                'impid': '22c4871113f461',
                'price': 1.04,
                'nurl': 'https://s.adx.opera.com/win?a=a5311273992064&burl=aHR0cHM6Ly93d3cub3BlcmEuY29tL2J1cmw%3D&cc=HK&cm=1&crid=0.49379027&dvt=PHONE&ext=_6Ux3PNfxKD5lYt5CVWDTM-TRx6sr__qxRadWTKvNcOIzec2BXxScDVZDKJPkeCOCdUW-0I7YwEsmixrPTT4r1mGH8-plpXh3ws4p0JhEtuvrGK3LJOwhJfT2pBvrMSY&iabCat=IAB9-31%2CIAB8&m=m5311273992833&pubId=pub5311274436800&s=s5323636048704&se=003004d9c05c6bc7fec0&srid=b06c5141-fe8f-4cdf-9d7d-54415490a917&u=68a99bb21f5855f2&ac=${AUCTION_CURRENCY}&ap=${AUCTION_PRICE}',
                'lurl': 'https://s.adx.opera.com/loss?a=a5311273992064&burl=aHR0cHM6Ly93d3cub3BlcmEuY29tL2J1cmw%3D&cc=HK&cm=1&crid=0.49379027&dvt=PHONE&ext=_6Ux3PNfxKD5lYt5CVWDTM-TRx6sr__qxRadWTKvNcOIzec2BXxScDVZDKJPkeCOCdUW-0I7YwEsmixrPTT4r1mGH8-plpXh3ws4p0JhEtuvrGK3LJOwhJfT2pBvrMSY&iabCat=IAB9-31%2CIAB8&m=m5311273992833&pubId=pub5311274436800&s=s5323636048704&se=003004d9c05c6bc7fec0&srid=b06c5141-fe8f-4cdf-9d7d-54415490a917&u=68a99bb21f5855f2&al=${AUCTION_LOSS}',
                'adm': "<head><style type='text/css'>body {margin:auto auto;text-align:center;} </style></head><div id=\"-oadx_003004d9c05c6bc7fec0m53112739928331625630126518539006\"><div><img src=\"https://res.adx.opera.com/i/2021/7/6/5328860977280.jpeg\" width=\"300\" height=\"250\" onclick=\"window.open('http://www.opera.com')\" style=\"cursor: pointer;\" /></div><img id='adxImpressionTrackingPixel0' alt=\"\" src=\"https://s.adx.opera.com/impr?a=a5311273992064&burl=aHR0cHM6Ly93d3cub3BlcmEuY29tL2J1cmw%3D&cc=HK&cm=1&crid=0.49379027&dvt=PHONE&ext=_6Ux3PNfxKD5lYt5CVWDTM-TRx6sr__qxRadWTKvNcOIzec2BXxScDVZDKJPkeCOCdUW-0I7YwEsmixrPTT4r1mGH8-plpXh3ws4p0JhEtuvrGK3LJOwhJfT2pBvrMSY&iabCat=IAB9-31%2CIAB8&impr_dl=1625630626517&m=m5311273992833&pubId=pub5311274436800&s=s5323636048704&se=003004d9c05c6bc7fec0&srid=b06c5141-fe8f-4cdf-9d7d-54415490a917&u=68a99bb21f5855f2&ac=${AUCTION_CURRENCY}&ap=${AUCTION_PRICE}\" style='width:0px;height:0px;border:0px;margin:0px;float:left;'/></div><script type=\"text/javascript\" src=\"https://q.adrta.com/s/opr/aa.js?cb=003004d9c05c6bc7fec0#opr;paid=opr;avid=adv4199760017536;publisherId=pub5311274436800;plid=m5311273992833;siteId=app5323634070016;caid=o4199760017920;lineItemId=a5311273992064;kv1=250x300;kv2=http%3A%2F%2Fexample.com;kv3=68a99bb21f5855f2;kv4=103.196.20.138;kv10=;kv11=003004d9c05c6bc7fec0;kv12=s5323636048704;kv15=HK;kv16=0.00000000;kv17=0.00000000;kv18=;kv19=;kv28=;kv23=;kv25=sspMedia_93_web;kv26=;kv27=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+HeadlessChrome%2F91.0.4472.114+Safari%2F537.36;kv5=API;kv24=Mobile_Web\"></script><script type=\"text/javascript\">(function(){var clk = document.getElementById('-oadx_003004d9c05c6bc7fec0m53112739928331625630126518539006');clk.addEventListener(\"click\", function(){var httpRequest = new XMLHttpRequest();httpRequest.open('GET', 'https://s.adx.opera.com/click?a=a5311273992064&burl=aHR0cHM6Ly93d3cub3BlcmEuY29tL2J1cmw%3D&cc=HK&cm=1&crid=0.49379027&dvt=PHONE&ext=_6Ux3PNfxKD5lYt5CVWDTM-TRx6sr__qxRadWTKvNcOIzec2BXxScDVZDKJPkeCOCdUW-0I7YwEsmixrPTT4r1mGH8-plpXh3ws4p0JhEtuvrGK3LJOwhJfT2pBvrMSY&iabCat=IAB9-31%2CIAB8&m=m5311273992833&pubId=pub5311274436800&s=s5323636048704&se=003004d9c05c6bc7fec0&srid=b06c5141-fe8f-4cdf-9d7d-54415490a917&u=68a99bb21f5855f2&ac=${AUCTION_CURRENCY}&ap=${AUCTION_PRICE}', true);httpRequest.send();});})();</script>",
                'adomain': [
                  'opera.com',
                  'www.algorx.cn'
                ],
                'bundle': 'com.opera.mini.beta',
                'cid': '0.49379027',
                'crid': '0.49379027',
                'cat': [
                  'IAB9-31',
                  'IAB8'
                ],
                'language': 'EN',
                'h': 300,
                'w': 250,
                'exp': 500,
                'ext': {}
              }
            ],
            'seat': 'adv4199760017536'
          }
        ],
        'bidid': '003004d9c05c6bc7fec0',
        'cur': 'USD'
      }
    };

    it('interpretResponse', function () {
      const bidResponses = spec.interpretResponse(serverResponse, {
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'operaads',
        bidderRequestId: '15246a574e859f',
        mediaTypes: {banner: {sizes: [[300, 250]]}},
        params: {
          placementId: 's12345678',
          publisherId: 'pub123456',
          endpointId: 'ep1234566'
        },
        src: 'client',
        transactionId: '4781e6ac-93c4-42ba-86fe-ab5f278863cf'
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;
    });
  });
});
