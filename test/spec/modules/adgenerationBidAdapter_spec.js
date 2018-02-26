import {expect} from 'chai';
import * as utils from 'src/utils';
import {spec} from 'modules/adgenerationBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {NATIVE} from 'src/mediaTypes';

describe('AdgenerationAdapter', () => {
  const adapter = newBidder(spec);
  const ENDPOINT = ['http://api-test.scaleout.jp/adsv/v1', 'https://d.socdm.com/adsv/v1'];

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'adg',
      'params': {
        id: '58278', // banner
      }
    };
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const bidRequests = [
      { // banner
        bidder: 'adg',
        params: {
          id: '58278',
          width: '300',
          height: '250'
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: '2f6ac468a9c15e',
        bidderRequestId: '14a9f773e30243',
        auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        transactionTd: 'f76f6dfd-d64f-4645-a29f-682bac7f431a'
      },
      { // native
        bidder: 'adg',
        params: {
          id: '58278',
          width: '300',
          height: '250'
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
    const data = {
      banner: 'posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3&imark=1',
      native: 'posall=SSPLOC&id=58278&sdktype=0&hb=true&t=json3'
    };
    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(ENDPOINT[1]);
      expect(request.method).to.equal('GET');
    });

    it('sends bid request to debug ENDPOINT via GET', () => {
      bidRequests[0].params.debug = true;
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(ENDPOINT[0]);
      expect(request.method).to.equal('GET');
    });

    it('should attache params to the banner request', () => {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.data).to.equal(data.banner);
    });

    it('should attache params to the native request', () => {
      const request = spec.buildRequests(bidRequests)[1];
      expect(request.data).to.equal(data.native);
    });
  });

  describe('interpretResponse', () => {
    const bidRequests = {
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
      }
    };

    const serverResponse = {
      ad: '<!DOCTYPE html>↵  <head>↵    <meta charset="UTF-8">↵    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>↵    <script type="text/javascript">↵      adsettings = {↵        locationid  : 58278,↵        rotation    : 0,↵        displaytype : 1,↵        sdktype     : "0",↵        scheduleid  : 512601↵      };↵    </script>↵    <style>↵      body {↵        margin:0;↵        padding:0;↵      }↵    </style>↵  </head>↵  <body>↵    <div id="medibasspContainer">↵      <iframe src="https://s3-ap-northeast-1.amazonaws.com/sdk-temp/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  </body>',
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
              value: 'https://supership.jp/optout/'
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
              url: 'https://s3-ap-northeast-1.amazonaws.com/sdk-temp/adg-sample-ad/img/300x250.png',
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
        imptrackers: ['https://s3-ap-northeast-1.amazonaws.com/adg-dummy-dsp/1x1.gif'],
        link: {
          clicktrackers: [
            'https://s3-ap-northeast-1.amazonaws.com/adg-dummy-dsp/1x1_clicktracker_access.gif'
          ],
          url: 'https://supership.jp'
        },
      },
      rotation: '0',
      scheduleid: '512603',
      sdktype: '0',
      creativeid: '1k2kv35vsa5r',
      dealid: 'fd5sa5fa7f',
      ttl: 1000
    };

    const bidResponses = [
      {
        requestId: '2f6ac468a9c15e',
        cpm: 36.0008,
        width: 1,
        height: 1,
        creativeId: '1k2kv35vsa5r',
        dealId: 'fd5sa5fa7f',
        currency: 'JPY',
        netRevenue: true,
        ttl: 1000,
        referrer: utils.getTopWindowUrl(),
        ad: '↵    <div id="medibasspContainer">↵      <iframe src="https://s3-ap-northeast-1.amazonaws.com/sdk-temp/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  <img src="https://tg.socdm.com/bc/v3?b=Y2hzbT0zNTQsMjZhOGQ2NTRpZD01ODI3OSZwb3M9U1NQTE9DJmFkPTUxMjYwMy83MjExNi43Njg1Ni41MTI2MDMvMTA5MzkyNy82NDkyMC81ODI3OTpTU1BMT0M6Ki9pZHg9MDtkc3BpZD0zMDE7cHI9emZpM2lmMVd4eVQya1ZPdDl6ZjFiMzBxO3ByYj15UTtwcm89eVE7cHJvYz1KUFk7Y3JkMnk9MTEyLjA1O2NyeTJkPTAuMDA4OTI0NTg3MjM3ODQwMjUwNDtwcnY9aWp6QVZtWW9wbmJUV1B0cWhtZEN1ZWRXNDd0MjU1MEtmYjFWYmI3SzthY2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNSU3RDthc2Q9JTdCJTIybWFyZ2luX2lkJTIyJTNBNTIlMkMlMjJtYXJnaW4lMjIlM0FmYWxzZSU3RDsmZXg9MTUxNDE4NzQ4NiZjdD0xNTE0MTg3NDg2Mzc4JnNyPWh0dHA-&amp;xuid=Wjh5scCo4VIAAGXQzTkAAAAA&amp;ctsv=a-ad84&amp;seqid=ca7d6a2d-7cf1-6c6a-f4bd-a19b168ba94b&amp;seqtime=1514187486378&amp;t=.gif" width="1" height="1" style="display:none;border:none;padding:0;margin:0;width:1px;height:1px"/>',
        native: {
          title: 'Title',
          image: {
            url: 'https://s3-ap-northeast-1.amazonaws.com/sdk-temp/adg-sample-ad/img/300x250.png',
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
          clickUrl: 'https://supership.jp',
          clickTrackers: ['https://s3-ap-northeast-1.amazonaws.com/adg-dummy-dsp/1x1_clicktracker_access.gif'],
          impressionTrackers: ['https://s3-ap-northeast-1.amazonaws.com/adg-dummy-dsp/1x1.gif']
        },
        mediaType: NATIVE
      }
    ];

    it('no bid responses', () => {
      const result = spec.interpretResponse({body: serverResponse}, bidRequests);
      expect(result.length).to.equal(0);
    });

    it('handles native responses', () => {
      serverResponse.results = [{ad: '<body>Creative<\/body>'}];
      const result = spec.interpretResponse({body: serverResponse}, bidRequests)[0];
      expect(result.requestId).to.equal(bidResponses[0].requestId);
      expect(result.width).to.equal(bidResponses[0].width);
      expect(result.height).to.equal(bidResponses[0].height);
      expect(result.creativeId).to.equal(bidResponses[0].creativeId);
      expect(result.dealId).to.equal(bidResponses[0].dealId);
      expect(result.currency).to.equal(bidResponses[0].currency);
      expect(result.netRevenue).to.equal(bidResponses[0].netRevenue);
      expect(result.ttl).to.equal(bidResponses[0].ttl);
      expect(result.referrer).to.equal(bidResponses[0].referrer);
      expect(result.native.title).to.equal(bidResponses[0].native.title);
      expect(result.native.image.url).to.equal(bidResponses[0].native.image.url);
      expect(result.native.image.height).to.equal(bidResponses[0].native.image.height);
      expect(result.native.image.width).to.equal(bidResponses[0].native.image.width);
      expect(result.native.icon.url).to.equal(bidResponses[0].native.icon.url);
      expect(result.native.icon.width).to.equal(bidResponses[0].native.icon.width);
      expect(result.native.icon.height).to.equal(bidResponses[0].native.icon.height);
      expect(result.native.sponsoredBy).to.equal(bidResponses[0].native.sponsoredBy);
      expect(result.native.body).to.equal(bidResponses[0].native.body);
      expect(result.native.cta).to.equal(bidResponses[0].native.cta);
      expect(result.native.clickUrl).to.equal(bidResponses[0].native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses[0].native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses[0].native.clickTrackers[0]);
      expect(result.mediaType).to.equal(bidResponses[0].mediaType);
    });

    it('handles banner responses', () => {
      serverResponse.results = [{ad: '<!DOCTYPE html>↵  <head>↵    <meta charset="UTF-8">↵    <script src="https://i.socdm.com/sdk/js/adg-script-base.js" type="text/javascript"></script>↵    <script type="text/javascript">↵      adsettings = {↵        locationid  : 58278,↵        rotation    : 0,↵        displaytype : 1,↵        sdktype     : "0",↵        scheduleid  : 512601↵      };↵    </script>↵    <style>↵      body {↵        margin:0;↵        padding:0;↵      }↵    </style>↵  </head>↵  <body>↵    <div id="medibasspContainer">↵      <iframe src="https://s3-ap-northeast-1.amazonaws.com/sdk-temp/adg-sample-ad/300x250.html?prc=-WjRm3cb&rd=https%3A%2F%2Ftg.socdm.com%2Frd%2Fv1%2Fz%2FhKFj2gDZY2hzbT0yMDAsN2NhNTY1NjQvNTgyNzgvU1NQTE9DLzUxMjYwMS83MjExNS43Njg1NS41MTI2MDEvMTA5MzkyNi82NDkxOS81ODI3ODpTU1BMT0M6Ki9jdD0xNTE1MDM4NTQ3NjQyO3NyPWh0dHBzO2RzcGlkPTMwMTtwcj16ZmkzaWYxV3h5VDJrVk90OXpmMWIzMHE7cHJiPXlRO3Bybz15UTtwcm9jPUpQWTtjcmQyeT0xMTM7Y3J5MmQ9MC4wMDg4NDk1NTc1MjIxMjM4OTAyO2lkeD0wO6VzZXFpZNoAJDgyZDcxYzA3LTg5ZjItM2E1ZC1kYmVmLTFjNjhiMDZkOTBmZKdzZXF0aW1lrTE1MTUwMzg1NDc2NDKkeHVpZLhXamg1c2NDbzRWSUFBR1hRelRrQUFBQUE%2Fp%2Fseqid%3D82d71c07-89f2-3a5d-dbef-1c68b06d90fd%3B%2Fg%2FU%3A%3Furl%3D" style="border: 0px;" width="300" height="250" frameborder="0" scrolling="no"></iframe>↵    </div>↵  </body>'}];
      delete serverResponse.native_ad;
      delete serverResponse.mediaType;
      delete bidRequests.bidRequest.mediaTypes;
      const result = spec.interpretResponse({body: serverResponse}, bidRequests)[0];
      expect(result.requestId).to.equal(bidResponses[0].requestId);
      expect(result.width).to.equal(bidResponses[0].width);
      expect(result.height).to.equal(bidResponses[0].height);
      expect(result.creativeId).to.equal(bidResponses[0].creativeId);
      expect(result.dealId).to.equal(bidResponses[0].dealId);
      expect(result.currency).to.equal(bidResponses[0].currency);
      expect(result.netRevenue).to.equal(bidResponses[0].netRevenue);
      expect(result.ttl).to.equal(bidResponses[0].ttl);
      expect(result.referrer).to.equal(bidResponses[0].referrer);
      expect(result.ad).to.equal(bidResponses[0].ad);
    });
  });
});
