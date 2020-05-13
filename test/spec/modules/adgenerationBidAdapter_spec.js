import {expect} from 'chai';
import {spec} from 'modules/adgenerationBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {NATIVE} from 'src/mediaTypes.js';
import {config} from 'src/config.js';
import prebid from '../../../package.json';

describe('AdgenerationAdapter', function () {
  const adapter = newBidder(spec);
  const ENDPOINT = ['https://api-test.scaleout.jp/adsv/v1', 'https://d.socdm.com/adsv/v1'];

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'adg',
      'params': {
        id: '58278', // banner
      }
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      { // banner
        bidder: 'adg',
        params: {
          id: '58278',
          currency: 'JPY',
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [320, 100]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
      },
      { // native
        bidder: 'adg',
        params: {
          id: '58278',
          currency: 'JPY',
        },
        mediaTypes: {
          native: {
            image: {
              required: true
            },
            title: {
              required: true,
              len: 80
            },
            sponsoredBy: {
              required: true
            },
            clickUrl: {
              required: true
            },
            body: {
              required: true
            },
            icon: {
              required: true
            }
          },
        },
        adUnitCode: 'adunit-code',
        sizes: [[1, 1]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
      }
    ];
    const bidderRequest = {
      refererInfo: {
        referer: 'https://example.com'
      }
    };
    const data = {
      banner: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=300x250%2C320x100&currency=JPY&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.0.1&imark=1&tp=https%3A%2F%2Fexample.com`,
      bannerUSD: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=300x250%2C320x100&currency=USD&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.0.1&imark=1&tp=https%3A%2F%2Fexample.com`,
      native: 'posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=1x1&currency=JPY&pbver=' + prebid.version + '&sdkname=prebidjs&adapterver=1.0.1&tp=https%3A%2F%2Fexample.com'
    };
    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.equal(ENDPOINT[1]);
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to debug ENDPOINT via GET', function () {
      bidRequests[0].params.debug = true;
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.equal(ENDPOINT[0]);
      expect(request.method).to.equal('GET');
    });

    it('should attache params to the banner request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data).to.equal(data.banner);
    });

    it('should attache params to the native request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[1];
      expect(request.data).to.equal(data.native);
    });
    it('allows setConfig to set bidder currency for JPY', function () {
      config.setConfig({
        currency: {
          adServerCurrency: 'JPY'
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data).to.equal(data.banner);
      config.resetConfig();
    });
    it('allows setConfig to set bidder currency for USD', function () {
      config.setConfig({
        currency: {
          adServerCurrency: 'USD'
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data).to.equal(data.bannerUSD);
      config.resetConfig();
    });
  });
  describe('interpretResponse', function () {
    const bidRequests = {
      banner: {
        bidRequest: {
          bidder: 'adg',
          params: {
            id: '58278', // banner
          },
          adUnitCode: 'adunit-code',
          sizes: [[320, 100]],
          bidId: '2f6ac468a9c15e',
          bidderRequestId: '14a9f773e30243',
          auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
          transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
        },
      },
      native: {
        bidRequest: {
          bidder: 'adg',
          params: {
            id: '58278', // banner
          },
          mediaTypes: {
            native: {
              image: {
                required: true
              },
              title: {
                required: true,
                len: 80
              },
              sponsoredBy: {
                required: true
              },
              clickUrl: {
                required: true
              },
              body: {
                required: true
              },
              icon: {
                required: true
              }
            }
          },
          adUnitCode: 'adunit-code',
          sizes: [[1, 1]],
          bidId: '2f6ac468a9c15e',
          bidderRequestId: '14a9f773e30243',
          auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
          transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
        },
      },
    };

    const serverResponse = {
      noAd: {
        results: [],
      },
      banner: {
        ad: '<div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>',
        beacon: '<img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0zNTQsMjZhOGQ2NTRpZD01ODI3OSZwb3M9U1NQTE9DJmFkPTUxMjYwMy83MjExNi43Njg1Ni41MTI2MDMvMTA5MzkyNy82NDkyMC81ODI3OTpTU1BMT0M6Ki9pZHg9MDtkc3BpZD0zMDE7cHI9emZpM2lmMVd4eVQya1ZPdDl6ZjFiMzBxO3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTEyLjA1O2NyeTJkPTAuMDA4OTI0NTg3MjM3ODQwMjUwNDtwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzthY2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNSU3RDthc2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNTIlMkMlMjJtYXJnaW4lMjIlM0FmYWxzZSU3RDsmZXg9MTUxNDE4NzQ4NiZjdD0xNTE0MTg3NDg2Mzc4JnNyPWh0dHA-&amp;xuid=Wjh5scCo4VIAAGXQzTkAAAAA&amp;ctsv=a-ad84&amp;seqid=ca7d6a2d-7cf1-6c6a-f4bd-a19b168ba94b&amp;seqtime=1514187486378&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
        cpm: 36.0008,
        displaytype: '1',
        ids: {},
        w: 320,
        h: 100,
        location_params: null,
        locationid: '58279',
        rotation: '0',
        scheduleid: '512603',
        sdktype: '0',
        creativeid: '1k2kv35vsa5r',
        dealid: 'fd5sa5fa7f',
        ttl: 1000,
        results: [
          {ad: '<!DOCTYPE html> <head> <meta charset="UTF-8"> <script src="https://bigman-test.scaleout.jp/sdk/js/adg-script-base.js" type="text/javascript"></script> <script type="text/javascript">adsettings = {locationid  : 10696,rotation    : 0,displaytype : 1,sdktype     : "0",scheduleid  : 12827}; </script> <style>body {margin:0;padding:0;} </style> </head> <body> <div id="medibasspContainer"> <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=_HWL-PTe&rd=https%3A%2F%2Fapi-test.scaleout.jp%2Frd%2Fv1%2Fz%2FhKFj2gDAY2hzbT0xNzUsYjkzMzU2N2QvMTA2OTYvU1NQTE9DLzEyODI3LzI3NTMuNzQ5NC4xMjgyNy84Mjg1LzExMjc1LzEwNjk2OlNTUExPQzoqL2N0PTE1MjIyMjY1OTU3ODI7c3I9aHR0cDtkc3BpZD0zMDE7cHI9eU1pV0FySmZ6TmJCU1ZDcm5FSkZBNGQ1O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTAwO2NyeTJkPTAuMDE7aWR4PTA7pXNlcWlk2gAkODZhN2EzNjYtNzI2Yi1mYjFkLTc0Y2QtZmQ3MTA5NzQ2NmVip3NlcXRpbWWtMTUyMjIyNjU5NTc4MqR4dWlkuFZuME5lcXdRQVMwQUFCbC1BTnNBQUFBQQ%2Fp%2Fseqid%3D86a7a366-726b-fb1d-74cd-fd71097466eb%3Bseqctx%3Dgat3by5hZy5mdHlwZaEx%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe> </div> </body> <iframe src="https://api-test.scaleout.jp/aux/sosync?ctsv=localhost&amp;seqid=86a7a366-726b-fb1d-74cd-fd71097466eb&amp;seqtime=1522226595782" width="1" height="1" style="position:absolute;border:none;padding:0;margin:0;"></iframe>'},
        ]
      },
      native: {
        ad: '<!DOCTYPE html>↵  <head>↵    <meta charset="UTF-8">↵    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>↵    <script type="text/javascript">↵      adsettings = {↵        locationid  : 58278,↵        rotation    : 0,↵        displaytype : 1,↵        sdktype     : "0",↵        scheduleid  : 512601↵      };↵    </script>↵    <style>↵      body {↵        margin:0;↵        padding:0;↵      }↵    </style>↵  </head>↵  <body>↵    <div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  </body>',
        beacon: '<img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0zNTQsMjZhOGQ2NTRpZD01ODI3OSZwb3M9U1NQTE9DJmFkPTUxMjYwMy83MjExNi43Njg1Ni41MTI2MDMvMTA5MzkyNy82NDkyMC81ODI3OTpTU1BMT0M6Ki9pZHg9MDtkc3BpZD0zMDE7cHI9emZpM2lmMVd4eVQya1ZPdDl6ZjFiMzBxO3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTEyLjA1O2NyeTJkPTAuMDA4OTI0NTg3MjM3ODQwMjUwNDtwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzthY2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNSU3RDthc2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNTIlMkMlMjJtYXJnaW4lMjIlM0FmYWxzZSU3RDsmZXg9MTUxNDE4NzQ4NiZjdD0xNTE0MTg3NDg2Mzc4JnNyPWh0dHA-&amp;xuid=Wjh5scCo4VIAAGXQzTkAAAAA&amp;ctsv=a-ad84&amp;seqid=ca7d6a2d-7cf1-6c6a-f4bd-a19b168ba94b&amp;seqtime=1514187486378&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
        cpm: 36.0008,
        displaytype: '1',
        ids: {},
        location_params: null,
        locationid: '58279',
        native_ad: {
          assets: [
            {
              data: {
                label: 'accompanying_text',
                value: 'AD'
              },
              id: 501
            },
            {
              data: {
                label: 'optout_url',
                value: 'https://supership.jp/optout/#'
              },
              id: 502
            },
            {
              data: {
                ext: {
                  black_back: 'https://i.socdm.com/sdk/img/icon_adg_optout_26x26_white.png',
                },
                label: 'information_icon_url',
                value: 'https://i.socdm.com/sdk/img/icon_adg_optout_26x26_gray.png',
                id: 503
              }
            },
            {
              id: 1,
              required: 1,
              title: {text: 'Title'}
            },
            {
              id: 2,
              img: {
                h: 250,
                url: 'https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/img/300x250.png',
                w: 300
              },
              required: 1
            },
            {
              id: 3,
              img: {
                h: 300,
                url: 'https://placehold.jp/300x300.png',
                w: 300
              },
              required: 1
            },
            {
              data: {value: 'Description'},
              id: 5,
              required: 0
            },
            {
              data: {value: 'CTA'},
              id: 6,
              required: 0
            },
            {
              data: {value: 'Sponsored'},
              id: 4,
              required: 0
            }
          ],
          imptrackers: ['https://adg-dummy-dsp.s3-ap-northeast-1.amazonaws.com/1x1.gif'],
          link: {
            clicktrackers: [
              'https://adg-dummy-dsp.s3-ap-northeast-1.amazonaws.com/1x1_clicktracker_access.gif'
            ],
            url: 'https://supership.jp'
          },
        },
        results: [
          {ad: '<body>Creative<\/body>'}
        ],
        rotation: '0',
        scheduleid: '512603',
        sdktype: '0',
        creativeid: '1k2kv35vsa5r',
        dealid: 'fd5sa5fa7f',
        ttl: 1000
      }
    };

    const bidResponses = {
      banner: {
        requestId: '2f6ac468a9c15e',
        cpm: 36.0008,
        width: 320,
        height: 100,
        creativeId: '1k2kv35vsa5r',
        dealId: 'fd5sa5fa7f',
        currency: 'JPY',
        netRevenue: true,
        ttl: 1000,
        ad: '<div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>',
      },
      native: {
        requestId: '2f6ac468a9c15e',
        cpm: 36.0008,
        width: 1,
        height: 1,
        creativeId: '1k2kv35vsa5r',
        dealId: 'fd5sa5fa7f',
        currency: 'JPY',
        netRevenue: true,
        ttl: 1000,
        ad: '↵    <div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  <img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0zNTQsMjZhOGQ2NTRpZD01ODI3OSZwb3M9U1NQTE9DJmFkPTUxMjYwMy83MjExNi43Njg1Ni41MTI2MDMvMTA5MzkyNy82NDkyMC81ODI3OTpTU1BMT0M6Ki9pZHg9MDtkc3BpZD0zMDE7cHI9emZpM2lmMVd4eVQya1ZPdDl6ZjFiMzBxO3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTEyLjA1O2NyeTJkPTAuMDA4OTI0NTg3MjM3ODQwMjUwNDtwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzthY2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNSU3RDthc2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNTIlMkMlMjJtYXJnaW4lMjIlM0FmYWxzZSU3RDsmZXg9MTUxNDE4NzQ4NiZjdD0xNTE0MTg3NDg2Mzc4JnNyPWh0dHA-&amp;xuid=Wjh5scCo4VIAAGXQzTkAAAAA&amp;ctsv=a-ad84&amp;seqid=ca7d6a2d-7cf1-6c6a-f4bd-a19b168ba94b&amp;seqtime=1514187486378&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
        native: {
          title: 'Title',
          image: {
            url: 'https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/img/300x250.png',
            height: 250,
            width: 300
          },
          icon: {
            url: 'https://placehold.jp/300x300.png',
            height: 300,
            width: 300
          },
          sponsoredBy: 'Sponsored',
          body: 'Description',
          cta: 'CTA',
          privacyLink: 'https://supership.jp/optout/#',
          clickUrl: 'https://supership.jp',
          clickTrackers: ['https://adg-dummy-dsp.s3-ap-northeast-1.amazonaws.com/1x1_clicktracker_access.gif'],
          impressionTrackers: ['https://adg-dummy-dsp.s3-ap-northeast-1.amazonaws.com/1x1.gif']
        },
        mediaType: NATIVE
      }
    };

    it('no bid responses', function () {
      const result = spec.interpretResponse({body: serverResponse.noAd}, bidRequests.banner);
      expect(result.length).to.equal(0);
    });

    it('handles banner responses', function () {
      const result = spec.interpretResponse({body: serverResponse.banner}, bidRequests.banner)[0];
      expect(result.requestId).to.equal(bidResponses.banner.requestId);
      expect(result.width).to.equal(bidResponses.banner.width);
      expect(result.height).to.equal(bidResponses.banner.height);
      expect(result.creativeId).to.equal(bidResponses.banner.creativeId);
      expect(result.dealId).to.equal(bidResponses.banner.dealId);
      expect(result.currency).to.equal(bidResponses.banner.currency);
      expect(result.netRevenue).to.equal(bidResponses.banner.netRevenue);
      expect(result.ttl).to.equal(bidResponses.banner.ttl);
      expect(result.ad).to.equal(bidResponses.banner.ad);
    });

    it('handles native responses', function () {
      const result = spec.interpretResponse({body: serverResponse.native}, bidRequests.native)[0];
      expect(result.requestId).to.equal(bidResponses.native.requestId);
      expect(result.width).to.equal(bidResponses.native.width);
      expect(result.height).to.equal(bidResponses.native.height);
      expect(result.creativeId).to.equal(bidResponses.native.creativeId);
      expect(result.dealId).to.equal(bidResponses.native.dealId);
      expect(result.currency).to.equal(bidResponses.native.currency);
      expect(result.netRevenue).to.equal(bidResponses.native.netRevenue);
      expect(result.ttl).to.equal(bidResponses.native.ttl);
      expect(result.native.title).to.equal(bidResponses.native.native.title);
      expect(result.native.image.url).to.equal(bidResponses.native.native.image.url);
      expect(result.native.image.height).to.equal(bidResponses.native.native.image.height);
      expect(result.native.image.width).to.equal(bidResponses.native.native.image.width);
      expect(result.native.icon.url).to.equal(bidResponses.native.native.icon.url);
      expect(result.native.icon.width).to.equal(bidResponses.native.native.icon.width);
      expect(result.native.icon.height).to.equal(bidResponses.native.native.icon.height);
      expect(result.native.sponsoredBy).to.equal(bidResponses.native.native.sponsoredBy);
      expect(result.native.body).to.equal(bidResponses.native.native.body);
      expect(result.native.cta).to.equal(bidResponses.native.native.cta);
      expect(decodeURIComponent(result.native.privacyLink)).to.equal(bidResponses.native.native.privacyLink);
      expect(result.native.clickUrl).to.equal(bidResponses.native.native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses.native.native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses.native.native.clickTrackers[0]);
      expect(result.mediaType).to.equal(bidResponses.native.mediaType);
    });
  });
});
