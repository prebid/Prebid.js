import { expect } from 'chai';
import { spec } from '../../../modules/datablocksBidAdapter';

let bid = {
  bidId: '2dd581a2b6281d',
  bidder: 'datablocks',
  bidderRequestId: '145e1d6a7837c9',
  params: {
    sourceId: 7560,
    host: 'v5demo.datablocks.net'
  },
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  sizes: [
    [300, 250]
  ],
  transactionId: '1ccbee15-f6f6-46ce-8998-58fe5542e8e1'
};

let bid2 = {
  bidId: '2dd581a2b624324g',
  bidder: 'datablocks',
  bidderRequestId: '145e1d6a7837543',
  params: {
    sourceId: 7560,
    host: 'v5demo.datablocks.net'
  },
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
  mediaTypes: {
    banner: {
      sizes:
        [728, 90]
    }
  },
  transactionId: '1ccbee15-f6f6-46ce-8998-58fe55425432'
};

let nativeBid = {
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '160c78a4-f808-410f-b682-d8728f3a79ee',
  bidId: '332045ee374a99',
  bidder: 'datablocks',
  bidderRequestId: '15d9012765e36c',
  mediaTypes: {
    native: {
      title: {
        required: true
      },
      body: {
        required: true
      },
      image: {
        required: true
      }
    }
  },
  nativeParams: {
    title: {
      required: true
    },
    body: {
      required: true,
      data: {
        len: 250
      }
    },
    image: {
      required: true,
      sizes: [728, 90]
    }
  },
  params: {
    sourceId: 7560,
    host: 'v5demo.datablocks.net'
  },
  transactionId: '0a4e9788-4def-4b94-bc25-564d7cac99f6'
}

let videoBid = {
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '160c78a4-f808-410f-b682-d8728f3a79e1',
  bidId: '332045ee374b99',
  bidder: 'datablocks',
  bidderRequestId: '15d9012765e36d',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [501, 400],
      durationRangeSec: [15, 60]
    }
  },
  params: {
    sourceId: 7560,
    host: 'v5demo.datablocks.net',
    video: {
      minduration: 14
    }
  },
  transactionId: '0a4e9788-4def-4b94-bc25-564d7cac99f7'
}

const bidderRequest = {
  auctionId: '8bfef1be-d3ac-4d18-8859-754c7b4cf017',
  auctionStart: Date.now(),
  biddeCode: 'datablocks',
  bidderRequestId: '10c47a5fc3c41',
  bids: [bid, bid2, nativeBid, videoBid],
  refererInfo: {
    numIframes: 0,
    reachedTop: true,
    referer: 'https://v5demo.datablocks.net/test',
    stack: ['https://v5demo.datablocks.net/test']
  },
  start: Date.now(),
  timeout: 10000
};

let resObject = {
  body: {
    id: '10c47a5fc3c41',
    bidid: '166895245-28-11347-1',
    seatbid: [{
      seat: '7560',
      bid: [{
        id: '1090738570',
        impid: '2966b257c81d27',
        price: 24.000000,
        adm: '<a href="https://click.v5demo.datablocks.net/c//?fcid=1090738570"><img src="https://impression.v5demo.datablocks.net/i//?fcid=1090738570&mime=image/png" alt="RON" height="250" width="300"></a><img alt="" src="https://impression.v5demo.datablocks.net/i//?fcid=1090738570&pixel=1" width="1" height="1" >',
        cid: '55',
        adid: '177654',
        crid: '177656',
        cat: [],
        api: [],
        w: 300,
        h: 250
      }, {
        id: '1090738571',
        impid: '2966b257c81d28',
        price: 24.000000,
        adm: '<a href="https://click.v5demo.datablocks.net/c//?fcid=1090738570"><img src="https://impression.v5demo.datablocks.net/i//?fcid=1090738570&mime=image/png" alt="RON" height="250" width="300"></a><img alt="" src="https://impression.v5demo.datablocks.net/i//?fcid=1090738570&pixel=1" width="1" height="1" >',
        cid: '55',
        adid: '177654',
        crid: '177656',
        cat: [],
        api: [],
        w: 728,
        h: 90
      }, {
        id: '1090738570',
        impid: '15d9012765e36c',
        price: 24.000000,
        adm: '{"native":{"ver":"1.2","assets":[{"id":1,"required":1,"title":{"text":"Example Title"}},{"id":2,"required":1,"data":{"value":"Example Body"}},{"id":3,"required":1,"img":{"url":"https://example.image.com/"}}],"link":{"url":"https://click.example.com/c/264597/?fcid=29699699045816"},"imptrackers":["https://impression.example.com/i/264597/?fcid=29699699045816"]}}',
        cid: '132145',
        adid: '154321',
        crid: '177432',
        cat: [],
        api: []
      }, {
        id: '1090738575',
        impid: '15d9012765e36f',
        price: 25.000000,
        cid: '12345',
        adid: '12345',
        crid: '123456',
        nurl: 'https://click.v5demo.datablocks.net/m//?fcid=435235435432',
        cat: [],
        api: [],
        w: 500,
        h: 400
      }]
    }],
    cur: 'USD',
    ext: {}
  }
};
let bidRequest = {
  method: 'POST',
  url: 'https://v5demo.datablocks.net/search/?sid=7560',
  options: {
    withCredentials: false
  },
  data: {
    device: {
      ip: 'peer',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) Ap…ML, like Gecko) Chrome/73.0.3683.86 Safari/537.36',
      js: 1,
      language: 'en'
    },
    id: '10c47a5fc3c41',
    imp: [{
      banner: { w: 300, h: 250 },
      id: '2966b257c81d27',
      secure: false,
      tagid: '/19968336/header-bid-tag-0'
    }, {
      banner: { w: 728, h: 90 },
      id: '2966b257c81d28',
      secure: false,
      tagid: '/19968336/header-bid-tag-0'
    }, {
      id: '15d9012765e36c',
      native: {request: '{"native":{"assets":[{"id":"1","required":true,"title":{"len":140}},{"id":"2","required":true,"data":{"type":2}},{"id":"3","img":{"w":728,"h":90,"type":3}}]}}'},
      secure: false,
      tagid: '/19968336/header-bid-tag-0'
    }, {
      id: '15d9012765e36f',
      video: {w: 500, h: 400, minduration: 15, maxduration: 60},
      secure: false,
      tagid: '/19968336/header-bid-tag-0'
    }],
    site: {
      domain: '',
      id: 'blank',
      page: 'https://v5demo.datablocks.net/test'
    }
  }
}

