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
