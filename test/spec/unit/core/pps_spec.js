import { auctionManager } from '../../../../src/auctionManager';
import { getFpdIntersection, getSegmentsIntersection, getSignalsArray } from '../../../../src/pps'

describe('pps', () => {
  let getAuctionStub;

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

  beforeEach(function () {
    getAuctionStub = sinon.stub(auctionManager.index, 'getAuction').callsFake(({ auctionId }) => {
      return mocksAuctions.find(auction => auction.auctionId === auctionId)
    });
  });

  afterEach(function () {
    getAuctionStub.restore();
  });

  it('should properly find intersection', () => {
    const signals = getSignalsArray(['1111', '234234', '234324234']);
    const expectedResult = { IAB_AUDIENCE_1_1:["2"], IAB_CONTENT_2_2:[]};
    expect(signals).to.be.equal(JSON.stringify(expectedResult));
  })
})