describe('DatablocksAdapter', function() {
  describe('isBidRequestValid', function() {
    it('Should return true when sourceId and Host are set', function() {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when host/sourceId is not set', function() {
      let moddedBid = Object.assign({}, bid);
      delete moddedBid.params.sourceId;
      delete moddedBid.params.host;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    let requests = spec.buildRequests([bid, bid2, nativeBid, videoBid], bidderRequest);
    it('Creates an array of request objects', function() {
      expect(requests).to.be.an('array').that.is.not.empty;
    });

    requests.forEach(request => {
      expect(request).to.exist;
      it('Returns POST method', function() {
        expect(request.method).to.exist;
        expect(request.method).to.equal('POST');
      });
      it('Returns valid URL', function() {
        expect(request.url).to.exist;
        expect(request.url).to.equal('https://v5demo.datablocks.net/search/?sid=7560');
      });

      it('Should be a valid openRTB request', function() {
        let data = request.data;
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('device', 'imp', 'site', 'id');
        expect(data.id).to.be.a('string');

        let imps = data['imp'];
        imps.forEach((imp, index) => {
          let curBid = bidderRequest.bids[index];
          if (imp.banner) {
            expect(imp).to.have.all.keys('banner', 'id', 'secure', 'tagid');
            expect(imp.banner).to.be.a('object');
          } else if (imp.native) {
            expect(imp).to.have.all.keys('native', 'id', 'secure', 'tagid');
            expect(imp.native).to.have.all.keys('request');
            expect(imp.native.request).to.be.a('string');
            let native = JSON.parse(imp.native.request);
            expect(native).to.be.a('object');
          } else if (imp.video) {
            expect(imp).to.have.all.keys('video', 'id', 'secure', 'tagid');
            expect(imp.video).to.have.all.keys('w', 'h', 'minduration', 'maxduration')
          } else {
            expect(true).to.equal(false);
          }

          expect(imp.id).to.be.a('string');
          expect(imp.id).to.equal(curBid.bidId);
          expect(imp.tagid).to.be.a('string');
          expect(imp.tagid).to.equal(curBid.adUnitCode);
          expect(imp.secure).to.equal(false);
        })

        expect(data.device.ip).to.equal('peer');
      });
    })

    it('Returns empty data if no valid requests are passed', function() {
      let request = spec.buildRequests([]);
      expect(request).to.be.an('array').that.is.empty;
    });
  });
  describe('interpretResponse', function() {
    let serverResponses = spec.interpretResponse(resObject, bidRequest);
    it('Returns an array of valid server responses if response object is valid', function() {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(Object.keys(dataItem)).to.include('cpm', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType', 'requestId');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');

        if (dataItem.mediaType == 'banner') {
          expect(dataItem.ad).to.be.a('string');
          expect(dataItem.width).to.be.a('number');
          expect(dataItem.height).to.be.a('number');
        } else if (dataItem.mediaType == 'native') {
          expect(dataItem.native.title).to.be.a('string');
          expect(dataItem.native.body).to.be.a('string');
          expect(dataItem.native.clickUrl).to.be.a('string');
        } else if (dataItem.mediaType == 'video') {
          expect(dataItem.vastUrl).to.be.a('string');
          expect(dataItem.width).to.be.a('number');
          expect(dataItem.height).to.be.a('number');
        }
      }
      it('Returns an empty array if invalid response is passed', function() {
        serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });
});
