import { expect } from 'chai';
import { spec } from 'modules/dvgroupBidAdapter.js';
import { deepClone } from 'src/utils.js';

describe('dvgroupBidAdapterTests', function () {
  let bidRequestData = {
    bids: [
      {
        adUnitCode: 'div-banner-id',
        bidId: 'bid-ID-2',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidder: 'dvgroup',
        params: {
          source: 'ssp1',
        },
        requestId: 'request-123',
      }
    ]
  };

  it('validate_generated_url', function () {
    const request = spec.buildRequests(deepClone(bidRequestData.bids), { timeout: 1234 });
    let req_url = request[0].url;

    expect(req_url).to.equal('https://rtb.dvgroup.com/bid?sspuid=prebidssp');
  });

  it('validate_response_params', function () {
    let serverResponse = {
      body: {
        id: 'bid123',
        seatbid: [
          {
            bid: [
              {
                id: '2b1fdd73-11c3-4765-99e9-9350cbf9a8c8',
                impid: 'bid-ID-2',
                price: 0.9899,
                adm: '<h1>AD</h1>',
                adomain: ['adomain.com'],
                cid: '6543122',
                crid: '654231',
                w: 300,
                h: 600,
                mtype: 1,
                ext: {
                  prebid: {
                    type: 'banner',
                  }
                }
              },
            ],
            seat: '5612',
          },
        ],
        cur: 'EUR',
      }
    };

    const bidRequest = deepClone(bidRequestData.bids)
    bidRequest[0].mediaTypes = {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      }
    }

    const request = spec.buildRequests(bidRequest);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.ad).to.equal('<h1>AD</h1>');
    expect(bid.cpm).to.equal(0.9899);
    expect(bid.currency).to.equal('EUR');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(600);
    expect(bid.creativeId).to.equal('654231');
    expect(bid.meta.advertiserDomains).to.deep.equal(['adomain.com']);
  });

  it('validate_invalid_response', function () {
    let serverResponse = {
      body: {}
    };

    const bidRequest = deepClone(bidRequestData.bids)
    bidRequest[0].mediaTypes = {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      }
    }

    const request = spec.buildRequests(bidRequest);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(0);
  })

  if (FEATURES.VIDEO) {
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
          id: 'bid123',
          seatbid: [
            {
              bid: [
                {
                  id: '1bh7jku7-ko2g-8654-ab72-h268abcde271',
                  impid: 'bid-ID-2',
                  price: 0.9899,
                  adm: vastXml,
                  adomain: ['adomain.com'],
                  cid: '6543122',
                  crid: '654231',
                  w: 300,
                  h: 600,
                  mtype: 1,
                  ext: {
                    prebid: {
                      type: 'banner',
                    }
                  }
                },
              ],
              seat: '5612',
            },
          ],
          cur: 'EUR',
        }
      };

      let bids = spec.interpretResponse(serverResponse, request[0]);
      expect(bids).to.have.lengthOf(1);

      let bid = bids[0];
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.equal(vastXml);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(600);
    });
  }
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
    expect(syncData[0].url).to.equal('//sync.dvgroup.com/match/sp?us_privacy=1---&gdpr_consent=')
  });

  it('Should return array of objects with proper sync config , include GDPR', function() {
    const syncData = spec.getUserSyncs({
      pixelEnabled: true,
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
    expect(syncData[0].type).to.equal('image')
    expect(syncData[0].url).to.be.a('string')
    expect(syncData[0].url).to.equal('//sync.dvgroup.com/match/sp?us_privacy=&gdpr_consent=COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw&gdpr=1')
  });

  it('Should return array of objects with proper sync config , include GDPR, no purpose', function() {
    const syncData = spec.getUserSyncs({
      pixelEnabled: true,
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
      pixelEnabled: true,
    }, {}, {
      gdprApplies: false,
      consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
    }, '');
    expect(syncData).to.be.an('array').which.is.not.empty;
    expect(syncData[0]).to.be.an('object')
    expect(syncData[0].type).to.be.a('string')
    expect(syncData[0].type).to.equal('image')
    expect(syncData[0].url).to.be.a('string')
    expect(syncData[0].url).to.equal('//sync.dvgroup.com/match/sp?us_privacy=&gdpr_consent=COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw&gdpr=0')
  });
})
