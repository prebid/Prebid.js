import { expect } from 'chai';
import { spec } from 'modules/vistarsBidAdapter.js';
import { deepClone } from 'src/utils.js';

describe('vistarsBidAdapterTests', function () {
  const bidRequestData = {
    bids: [
      {
        adUnitCode: 'div-banner-id',
        bidId: 'bid-123',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidder: 'vistars',
        params: {
          source: 'ssp1',
        },
        requestId: 'request-123',
      }
    ]
  };

  it('validate_pub_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'vistars',
        params: {
          source: 'ssp1',
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_url', function () {
    const request = spec.buildRequests(deepClone(bidRequestData.bids), { timeout: 1234 });
    const req_url = request[0].url;

    expect(req_url).to.equal('https://ex-asr.vistarsagency.com/bid?source=ssp1');
  });

  it('validate_response_params', function () {
    const serverResponse = {
      body: {
        id: 'bid123',
        seatbid: [
          {
            bid: [
              {
                id: '1bh7jku7-ko2g-8654-ab72-h268abcde271',
                impid: 'bid-123',
                price: 0.6565,
                adm: '<h1>AD</h1>',
                adomain: ['abc.com'],
                cid: '1242512',
                crid: '535231',
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
            seat: '4212',
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
    const bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    const bid = bids[0];
    expect(bid.ad).to.equal('<h1>AD</h1>');
    expect(bid.cpm).to.equal(0.6565);
    expect(bid.currency).to.equal('EUR');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(600);
    expect(bid.creativeId).to.equal('535231');
    expect(bid.meta.advertiserDomains).to.deep.equal(['abc.com']);
  });

  it('validate_invalid_response', function () {
    const serverResponse = {
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
    const bids = spec.interpretResponse(serverResponse, request[0]);
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
      const serverResponse = {
        body: {
          id: 'bid123',
          seatbid: [
            {
              bid: [
                {
                  id: '1bh7jku7-ko2g-8654-ab72-h268abcde271',
                  impid: 'bid-123',
                  price: 0.6565,
                  adm: vastXml,
                  adomain: ['abc.com'],
                  cid: '1242512',
                  crid: '535231',
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
              seat: '4212',
            },
          ],
          cur: 'EUR',
        }
      };

      const bids = spec.interpretResponse(serverResponse, request[0]);
      expect(bids).to.have.lengthOf(1);

      const bid = bids[0];
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
    expect(syncData[0].url).to.equal('//sync.vistarsagency.com/match/sp?us_privacy=1---&gdpr_consent=')
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
    expect(syncData[0].url).to.equal('//sync.vistarsagency.com/match/sp.ifr?us_privacy=&gdpr_consent=COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw&gdpr=1')
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
    expect(syncData[0].url).to.equal('//sync.vistarsagency.com/match/sp.ifr?us_privacy=&gdpr_consent=COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw&gdpr=0')
  });
})
