import { expect } from 'chai';
import { spec } from 'modules/lunamediaBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

describe('lunamediaBidAdapter', function () {
  let bidRequests;
  let bidRequestsVid;

  beforeEach(function () {
    bidRequests = [{'bidder': 'lunamedia', 'params': {'pubid': '0cf8d6d643e13d86a5b6374148a4afac', 'floor': 0.5, 'placement': 1234, size: '320x250'}, 'crumbs': {'pubcid': '979fde13-c71e-4ac2-98b7-28c90f99b449'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': 'f72931e6-2b0e-4e37-a2bc-1ea912141f81', 'sizes': [[300, 250]], 'bidId': '2aa73f571eaf29', 'bidderRequestId': '1bac84515a7af3', 'auctionId': '5dbc60fa-1aa1-41ce-9092-e6bbd4d478f7', 'src': 'client', 'bidRequestsCount': 1, 'pageurl': 'http://google.com'}];

    bidRequestsVid = [{'bidder': 'lunamedia', 'params': {'pubid': '8537f00948fc37cc03c5f0f88e198a76', 'floor': 1.0, 'placement': 1234, size: '320x480', 'video': {'id': 123, 'skip': 1, 'mimes': ['video/mp4', 'application/javascript'], 'playbackmethod': [2, 6], 'maxduration': 30}}, 'crumbs': {'pubcid': '979fde13-c71e-4ac2-98b7-28c90f99b449'}, 'mediaTypes': {'video': {'playerSize': [[320, 480]], 'context': 'instream'}}, 'adUnitCode': 'video1', 'transactionId': '8b060952-93f7-4863-af44-bb8796b97c42', 'sizes': [], 'bidId': '25c6ab92aa0e81', 'bidderRequestId': '1d420b73a013fc', 'auctionId': '9a69741c-34fb-474c-83e1-cfa003aaee17', 'src': 'client', 'bidRequestsCount': 1, 'pageurl': 'http://google.com'}];
  });

  describe('spec.isBidRequestValid', function () {
    it('should return true when the required params are passed for banner', function () {
      const bidRequest = bidRequests[0];
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when the required params are passed for video', function () {
      const bidRequests = bidRequestsVid[0];
      expect(spec.isBidRequestValid(bidRequests)).to.equal(true);
    });

    it('should return false when no pub id params are passed', function () {
      const bidRequest = bidRequests[0];
      bidRequest.params.pubid = '';
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no placement params are passed', function () {
      const bidRequest = bidRequests[0];
      bidRequest.params.placement = '';
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when a bid request is not passed', function () {
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('spec.buildRequests', function () {
    it('should create a POST request for each bid', function () {
      const bidRequest = bidRequests[0];
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].method).to.equal('POST');
    });

    it('should create a POST request for each bid in video request', function () {
      const bidRequest = bidRequestsVid[0];
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].method).to.equal('POST');
    });

    it('should have domain in request', function () {
      const bidRequest = bidRequests[0];
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].data.site.domain).length !== 0;
    });
  });

  describe('spec.interpretResponse', function () {
    describe('for banner bids', function () {
      it('should return no bids if the response is not valid', function () {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { banner: {} };
        const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });

        if (typeof bidResponse !== 'undefined') {
          expect(bidResponse.length).to.equal(0);
        } else {
          expect(true).to.equal(true);
        }
      });

      it('should return no bids if the response is empty', function () {
        const bidRequest = bidRequests[0];
        bidRequest.mediaTypes = { banner: {} };
        const bidResponse = spec.interpretResponse({ body: [] }, { bidRequest });
        if (typeof bidResponse !== 'undefined') {
          expect(bidResponse.length).to.equal(0);
        } else { expect(true).to.equal(true); }
      });

      it('should return valid video bid responses', function () {
        let _mediaTypes = VIDEO;
        const lunamediabidreqVid = {'bidRequest': {'mediaTypes': {'video': {'w': 320, 'h': 480}}}};
        const serverResponseVid = {'cur': 'USD', 'id': '25c6ab92aa0e81', 'seatbid': [{'seat': '3', 'bid': [{'crid': '1855', 'h': 480, 'protocol': 2, 'nurl': 'http://api.lunamedia.io/xp/evt?pp=1MO1wiaMhhq7wLRzZZwwwPkJxxKpYEnM5k5MH4qSGm1HR8rp3Nl7vDocvzZzSAvE4pnREL9mQ1kf5PDjk6E8em6DOk7vVrYUH1TYQyqCucd58PFpJNN7h30RXKHHFg3XaLuQ3PKfMuI1qZATBJ6WHcu875y0hqRdiewn0J4JsCYF53M27uwmcV0HnQxARQZZ72mPqrW95U6wgkZljziwKrICM3aBV07TU6YK5R5AyzJRuD6mtrQ2xtHlQ3jXVYKE5bvWFiUQd90t0jOGhPtYBNoOfP7uQ4ZZj4pyucxbr96orHe9PSOn9UpCSWArdx7s8lOfDpwOvbMuyGxynbStDWm38sDgd4bMHnIt762m5VMDNJfiUyX0vWzp05OsufJDVEaWhAM62i40lQZo7mWP4ipoOWLkmlaAzFIMsTcNaHAHiKKqGEOZLkCEhFNM0SLcvgN2HFRULOOIZvusq7TydOKxuXgCS91dLUDxDDDFUK83BFKlMkTxnCzkLbIR1bd9GKcr1TRryOrulyvRWAKAIhEsUzsc5QWFUhmI2dZ1eqnBQJ0c89TaPcnoaP2WipF68UgyiOstf2CBy0M34858tC5PmuQwQYwXscg6zyqDwR0i9MzGH4FkTyU5yeOlPcsA0ht6UcoCdFpHpumDrLUwAaxwGk1Nj8S6YlYYT5wNuTifDGbg22QKXzZBkUARiyVvgPn9nRtXnrd7WmiMYq596rya9RQj7LC0auQW8bHVQLEe49shsZDnAwZTWr4QuYKqgRGZcXteG7RVJe0ryBZezOq11ha9C0Lv0siNVBahOXE35Wzoq4c4BDaGpqvhaKN7pjeWLGlQR04ufWekwxiMWAvjmfgAfexBJ7HfbYNZpq__', 'adid': '61_1855', 'adomain': ['chevrolet.com.ar'], 'price': 2, 'w': 320, 'iurl': 'https://daf37cpxaja7f.cloudfront.net/c61/creative_url_14922301369663_1.png', 'cat': ['IAB2'], 'id': '7f570b40-aca1-4806-8ea8-818ea679c82b_0', 'attr': [], 'impid': '0', 'cid': '61'}]}], 'bidid': '7f570b40-aca1-4806-8ea8-818ea679c82b'}
        const bidResponseVid = spec.interpretResponse({ body: serverResponseVid }, lunamediabidreqVid);
        delete bidResponseVid['vastUrl'];
        delete bidResponseVid['ad'];
        expect(bidResponseVid).to.deep.equal({
          requestId: bidRequestsVid[0].bidId,
          bidderCode: 'lunamedia',
          creativeId: serverResponseVid.seatbid[0].bid[0].crid,
          cpm: serverResponseVid.seatbid[0].bid[0].price,
          width: serverResponseVid.seatbid[0].bid[0].w,
          height: serverResponseVid.seatbid[0].bid[0].h,
          mediaType: 'video',
          currency: 'USD',
          netRevenue: true,
          ttl: 60
        });
      });

      it('should return valid banner bid responses', function () {
        const lunamediabidreq = {bids: {}};
        bidRequests.forEach(bid => {
          let _mediaTypes = (bid.mediaTypes && bid.mediaTypes.video ? VIDEO : BANNER);
          lunamediabidreq.bids[bid.bidId] = {mediaTypes: _mediaTypes,
            w: _mediaTypes == BANNER ? bid.mediaTypes[_mediaTypes].sizes[0][0] : bid.mediaTypes[_mediaTypes].playerSize[0],
            h: _mediaTypes == BANNER ? bid.mediaTypes[_mediaTypes].sizes[0][1] : bid.mediaTypes[_mediaTypes].playerSize[1]

          };
        });
        const serverResponse = {'id': '2aa73f571eaf29', 'seatbid': [{'bid': [{'id': '2c5e8a1a84522d', 'impid': '2c5e8a1a84522d', 'price': 0.81, 'adid': 'abcde-12345', 'nurl': '', 'adm': '<div><img src=\'http://cdnin.bnmla.com/0b1c6e85e9376e3092df8c9fc8ab9095.gif\' width=350 height=250 /></div>', 'adomain': ['advertiserdomain.com'], 'iurl': '', 'cid': 'campaign1', 'crid': 'abcde-12345', 'w': 300, 'h': 250}], 'seat': '19513bcfca8006'}], 'bidid': '19513bcfca8006', 'cur': 'USD', 'w': 300, 'h': 250};

        const bidResponse = spec.interpretResponse({ body: serverResponse }, lunamediabidreq);
        expect(bidResponse).to.deep.equal({
          requestId: bidRequests[0].bidId,
          ad: serverResponse.seatbid[0].bid[0].adm,
          bidderCode: 'lunamedia',
          creativeId: serverResponse.seatbid[0].bid[0].crid,
          cpm: serverResponse.seatbid[0].bid[0].price,
          width: serverResponse.seatbid[0].bid[0].w,
          height: serverResponse.seatbid[0].bid[0].h,
          mediaType: 'banner',
          currency: 'USD',
          netRevenue: true,
          ttl: 60
        });
      });
    });
  });
});
