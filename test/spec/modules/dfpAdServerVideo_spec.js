import {expect} from 'chai';

import parse from 'url-parse';
import {buildDfpVideoUrl, dep} from 'modules/dfpAdServerVideo.js';
import AD_UNIT from 'test/fixtures/video/adUnit.json';
import * as utils from 'src/utils.js';
import {deepClone} from 'src/utils.js';
import {config} from 'src/config.js';
import {targeting} from 'src/targeting.js';
import {auctionManager} from 'src/auctionManager.js';
import {gdprDataHandler} from 'src/adapterManager.js';

import * as adServer from 'src/adserver.js';
import {hook} from '../../../src/hook.js';
import {stubAuctionIndex} from '../../helpers/indexStub.js';
import {AuctionIndex} from '../../../src/auctionIndex.js';

describe('The DFP video support module', function () {
  before(() => {
    hook.ready();
  });

  let sandbox, bid, adUnit;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    bid = {
      videoCacheKey: 'abc',
      adserverTargeting: {
        hb_uuid: 'abc',
        hb_cache_id: 'abc',
      },
    };
    adUnit = deepClone(AD_UNIT);
  });

  afterEach(() => {
    sandbox.restore();
  });

  function getURL(options) {
    return parse(buildDfpVideoUrl(Object.assign({
      adUnit: adUnit,
      bid: bid,
      params: {
        'iu': 'my/adUnit'
      }
    }, options)))
  }
  function getQueryParams(options) {
    return utils.parseQS(getURL(options).query);
  }

  function getCustomParams(options) {
    return utils.parseQS('?' + decodeURIComponent(getQueryParams(options).cust_params));
  }

  Object.entries({
    params: {
      params: {
        'iu': 'my/adUnit'
      }
    },
    url: {
      url: 'https://some-example-url.com'
    }
  }).forEach(([t, options]) => {
    describe(`when using ${t}`, () => {
      it('should use page location as default for description_url', () => {
        sandbox.stub(dep, 'ri').callsFake(() => ({page: 'example.com'}));
        const prm = getQueryParams(options);
        expect(prm.description_url).to.eql('example.com');
      });

      it('should use a URI encoded page location as default for description_url', () => {
        sandbox.stub(dep, 'ri').callsFake(() => ({page: 'https://example.com?iu=/99999999/news&cust_params=current_hour%3D12%26newscat%3Dtravel&pbjs_debug=true'}));
        const prm = getQueryParams(options);
        expect(prm.description_url).to.eql('https%3A%2F%2Fexample.com%3Fiu%3D%2F99999999%2Fnews%26cust_params%3Dcurrent_hour%253D12%2526newscat%253Dtravel%26pbjs_debug%3Dtrue');
      });
    });
  })

  it('should make a legal request URL when given the required params', function () {
    const url = getURL({
      params: {
        'iu': 'my/adUnit',
        'description_url': 'someUrl.com',
      }
    })
    expect(url.protocol).to.equal('https:');
    expect(url.host).to.equal('securepubads.g.doubleclick.net');

    const queryParams = utils.parseQS(url.query);
    expect(queryParams).to.have.property('correlator');
    expect(queryParams).to.have.property('description_url', 'someUrl.com');
    expect(queryParams).to.have.property('env', 'vp');
    expect(queryParams).to.have.property('gdfp_req', '1');
    expect(queryParams).to.have.property('iu', 'my/adUnit');
    expect(queryParams).to.have.property('output', 'vast');
    expect(queryParams).to.have.property('sz', '640x480');
    expect(queryParams).to.have.property('unviewed_position_start', '1');
    expect(queryParams).to.have.property('url');
  });

  it('can take an adserver url as a parameter', function () {
    bid.vastUrl = 'vastUrl.example';
    const url = getURL({
      url: 'https://video.adserver.example/',
    })
    expect(url.host).to.equal('video.adserver.example');
  });

  it('requires a params object or url', function () {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
    });

    expect(url).to.be.undefined;
  });

  it('overwrites url params when both url and params object are given', function () {
    const params = getQueryParams({
      url: 'https://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s',
      params: { iu: 'my/adUnit' }
    });

    expect(params.iu).to.equal('my/adUnit');
  });

  it('should override param defaults with user-provided ones', function () {
    const params = getQueryParams({
      params: {
        'output': 'vast',
      }
    });
    expect(params.output).to.equal('vast');
  });

  it('should include the cache key and adserver targeting in cust_params', function () {
    bid.adserverTargeting = Object.assign(bid.adserverTargeting, {
      hb_adid: 'ad_id',
    });

    const customParams = getCustomParams()

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
    expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
  });

  it('should include the GDPR keys when GDPR Consent is available', function () {
    sandbox.stub(gdprDataHandler, 'getConsentData').returns({
      gdprApplies: true,
      consentString: 'consent',
      addtlConsent: 'moreConsent'
    });
    const queryObject = getQueryParams();
    expect(queryObject.gdpr).to.equal('1');
    expect(queryObject.gdpr_consent).to.equal('consent');
    expect(queryObject.addtl_consent).to.equal('moreConsent');
  });

  it('should not include the GDPR keys when GDPR Consent is not available', function () {
    const queryObject = getQueryParams()
    expect(queryObject.gdpr).to.equal(undefined);
    expect(queryObject.gdpr_consent).to.equal(undefined);
    expect(queryObject.addtl_consent).to.equal(undefined);
  });

  it('should only include the GDPR keys for GDPR Consent fields with values', function () {
    sandbox.stub(gdprDataHandler, 'getConsentData').returns({
      gdprApplies: true,
      consentString: 'consent',
    });
    const queryObject = getQueryParams()
    expect(queryObject.gdpr).to.equal('1');
    expect(queryObject.gdpr_consent).to.equal('consent');
    expect(queryObject.addtl_consent).to.equal(undefined);
  });
  describe('GAM PPID', () => {
    let ppid;
    let getPPIDStub;
    beforeEach(() => {
      getPPIDStub = sinon.stub(adServer, 'getPPID').callsFake(() => ppid);
    });
    afterEach(() => {
      getPPIDStub.restore();
    });

    Object.entries({
      'params': {params: {'iu': 'mock/unit'}},
      'url': {url: 'https://video.adserver.mock/', params: {'iu': 'mock/unit'}}
    }).forEach(([t, opts]) => {
      describe(`when using ${t}`, () => {
        it('should be included if available', () => {
          ppid = 'mockPPID';
          const q = getQueryParams(opts);
          expect(q.ppid).to.equal('mockPPID');
        });

        it('should not be included if not available', () => {
          ppid = undefined;
          const q = getQueryParams(opts);
          expect(q.hasOwnProperty('ppid')).to.be.false;
        })
      })
    })
  })

  describe('ORTB video parameters', () => {
    Object.entries({
      plcmt: [
        {
          video: {
            plcmt: 1
          },
          expected: '1'
        }
      ],
      min_ad_duration: [
        {
          video: {
            minduration: 123
          },
          expected: '123000'
        }
      ],
      max_ad_duration: [
        {
          video: {
            maxduration: 321
          },
          expected: '321000'
        }
      ],
      vpos: [
        {
          video: {
            startdelay: 0
          },
          expected: 'preroll'
        },
        {
          video: {
            startdelay: -1
          },
          expected: 'midroll'
        },
        {
          video: {
            startdelay: -2
          },
          expected: 'postroll'
        },
        {
          video: {
            startdelay: 10
          },
          expected: 'midroll'
        }
      ],
      vconp: [
        {
          video: {
            playbackmethod: [7]
          },
          expected: '2'
        },
        {
          video: {
            playbackmethod: [7, 1]
          },
          expected: undefined
        }
      ],
      vpa: [
        {
          video: {
            playbackmethod: [1, 2, 4, 5, 6, 7]
          },
          expected: 'auto'
        },
        {
          video: {
            playbackmethod: [3, 7],
          },
          expected: 'click'
        },
        {
          video: {
            playbackmethod: [1, 3],
          },
          expected: undefined
        }
      ],
      vpmute: [
        {
          video: {
            playbackmethod: [1, 3, 4, 5, 7]
          },
          expected: '0'
        },
        {
          video: {
            playbackmethod: [2, 6, 7],
          },
          expected: '1'
        },
        {
          video: {
            playbackmethod: [1, 2]
          },
          expected: undefined
        }
      ]
    }).forEach(([param, cases]) => {
      describe(param, () => {
        cases.forEach(({video, expected}) => {
          describe(`when mediaTypes.video has ${JSON.stringify(video)}`, () => {
            it(`fills in ${param} = ${expected}`, () => {
              Object.assign(adUnit.mediaTypes.video, video);
              expect(getQueryParams()[param]).to.eql(expected);
            });
            it(`does not override pub-provided params.${param}`, () => {
              Object.assign(adUnit.mediaTypes.video, video);
              expect(getQueryParams({
                params: {
                  [param]: 'OG'
                }
              })[param]).to.eql('OG');
            });
            it('does not fill if param has no value', () => {
              expect(getQueryParams().hasOwnProperty(param)).to.be.false;
            })
          })
        })
      })
    })
  });

  describe('ppsj', () => {
    let ortb2;
    beforeEach(() => {
      ortb2 = null;
    })

    function getSignals() {
      const ppsj = JSON.parse(atob(getQueryParams().ppsj));
      return Object.fromEntries(ppsj.PublisherProvidedTaxonomySignals.map(sig => [sig.taxonomy, sig.values]));
    }

    Object.entries({
      'FPD from bid request'() {
        bid.requestId = 'req-id';
        sandbox.stub(auctionManager, 'index').get(() => stubAuctionIndex({
          bidRequests: [
            {
              bidId: 'req-id',
              ortb2
            }
          ]
        }));
      },
      'global FPD from auction'() {
        bid.auctionId = 'auid';
        sandbox.stub(auctionManager, 'index').get(() => new AuctionIndex(() => [{
          getAuctionId: () => 'auid',
          getFPD: () => ({
            global: ortb2
          })
        }]));
      }
    }).forEach(([t, setup]) => {
      describe(`using ${t}`, () => {
        beforeEach(setup);
        it('does not fill if there\'s no segments in segtax 4 or 6', () => {
          ortb2 = {
            site: {
              content: {
                data: [
                  {
                    segment: [
                      {id: '1'},
                      {id: '2'}
                    ]
                  },
                ]
              }
            },
            user: {
              data: [
                {
                  ext: {
                    segtax: 1,
                  },
                  segment: [
                    {id: '3'}
                  ]
                }
              ]
            }
          }
          expect(getQueryParams().ppsj).to.not.exist;
        });

        const SEGMENTS = [
          {
            ext: {
              segtax: 4,
            },
            segment: [
              {id: '4-1'},
              {id: '4-2'}
            ]
          },
          {
            ext: {
              segtax: 4,
            },
            segment: [
              {id: '4-2'},
              {id: '4-3'}
            ]
          },
          {
            ext: {
              segtax: 6,
            },
            segment: [
              {id: '6-1'},
              {id: '6-2'}
            ]
          },
          {
            ext: {
              segtax: 6,
            },
            segment: [
              {id: '6-2'},
              {id: '6-3'}
            ]
          },
        ]

        it('collects user.data segments with segtax = 4 into IAB_AUDIENCE_1_1', () => {
          ortb2 = {
            user: {
              data: SEGMENTS
            }
          }
          expect(getSignals()).to.eql({
            IAB_AUDIENCE_1_1: ['4-1', '4-2', '4-3']
          })
        })

        it('collects site.content.data segments with segtax = 6 into IAB_CONTENT_2_2', () => {
          ortb2 = {
            site: {
              content: {
                data: SEGMENTS
              }
            }
          }
          expect(getSignals()).to.eql({
            IAB_CONTENT_2_2: ['6-1', '6-2', '6-3']
          })
        })
      })
    })
  })

  describe('special targeting unit test', function () {
    const allTargetingData = {
      'hb_format': 'video',
      'hb_source': 'client',
      'hb_size': '640x480',
      'hb_pb': '5.00',
      'hb_adid': '2c4f6cc3ba128a',
      'hb_bidder': 'testBidder2',
      'hb_format_testBidder2': 'video',
      'hb_source_testBidder2': 'client',
      'hb_size_testBidder2': '640x480',
      'hb_pb_testBidder2': '5.00',
      'hb_adid_testBidder2': '2c4f6cc3ba128a',
      'hb_bidder_testBidder2': 'testBidder2',
      'hb_format_appnexus': 'video',
      'hb_source_appnexus': 'client',
      'hb_size_appnexus': '640x480',
      'hb_pb_appnexus': '5.00',
      'hb_adid_appnexus': '44e0b5f2e5cace',
      'hb_bidder_appnexus': 'appnexus'
    };
    let targetingStub;

    before(function () {
      targetingStub = sinon.stub(targeting, 'getAllTargeting');
      targetingStub.returns({'video1': allTargetingData});

      config.setConfig({
        enableSendAllBids: true
      });
    });

    after(function () {
      config.resetConfig();
      targetingStub.restore();
    });

    it('should include all adserver targeting in cust_params if pbjs.enableSendAllBids is true', function () {
      const adUnitsCopy = utils.deepClone(adUnit);
      adUnitsCopy.bids.push({
        'bidder': 'testBidder2',
        'params': {
          'placementId': '9333431',
          'video': {
            'skipppable': false,
            'playback_methods': ['auto_play_sound_off']
          }
        }
      });

      const bidCopy = utils.deepClone(bid);
      bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
        hb_adid: 'ad_id',
      });

      const url = parse(buildDfpVideoUrl({
        adUnit: adUnitsCopy,
        bid: bidCopy,
        params: {
          'iu': 'my/adUnit'
        }
      }));
      const queryObject = utils.parseQS(url.query);
      const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

      expect(customParams).to.have.property('hb_adid', 'ad_id');
      expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
      expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
      expect(customParams).to.have.property('hb_bidder_appnexus', 'appnexus');
      expect(customParams).to.have.property('hb_bidder_testBidder2', 'testBidder2');
    });
  });

  it('should merge the user-provided cust_params with the default ones', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_adid: 'ad_id',
    });

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit',
        cust_params: {
          'my_targeting': 'foo',
        },
      },
    }));
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('my_targeting', 'foo');
  });

  it('should merge the user-provided cust-params with the default ones when using url object', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_adid: 'ad_id',
    });

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      url: 'https://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s&cust_params=section%3dblog%26mykey%3dmyvalue'
    }));

    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('section', 'blog');
    expect(customParams).to.have.property('mykey', 'myvalue');
    expect(customParams).to.have.property('hb_uuid', 'abc');
    expect(customParams).to.have.property('hb_cache_id', 'abc');
  });

  it('should not overwrite an existing description_url for object input and cache disabled', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        iu: 'my/adUnit',
        description_url: 'descriptionurl.example'
      }
    }));

    const queryObject = utils.parseQS(url.query);
    expect(queryObject.description_url).to.equal('descriptionurl.example');
  });

  it('should work with nobid responses', function () {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      params: { 'iu': 'my/adUnit' }
    });

    expect(url).to.be.a('string');
  });

  it('should include hb_uuid and hb_cache_id in cust_params when both keys are exluded from overwritten bidderSettings', function () {
    const bidCopy = utils.deepClone(bid);
    delete bidCopy.adserverTargeting.hb_uuid;
    delete bidCopy.adserverTargeting.hb_cache_id;

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
    expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
  });

  it('should include hb_uuid and hb_cache_id in cust params from overwritten standard bidderSettings', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_uuid: 'def',
      hb_cache_id: 'def'
    });

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_uuid', 'def');
    expect(customParams).to.have.property('hb_cache_id', 'def');
  });

  it('should keep the url protocol, host, and pathname when using url and params', function () {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      url: 'http://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s',
      params: {
        cust_params: {
          hb_rand: 'random'
        }
      }
    }));

    expect(url.protocol).to.equal('http:');
    expect(url.host).to.equal('video.adserver.example');
    expect(url.pathname).to.equal('/ads');
  });

  it('should append to the url size param', () => {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      url: 'http://video.adserver.example/ads?sz=360x240&iu=/123/aduniturl&impl=s',
      params: {
        cust_params: {
          hb_rand: 'random'
        }
      }
    }));

    const queryObject = utils.parseQS(url.query);
    expect(queryObject.sz).to.equal('360x240|640x480');
  });

  it('should append to the existing url cust params', () => {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      url: 'http://video.adserver.example/ads?sz=360x240&iu=/123/aduniturl&impl=s&cust_params=existing_key%3Dexisting_value%26other_key%3Dother_value',
      params: {
        cust_params: {
          hb_rand: 'random'
        }
      }
    }));

    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('existing_key', 'existing_value');
    expect(customParams).to.have.property('other_key', 'other_value');
    expect(customParams).to.have.property('hb_rand', 'random');
  });
});
