import {expect} from 'chai';
import {spec} from 'modules/viqeoBidAdapter';

describe('viqeoBidAdapter', function () {
  it('minimal params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'viqeo',
      params: {
        tagId: '2',
        playerOptions: {
          videoId: 'ed584da454c7205ca7e4',
          profileId: 1382,
        },
      }})).to.equal(true);
  });
  it('minimal params no playerOptions', function () {
    expect(spec.isBidRequestValid({
      bidder: 'viqeo',
      params: {
        currency: 'EUR',
      }})).to.equal(false);
  });
  it('build request check data', function () {
    const bidRequestData = [{
      bidId: 'id1',
      bidder: 'viqeo',
      params: {
        tagId: '2',
        currency: 'EUR',
        floor: 0.5,
        playerOptions: {
          videoId: 'ed584da454c7205ca7e4',
          profileId: 1382,
        },
      },
      mediaTypes: {
        video: { playerSize: [[240, 400]] }
      },
    }];
    const request = spec.buildRequests(bidRequestData);
    const requestData = request[0].data;
    expect(requestData.id).to.equal('id1')
    expect(requestData.imp[0].bidfloorcur).to.equal('EUR');
    expect(requestData.imp[0].bidfloor).to.equal(0.5);
    expect(requestData.imp[0].video.w).to.equal(240);
    expect(requestData.imp[0].video.h).to.equal(400);
    expect(requestData.imp[0].tagid).to.equal('2');
  });
  it('build request check url', function () {
    const bidRequestData = [{
      bidder: 'viqeo',
      params: {
        playerOptions: {
          videoId: 'ed584da454c7205ca7e4',
          profileId: 1382,
        },
      },
      mediaTypes: {
        video: { playerSize: [[240, 400]] }
      },
    }];
    const request = spec.buildRequests(bidRequestData);
    expect(request[0].url).to.equal('https://ad.vqserve.com/ads/prebid')
  });
  it('response_params common case', function () {
    const bidRequestData = {
      bids: [{
        bidId: 'id1',
        params: {},
        mediaTypes: {
          video: { playerSize: [[240, 400]] }
        },
      }],
    };
    const serverResponse = {
      body: {
        id: 'id1',
        cur: 'EUR',
        seatbid: [{
          bid: [{
            cpm: 0.5,
            ttl: 3600,
            netRevenue: true,
            creativeId: 'test1',
            adm: '',
          }],
        }],
      }
    };
    const bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
  });
  it('should set flooPrice to getFloor.floor value if it is greater than params.floor', function() {
    const bidRequestData = [{
      bidId: 'id1',
      bidder: 'viqeo',
      params: {
        currency: 'EUR',
        floor: 0.5,
        playerOptions: {
          videoId: 'ed584da454c7205ca7e4',
          profileId: 1382,
        },
      },
      mediaTypes: {
        video: { playerSize: [[240, 400]] }
      },
      getFloor: () => {
        return {
          currency: 'EUR',
          floor: 3.32
        }
      },
    }];
    const request = spec.buildRequests(bidRequestData);
    const requestData = request[0].data;
    expect(requestData.imp[0].bidfloor).to.equal(3.32)
  });
});
