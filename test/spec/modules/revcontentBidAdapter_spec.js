// jshint esversion: 6, es3: false, node: true
import {assert, expect} from 'chai';
import {spec} from 'modules/revcontentBidAdapter.js';
import { NATIVE } from 'src/mediaTypes.js';
import { config } from 'src/config.js';

describe('revcontent adapter', function () {
  let serverResponse, bidRequest, bidResponses;
  let bids = [];

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'revcontent',
      nativeParams: {},
      params: {
        size: {width: 300, height: 250},
        apiKey: '8a33fa9cf220ae685dcc3544f847cdda858d3b1c',
        userId: 673,
        domain: 'test.com',
        endpoint: 'trends-s0.revcontent.com'
      }
    };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params.apiKey = undefined;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    it('should send request with correct structure', function () {
      let validBidRequests = [{
        bidder: 'revcontent',
        nativeParams: {},
        params: {
          size: {width: 300, height: 250},
          apiKey: '8a33fa9cf220ae685dcc3544f847cdda858d3b1c',
          userId: 673,
          widgetId: 33861,
          endpoint: 'trends-s0.revcontent.com'
        }
      }];
      let request = spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}});
      request = request[0];
      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://trends-s0.revcontent.com/rtb?apiKey=8a33fa9cf220ae685dcc3544f847cdda858d3b1c&userId=673&widgetId=33861');
      assert.deepEqual(request.options, {contentType: 'application/json'});
      assert.ok(request.data);
    });

    it('should have default request structure', function () {
      let keys = 'method,options,url,data,bid'.split(',');
      let validBidRequests = [{
        bidder: 'revcontent',
        nativeParams: {},
        params: {
          size: {width: 300, height: 250},
          apiKey: '8a33fa9cf220ae685dcc3544f847cdda858d3b1c',
          userId: 673,
          domain: 'test.com',
          endpoint: 'trends-s0.revcontent.com'
        }
      }];
      let request = spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}});

      request = request[0];
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('should send info about device and unique bidfloor', function () {
      let validBidRequests = [{
        bidder: 'revcontent',
        nativeParams: {},
        params: {
          size: {width: 300, height: 250},
          apiKey: '8a33fa9cf220ae685dcc3544f847cdda858d3b1c',
          userId: 673,
          domain: 'test.com',
          endpoint: 'trends-s0.revcontent.com',
          bidfloor: 0.05
        }
      }];
      let request = spec.buildRequests(validBidRequests, {refererInfo: {referer: 'page'}});
      request = JSON.parse(request[0].data);
      assert.equal(request.imp[0].bidfloor, 0.05);
      assert.equal(request.device.ua, navigator.userAgent);
    });

    it('should send info about the site and default bidfloor', function () {
      let validBidRequests = [{
        bidder: 'revcontent',
        nativeParams: {
          image: {
            required: false
          },
          'title': {
            required: false,
            len: 140
          },
          clickUrl: {
            required: false
          },
          sponsoredBy: {
            id: 5,
            name: 'data',
            type: 1
          }
        },
        params: {
          size: {width: 300, height: 250},
          apiKey: '8a33fa9cf220ae685dcc3544f847cdda858d3b1c',
          userId: 673,
          domain: 'test.com',
          endpoint: 'trends-s0.revcontent.com'
        }
      }];
      let refererInfo = {referer: 'page'};
      let request = spec.buildRequests(validBidRequests, {refererInfo});

      request = JSON.parse(request[0].data);
      assert.equal(request.imp[0].bidfloor, 0.1);
      assert.deepEqual(request.site, {
        domain: 'test.com',
        page: 'page',
        cat: ['IAB17'],
        publisher: {id: 673, domain: 'test.com'}
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return if no body in response', function () {
      let serverResponse = {};
      let bidRequest = {};

      assert.ok(!spec.interpretResponse(serverResponse, bidRequest));
    });

    const serverResponse = {
      body: {
        id: '5d61ca27-1b7a-4d5a-90ad-bbfc93e53f58',
        seatbid: [
          {
            bid: [
              {
                id: '6bbe3eed-f443-4e2b-a8da-57fd6327b37d',
                impid: '1',
                price: 0.1,
                adid: '4162547',
                nurl: 'https://trends-s0.revcontent.com/push/track/?p=${AUCTION_PRICE}&d=nTCdHIfsgKOLFuV7DS1LF%2FnTk5HiFduGU65BgKgB%2BvKyG9YV7ceQWN76HMbBE0C6gwQeXUjravv3Hq5x9TT8CM6r2oUNgkGC9mhgv2yroTH9i3cSoH%2BilxyY19fMXFirtBz%2BF%2FEXKi4bsNh%2BDMPfj0L4elo%2FJEZmx4nslvOneJJjsFjJJtUJc%2F3UPivOisSCa%2B36mAgFQqt%2FSWBriYB%2BVAufz70LaGspF6T6jDzuIyVFJUpLhZVDtLRSJEzh7Lyzzw1FmYarp%2FPg0gZDY48aDdjw5A3Tlj%2Bap0cPHLDprNOyF0dmHDn%2FOVJEDRTWvrQ2JNK1t%2Fg1bGHIih0ec6XBVIBNurqRpLFBuUY6LgXCt0wRZWTByTEZ8AEv8IoYVILJAL%2BXL%2F9IyS4eTcdOUfn5X7gT8QBghCrAFrsCg8ZXKgWddTEXbpN1lU%2FzHdI5eSHkxkJ6WcYxSkY9PyripaIbmKiyb98LQMgTD%2B20RJO5dAmXTQTAcauw6IUPTjgSPEU%2Bd6L5Txd3CM00Hbd%2Bw1bREIQcpKEmlMwrRSwe4bu1BCjlh5A9gvU9Xc2sf7ekS3qPPmtp059r5IfzdNFQJB5aH9HqeDEU%2FxbMHx4ggMgojLBBL1fKrCKLAteEDQxd7PVmFJv7GHU2733vt5TnjKiEhqxHVFyi%2B0MIYMGIziM5HfUqfq3KUf%2F%2FeiCtJKXjg7FS6hOambdimSt7BdGDIZq9QECWdXsXcQqqVLwli27HYDMFVU3TWWRyjkjbhnQID9gQJlcpwIi87jVAODb6qP%2FKGQ%3D%3D',
                adm: '{"ver":"1.1","assets":[{"id":3,"required":1,"img":{"url":"//img.revcontent.com/?url=https://revcontent-p0.s3.amazonaws.com/content/images/15761052960288727821.jpg&static=true"}},{"id":0,"required":1,"title":{"text":"Do You Eat Any of These Craving-trigger Foods?"}},{"id":5,"required":1,"data":{"value":""}}],"link":{"url":"https://trends-s0.revcontent.com/click.php?d=A7EVbNYBVyonty19Ak08zCr9J54qg%2Bmduq6p0Zyn5%2F%2Bapm4deUo9VAXmOGEIbUBf6i7m3%2F%2FWJm%2FzTha8SJ%2Br9MZL9jhhUxDeiKb6aRY1biLrvr6tFUd1phvtKqVmPd76l9VBLFMxS1brSzKjRCJlIGmyGJg7ueFvxpE9X%2BpHmdbE2uqUdRC49ENO3XZyHCCKMAZ8XD29fasX9Kli9mKpZTqw8vayFlXbVYSUwB8wfSwCt1sIUrt0aICYc0jcyWU3785GTS1xXzQj%2FIVszFYYrdTWd%2BDijjNZtFny0OomPHp8lRy5VcQVCuLpw0Fks4myvsE38XcNvs4wO3tWTNrI%2BMqcW1%2BD2OnMSq5nN5FCbmi2ly%2F1LbN9fibaFvW%2FQbzQhN9ZsAwmhm409UTtdmSA6hd96vDxDWLeUJhVO3UQyI0yq2TtVnB9tEICD8mZNWwYehOab%2BQ1EWmTerF6ZCDx8RyZus1UrsDfRwvTCyUjCmkZhmeo4QVJkpPy6QobCsngSaxkkKhH%2Fb7coZyBXXEt3ORoYBLUbfRO6nR8GdIt8413vrYr4gTAroh46VcWK0ls0gFNe2u3%2FqP%2By1yLKbzDVaR%2Fa02G%2Biiqbw86sCYfsy7qK9atyjNTm8RkH6JLESUzxc6IEazu4iwHKGnu5phTacmseXCi8y9Y5AdBZn8VnLP%2F2a%2FyAqq93xEH%2BIrkAdhGRY1tY39rBYAtvH%2FVyNFZcong%2FutUMYbp0WhDNyfl6iWxmpE28Cx9KDcqXss0NIwQm0AWeu8ogJCIG3faAkm5PdFsUdf2X9h3HuFDbnbvnXW27ml6z9GykEzv%2F8aSZlMZ"}}'
              }
            ]
          }
        ],
        bidid: '7f729368-edb2-427a-bde7-a55b3bf8837c'
      },
      headers: {}
    };

    const bidRequest = {
      method: 'POST',
      options: {
        contentType: 'application/json'
      },
      url: 'https://trends-s0.revcontent.com/rtb?apiKey=8a33fa9cf220ae685dcc3544f847cdda858d3b1c&userId=673',
      data: '{"id":"5d61ca27-1b7a-4d5a-90ad-bbfc93e53f58","imp":[{"id":1,"bidderRequestId":"14e4dab7b5396e8","auctionId":"5d61ca27-1b7a-4d5a-90ad-bbfc93e53f58","transactionId":"69e69abf-a3ea-484d-a81c-d48dd0d5eaa3","native":{"request":{"ver":"1.1","context":2,"contextsubtype":21,"plcmttype":4,"plcmtcnt":4,"assets":[{"required":0,"id":3,"img":{"type":3}},{"required":0,"id":0,"title":{"len":140}},{"required":0,"id":5,"data":{"type":1}}]},"ver":"1.1","battr":[1,3,8,11,17]},"instl":0,"bidfloor":0.1,"secure":"1"}],"site":{"domain":"test.com","page":"https://feudfun.com/test22/revcontent_example.php","cat":["IAB17"],"publisher":{"id":673,"domain":"test.com"}},"device":{"ua":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:71.0) Gecko/20100101 Firefox/71.0","language":"en"},"user":{"id":1},"at":2,"bcat":["IAB24","IAB25","IAB25-1","IAB25-2","IAB25-3","IAB25-4","IAB25-5","IAB25-6","IAB25-7","IAB26","IAB26-1","IAB26-2","IAB26-3","IAB26-4"]}',
      bid: [
        {
          bidder: 'revcontent',
          params: {
            size: {
              width: 300,
              height: 250
            },
            apiKey: '8a33fa9cf220ae685dcc3544f847cdda858d3b1c',
            userId: 673,
            domain: 'test.com',
            endpoint: 'trends-s0.revcontent.com'
          },
          crumbs: {
            pubcid: '7a0b4adc-c109-49f0-aadc-4a4b62ebe269'
          },
          nativeParams: {
            image: {
              required: false
            },
            'title': {
              required: false,
              len: 140
            },
            clickUrl: {
              required: false
            },
            sponsoredBy: {
              id: 5,
              name: 'data',
              type: 1
            }
          },
          mediaTypes: {
            native: {
              image: {
                required: false
              },
              title: {
                required: false,
                len: 140
              },
              clickUrl: {
                required: false
              },
              sponsoredBy: {
                id: 5,
                name: 'data',
                type: 1
              }
            }
          },
          adUnitCode: '/19968336/header-bid-tag-1',
          transactionId: '69e69abf-a3ea-484d-a81c-d48dd0d5eaa3',
          sizes: [],
          bidId: '294a7f446202848',
          bidderRequestId: '14e4dab7b5396e8',
          auctionId: '5d61ca27-1b7a-4d5a-90ad-bbfc93e53f58',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0
        }
      ]
    };

    it('should set correct native params', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest)[0];

      assert.equal(result.bidder, 'revcontent');
      assert.equal(result.bidderCode, 'revcontent');
      assert.equal(result.mediaType, 'native');
      assert.equal(result.requestId, '294a7f446202848');
      assert.equal(result.cpm, '0.1');
      assert.equal(result.creativeId, '4162547');
    });

    it('validate template 728x90', function () {
      bidRequest.bid[0].params.size.width = 728;
      bidRequest.bid[0].params.size.height = 90;

      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.equal(result.bidder, 'revcontent');
      assert.equal(result.bidderCode, 'revcontent');
      assert.equal(result.mediaType, 'native');
      assert.equal(result.requestId, '294a7f446202848');
      assert.equal(result.cpm, '0.1');
      assert.equal(result.creativeId, '4162547');
    });

    it('validate template 300x600', function () {
      bidRequest.bid[0].params.size.width = 300;
      bidRequest.bid[0].params.size.height = 600;

      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.equal(result.bidder, 'revcontent');
      assert.equal(result.bidderCode, 'revcontent');
      assert.equal(result.mediaType, 'native');
      assert.equal(result.requestId, '294a7f446202848');
      assert.equal(result.cpm, '0.1');
      assert.equal(result.creativeId, '4162547');
    });

    it('validate template custom template', function () {
      bidRequest.bid[0].params.template = '<a href="{clickUrl}" rel="nofollow sponsored"  target="_blank" style="    border: 1px solid #eee;    width: 298px;    height: 248px;    display: block;"><div style="background-image:url({image});width: 300px;height: 165px;background-repeat: none;background-size: cover;"><div style="position: absolute;top: 160px;left:12px"><h1 style="color: #000;font-family: Arial, sans-serif;font-size: 19px; position: relative; width: 290px;">{title}</h1> <div style="border:1px solid #000;text-align:center;width:94%;font-family:Verdana;font-size:12px;color:#000">SEE MORE</div></div></div></a>';

      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.equal(result.bidder, 'revcontent');
      assert.equal(result.bidderCode, 'revcontent');
      assert.equal(result.mediaType, 'native');
      assert.equal(result.requestId, '294a7f446202848');
      assert.equal(result.cpm, '0.1');
      assert.equal(result.creativeId, '4162547');
    });

    it('validate template custom invalid template', function () {
      bidRequest.bid[0].params.size.width = 100;
      bidRequest.bid[0].params.size.height = 200;

      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.equal(result.bidder, 'revcontent');
      assert.equal(result.bidderCode, 'revcontent');
      assert.equal(result.mediaType, 'native');
      assert.equal(result.requestId, '294a7f446202848');
      assert.equal(result.cpm, '0.1');
      assert.equal(result.creativeId, '4162547');
    });

    it('should return empty when there is no bids in response', function () {
      const serverResponse = {
        body: {
          id: null,
          bidid: null,
          seatbid: [{bid: []}],
          cur: 'USD'
        }
      };
      let bidRequest = {
        data: {},
        bids: [{bidId: 'bidId1'}]
      };
      const result = spec.interpretResponse(serverResponse, bidRequest)[0];
      assert.ok(!result);
    });
  });

  describe('onBidWon', function () {
    it('default bid won', function () {
      const bid = {
        nurl: 'https://trends-s0.revcontent.com/push/track/?p=${AUCTION_PRICE}&d=nTCdHIfsgKOLFuV7DS1LF%2FnTk5HiFduGU65BgKgB%2BvKyG9YV7ceQWN76HMbBE0C6gwQeXUjravv3Hq5x9TT8CM6r2oUNgkGC9mhgv2yroTH9i3cSoH%2BilxyY19fMXFirtBz%2BF%2FEXKi4bsNh%2BDMPfj0L4elo%2FJEZmx4nslvOneJJjsFjJJtUJc%2F3UPivOisSCa%2B36mAgFQqt%2FSWBriYB%2BVAufz70LaGspF6T6jDzuIyVFJUpLhZVDtLRSJEzh7Lyzzw1FmYarp%2FPg0gZDY48aDdjw5A3Tlj%2Bap0cPHLDprNOyF0dmHDn%2FOVJEDRTWvrQ2JNK1t%2Fg1bGHIih0ec6XBVIBNurqRpLFBuUY6LgXCt0wRZWTByTEZ8AEv8IoYVILJAL%2BXL%2F9IyS4eTcdOUfn5X7gT8QBghCrAFrsCg8ZXKgWddTEXbpN1lU%2FzHdI5eSHkxkJ6WcYxSkY9PyripaIbmKiyb98LQMgTD%2B20RJO5dAmXTQTAcauw6IUPTjgSPEU%2Bd6L5Txd3CM00Hbd%2Bw1bREIQcpKEmlMwrRSwe4bu1BCjlh5A9gvU9Xc2sf7ekS3qPPmtp059r5IfzdNFQJB5aH9HqeDEU%2FxbMHx4ggMgojLBBL1fKrCKLAteEDQxd7PVmFJv7GHU2733vt5TnjKiEhqxHVFyi%2B0MIYMGIziM5HfUqfq3KUf%2F%2FeiCtJKXjg7FS6hOambdimSt7BdGDIZq9QECWdXsXcQqqVLwli27HYDMFVU3TWWRyjkjbhnQID9gQJlcpwIi87jVAODb6qP%2FKGQ%3D%3D',
        cpm: '0.1'
      };
      const result = spec.onBidWon(bid);
      assert.ok(result);
    });
  });
});
