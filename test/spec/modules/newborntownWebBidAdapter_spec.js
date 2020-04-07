import { expect } from 'chai';
import {spec} from 'modules/newborntownWebBidAdapter.js';
describe('NewborntownWebAdapter', function() {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'newborntownWeb',
      'params': {
        'publisher_id': '1238122',
        'slot_id': '123123',
        'bidfloor': 0.3
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'sizes': [[300, 250]],
      'bidId': '2e9cf65f23dbd9',
      'bidderRequestId': '1f01d9d22ee657',
      'auctionId': '2bf455a4-a889-41d5-b48f-9b56b89fbec7',
    }
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  })
  describe('buildRequests', function () {
    let bidderRequest = {
      'bidderCode': 'newborntownWeb',
      'bidderRequestId': '1f5c279a4c5de3',
      'bids': [
        {
          'bidder': 'newborntownWeb',
          'params': {
            'publisher_id': '1238122',
            'slot_id': '123123',
            'bidfloor': 0.3
          },
          'mediaTypes': {
            'banner': {'sizes': [[300, 250]]}
          },
          'adUnitCode': '/19968336/header-bid-tag-1',
          'transactionId': '9b954797-d6f4-4730-9cbe-5a1bc8480f52',
          'sizes': [[300, 250]],
          'bidId': '215f48d07eb8b8',
          'bidderRequestId': '1f5c279a4c5de3',
          'auctionId': '5ed4f607-e11c-45b0-aba9-f67768e1f9f4',
          'src': 'client',
          'bidRequestsCount': 1
        }
      ],
      'auctionStart': 1573123289380,
      'timeout': 9000,
      'start': 1573123289383
    }
    it('Returns POST method', function () {
      const request = spec.buildRequests(bidderRequest['bids'], bidderRequest);
      expect(request[0].method).to.equal('POST');
      expect(request[0].url.indexOf('//us-west.solortb.com/adx/api/rtb?from=4') !== -1).to.equal(true);
      expect(request[0].data).to.exist;
    });
    it('request params multi size format object check', function () {
      let bidderRequest = {
        'bidderCode': 'newborntownWeb',
        'bidderRequestId': '1f5c279a4c5de3',
        'bids': [
          {
            'bidder': 'newborntownWeb',
            'params': {
              'publisher_id': '1238122',
              'slot_id': '123123',
              'bidfloor': 0.3
            },
            'mediaTypes': {
              'native': {'sizes': [[300, 250]]}
            },
            'adUnitCode': '/19968336/header-bid-tag-1',
            'transactionId': '9b954797-d6f4-4730-9cbe-5a1bc8480f52',
            'sizes': [300, 250],
            'bidId': '215f48d07eb8b8',
            'bidderRequestId': '1f5c279a4c5de3',
            'auctionId': '5ed4f607-e11c-45b0-aba9-f67768e1f9f4',
            'src': 'client',
            'bidRequestsCount': 1
          }
        ],
        'auctionStart': 1573123289380,
        'timeout': 9000,
        'start': 1573123289383
      }
      let requstTest = spec.buildRequests(bidderRequest['bids'], bidderRequest)
      expect(requstTest[0].data.imp[0].banner.w).to.equal(300);
      expect(requstTest[0].data.imp[0].banner.h).to.equal(250);
    });
  })
  describe('interpretResponse', function () {
    let serverResponse;
    let bidRequest = {
      data: {
        bidId: '2d359291dcf53b'
      }
    };
    beforeEach(function () {
      serverResponse = {
        'body': {
          'id': '174548259807190369860081',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1573540665390298996',
                  'impid': '1',
                  'price': 0.3001,
                  'adid': '1573540665390299172',
                  'nurl': 'https://us-west.solortb.com/winnotice?price=${AUCTION_PRICE}&ssp=4&req_unique_id=740016d1-175b-4c19-9744-58a59632dabe&unique_id=06b08e40-2489-439a-8f9e-6413f3dd0bc8&isbidder=1&up=bQyvVo7tgbBVW2dDXzTdBP95Mv35YqqEika0T_btI1h6xjqA8GSXQe51_2CCHQcfuwAEOgdwN8u3VgUHmCuqNPKiBmIPaYUOQBBKjJr05zeKtabKnGT7_JJKcurrXqQ5Sl804xJear_qf2-jOaKB4w',
                  'adm': "<div id='grumi-container'></div>",
                  'adomain': [
                    'newborntown.com'
                  ],
                  'iurl': 'https://sdkvideo.s3.amazonaws.com/4aa1d9533c4ce71bb1cf750ed38e3a58.png',
                  'cid': '345',
                  'crid': '41_11113',
                  'cat': [
                    ''
                  ],
                  'h': 250,
                  'w': 300
                }
              ],
              'seat': '1'
            }
          ],
          'bidid': 'bid1573540665390298585'
        },
        'headers': {

        }
      }
    });
    it('result is correct', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);
      if (result && result[0]) {
        expect(result[0].requestId).to.equal('2d359291dcf53b');
        expect(result[0].cpm).to.equal(0.3001);
        expect(result[0].width).to.equal(300);
        expect(result[0].height).to.equal(250);
        expect(result[0].creativeId).to.equal('345');
      }
    });
  })
})
