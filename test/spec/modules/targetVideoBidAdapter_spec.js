import { spec } from '../../../modules/targetVideoBidAdapter.js'
import { SYNC_URL } from '../../../libraries/targetVideoUtils/constants.js';
import { deepClone } from '../../../src/utils.js';

describe('TargetVideo Bid Adapter', function() {
  const bidder = 'targetVideo';
  const params = {
    placementId: 12345,
  };

  const defaultBidderRequest = {
    bidderRequestId: 'mock-uuid',
  };

  const bannerRequest = [{
    bidder,
    params,
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
  }];

  const videoRequest = [{
    bidder,
    params,
    mediaTypes: {
      video: {
        playerSize: [[640, 360]],
        context: 'instream',
        playbackmethod: [1, 2, 3, 4]
      }
    }
  }];

  it('Test the bid validation function', function() {
    const validBid = spec.isBidRequestValid(bannerRequest[0]) && spec.isBidRequestValid(videoRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });

  it('Test the BANNER request processing function', function() {
    const request = spec.buildRequests(bannerRequest, defaultBidderRequest);
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

  it('Test the VIDEO request processing function', function() {
    const request = spec.buildRequests(videoRequest, defaultBidderRequest);
    expect(request).to.not.be.empty;

    const payload = JSON.parse(request[0].data);
    expect(payload).to.not.be.empty;
    expect(payload.sdk).to.deep.equal({
      source: 'pbjs',
      version: '$prebid.version$'
    });
    expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal(12345);
  })

  it('Test the VIDEO request schain sending', function() {
    const globalSchain = {
      ver: '1.0',
      complete: 1,
      nodes: [{
        asi: 'examplewebsite.com',
        sid: '00001',
        hp: 1
      }]
    };

    const videoRequestCloned = deepClone(videoRequest);
    videoRequestCloned[0].ortb2 = {
      source: {
        ext: {
          schain: globalSchain
        }
      }
    };

    const request = spec.buildRequests(videoRequestCloned, defaultBidderRequest);
    expect(request).to.not.be.empty;

    const payload = JSON.parse(request[0].data);
    expect(payload).to.not.be.empty;
    expect(payload.source.ext.schain).to.exist;
    expect(payload.source.ext.schain).to.deep.equal(globalSchain);
  });

  it('Test the VIDEO request gpid and tid', function () {
    const gpid = '/123/test-gpid';
    const tid = '123-test-tid';

    const videoRequestCloned = deepClone(videoRequest);
    videoRequestCloned[0].ortb2Imp = { ext: { gpid, tid } };
    videoRequestCloned[0].ortb2 = { source: { tid } };

    const request = spec.buildRequests(videoRequestCloned, defaultBidderRequest);
    const payload = JSON.parse(request[0].data);

    expect(payload.imp[0].ext.gpid).to.exist.and.equal(gpid);
    expect(payload.imp[0].ext.tid).to.exist.and.equal(tid);
    expect(payload.source.tid).to.exist.and.equal(tid);
  });

  it('Test the VIDEO request eids and user data sending', function() {
    const userData = [
      {
        ext: { segtax: 600, segclass: '1' },
        name: 'example.com',
        segment: [{ id: '243' }],
      },
      {
        ext: { segtax: 600, segclass: '1' },
        name: 'ads.example.org',
        segment: [{ id: '243' }],
      },
    ];
    const userIdAsEids = [
      {
        source: 'test1.org',
        uids: [{id: '123'}]
      }
    ];
    const bidderRequestWithUserData = {
      ...defaultBidderRequest,
      ortb2: {
        user: {
          data: userData
        }
      }
    };
    const expected = {
      ext: {
        eids: userIdAsEids,
        data: bidderRequestWithUserData.ortb2.user.data,
      }
    };

    const videoRequestCloned = deepClone(videoRequest);
    videoRequestCloned[0].userIdAsEids = userIdAsEids;

    const request = spec.buildRequests(videoRequestCloned, bidderRequestWithUserData);
    expect(request).to.not.be.empty;

    const payload = JSON.parse(request[0].data);
    expect(payload).to.not.be.empty;
    expect(payload.user).to.exist;
    expect(payload.user).to.deep.equal(expected);
  });

  it('Handle BANNER nobid responses', function() {
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

    const bidResponse = spec.interpretResponse({ body: responseBody }, { bidderRequest });
    expect(bidResponse.length).to.equal(0);
  });

  it('Handle VIDEO nobid responses', function() {
    const responseBody = {
      'id': 'test-id',
      'cur': 'USD',
      'seatbid': [],
      'nbr': 0
    };
    const bidderRequest = null;

    const bidResponse = spec.interpretResponse({ body: responseBody }, { bidderRequest });
    expect(bidResponse.length).to.equal(0);
  })

  it('Test the BANNER response parsing function', function() {
    const responseBody = {
      'tags': [{
        'uuid': '84ab500420319d',
        'ads': [{
          'ad_type': 'video',
          'cpm': 0.675000,
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

    const bidResponse = spec.interpretResponse({ body: responseBody }, { bidderRequest });
    expect(bidResponse).to.not.be.empty;

    const bid = bidResponse[0];
    expect(bid).to.not.be.empty;
    expect(bid.cpm).to.equal(0.5);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.ad).to.include('<script src="https://player.target-video.com/custom/targetvideo-banner.js"></script>')
    expect(bid.ad).to.include('initPlayer')
  });

  it('Test the VIDEO response parsing function', function() {
    const responseBody = {
      'id': 'test-id',
      'cur': 'USD',
      'seatbid': [{
        'bid': [{
          'id': '5044997188309660254',
          'price': 10,
          'adm': 'test ad',
          'adid': '97517771',
          'crid': '97517771',
          'adomain': ['domain.com'],
          'w': 640,
          'h': 480
        }],
        'seat': 'bidder'
      }]
    };
    const bidderRequest = {
      bidderCode: 'brid',
      bidderRequestId: '22edbae2733bf6',
      bids: videoRequest
    };

    const bidResponse = spec.interpretResponse({ body: responseBody }, { bidderRequest });
    expect(bidResponse).to.not.be.empty;

    const bid = bidResponse[0];
    expect(bid).to.not.be.empty;
    expect(bid.ad).to.equal('test ad');
    expect(bid.cpm).to.equal(10);
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.currency).to.equal('USD');
  });

  it('Test BANNER GDPR consent information is present in the request', function() {
    const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
    const bidderRequest = {
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

  it('Test BANNER US Privacy string is present in the request', function() {
    const consentString = '1YA-';
    const bidderRequest = {
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

  it('Test VIDEO GDPR and USP consents  are present in the request', function() {
    const gdprConsentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
    const uspConsentString = '1YA-';
    const bidderRequest = {
      'bidderCode': 'targetVideo',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'uspConsent': uspConsentString,
      'gdprConsent': {
        consentString: gdprConsentString,
        gdprApplies: true,
        addtlConsent: '1~7.12.35.62.66.70.89.93.108'
      }
    };
    bidderRequest.bids = videoRequest;

    const request = spec.buildRequests(videoRequest, bidderRequest);
    const payload = JSON.parse(request[0].data);

    expect(payload.user.ext.consent).to.equal(gdprConsentString);
    expect(payload.regs.ext.us_privacy).to.equal(uspConsentString);
    expect(payload.regs.ext.gdpr).to.equal(1);
  });

  it('Test userSync have only one object and it should have a property type=iframe', function () {
    const userSync = spec.getUserSyncs({ iframeEnabled: true });
    expect(userSync).to.be.an('array');
    expect(userSync.length).to.be.equal(1);
    expect(userSync[0]).to.have.property('type');
    expect(userSync[0].type).to.be.equal('iframe');
  });

  it('Test userSync valid sync url for iframe', function () {
    const [userSync] = spec.getUserSyncs({ iframeEnabled: true }, {}, {consentString: 'anyString'});
    expect(userSync.url).to.contain(SYNC_URL + 'load-cookie.html?endpoint=targetvideo&gdpr=0&gdpr_consent=anyString');
    expect(userSync.type).to.be.equal('iframe');
  });

  it('Test userSyncs iframeEnabled=false', function () {
    const userSyncs = spec.getUserSyncs({iframeEnabled: false});
    expect(userSyncs).to.have.lengthOf(0);
  });
});
