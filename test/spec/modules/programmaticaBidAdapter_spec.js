import { expect } from 'chai';
import { spec } from 'modules/programmaticaBidAdapter.js';
import { deepClone } from 'src/utils.js';

describe('programmaticaBidAdapterTests', function () {
  let bidRequestData = {
    bids: [
      {
        bidId: 'testbid',
        bidder: 'programmatica',
        params: {
          siteId: 'testsite',
          placementId: 'testplacement',
        },
        sizes: [[300, 250]]
      }
    ]
  };
  let request = [];

  it('validate_pub_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'programmatica',
        params: {
          siteId: 'testsite',
          placementId: 'testplacement',
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_url', function () {
    const request = spec.buildRequests(deepClone(bidRequestData.bids), { timeout: 1234 });
    let req_url = request[0].url;

    expect(req_url).to.equal('https://asr.programmatica.com/get');
  });

  it('validate_response_params', function () {
    let serverResponse = {
      body: {
        'id': 'crid',
        'type': {
          'format': 'Image',
          'source': 'passback',
          'dspId': '',
          'dspCreativeId': ''
        },
        'content': {
          'data': 'test ad',
          'imps': null,
          'click': {
            'url': '',
            'track': null
          }
        },
        'size': '300x250',
        'matching': '',
        'cpm': 10,
        'currency': 'USD'
      }
    };

    const bidRequest = deepClone(bidRequestData.bids)
    bidRequest[0].mediaTypes = {
      banner: {}
    }

    const request = spec.buildRequests(bidRequest);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.ad).to.equal('test ad');
    expect(bid.cpm).to.equal(10);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('crid');
    expect(bid.meta.advertiserDomains).to.deep.equal(['programmatica.com']);
  });

  it('validate_response_params_imps', function () {
    let serverResponse = {
      body: {
        'id': 'crid',
        'type': {
          'format': 'Image',
          'source': 'passback',
          'dspId': '',
          'dspCreativeId': ''
        },
        'content': {
          'data': 'test ad',
          'imps': [
            'testImp'
          ],
          'click': {
            'url': '',
            'track': null
          }
        },
        'size': '300x250',
        'matching': '',
        'cpm': 10,
        'currency': 'USD'
      }
    };

    const bidRequest = deepClone(bidRequestData.bids)
    bidRequest[0].mediaTypes = {
      banner: {}
    }

    const request = spec.buildRequests(bidRequest);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.ad).to.equal('test ad<script src="testImp"></script>');
    expect(bid.cpm).to.equal(10);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('crid');
    expect(bid.meta.advertiserDomains).to.deep.equal(['programmatica.com']);
  })

  it('validate_invalid_response', function () {
    let serverResponse = {
      body: {}
    };

    const bidRequest = deepClone(bidRequestData.bids)
    bidRequest[0].mediaTypes = {
      banner: {}
    }

    const request = spec.buildRequests(bidRequest);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(0);
  })

  it('video_bid', function () {
    const bidRequest = deepClone(bidRequestData.bids);
    bidRequest[0].mediaTypes = {
      video: {
        playerSize: [234, 765]
      }
    };

    const request = spec.buildRequests(bidRequest, { timeout: 1234 });
    const vastXml = '<VAST></VAST>';
    let serverResponse = {
      body: {
        'id': 'cki2n3n6snkuulqutpf0',
        'type': {
          'format': '',
          'source': 'rtb',
          'dspId': '1'
        },
        'content': {
          'data': vastXml,
          'imps': [
            'https://asr.dev.programmatica.com/track/imp'
          ],
          'click': {
            'url': '',
            'track': null
          }
        },
        'size': '',
        'matching': '',
        'cpm': 70,
        'currency': 'RUB'
      }
    };

    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.mediaType).to.equal('video');
    expect(bid.vastXml).to.equal(vastXml);
    expect(bid.width).to.equal(234);
    expect(bid.height).to.equal(765);
  });
});

describe('getUserSyncs', function() {
  it('returns empty sync array', function() {
    const syncOptions = {};

    expect(spec.getUserSyncs(syncOptions)).to.deep.equal([]);
  });

  it('Should return array of objects with proper sync config , include CCPA', function() {
    const syncData = spec.getUserSyncs({
      pixelEnabled: true,
    }, {}, {}, '1---');
    expect(syncData).to.be.an('array').which.is.not.empty;
    expect(syncData[0]).to.be.an('object')
    expect(syncData[0].type).to.be.a('string')
    expect(syncData[0].type).to.equal('image')
    expect(syncData[0].url).to.be.a('string')
    expect(syncData[0].url).to.equal('//sync.programmatica.com/match/sp?usp=1---&consent=')
  });

  it('Should return array of objects with proper sync config , include GDPR', function() {
    const syncData = spec.getUserSyncs({
      iframeEnabled: true,
    }, {}, {
      gdprApplies: true,
      consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
      vendorData: {
        purpose: {
          consents: {
            1: true
          },
        },
      }
    }, '');
    expect(syncData).to.be.an('array').which.is.not.empty;
    expect(syncData[0]).to.be.an('object')
    expect(syncData[0].type).to.be.a('string')
    expect(syncData[0].type).to.equal('iframe')
    expect(syncData[0].url).to.be.a('string')
    expect(syncData[0].url).to.equal('//sync.programmatica.com/match/sp.ifr?usp=&consent=COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw&gdpr=1')
  });

  it('Should return array of objects with proper sync config , include GDPR, no purpose', function() {
    const syncData = spec.getUserSyncs({
      iframeEnabled: true,
    }, {}, {
      gdprApplies: true,
      consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
      vendorData: {
        purpose: {
          consents: {
            1: false
          },
        },
      }
    }, '');
    expect(syncData).is.empty;
  });

  it('Should return array of objects with proper sync config , GDPR not applies', function() {
    const syncData = spec.getUserSyncs({
      iframeEnabled: true,
    }, {}, {
      gdprApplies: false,
      consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
    }, '');
    expect(syncData).to.be.an('array').which.is.not.empty;
    expect(syncData[0]).to.be.an('object')
    expect(syncData[0].type).to.be.a('string')
    expect(syncData[0].type).to.equal('iframe')
    expect(syncData[0].url).to.be.a('string')
    expect(syncData[0].url).to.equal('//sync.programmatica.com/match/sp.ifr?usp=&consent=COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw&gdpr=0')
  });
})
