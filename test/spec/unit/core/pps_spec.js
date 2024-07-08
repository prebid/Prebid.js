import { auctionManager } from '../../../../src/auctionManager';
import { getAuctionsIdsFromTargeting, getSegments, getSignals, getSignalsArrayByAuctionsIds, getSignalsIntersection } from '../../../../src/pps';

describe('pps', () => {
  let getAuctionStub;
  const mockTargeting = {'/123456/header-bid-tag-0': {'hb_deal_rubicon': '1234', 'hb_deal': '1234', 'hb_pb': '0.53', 'hb_adid': '148018fe5e', 'hb_bidder': 'rubicon', 'foobar': '300x250', 'hb_pb_rubicon': '0.53', 'hb_adid_rubicon': '148018fe5e', 'hb_bidder_rubicon': 'rubicon', 'hb_deal_appnexus': '4321', 'hb_pb_appnexus': '0.1', 'hb_adid_appnexus': '567891011', 'hb_bidder_appnexus': 'appnexus'}}

  const mocksAuctions = [
    {
      auctionId: '1111',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '1'
              }, {
                id: '2'
              }]
            }],
          }
        }
      })
    },
    {
      auctionId: '234234',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '2'
              }]
            }]
          }
        }
      }),
    }, {
      auctionId: '234324234',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '2'
              }, {
                id: '3'
              }]
            }]
          }
        }
      })
    },
  ]

  it('should parse segments from fpd', () => {
    const twoSegments = getSegments(mocksAuctions[0].getFPD().global, ['user.data'], 4);
    expect(JSON.stringify(twoSegments)).to.equal(JSON.stringify(['1', '2']))
    const zeroSegments = getSegments(mocksAuctions[0].getFPD().global, ['user.data'], 6);
    expect(zeroSegments).to.length(0);
  })

  it('should return signals from fpd', () => {
    const signals = getSignals(mocksAuctions[0].getFPD().global);
    const expectedSignals = [{ taxonomy: 'IAB_AUDIENCE_1_1', values: ['1', '2'] }];
    expect(JSON.stringify(signals)).to.equal(JSON.stringify(expectedSignals))
  })

  it('should properly get auctions ids from targeting', () => {
    const auctionsIds = getAuctionsIdsFromTargeting(mockTargeting);
    expect(JSON.stringify(auctionsIds)).to.equal(JSON.stringify(['148018fe5e', '567891011']))
  })

  it('should properly return empty array of auction ids for invalid targeting', () => {
    let auctionsIds = getAuctionsIdsFromTargeting({});
    expect(Array.isArray(auctionsIds)).to.equal(true);
    expect(auctionsIds).to.length(0);
    auctionsIds = getAuctionsIdsFromTargeting({'/123456/header-bid-tag-0/bg': {'invalidContent': '123'}});
    expect(Array.isArray(auctionsIds)).to.equal(true);
    expect(auctionsIds).to.length(0);
  })

  it('should properly get signals from auctions', () => {
    getAuctionStub = sinon.stub(auctionManager.index, 'getAuction').callsFake(({ auctionId }) => {
      return mocksAuctions.find(auction => auction.auctionId === auctionId)
    });
    const signals = getSignalsArrayByAuctionsIds(['1111', '234234', '234324234']);
    const intersection = getSignalsIntersection(signals)
    const expectedResult = { IAB_AUDIENCE_1_1: { values: ['2'] }, IAB_CONTENT_2_2: { values: [] } };
    expect(JSON.stringify(intersection)).to.be.equal(JSON.stringify(expectedResult));
    getAuctionStub.restore();
  })

  it('should return empty signals array for empty auctions ids array', () => {
    const signals = getSignalsArrayByAuctionsIds([]);
    expect(Array.isArray(signals)).to.equal(true);
    expect(signals).to.length(0);
  })

  it('should return properly formatted object for getSignalsIntersection invoked with empty array', () => {
    const signals = getSignalsIntersection([]);
    expect(Object.keys(signals)).to.contain.members(['IAB_AUDIENCE_1_1', 'IAB_CONTENT_2_2']);
  })
})
