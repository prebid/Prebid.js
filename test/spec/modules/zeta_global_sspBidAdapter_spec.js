import {spec} from '../../../modules/zeta_global_sspBidAdapter.js'
import {BANNER, VIDEO} from '../../../src/mediaTypes';
import {deepClone} from '../../../src/utils';

describe('Zeta Ssp Bid Adapter', function () {
  const eids = [
    {
      'source': 'example.com',
      'uids': [
        {
          'id': 'someId1',
          'atype': 1
        },
        {
          'id': 'someId2',
          'atype': 1
        },
        {
          'id': 'someId3',
          'atype': 2
        }
      ],
      'ext': {
        'foo': 'bar'
      }
    }
  ];

  const schain = {
    complete: 1,
    nodes: [
      {
        asi: 'asi1',
        sid: 'sid1',
        rid: 'rid1'
      },
      {
        asi: 'asi2',
        sid: 'sid2',
        rid: 'rid2'
      }
    ]
  };

  const params = {
    user: {
      uid: 222,
      buyeruid: 333
    },
    tags: {
      someTag: 444,
      emptyTag: {},
      nullTag: null,
      complexEmptyTag: {
        empty: {},
        nullValue: null
      }
    },
    sid: 'publisherId',
    tagid: 'test_tag_id',
    site: {
      page: 'http://www.zetaglobal.com/page?param=value'
    },
    app: {
      bundle: 'testBundle'
    },
    bidfloor: 0.2,
    test: 1
  };

  const multiImpRequest = [
    {
      bidId: 12345,
      auctionId: 67890,
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        }
      },
      refererInfo: {
        page: 'http://www.zetaglobal.com/page?param=value',
        domain: 'www.zetaglobal.com',
      },
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'consentString'
      },
      uspConsent: 'someCCPAString',
      params: params,
      userIdAsEids: eids
    }, {
      bidId: 54321,
      auctionId: 67890,
      mediaTypes: {
        banner: {
          sizes: [[600, 400]],
        }
      },
      refererInfo: {
        page: 'http://www.zetaglobal.com/page?param=value',
        domain: 'www.zetaglobal.com',
      },
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'consentString'
      },
      uspConsent: 'someCCPAString',
      params: params,
      userIdAsEids: eids
    }
  ];

  const bannerRequest = [{
    bidId: 12345,
    auctionId: 67890,
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    refererInfo: {
      page: 'http://www.zetaglobal.com/page?param=value',
      domain: 'www.zetaglobal.com',
    },
    gdprConsent: {
      gdprApplies: 1,
      consentString: 'consentString'
    },
    schain: schain,
    uspConsent: 'someCCPAString',
    params: params,
    userIdAsEids: eids,
    timeout: 500,
    ortb2: {
      device: {
        sua: {
          mobile: 1,
          architecture: 'arm',
          platform: {
            brand: 'Chrome',
            version: ['102']
          }
        }
      },
      user: {
        data: [
          {
            ext: {
              segtax: 600,
              segclass: 'classifier_v1'
            },
            segment: [
              { id: '3' },
              { id: '44' },
              { id: '59' }
            ]
          }
        ],
        geo: {
          lat: 40.0,
          lon: -80.0,
          type: 2,
          country: 'USA',
          region: 'NY',
          metro: '501',
          city: 'New York',
          zip: '10001',
        }
      }
    }
  }];

  const bannerWithFewSizesRequest = [{
    bidId: 12345,
    auctionId: 67890,
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [200, 240], [100, 150]],
      }
    },
    refererInfo: {
      page: 'http://www.zetaglobal.com/page?param=value',
      domain: 'www.zetaglobal.com',
    },
    gdprConsent: {
      gdprApplies: 1,
      consentString: 'consentString'
    },
    schain: schain,
    uspConsent: 'someCCPAString',
    params: params,
    userIdAsEids: eids,
    timeout: 500
  }];

  const videoRequest = [{
    bidId: 112233,
    auctionId: 667788,
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[720, 340]],
        mimes: ['video/mp4'],
        minduration: 5,
        maxduration: 30,
        placement: 2,
        plcmt: 1,
        protocols: [2, 3]
      }
    },
    refererInfo: {
      referer: 'http://www.zetaglobal.com/page?param=video'
    },
    params: params
  }];

  const zetaResponse = {
    body: {
      id: '12345',
      seatbid: [
        {
          seat: '1',
          bid: [
            {
              id: 'auctionId',
              impid: 'impId',
              price: 0.0,
              adm: 'adMarkup',
              crid: 'creativeId',
              adomain: [
                'https://example.com'
              ],
              h: 250,
              w: 300
            }
          ]
        }
      ],
      cur: 'USD'
    }
  }

  const responseBannerPayload = {
    data: {
      id: '123',
      site: {
        id: 'SITE_ID',
        page: 'http://www.zetaglobal.com/page?param=value',
        domain: 'domain.com'
      },
      user: {
        id: '45asdf9tydhrty789adfad4678rew656789',
        buyeruid: '1234567890'
      },
      cur: [
        'USD'
      ],
      imp: [
        {
          id: '1',
          banner: {
            h: 600,
            w: 160
          }
        }
      ],
      at: 1
    }
  };

  const responseVideoPayload = {
    data: {
      id: '123',
      site: {
        id: 'SITE_ID',
        page: 'http://www.zetaglobal.com/page?param=value',
        domain: 'domain.com'
      },
      user: {
        id: '45asdf9tydhrty789adfad4678rew656789',
        buyeruid: '1234567890'
      },
      cur: [
        'USD'
      ],
      imp: [
        {
          id: '1',
          video: {
            h: 600,
            w: 160
          }
        }
      ],
      at: 1
    }
  };

  it('Test the bid validation function', function () {
    const invalidBid = deepClone(bannerRequest[0]);
    invalidBid.params = {};
    const isValidBid = spec.isBidRequestValid(bannerRequest[0]);
    const isInvalidBid = spec.isBidRequestValid(null);

    expect(isValidBid).to.be.true;
    expect(isInvalidBid).to.be.false;
  });

  it('Test provide eids', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.user.ext.eids).to.eql(eids);
  });

  it('Test contains ua and language', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.device.ua).to.not.be.empty;
    expect(payload.device.language).to.not.be.empty;
  });

  it('Test page and domain in site', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.site.page).to.eql('zetaglobal.com/page');
    expect(payload.site.domain).to.eql('zetaglobal.com');
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    expect(request).to.not.be.empty;

    const payload = request.data;
    expect(payload).to.not.be.empty;
  });

  it('Test the response parsing function', function () {
    const response = {
      body: {
        id: '12345',
        seatbid: [
          {
            bid: [
              {
                id: 'auctionId',
                impid: 'impId',
                price: 0.0,
                adm: 'adMarkup',
                crid: 'creativeId',
                adomain: [
                  'https://example.com'
                ],
                h: 250,
                w: 300,
                ext: {
                  prebid: {
                    type: 'banner'
                  }
                }
              },
              {
                id: 'auctionId2',
                impid: 'impId2',
                price: 0.1,
                adm: 'adMarkup2',
                crid: 'creativeId2',
                adomain: [
                  'https://example2.com'
                ],
                h: 150,
                w: 200,
                ext: {
                  prebid: {
                    type: 'video'
                  }
                }
              },
              {
                id: 'auctionId3',
                impid: 'impId3',
                price: 0.2,
                adm: '<?xml version=\\"1.0\\"?><VAST version=\\"4.0\\">',
                crid: 'creativeId3',
                adomain: [
                  'https://example3.com'
                ],
                h: 400,
                w: 300,
                ext: {
                  prebid: {
                    type: 'video'
                  }
                }
              }
            ]
          }
        ],
        cur: 'USD'
      }
    };

    const bidResponse = spec.interpretResponse(response, responseBannerPayload);
    expect(bidResponse).to.not.be.empty;

    const bid1 = bidResponse[0];
    const receivedBid1 = response.body.seatbid[0].bid[0];
    expect(bid1).to.not.be.empty;
    expect(bid1.ad).to.equal(receivedBid1.adm);
    expect(bid1.vastXml).to.be.undefined;
    expect(bid1.mediaType).to.equal(BANNER);
    expect(bid1.cpm).to.equal(receivedBid1.price);
    expect(bid1.height).to.equal(receivedBid1.h);
    expect(bid1.width).to.equal(receivedBid1.w);
    expect(bid1.requestId).to.equal(receivedBid1.impid);
    expect(bid1.meta.advertiserDomains).to.equal(receivedBid1.adomain);

    const bid2 = bidResponse[1];
    const receivedBid2 = response.body.seatbid[0].bid[1];
    expect(bid2).to.not.be.empty;
    expect(bid2.ad).to.equal(receivedBid2.adm);
    expect(bid2.vastXml).to.equal(receivedBid2.adm);
    expect(bid2.mediaType).to.equal(VIDEO);
    expect(bid2.cpm).to.equal(receivedBid2.price);
    expect(bid2.height).to.equal(receivedBid2.h);
    expect(bid2.width).to.equal(receivedBid2.w);
    expect(bid2.requestId).to.equal(receivedBid2.impid);
    expect(bid2.meta.advertiserDomains).to.equal(receivedBid2.adomain);

    const bid3 = bidResponse[2];
    const receivedBid3 = response.body.seatbid[0].bid[2];
    expect(bid3).to.not.be.empty;
    expect(bid3.ad).to.equal(receivedBid3.adm);
    expect(bid3.vastXml).to.equal(receivedBid3.adm);
    expect(bid3.mediaType).to.equal(VIDEO);
    expect(bid3.cpm).to.equal(receivedBid3.price);
    expect(bid3.height).to.equal(receivedBid3.h);
    expect(bid3.width).to.equal(receivedBid3.w);
    expect(bid3.requestId).to.equal(receivedBid3.impid);
    expect(bid3.meta.advertiserDomains).to.equal(receivedBid3.adomain);
  });

  it('Different cases for user syncs', function () {
    const USER_SYNC_URL_IFRAME = 'https://ssp.disqus.com/sync?type=iframe';
    const USER_SYNC_URL_IMAGE = 'https://ssp.disqus.com/sync?type=image';

    const sync1 = spec.getUserSyncs({iframeEnabled: true})[0];
    expect(sync1.type).to.equal('iframe');
    expect(sync1.url).to.include(USER_SYNC_URL_IFRAME);

    const sync2 = spec.getUserSyncs({iframeEnabled: false})[0];
    expect(sync2.type).to.equal('image');
    expect(sync2.url).to.include(USER_SYNC_URL_IMAGE);

    const sync3 = spec.getUserSyncs({iframeEnabled: true}, {}, {gdprApplies: true})[0];
    expect(sync3.type).to.equal('iframe');
    expect(sync3.url).to.include(USER_SYNC_URL_IFRAME);
    expect(sync3.url).to.include('&gdpr=');

    const sync4 = spec.getUserSyncs({iframeEnabled: true}, {}, {gdprApplies: true}, 'test')[0];
    expect(sync4.type).to.equal('iframe');
    expect(sync4.url).to.include(USER_SYNC_URL_IFRAME);
    expect(sync4.url).to.include('&gdpr=');
    expect(sync4.url).to.include('&us_privacy=');
  });

  it('Test provide gdpr and ccpa values in payload', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.user.ext.consent).to.eql('consentString');
    expect(payload.regs.ext.gdpr).to.eql(1);
    expect(payload.regs.ext.us_privacy).to.eql('someCCPAString');
  });

  it('Test do not override user object', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.user.uid).to.eql(222);
    expect(payload.user.buyeruid).to.eql(333);
    expect(payload.user.ext.consent).to.eql('consentString');
  });

  it('Test video object', function () {
    const request = spec.buildRequests(videoRequest, videoRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.imp[0].video.minduration).to.eql(videoRequest[0].mediaTypes.video.minduration);
    expect(payload.imp[0].video.maxduration).to.eql(videoRequest[0].mediaTypes.video.maxduration);
    expect(payload.imp[0].video.protocols).to.eql(videoRequest[0].mediaTypes.video.protocols);
    expect(payload.imp[0].video.mimes).to.eql(videoRequest[0].mediaTypes.video.mimes);
    expect(payload.imp[0].video.w).to.eql(720);
    expect(payload.imp[0].video.h).to.eql(340);
    expect(payload.imp[0].video.placement).to.eql(videoRequest[0].mediaTypes.video.placement);
    expect(payload.imp[0].video.plcmt).to.eql(videoRequest[0].mediaTypes.video.plcmt);

    expect(payload.imp[0].banner).to.be.undefined;
  });

  it('Test required params in banner request', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(request.url).to.eql('https://ssp.disqus.com/bid/prebid?sid=publisherId');
    expect(payload.ext.sid).to.eql('publisherId');
    expect(payload.ext.tags.someTag).to.eql(444);
    expect(payload.ext.tags.shortname).to.be.undefined;
  });

  it('Test required params in video request', function () {
    const request = spec.buildRequests(videoRequest, videoRequest[0]);
    const payload = JSON.parse(request.data);
    expect(request.url).to.eql('https://ssp.disqus.com/bid/prebid?sid=publisherId');
    expect(payload.ext.sid).to.eql('publisherId');
    expect(payload.ext.tags.someTag).to.eql(444);
    expect(payload.ext.tags.shortname).to.be.undefined;
  });

  it('Test multi imp', function () {
    const request = spec.buildRequests(multiImpRequest, multiImpRequest[0]);
    const payload = JSON.parse(request.data);
    expect(request.url).to.eql('https://ssp.disqus.com/bid/prebid?sid=publisherId');

    expect(payload.imp.length).to.eql(2);

    expect(payload.imp[0].id).to.eql(12345);
    expect(payload.imp[1].id).to.eql(54321);

    expect(payload.imp[0].banner.w).to.eql(300);
    expect(payload.imp[0].banner.h).to.eql(250);

    expect(payload.imp[1].banner.w).to.eql(600);
    expect(payload.imp[1].banner.h).to.eql(400);
  });

  it('Test provide tmax', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.tmax).to.eql(500);
  });

  it('Test provide tmax without value', function () {
    const request = spec.buildRequests(videoRequest, videoRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.tmax).to.be.undefined;
  });

  it('Test provide bidfloor', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.imp[0].bidfloor).to.eql(params.bidfloor);
  });

  it('Test schain provided', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.source.ext.schain).to.eql(schain);
  });

  it('Test tagid provided', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.imp[0].tagid).to.eql(params.tagid);
  });

  it('Test if only one size', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    // banner
    expect(payload.imp[0].banner.w).to.eql(300);
    expect(payload.imp[0].banner.h).to.eql(250);

    expect(payload.imp[0].banner.format).to.be.undefined;
  });

  it('Test few sizes provided in format', function () {
    const request = spec.buildRequests(bannerWithFewSizesRequest, bannerWithFewSizesRequest[0]);
    const payload = JSON.parse(request.data);

    // banner
    expect(payload.imp[0].banner.w).to.eql(300);
    expect(payload.imp[0].banner.h).to.eql(250);

    expect(payload.imp[0].banner.format.length).to.eql(3);

    // format[0]
    expect(payload.imp[0].banner.format[0].w).to.eql(300);
    expect(payload.imp[0].banner.format[0].h).to.eql(250);

    // format[1]
    expect(payload.imp[0].banner.format[1].w).to.eql(200);
    expect(payload.imp[0].banner.format[1].h).to.eql(240);

    // format[2]
    expect(payload.imp[0].banner.format[2].w).to.eql(100);
    expect(payload.imp[0].banner.format[2].h).to.eql(150);
  });

  it('Test the response default mediaType:banner', function () {
    const bidResponse = spec.interpretResponse(zetaResponse, responseBannerPayload);
    expect(bidResponse).to.not.be.empty;
    expect(bidResponse.length).to.eql(1);
    expect(bidResponse[0].mediaType).to.eql(BANNER);
    expect(bidResponse[0].ad).to.eql(zetaResponse.body.seatbid[0].bid[0].adm);
    expect(bidResponse[0].vastXml).to.be.undefined;
    expect(bidResponse[0].dspId).to.eql(zetaResponse.body.seatbid[0].seat);
  });

  it('Test the response default mediaType:video', function () {
    const bidResponse = spec.interpretResponse(zetaResponse, responseVideoPayload);
    expect(bidResponse).to.not.be.empty;
    expect(bidResponse.length).to.eql(1);
    expect(bidResponse[0].mediaType).to.eql(VIDEO);
    expect(bidResponse[0].ad).to.eql(zetaResponse.body.seatbid[0].bid[0].adm);
    expect(bidResponse[0].vastXml).to.eql(zetaResponse.body.seatbid[0].bid[0].adm);
    expect(bidResponse[0].dspId).to.eql(zetaResponse.body.seatbid[0].seat);
  });

  it('Test the response mediaType:video from ext param', function () {
    zetaResponse.body.seatbid[0].bid[0].ext = {
      prebid: {
        type: 'video'
      }
    }
    const bidResponse = spec.interpretResponse(zetaResponse, responseBannerPayload);
    expect(bidResponse).to.not.be.empty;
    expect(bidResponse.length).to.eql(1);
    expect(bidResponse[0].mediaType).to.eql(VIDEO);
    expect(bidResponse[0].ad).to.eql(zetaResponse.body.seatbid[0].bid[0].adm);
    expect(bidResponse[0].vastXml).to.eql(zetaResponse.body.seatbid[0].bid[0].adm);
    expect(bidResponse[0].dspId).to.eql(zetaResponse.body.seatbid[0].seat);
  });

  it('Test the response mediaType:banner from ext param', function () {
    zetaResponse.body.seatbid[0].bid[0].ext = {
      prebid: {
        type: 'banner'
      }
    }
    const bidResponse = spec.interpretResponse(zetaResponse, responseVideoPayload);
    expect(bidResponse).to.not.be.empty;
    expect(bidResponse.length).to.eql(1);
    expect(bidResponse[0].mediaType).to.eql(BANNER);
    expect(bidResponse[0].ad).to.eql(zetaResponse.body.seatbid[0].bid[0].adm);
    expect(bidResponse[0].vastXml).to.be.undefined;
    expect(bidResponse[0].dspId).to.eql(zetaResponse.body.seatbid[0].seat);
  });

  it('Test provide segments into the request', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.user.data[0].segment.length).to.eql(3);
    expect(payload.user.data[0].segment[0].id).to.eql('3');
    expect(payload.user.data[0].segment[1].id).to.eql('44');
    expect(payload.user.data[0].segment[2].id).to.eql('59');
  });

  it('Test provide device params', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.device.sua.mobile).to.eql(1);
    expect(payload.device.sua.architecture).to.eql('arm');
    expect(payload.device.sua.platform.brand).to.eql('Chrome');
    expect(payload.device.sua.platform.version[0]).to.eql('102');

    // expecting the same values for user.geo and device.geo
    expect(payload.device.geo.type).to.eql(2);
    expect(payload.device.geo.lat).to.eql(40.0);
    expect(payload.device.geo.lon).to.eql(-80.0);
    expect(payload.device.geo.country).to.eql('USA');
    expect(payload.device.geo.region).to.eql('NY');
    expect(payload.device.geo.metro).to.eql('501');
    expect(payload.device.geo.city).to.eql('New York');
    expect(payload.device.geo.zip).to.eql('10001');

    expect(payload.device.ua).to.not.be.undefined;
    expect(payload.device.language).to.not.be.undefined;
    expect(payload.device.w).to.not.be.undefined;
    expect(payload.device.h).to.not.be.undefined;
  });

  it('Test provide user params', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    // expecting the same values for user.geo and device.geo
    expect(payload.user.geo.type).to.eql(2);
    expect(payload.user.geo.lat).to.eql(40.0);
    expect(payload.user.geo.lon).to.eql(-80.0);
    expect(payload.user.geo.country).to.eql('USA');
    expect(payload.user.geo.region).to.eql('NY');
    expect(payload.user.geo.metro).to.eql('501');
    expect(payload.user.geo.city).to.eql('New York');
    expect(payload.user.geo.zip).to.eql('10001');
  });

  it('Test that all empties are removed', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);

    expect(payload.ext.tags.someTag).to.eql(444);

    expect(payload.ext.tags.emptyTag).to.be.undefined;
    expect(payload.ext.tags.nullTag).to.be.undefined;
    expect(payload.ext.tags.complexEmptyTag).to.be.undefined;
  });
});
