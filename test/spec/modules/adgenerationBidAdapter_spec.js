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
      },
      { // bannerWithHyperId
        bidder: 'adg',
        params: {
          id: '58278', // banner
        },
        adUnitCode: 'adunit-code',
        sizes: [[320, 100]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a',
        userId: {
          novatiq: {
            snowflake: {'id': 'novatiqId', syncResponse: 1}
          }
        }
      },
      { // bannerWithAdgextCriteoId
        bidder: 'adg',
        params: {
          id: '58278', // banner
        },
        adUnitCode: 'adunit-code',
        sizes: [[320, 100]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a',
        userId: {
          criteoId: 'criteo-id-test-1234567890'
        }
      },
      { // bannerWithAdgextId5Id
        bidder: 'adg',
        params: {
          id: '58278', // banner
        },
        adUnitCode: 'adunit-code',
        sizes: [[320, 100]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a',
        userId: {
          id5id: {
            ext: {
              linkType: 2
            },
            uid: 'id5-id-test-1234567890'
          }
        }
      }
    ];
    const bidderRequest = {
      refererInfo: {
        page: 'https://example.com'
      }
    };
    const data = {
      banner: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=300x250%2C320x100&currency=JPY&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.4.0&imark=1&tp=https%3A%2F%2Fexample.com`,
      bannerUSD: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=300x250%2C320x100&currency=USD&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.4.0&imark=1&tp=https%3A%2F%2Fexample.com`,
      native: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=1x1&currency=JPY&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.4.0&tp=https%3A%2F%2Fexample.com`,
      bannerWithHyperId: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=320x100&currency=JPY&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.4.0&imark=1&tp=https%3A%2F%2Fexample.com&hyper_id=novatiqId`,
      bannerWithAdgextCriteoId: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=320x100&currency=JPY&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.4.0&adgext_criteo_id=criteo-id-test-1234567890&imark=1&tp=https%3A%2F%2Fexample.com`,
      bannerWithAdgextId5Id: `posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&sizes=320x100&currency=JPY&pbver=${prebid.version}&sdkname=prebidjs&adapterver=1.4.0&adgext_id5_id=id5-id-test-1234567890&adgext_id5_id_link_type=2&imark=1&tp=https%3A%2F%2Fexample.com`,
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

    it('should attache params to the bannerWithHyperId request', function () {
      const defaultUA = window.navigator.userAgent;
      window.navigator.__defineGetter__('userAgent', function() {
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
      });
      const request = spec.buildRequests(bidRequests, bidderRequest)[2];

      window.navigator.__defineGetter__('userAgent', function() {
        return defaultUA;
      });
      expect(request.data).to.equal(data.bannerWithHyperId);
    });

    it('should attache params to the bannerWithAdgextCriteoId request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[3];
      expect(request.data).to.equal(data.bannerWithAdgextCriteoId);
    });

    it('should attache params to the bannerWithAdgextId5Id request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[4];
      expect(request.data).to.equal(data.bannerWithAdgextId5Id);
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
      upperBillboard: {
        bidRequest: {
          bidder: 'adg',
          params: {
            id: '143038', // banner
            marginTop: '50',
          },
          adUnitCode: 'adunit-code',
          sizes: [[320, 180]],
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
      normal: {
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
            {ad: '<\!DOCTYPE html> <head> <meta charset="UTF-8"> <script src="https://bigman-test.scaleout.jp/sdk/js/adg-script-base.js" type="text/javascript"></script> <script type="text/javascript">adsettings = {locationid  : 10696,rotation    : 0,displaytype : 1,sdktype     : "0",scheduleid  : 12827}; </script> <style>body {margin:0;padding:0;} </style> </head> <body> <div id="medibasspContainer"> <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=_HWL-PTe&rd=https%3A%2F%2Fapi-test.scaleout.jp%2Frd%2Fv1%2Fz%2FhKFj2gDAY2hzbT0xNzUsYjkzMzU2N2QvMTA2OTYvU1NQTE9DLzEyODI3LzI3NTMuNzQ5NC4xMjgyNy84Mjg1LzExMjc1LzEwNjk2OlNTUExPQzoqL2N0PTE1MjIyMjY1OTU3ODI7c3I9aHR0cDtkc3BpZD0zMDE7cHI9eU1pV0FySmZ6TmJCU1ZDcm5FSkZBNGQ1O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTAwO2NyeTJkPTAuMDE7aWR4PTA7pXNlcWlk2gAkODZhN2EzNjYtNzI2Yi1mYjFkLTc0Y2QtZmQ3MTA5NzQ2NmVip3NlcXRpbWWtMTUyMjIyNjU5NTc4MqR4dWlkuFZuME5lcXdRQVMwQUFCbC1BTnNBQUFBQQ%2Fp%2Fseqid%3D86a7a366-726b-fb1d-74cd-fd71097466eb%3Bseqctx%3Dgat3by5hZy5mdHlwZaEx%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe> </div> </body> <iframe src="https://api-test.scaleout.jp/aux/sosync?ctsv=localhost&amp;seqid=86a7a366-726b-fb1d-74cd-fd71097466eb&amp;seqtime=1522226595782" width="1" height="1" style="position:absolute;border:none;padding:0;margin:0;"></iframe>'},
          ],
          adomain: ['advertiserdomain.com']
        },
        native: {
          ad: '<\!DOCTYPE html>↵  <head>↵    <meta charset="UTF-8">↵    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>↵    <script type="text/javascript">↵      adsettings = {↵        locationid  : 58278,↵        rotation    : 0,↵        displaytype : 1,↵        sdktype     : "0",↵        scheduleid  : 512601↵      };↵    </script>↵    <style>↵      body {↵        margin:0;↵        padding:0;↵      }↵    </style>↵  </head>↵  <body>↵    <div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  </body>',
          beacon: '<img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0zNTQsMjZhOGQ2NTRpZD01ODI3OSZwb3M9U1NQTE9DJmFkPTUxMjYwMy83MjExNi43Njg1Ni41MTI2MDMvMTA5MzkyNy82NDkyMC81ODI3OTpTU1BMT0M6Ki9pZHg9MDtkc3BpZD0zMDE7cHI9emZpM2lmMVd4eVQya1ZPdDl6ZjFiMzBxO3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTEyLjA1O2NyeTJkPTAuMDA4OTI0NTg3MjM3ODQwMjUwNDtwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzthY2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNSU3RDthc2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNTIlMkMlMjJtYXJnaW4lMjIlM0FmYWxzZSU3RDsmZXg9MTUxNDE4NzQ4NiZjdD0xNTE0MTg3NDg2Mzc4JnNyPWh0dHA-&amp;xuid=Wjh5scCo4VIAAGXQzTkAAAAA&amp;ctsv=a-ad84&amp;seqid=ca7d6a2d-7cf1-6c6a-f4bd-a19b168ba94b&amp;seqtime=1514187486378&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
          cpm: 36.0008,
          displaytype: '1',
          ids: {},
          location_params: null,
          locationid: '58279',
          adomain: ['advertiserdomain.com'],
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
        },
        upperBillboard: {
          'ad': '<\!DOCTYPE html>\n  <head>\n    <meta charset="UTF-8">\n    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>\n    <script type="text/javascript">\n      adsettings = {\n        locationid  : 143038,\n        rotation    : 0,\n        displaytype : 1,\n        sdktype     : "0",\n        scheduleid  : 1233323\n      };\n    </script>\n    <style>\n      body {\n        margin:0;\n        padding:0;\n      }\n    </style>\n  </head>\n  <body>\n    <div id="medibasspContainer">\n      \n    </div>\n  </body>\n<iframe src="https://tg.socdm.com/aux/sosync?ctsv=m-ad240&amp;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&amp;seqtime=1633327583803" width="1" height="1" style="position:absolute;border:none;padding:0;margin:0;"></iframe>',
          'beacon': '<img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&amp;xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&amp;ctsv=m-ad240&amp;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&amp;seqtime=1633327583803&amp;seqctx=gat3by5hZy5mdHlwZaEz&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
          'beaconurl': 'https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&seqctx=gat3by5hZy5mdHlwZaEz&t=.gif',
          'cpm': 80,
          'creative_params': {},
          'creativeid': 'ScaleOut_2146187',
          'dealid': '2134-132864_newformat_test',
          'displaytype': '1',
          'h': 180,
          'ids': {
            'anid': '',
            'diid': '',
            'idfa': '',
            'soc': 'Xm8Q8cCo5r8AAHCCMg0AAAAA'
          },
          'location_params': {
            'option': {
              'ad_type': 'upper_billboard'
            }
          },
          'locationid': '143038',
          'results': [
            {
              'ad': '<\!DOCTYPE html>\n  <head>\n    <meta charset="UTF-8">\n    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>\n    <script type="text/javascript">\n      adsettings = {\n        locationid  : 143038,\n        rotation    : 0,\n        displaytype : 1,\n        sdktype     : "0",\n        scheduleid  : 1233323\n      };\n    </script>\n    <style>\n      body {\n        margin:0;\n        padding:0;\n      }\n    </style>\n  </head>\n  <body>\n    <div id="medibasspContainer">\n      \n    </div>\n  </body>\n',
              'beacon': '<img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&amp;xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&amp;ctsv=m-ad240&amp;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&amp;seqtime=1633327583803&amp;seqctx=gat3by5hZy5mdHlwZaEz&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
              'beaconurl': 'https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&seqctx=gat3by5hZy5mdHlwZaEz&t=.gif',
              'cpm': 80,
              'creative_params': {},
              'creativeid': 'ScaleOut_2146187',
              'dealid': '2134-132864_newformat_test',
              'h': 180,
              'landing_url': 'https://supership.jp/',
              'rparams': {},
              'scheduleid': '1233323',
              'trackers': {
                'imp': [
                  'https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&seqctx=gat3by5hZy5mdHlwZaEz&t=.gif'
                ],
                'viewable_imp': [
                  'https://tg.socdm.com/aux/inview?creative_id=2166466&ctsv=m-ad240&extra_field=idx%3D0%3Bdspid%3D1%3Bdi2%3D2134-132864_newformat_test%3Bftype%3D3%3Bprb%3D0%3Bpro%3D0%3Bproc%3DJPY%3Bcrd2y%3D111.92%3Bcry2d%3D0.0089349535382416013%3Bsspm%3D0%3Bsom%3D0.2%3Borgm%3D0%3Btechm%3D0%3Bssp_margin%3D0%3Bso_margin%3D0.2%3Borg_margin%3D0%3Btech_margin%3D0%3Bbs%3Dclassic%3B&family_id=1233323&id=143038&loglocation_id=154410&lookupname=143038%3ASSPLOC%3A*&pos=SSPLOC&schedule_id=261061.265799.1233323&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA'
                ],
                'viewable_measured': [
                  'https://tg.socdm.com/aux/measured?creative_id=2166466&ctsv=m-ad240&extra_field=idx%3D0%3Bdspid%3D1%3Bdi2%3D2134-132864_newformat_test%3Bftype%3D3%3Bprb%3D0%3Bpro%3D0%3Bproc%3DJPY%3Bcrd2y%3D111.92%3Bcry2d%3D0.0089349535382416013%3Bsspm%3D0%3Bsom%3D0.2%3Borgm%3D0%3Btechm%3D0%3Bssp_margin%3D0%3Bso_margin%3D0.2%3Borg_margin%3D0%3Btech_margin%3D0%3Bbs%3Dclassic%3B&family_id=1233323&id=143038&loglocation_id=154410&lookupname=143038%3ASSPLOC%3A*&pos=SSPLOC&schedule_id=261061.265799.1233323&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA'
                ]
              },
              'ttl': 1000,
              'vastxml': '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><VAST version="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd">\n  <Ad id="SOADS_1219110">\n    <InLine>\n      <AdSystem>SOADS</AdSystem>\n      <AdTitle/>\n      <Description/>\n      <Impression><![CDATA[https://tg.socdm.com/adsv/v1?id=10392&posall=RTB&schedule_id=256840.261578.1219110&family_id=1219110&creative_id=2146187&loglocation_id=12869&proto=adgen&wpr=YmRlYmM4ZWI4YzVmNDU2Nw==&ssp_audit=abc&ssplocid=adgen%3A143038&wdl=30&nobc=1&prv2=ig9WkPpYLbCeleBCDAkD6vLXsKEH_gNH2aGvvA&t=pixel&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&width=320&height=180&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e&seqtime=1633327583825&ssp_tag_id=143038&bidtime=1633327583&idx=0]]></Impression>\n      <Creatives>\n        <Creative AdID="2146187">\n          <CreativeExtensions>\n            <CreativeExtension on_playing="false" type="pmp">\n              <CtaButtonText>\n                <![CDATA[Supership株式会社]]>\n              </CtaButtonText>\n              <CtaButtonTextExtra>\n                <![CDATA[広告配信後に移動します]]>\n              </CtaButtonTextExtra>\n            </CreativeExtension>\n          </CreativeExtensions>\n\n          <Linear>\n          <Icons>\n            <Icon height="15" program="scaleout" width="18" xPosition="right" yPosition="top">\n              <StaticResource creativeType="image/png"><![CDATA[https://i.socdm.com/s/jiaa/rt_18x15.png]]></StaticResource>\n              <IconClicks>\n                <IconClickThrough><![CDATA[https://supership.jp/optout.html]]></IconClickThrough>\n              </IconClicks>\n            </Icon>\n          </Icons>\n            <Duration>00:00:15</Duration>\n            <TrackingEvents>\n              <Tracking event="start"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=start&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="firstQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=firstQuartile&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="midpoint"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=midpoint&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="thirdQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=thirdQuartile&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="complete"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=complete&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="fullscreen"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=fullscreen&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n            <Tracking event="start"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=start&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="skip"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=skip&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=firstQuartile&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="midpoint"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=midpoint&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=thirdQuartile&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="complete"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=complete&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="fullscreen"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=fullscreen&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking></TrackingEvents>\n            <VideoClicks>\n              <ClickThrough><![CDATA[https://tg.socdm.com/rd/v1/z/haFj2gDAY2hzbT0xNzUsNWE1Y2Y2YzMvMTAzOTIvUlRCLzEyMTkxMTAvMjU2ODQwLjI2MTU3OC4xMjE5MTEwLzIxNDYxODcvMTI4NjkvMTAzOTI6UlRCOiovY3Q9MTYzMzMyNzU4MzgyNTtzcj1odHRwcztwcj16RDRFO3ByYj16RDRFO3Bybz16RDRFO3Byb2M9SlBZO2NyZDJ5PTExMS45MjtjcnkyZD0wLjAwODkzNDk1MzUzODI0MTYwMTM7aWR4PTA7pXByb3RvpWFkZ2VupXNlcWlk2gAkNmNmNTFhZmItNmQyNi0xNDAyLWM5ZTctMGU4NDVlMzQxODNlp3NlcXRpbWWtMTYzMzMyNzU4MzgyNaR4dWlkuFhtOFE4Y0NvNXI4QUFIQ0NNZzBBQUFBQQ/p/ctsv=m-ad240;seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e;/g/B:aHR0cHM6Ly9zdXBlcnNoaXAuanAv]]></ClickThrough>\n            <ClickTracking><![CDATA[https://tg.socdm.com/rd/v1/z/hKFj2gD8Y2hzbT0yMzUsYzRjMmU2MjcvMTQzMDM4L1NTUExPQy8xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovY3Q9MTYzMzMyNzU4MzgwMztzcj1odHRwcztkc3BpZD0xO3ByPXlNcHc7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTEuOTI7Y3J5MmQ9MC4wMDg5MzQ5NTM1MzgyNDE2MDEzO2RpMj0yMTM0LTEzMjg2NF9uZXdmb3JtYXRfdGVzdDtkc3BpZD0xO2Z0eXBlPTM7aWR4PTA7pXNlcWlk2gAkYmUzOGJkYjQtNzRhNy0xNGE3LTM0MzktYjdmMWVhOGI0ZjMzp3NlcXRpbWWtMTYzMzMyNzU4MzgwM6R4dWlkuFhtOFE4Y0NvNXI4QUFIQ0NNZzBBQUFBQQ/p/ctsv=m-ad240;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33;seqctx=gat3by5hZy5mdHlwZaEz;/g/U:?url=]]></ClickTracking></VideoClicks>\n            <MediaFiles>\n              <MediaFile bitrate="400" delivery="progressive" height="360" type="video/mp4" width="640">https://i.socdm.com/a/2/2095/2091787/20210810043037-de3e74aec30f36.mp4</MediaFile>\n              <MediaFile bitrate="1000" delivery="progressive" height="480" type="video/mp4" width="854">https://i.socdm.com/a/2/2095/2091788/20210810043037-6dd368dc91d507.mp4</MediaFile>\n              <MediaFile bitrate="400" delivery="progressive" height="360" type="video/webm" width="640">https://i.socdm.com/a/2/2095/2091789/20210810043037-c8eb814ddd85c4.webm</MediaFile>\n              <MediaFile bitrate="1000" delivery="progressive" height="480" type="video/webm" width="854">https://i.socdm.com/a/2/2095/2091790/20210810043037-0a7f74c40268ab.webm</MediaFile>\n            </MediaFiles>\n          </Linear>\n        </Creative>\n      </Creatives>\n    </InLine>\n  </Ad>\n</VAST>',
              'vcpm': 0,
              'w': 320,
              'weight': 1
            }
          ],
          'rotation': '0',
          'scheduleid': '1233323',
          'sdktype': '0',
          'trackers': {
            'imp': [
              'https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&seqctx=gat3by5hZy5mdHlwZaEz&t=.gif'
            ],
            'viewable_imp': [
              'https://tg.socdm.com/aux/inview?creative_id=2166466&ctsv=m-ad240&extra_field=idx%3D0%3Bdspid%3D1%3Bdi2%3D2134-132864_newformat_test%3Bftype%3D3%3Bprb%3D0%3Bpro%3D0%3Bproc%3DJPY%3Bcrd2y%3D111.92%3Bcry2d%3D0.0089349535382416013%3Bsspm%3D0%3Bsom%3D0.2%3Borgm%3D0%3Btechm%3D0%3Bssp_margin%3D0%3Bso_margin%3D0.2%3Borg_margin%3D0%3Btech_margin%3D0%3Bbs%3Dclassic%3B&family_id=1233323&id=143038&loglocation_id=154410&lookupname=143038%3ASSPLOC%3A*&pos=SSPLOC&schedule_id=261061.265799.1233323&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA'
            ],
            'viewable_measured': [
              'https://tg.socdm.com/aux/measured?creative_id=2166466&ctsv=m-ad240&extra_field=idx%3D0%3Bdspid%3D1%3Bdi2%3D2134-132864_newformat_test%3Bftype%3D3%3Bprb%3D0%3Bpro%3D0%3Bproc%3DJPY%3Bcrd2y%3D111.92%3Bcry2d%3D0.0089349535382416013%3Bsspm%3D0%3Bsom%3D0.2%3Borgm%3D0%3Btechm%3D0%3Bssp_margin%3D0%3Bso_margin%3D0.2%3Borg_margin%3D0%3Btech_margin%3D0%3Bbs%3Dclassic%3B&family_id=1233323&id=143038&loglocation_id=154410&lookupname=143038%3ASSPLOC%3A*&pos=SSPLOC&schedule_id=261061.265799.1233323&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&seqtime=1633327583803&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA'
            ]
          },
          'ttl': 1000,
          'vastxml': '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><VAST version="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd">\n  <Ad id="SOADS_1219110">\n    <InLine>\n      <AdSystem>SOADS</AdSystem>\n      <AdTitle/>\n      <Description/>\n      <Impression><![CDATA[https://tg.socdm.com/adsv/v1?id=10392&posall=RTB&schedule_id=256840.261578.1219110&family_id=1219110&creative_id=2146187&loglocation_id=12869&proto=adgen&wpr=YmRlYmM4ZWI4YzVmNDU2Nw==&ssp_audit=abc&ssplocid=adgen%3A143038&wdl=30&nobc=1&prv2=ig9WkPpYLbCeleBCDAkD6vLXsKEH_gNH2aGvvA&t=pixel&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&width=320&height=180&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e&seqtime=1633327583825&ssp_tag_id=143038&bidtime=1633327583&idx=0]]></Impression>\n      <Creatives>\n        <Creative AdID="2146187">\n          <CreativeExtensions>\n            <CreativeExtension on_playing="false" type="pmp">\n              <CtaButtonText>\n                <![CDATA[Supership株式会社]]>\n              </CtaButtonText>\n              <CtaButtonTextExtra>\n                <![CDATA[広告配信後に移動します]]>\n              </CtaButtonTextExtra>\n            </CreativeExtension>\n          </CreativeExtensions>\n\n          <Linear>\n          <Icons>\n            <Icon height="15" program="scaleout" width="18" xPosition="right" yPosition="top">\n              <StaticResource creativeType="image/png"><![CDATA[https://i.socdm.com/s/jiaa/rt_18x15.png]]></StaticResource>\n              <IconClicks>\n                <IconClickThrough><![CDATA[https://supership.jp/optout.html]]></IconClickThrough>\n              </IconClicks>\n            </Icon>\n          </Icons>\n            <Duration>00:00:15</Duration>\n            <TrackingEvents>\n              <Tracking event="start"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=start&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="firstQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=firstQuartile&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="midpoint"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=midpoint&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="thirdQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=thirdQuartile&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="complete"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=complete&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n              <Tracking event="fullscreen"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=fullscreen&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>\n            <Tracking event="start"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=start&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="skip"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=skip&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=firstQuartile&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="midpoint"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=midpoint&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=thirdQuartile&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="complete"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=complete&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="fullscreen"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=fullscreen&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking></TrackingEvents>\n            <VideoClicks>\n              <ClickThrough><![CDATA[https://tg.socdm.com/rd/v1/z/haFj2gDAY2hzbT0xNzUsNWE1Y2Y2YzMvMTAzOTIvUlRCLzEyMTkxMTAvMjU2ODQwLjI2MTU3OC4xMjE5MTEwLzIxNDYxODcvMTI4NjkvMTAzOTI6UlRCOiovY3Q9MTYzMzMyNzU4MzgyNTtzcj1odHRwcztwcj16RDRFO3ByYj16RDRFO3Bybz16RDRFO3Byb2M9SlBZO2NyZDJ5PTExMS45MjtjcnkyZD0wLjAwODkzNDk1MzUzODI0MTYwMTM7aWR4PTA7pXByb3RvpWFkZ2VupXNlcWlk2gAkNmNmNTFhZmItNmQyNi0xNDAyLWM5ZTctMGU4NDVlMzQxODNlp3NlcXRpbWWtMTYzMzMyNzU4MzgyNaR4dWlkuFhtOFE4Y0NvNXI4QUFIQ0NNZzBBQUFBQQ/p/ctsv=m-ad240;seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e;/g/B:aHR0cHM6Ly9zdXBlcnNoaXAuanAv]]></ClickThrough>\n            <ClickTracking><![CDATA[https://tg.socdm.com/rd/v1/z/hKFj2gD8Y2hzbT0yMzUsYzRjMmU2MjcvMTQzMDM4L1NTUExPQy8xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovY3Q9MTYzMzMyNzU4MzgwMztzcj1odHRwcztkc3BpZD0xO3ByPXlNcHc7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTEuOTI7Y3J5MmQ9MC4wMDg5MzQ5NTM1MzgyNDE2MDEzO2RpMj0yMTM0LTEzMjg2NF9uZXdmb3JtYXRfdGVzdDtkc3BpZD0xO2Z0eXBlPTM7aWR4PTA7pXNlcWlk2gAkYmUzOGJkYjQtNzRhNy0xNGE3LTM0MzktYjdmMWVhOGI0ZjMzp3NlcXRpbWWtMTYzMzMyNzU4MzgwM6R4dWlkuFhtOFE4Y0NvNXI4QUFIQ0NNZzBBQUFBQQ/p/ctsv=m-ad240;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33;seqctx=gat3by5hZy5mdHlwZaEz;/g/U:?url=]]></ClickTracking></VideoClicks>\n            <MediaFiles>\n              <MediaFile bitrate="400" delivery="progressive" height="360" type="video/mp4" width="640">https://i.socdm.com/a/2/2095/2091787/20210810043037-de3e74aec30f36.mp4</MediaFile>\n              <MediaFile bitrate="1000" delivery="progressive" height="480" type="video/mp4" width="854">https://i.socdm.com/a/2/2095/2091788/20210810043037-6dd368dc91d507.mp4</MediaFile>\n              <MediaFile bitrate="400" delivery="progressive" height="360" type="video/webm" width="640">https://i.socdm.com/a/2/2095/2091789/20210810043037-c8eb814ddd85c4.webm</MediaFile>\n              <MediaFile bitrate="1000" delivery="progressive" height="480" type="video/webm" width="854">https://i.socdm.com/a/2/2095/2091790/20210810043037-0a7f74c40268ab.webm</MediaFile>\n            </MediaFiles>\n          </Linear>\n        </Creative>\n      </Creatives>\n    </InLine>\n  </Ad>\n</VAST>',
          'vcpm': 0,
          'w': 320,
        }
      },
      emptyAdomain: {
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
            {ad: '<\!DOCTYPE html> <head> <meta charset="UTF-8"> <script src="https://bigman-test.scaleout.jp/sdk/js/adg-script-base.js" type="text/javascript"></script> <script type="text/javascript">adsettings = {locationid  : 10696,rotation    : 0,displaytype : 1,sdktype     : "0",scheduleid  : 12827}; </script> <style>body {margin:0;padding:0;} </style> </head> <body> <div id="medibasspContainer"> <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=_HWL-PTe&rd=https%3A%2F%2Fapi-test.scaleout.jp%2Frd%2Fv1%2Fz%2FhKFj2gDAY2hzbT0xNzUsYjkzMzU2N2QvMTA2OTYvU1NQTE9DLzEyODI3LzI3NTMuNzQ5NC4xMjgyNy84Mjg1LzExMjc1LzEwNjk2OlNTUExPQzoqL2N0PTE1MjIyMjY1OTU3ODI7c3I9aHR0cDtkc3BpZD0zMDE7cHI9eU1pV0FySmZ6TmJCU1ZDcm5FSkZBNGQ1O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTAwO2NyeTJkPTAuMDE7aWR4PTA7pXNlcWlk2gAkODZhN2EzNjYtNzI2Yi1mYjFkLTc0Y2QtZmQ3MTA5NzQ2NmVip3NlcXRpbWWtMTUyMjIyNjU5NTc4MqR4dWlkuFZuME5lcXdRQVMwQUFCbC1BTnNBQUFBQQ%2Fp%2Fseqid%3D86a7a366-726b-fb1d-74cd-fd71097466eb%3Bseqctx%3Dgat3by5hZy5mdHlwZaEx%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe> </div> </body> <iframe src="https://api-test.scaleout.jp/aux/sosync?ctsv=localhost&amp;seqid=86a7a366-726b-fb1d-74cd-fd71097466eb&amp;seqtime=1522226595782" width="1" height="1" style="position:absolute;border:none;padding:0;margin:0;"></iframe>'},
          ],
          adomain: []
        },
        native: {
          ad: '<\!DOCTYPE html>↵  <head>↵    <meta charset="UTF-8">↵    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>↵    <script type="text/javascript">↵      adsettings = {↵        locationid  : 58278,↵        rotation    : 0,↵        displaytype : 1,↵        sdktype     : "0",↵        scheduleid  : 512601↵      };↵    </script>↵    <style>↵      body {↵        margin:0;↵        padding:0;↵      }↵    </style>↵  </head>↵  <body>↵    <div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  </body>',
          beacon: '<img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0zNTQsMjZhOGQ2NTRpZD01ODI3OSZwb3M9U1NQTE9DJmFkPTUxMjYwMy83MjExNi43Njg1Ni41MTI2MDMvMTA5MzkyNy82NDkyMC81ODI3OTpTU1BMT0M6Ki9pZHg9MDtkc3BpZD0zMDE7cHI9emZpM2lmMVd4eVQya1ZPdDl6ZjFiMzBxO3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTEyLjA1O2NyeTJkPTAuMDA4OTI0NTg3MjM3ODQwMjUwNDtwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzthY2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNSU3RDthc2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNTIlMkMlMjJtYXJnaW4lMjIlM0FmYWxzZSU3RDsmZXg9MTUxNDE4NzQ4NiZjdD0xNTE0MTg3NDg2Mzc4JnNyPWh0dHA-&amp;xuid=Wjh5scCo4VIAAGXQzTkAAAAA&amp;ctsv=a-ad84&amp;seqid=ca7d6a2d-7cf1-6c6a-f4bd-a19b168ba94b&amp;seqtime=1514187486378&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
          cpm: 36.0008,
          displaytype: '1',
          ids: {},
          location_params: null,
          locationid: '58279',
          adomain: [],
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
      },
      noAdomain: {
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
            {ad: '<\!DOCTYPE html> <head> <meta charset="UTF-8"> <script src="https://bigman-test.scaleout.jp/sdk/js/adg-script-base.js" type="text/javascript"></script> <script type="text/javascript">adsettings = {locationid  : 10696,rotation    : 0,displaytype : 1,sdktype     : "0",scheduleid  : 12827}; </script> <style>body {margin:0;padding:0;} </style> </head> <body> <div id="medibasspContainer"> <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=_HWL-PTe&rd=https%3A%2F%2Fapi-test.scaleout.jp%2Frd%2Fv1%2Fz%2FhKFj2gDAY2hzbT0xNzUsYjkzMzU2N2QvMTA2OTYvU1NQTE9DLzEyODI3LzI3NTMuNzQ5NC4xMjgyNy84Mjg1LzExMjc1LzEwNjk2OlNTUExPQzoqL2N0PTE1MjIyMjY1OTU3ODI7c3I9aHR0cDtkc3BpZD0zMDE7cHI9eU1pV0FySmZ6TmJCU1ZDcm5FSkZBNGQ1O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTAwO2NyeTJkPTAuMDE7aWR4PTA7pXNlcWlk2gAkODZhN2EzNjYtNzI2Yi1mYjFkLTc0Y2QtZmQ3MTA5NzQ2NmVip3NlcXRpbWWtMTUyMjIyNjU5NTc4MqR4dWlkuFZuME5lcXdRQVMwQUFCbC1BTnNBQUFBQQ%2Fp%2Fseqid%3D86a7a366-726b-fb1d-74cd-fd71097466eb%3Bseqctx%3Dgat3by5hZy5mdHlwZaEx%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe> </div> </body> <iframe src="https://api-test.scaleout.jp/aux/sosync?ctsv=localhost&amp;seqid=86a7a366-726b-fb1d-74cd-fd71097466eb&amp;seqtime=1522226595782" width="1" height="1" style="position:absolute;border:none;padding:0;margin:0;"></iframe>'},
          ],
        },
        native: {
          ad: '<\!DOCTYPE html>↵  <head>↵    <meta charset="UTF-8">↵    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>↵    <script type="text/javascript">↵      adsettings = {↵        locationid  : 58278,↵        rotation    : 0,↵        displaytype : 1,↵        sdktype     : "0",↵        scheduleid  : 512601↵      };↵    </script>↵    <style>↵      body {↵        margin:0;↵        padding:0;↵      }↵    </style>↵  </head>↵  <body>↵    <div id="medibasspContainer">↵      <iframe src="https://sdk-temp.s3-ap-northeast-1.amazonaws.com/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  </body>',
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
      }
    };

    const bidResponses = {
      normal: {
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
          adomain: ['advertiserdomain.com']
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
          adomain: ['advertiserdomain.com'],
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
        },
        upperBillboard: {
          requestId: '2f6ac468a9c15e',
          cpm: 80,
          width: 320,
          height: 180,
          creativeId: 'ScaleOut_2146187',
          dealId: '2134-132864_newformat_test',
          currency: 'JPY',
          netRevenue: true,
          ttl: 1000,
          ad: `<script type="text/javascript" src="https://i.socdm.com/sdk/js/adg-browser-m.js"></script><script type="text/javascript">window.ADGBrowserM.init({vastXml: '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><VAST version="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd">  <Ad id="SOADS_1219110">    <InLine>      <AdSystem>SOADS</AdSystem>      <AdTitle/>      <Description/>      <Impression><![CDATA[https://tg.socdm.com/adsv/v1?id=10392&posall=RTB&schedule_id=256840.261578.1219110&family_id=1219110&creative_id=2146187&loglocation_id=12869&proto=adgen&wpr=YmRlYmM4ZWI4YzVmNDU2Nw==&ssp_audit=abc&ssplocid=adgen%3A143038&wdl=30&nobc=1&prv2=ig9WkPpYLbCeleBCDAkD6vLXsKEH_gNH2aGvvA&t=pixel&xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&ctsv=m-ad240&width=320&height=180&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e&seqtime=1633327583825&ssp_tag_id=143038&bidtime=1633327583&idx=0]]></Impression>      <Creatives>        <Creative AdID="2146187">          <CreativeExtensions>            <CreativeExtension on_playing="false" type="pmp">              <CtaButtonText>                <![CDATA[Supership株式会社]]>              </CtaButtonText>              <CtaButtonTextExtra>                <![CDATA[広告配信後に移動します]]>              </CtaButtonTextExtra>            </CreativeExtension>          </CreativeExtensions>          <Linear>          <Icons>            <Icon height="15" program="scaleout" width="18" xPosition="right" yPosition="top">              <StaticResource creativeType="image/png"><![CDATA[https://i.socdm.com/s/jiaa/rt_18x15.png]]></StaticResource>              <IconClicks>                <IconClickThrough><![CDATA[https://supership.jp/optout.html]]></IconClickThrough>              </IconClicks>            </Icon>          </Icons>            <Duration>00:00:15</Duration>            <TrackingEvents>              <Tracking event="start"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=start&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>              <Tracking event="firstQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=firstQuartile&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>              <Tracking event="midpoint"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=midpoint&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>              <Tracking event="thirdQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=thirdQuartile&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>              <Tracking event="complete"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=complete&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>              <Tracking event="fullscreen"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=10392&schedule_id=256840.261578.1219110&wo_schedule_id=1219110&creative_id=2146187&event=fullscreen&loglocation_id=12869&order_id=256840&lookupname=10392:RTB:*&family_id=1219110&delivery_unit_id=261578&position=RTB&multiad_index=0&seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e]]></Tracking>            <Tracking event="start"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=start&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="skip"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=skip&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=firstQuartile&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="midpoint"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=midpoint&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=thirdQuartile&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="complete"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=complete&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking><Tracking event="fullscreen"><![CDATA[https://tg.socdm.com/aux/vast_event?page_id=143038&schedule_id=261061.265799.1233323&wo_schedule_id=1233323&creative_id=2166466&event=fullscreen&loglocation_id=154410&order_id=261061&lookupname=143038:SSPLOC:*&family_id=1233323&delivery_unit_id=265799&position=SSPLOC&multiad_index=0&seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&dspid=1&di2=2134-132864_newformat_test&ftype=3]]></Tracking></TrackingEvents>            <VideoClicks>              <ClickThrough><![CDATA[https://tg.socdm.com/rd/v1/z/haFj2gDAY2hzbT0xNzUsNWE1Y2Y2YzMvMTAzOTIvUlRCLzEyMTkxMTAvMjU2ODQwLjI2MTU3OC4xMjE5MTEwLzIxNDYxODcvMTI4NjkvMTAzOTI6UlRCOiovY3Q9MTYzMzMyNzU4MzgyNTtzcj1odHRwcztwcj16RDRFO3ByYj16RDRFO3Bybz16RDRFO3Byb2M9SlBZO2NyZDJ5PTExMS45MjtjcnkyZD0wLjAwODkzNDk1MzUzODI0MTYwMTM7aWR4PTA7pXByb3RvpWFkZ2VupXNlcWlk2gAkNmNmNTFhZmItNmQyNi0xNDAyLWM5ZTctMGU4NDVlMzQxODNlp3NlcXRpbWWtMTYzMzMyNzU4MzgyNaR4dWlkuFhtOFE4Y0NvNXI4QUFIQ0NNZzBBQUFBQQ/p/ctsv=m-ad240;seqid=6cf51afb-6d26-1402-c9e7-0e845e34183e;/g/B:aHR0cHM6Ly9zdXBlcnNoaXAuanAv]]></ClickThrough>            <ClickTracking><![CDATA[https://tg.socdm.com/rd/v1/z/hKFj2gD8Y2hzbT0yMzUsYzRjMmU2MjcvMTQzMDM4L1NTUExPQy8xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovY3Q9MTYzMzMyNzU4MzgwMztzcj1odHRwcztkc3BpZD0xO3ByPXlNcHc7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTEuOTI7Y3J5MmQ9MC4wMDg5MzQ5NTM1MzgyNDE2MDEzO2RpMj0yMTM0LTEzMjg2NF9uZXdmb3JtYXRfdGVzdDtkc3BpZD0xO2Z0eXBlPTM7aWR4PTA7pXNlcWlk2gAkYmUzOGJkYjQtNzRhNy0xNGE3LTM0MzktYjdmMWVhOGI0ZjMzp3NlcXRpbWWtMTYzMzMyNzU4MzgwM6R4dWlkuFhtOFE4Y0NvNXI4QUFIQ0NNZzBBQUFBQQ/p/ctsv=m-ad240;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33;seqctx=gat3by5hZy5mdHlwZaEz;/g/U:?url=]]></ClickTracking></VideoClicks>            <MediaFiles>              <MediaFile bitrate="400" delivery="progressive" height="360" type="video/mp4" width="640">https://i.socdm.com/a/2/2095/2091787/20210810043037-de3e74aec30f36.mp4</MediaFile>              <MediaFile bitrate="1000" delivery="progressive" height="480" type="video/mp4" width="854">https://i.socdm.com/a/2/2095/2091788/20210810043037-6dd368dc91d507.mp4</MediaFile>              <MediaFile bitrate="400" delivery="progressive" height="360" type="video/webm" width="640">https://i.socdm.com/a/2/2095/2091789/20210810043037-c8eb814ddd85c4.webm</MediaFile>              <MediaFile bitrate="1000" delivery="progressive" height="480" type="video/webm" width="854">https://i.socdm.com/a/2/2095/2091790/20210810043037-0a7f74c40268ab.webm</MediaFile>            </MediaFiles>          </Linear>        </Creative>      </Creatives>    </InLine>  </Ad></VAST>', marginTop: '50'});</script><img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0yOTQsNGZiM2NkNWVpZD0xNDMwMzgmcG9zPVNTUExPQyZhZD0xMjMzMzIzLzI2MTA2MS4yNjU3OTkuMTIzMzMyMy8yMTY2NDY2LzE1NDQxMC8xNDMwMzg6U1NQTE9DOiovaWR4PTA7ZHNwaWQ9MTtkaTI9MjEzNC0xMzI4NjRfbmV3Zm9ybWF0X3Rlc3Q7ZnR5cGU9Mztwcj15TXB3O3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTExLjkyO2NyeTJkPTAuMDA4OTM0OTUzNTM4MjQxNjAxMztwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzsmZXg9MTYzMzMyNzU4MyZjdD0xNjMzMzI3NTgzODAzJnNyPWh0dHA-&amp;xuid=Xm8Q8cCo5r8AAHCCMg0AAAAA&amp;ctsv=m-ad240&amp;seqid=be38bdb4-74a7-14a7-3439-b7f1ea8b4f33&amp;seqtime=1633327583803&amp;seqctx=gat3by5hZy5mdHlwZaEz&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>`,
          adomain: ['advertiserdomain.com']
        },
      },
      emptyAdomain: {
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
          adomain: []
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
          adomain: [],
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
        },
      },
      noAdomain: {
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
      },
    };

    it('no bid responses', function () {
      const result = spec.interpretResponse({body: serverResponse.noAd}, bidRequests.banner);
      expect(result.length).to.equal(0);
    });

    it('handles ADGBrowserM responses', function () {
      config.setConfig({
        currency: {
          adServerCurrency: 'JPY'
        }
      });
      const result = spec.interpretResponse({body: serverResponse.normal.upperBillboard}, bidRequests.upperBillboard)[0];
      expect(result.requestId).to.equal(bidResponses.normal.upperBillboard.requestId);
      expect(result.width).to.equal(bidResponses.normal.upperBillboard.width);
      expect(result.height).to.equal(bidResponses.normal.upperBillboard.height);
      expect(result.creativeId).to.equal(bidResponses.normal.upperBillboard.creativeId);
      expect(result.dealId).to.equal(bidResponses.normal.upperBillboard.dealId);
      expect(result.currency).to.equal(bidResponses.normal.upperBillboard.currency);
      expect(result.netRevenue).to.equal(bidResponses.normal.upperBillboard.netRevenue);
      expect(result.ttl).to.equal(bidResponses.normal.upperBillboard.ttl);
      expect(result.ad).to.equal(bidResponses.normal.upperBillboard.ad);
    });

    it('handles banner responses for empty adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.emptyAdomain.banner}, bidRequests.banner)[0];
      expect(result.requestId).to.equal(bidResponses.emptyAdomain.banner.requestId);
      expect(result.width).to.equal(bidResponses.emptyAdomain.banner.width);
      expect(result.height).to.equal(bidResponses.emptyAdomain.banner.height);
      expect(result.creativeId).to.equal(bidResponses.emptyAdomain.banner.creativeId);
      expect(result.dealId).to.equal(bidResponses.emptyAdomain.banner.dealId);
      expect(result.currency).to.equal(bidResponses.emptyAdomain.banner.currency);
      expect(result.netRevenue).to.equal(bidResponses.emptyAdomain.banner.netRevenue);
      expect(result.ttl).to.equal(bidResponses.emptyAdomain.banner.ttl);
      expect(result.ad).to.equal(bidResponses.emptyAdomain.banner.ad);
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    it('handles native responses for empty adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.emptyAdomain.native}, bidRequests.native)[0];
      expect(result.requestId).to.equal(bidResponses.emptyAdomain.native.requestId);
      expect(result.width).to.equal(bidResponses.emptyAdomain.native.width);
      expect(result.height).to.equal(bidResponses.emptyAdomain.native.height);
      expect(result.creativeId).to.equal(bidResponses.emptyAdomain.native.creativeId);
      expect(result.dealId).to.equal(bidResponses.emptyAdomain.native.dealId);
      expect(result.currency).to.equal(bidResponses.emptyAdomain.native.currency);
      expect(result.netRevenue).to.equal(bidResponses.emptyAdomain.native.netRevenue);
      expect(result.ttl).to.equal(bidResponses.emptyAdomain.native.ttl);
      expect(result.native.title).to.equal(bidResponses.emptyAdomain.native.native.title);
      expect(result.native.image.url).to.equal(bidResponses.emptyAdomain.native.native.image.url);
      expect(result.native.image.height).to.equal(bidResponses.emptyAdomain.native.native.image.height);
      expect(result.native.image.width).to.equal(bidResponses.emptyAdomain.native.native.image.width);
      expect(result.native.icon.url).to.equal(bidResponses.emptyAdomain.native.native.icon.url);
      expect(result.native.icon.width).to.equal(bidResponses.emptyAdomain.native.native.icon.width);
      expect(result.native.icon.height).to.equal(bidResponses.emptyAdomain.native.native.icon.height);
      expect(result.native.sponsoredBy).to.equal(bidResponses.emptyAdomain.native.native.sponsoredBy);
      expect(result.native.body).to.equal(bidResponses.emptyAdomain.native.native.body);
      expect(result.native.cta).to.equal(bidResponses.emptyAdomain.native.native.cta);
      expect(decodeURIComponent(result.native.privacyLink)).to.equal(bidResponses.emptyAdomain.native.native.privacyLink);
      expect(result.native.clickUrl).to.equal(bidResponses.emptyAdomain.native.native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses.emptyAdomain.native.native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses.emptyAdomain.native.native.clickTrackers[0]);
      expect(result.mediaType).to.equal(bidResponses.emptyAdomain.native.mediaType);
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    it('handles banner responses for no adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.noAdomain.banner}, bidRequests.banner)[0];
      expect(result.requestId).to.equal(bidResponses.noAdomain.banner.requestId);
      expect(result.width).to.equal(bidResponses.noAdomain.banner.width);
      expect(result.height).to.equal(bidResponses.noAdomain.banner.height);
      expect(result.creativeId).to.equal(bidResponses.noAdomain.banner.creativeId);
      expect(result.dealId).to.equal(bidResponses.noAdomain.banner.dealId);
      expect(result.currency).to.equal(bidResponses.noAdomain.banner.currency);
      expect(result.netRevenue).to.equal(bidResponses.noAdomain.banner.netRevenue);
      expect(result.ttl).to.equal(bidResponses.noAdomain.banner.ttl);
      expect(result.ad).to.equal(bidResponses.noAdomain.banner.ad);
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });

    it('handles native responses for no adomain', function () {
      const result = spec.interpretResponse({body: serverResponse.noAdomain.native}, bidRequests.native)[0];
      expect(result.requestId).to.equal(bidResponses.noAdomain.native.requestId);
      expect(result.width).to.equal(bidResponses.noAdomain.native.width);
      expect(result.height).to.equal(bidResponses.noAdomain.native.height);
      expect(result.creativeId).to.equal(bidResponses.noAdomain.native.creativeId);
      expect(result.dealId).to.equal(bidResponses.noAdomain.native.dealId);
      expect(result.currency).to.equal(bidResponses.noAdomain.native.currency);
      expect(result.netRevenue).to.equal(bidResponses.noAdomain.native.netRevenue);
      expect(result.ttl).to.equal(bidResponses.noAdomain.native.ttl);
      expect(result.native.title).to.equal(bidResponses.noAdomain.native.native.title);
      expect(result.native.image.url).to.equal(bidResponses.noAdomain.native.native.image.url);
      expect(result.native.image.height).to.equal(bidResponses.noAdomain.native.native.image.height);
      expect(result.native.image.width).to.equal(bidResponses.noAdomain.native.native.image.width);
      expect(result.native.icon.url).to.equal(bidResponses.noAdomain.native.native.icon.url);
      expect(result.native.icon.width).to.equal(bidResponses.noAdomain.native.native.icon.width);
      expect(result.native.icon.height).to.equal(bidResponses.noAdomain.native.native.icon.height);
      expect(result.native.sponsoredBy).to.equal(bidResponses.noAdomain.native.native.sponsoredBy);
      expect(result.native.body).to.equal(bidResponses.noAdomain.native.native.body);
      expect(result.native.cta).to.equal(bidResponses.noAdomain.native.native.cta);
      expect(decodeURIComponent(result.native.privacyLink)).to.equal(bidResponses.noAdomain.native.native.privacyLink);
      expect(result.native.clickUrl).to.equal(bidResponses.noAdomain.native.native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses.noAdomain.native.native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses.noAdomain.native.native.clickTrackers[0]);
      expect(result.mediaType).to.equal(bidResponses.noAdomain.native.mediaType);
      expect(result).to.not.have.any.keys('meta');
      expect(result).to.not.have.any.keys('advertiserDomains');
    });
  });
});
