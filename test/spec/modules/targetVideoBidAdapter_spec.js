import { spec } from '../../../modules/targetVideoBidAdapter.js'

describe('TargetVideo Bid Adapter', function() {
  const bannerRequest = [{
    bidder: 'targetVideo',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    params: {
      placementId: 12345,
    }
  }];

  it('Test the bid validation function', function() {
    const validBid = spec.isBidRequestValid(bannerRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    expect(request).to.not.be.empty;

    const payload = JSON.parse(request.data);
    expect(payload).to.not.be.empty;
    expect(payload.sdk).to.deep.equal({
      source: 'pbjs',
      version: '$prebid.version$'
    });
    expect(payload.tags[0].id).to.equal(12345);
    expect(payload.tags[0].gpid).to.equal('targetVideo');
    expect(payload.tags[0].ad_types[0]).to.equal('video');
  });

  it('Handle nobid responses', function () {
    const responseBody = {
      'version': '0.0.1',
      'tags': [{
        'uuid': '84ab500420319d',
        'tag_id': 5976557,
        'auction_id': '297492697822162468',
        'nobid': true
      }]
    };
    const bidderRequest = null;

    const bidResponse = spec.interpretResponse({ body: responseBody }, {bidderRequest});
    expect(bidResponse.length).to.equal(0);
  });

  it('Test the response parsing function', function () {
    const responseBody = {
      'tags': [{
        'uuid': '84ab500420319d',
        'ads': [{
          'ad_type': 'video',
          'cpm': 0.500000,
          'notify_url': 'https://www.target-video.com/',
          'rtb': {
            'video': {
              'player_width': 640,
              'player_height': 360,
              'asset_url': 'https://www.target-video.com/'
            }
          }
        }]
      }]
    };
    const bidderRequest = {
      bids: [{
        bidId: '84ab500420319d',
        adUnitCode: 'code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }]
    };

    const bidResponse = spec.interpretResponse({ body: responseBody }, {bidderRequest});
    expect(bidResponse).to.not.be.empty;

    const bid = bidResponse[0];
    expect(bid).to.not.be.empty;
    expect(bid.cpm).to.equal(0.675);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.ad).to.include('<script src="https://player.target-video.com/custom/targetvideo-banner.js"></script>')
    expect(bid.ad).to.include('initPlayer')
  });

  it('Test GDPR consent information is present in the request', function () {
    let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
    let bidderRequest = {
      'bidderCode': 'targetVideo',
      'auctionId': '1d1a030790a475',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'gdprConsent': {
        consentString: consentString,
        gdprApplies: true,
        addtlConsent: '1~7.12.35.62.66.70.89.93.108'
      }
    };
    bidderRequest.bids = bannerRequest;

    const request = spec.buildRequests(bannerRequest, bidderRequest);
    expect(request.options).to.deep.equal({withCredentials: true});
    const payload = JSON.parse(request.data);

    expect(payload.gdpr_consent).to.exist;
    expect(payload.gdpr_consent.consent_string).to.exist.and.to.equal(consentString);
    expect(payload.gdpr_consent.consent_required).to.exist.and.to.be.true;
    expect(payload.gdpr_consent.addtl_consent).to.exist.and.to.deep.equal([7, 12, 35, 62, 66, 70, 89, 93, 108]);
  });

  it('Test US Privacy string is present in the request', function() {
    let consentString = '1YA-';
    let bidderRequest = {
      'bidderCode': 'targetVideo',
      'auctionId': '1d1a030790a475',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'uspConsent': consentString
    };
    bidderRequest.bids = bannerRequest;

    const request = spec.buildRequests(bannerRequest, bidderRequest);
    const payload = JSON.parse(request.data);

    expect(payload.us_privacy).to.exist;
    expect(payload.us_privacy).to.exist.and.to.equal(consentString);
  });
});
