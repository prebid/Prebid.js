import { expect } from 'chai';
import {
  fireNativeTrackers,
  getNativeTargeting,
  nativeBidIsValid,
  getAssetMessage,
  getAllAssetsMessage,
  toLegacyResponse,
  decorateAdUnitsWithNativeParams,
  isOpenRTBBidRequestValid,
  isNativeOpenRTBBidValid,
  toOrtbNativeRequest,
  toOrtbNativeResponse,
  legacyPropertiesToOrtbNative,
  fireImpressionTrackers,
  fireClickTrackers,
  setNativeResponseProperties,
} from 'src/native.js';
import { NATIVE_KEYS } from 'src/constants.js';
import { stubAuctionIndex } from '../helpers/indexStub.js';
import { convertOrtbRequestToProprietaryNative, fromOrtbNativeRequest } from '../../src/native.js';
import {auctionManager} from '../../src/auctionManager.js';
const utils = require('src/utils');

const bid = {
  adId: '123',
  adUnitId: 'au',
  native: {
    title: 'Native Creative',
    body: 'Cool description great stuff',
    cta: 'Do it',
    image: {
      url: 'http://cdn.example.com/p/creative-image/image.png',
      height: 83,
      width: 127,
    },
    icon: {
      url: 'http://cdn.example.com/p/creative-image/icon.jpg',
      height: 742,
      width: 989,
    },
    sponsoredBy: 'AppNexus',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
    javascriptTrackers: '<script src="http://www.foobar.js"></script>',
    privacyLink: 'https://privacy-link.example',
    ext: {
      foo: 'foo-value',
      baz: 'baz-value',
    },
  },
};

const ortbBid = {
  adId: '123',
  adUnitId: 'au',
  native: {
    ortb: {
      assets: [
        {
          id: 0,
          title: {
            text: 'Native Creative'
          }
        },
        {
          id: 1,
          data: {
            value: 'Cool description great stuff'
          }
        },
        {
          id: 2,
          data: {
            value: 'Do it'
          }
        },
        {
          id: 3,
          img: {
            url: 'http://cdn.example.com/p/creative-image/image.png',
            h: 83,
            w: 127
          }
        },
        {
          id: 4,
          img: {
            url: 'http://cdn.example.com/p/creative-image/icon.jpg',
            h: 742,
            w: 989
          }
        },
        {
          id: 5,
          data: {
            value: 'AppNexus',
            type: 1
          }
        }
      ],
      link: {
        url: 'https://www.link.example'
      },
      privacy: 'https://privacy-link.example',
      ver: '1.2'
    }
  }
};

const completeNativeBid = {
  adId: '123',
  adUnitId: 'au',
  native: {
    ...bid.native,
    ...ortbBid.native
  }
}

const ortbRequest = {
  assets: [
    {
      id: 0,
      required: 0,
      title: {
        len: 140
      }
    }, {
      id: 1,
      required: 0,
      data: {
        type: 2
      }
    }, {
      id: 2,
      required: 0,
      data: {
        type: 12
      }
    }, {
      id: 3,
      required: 0,
      img: {
        type: 3
      }
    }, {
      id: 4,
      required: 0,
      img: {
        type: 1
      }
    }, {
      id: 5,
      required: 0,
      data: {
        type: 1
      }
    }
  ],
  ver: '1.2'
}

const bidWithUndefinedFields = {
  adUnitId: 'au',
  native: {
    title: 'Native Creative',
    body: undefined,
    cta: undefined,
    sponsoredBy: 'AppNexus',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
    javascriptTrackers: '<script src="http://www.foobar.js"></script>',
    ext: {
      foo: 'foo-value',
      baz: undefined,
    },
  },
};

describe('native.js', function () {
  let triggerPixelStub;
  let insertHtmlIntoIframeStub;

  function deps(adUnit) {
    return { index: stubAuctionIndex({ adUnits: [adUnit] }) };
  }

  beforeEach(function () {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    insertHtmlIntoIframeStub = sinon.stub(utils, 'insertHtmlIntoIframe');
  });

  afterEach(function () {
    utils.triggerPixel.restore();
    utils.insertHtmlIntoIframe.restore();
  });

  it('gets native targeting keys', function () {
    const targeting = getNativeTargeting(bid);
    expect(targeting[NATIVE_KEYS.title]).to.equal(bid.native.title);
    expect(targeting[NATIVE_KEYS.body]).to.equal(bid.native.body);
    expect(targeting[NATIVE_KEYS.clickUrl]).to.equal(
      bid.native.clickUrl
    );
    expect(targeting.hb_native_foo).to.equal(bid.native.foo);
  });

  it('can get targeting from null native keys', () => {
    const targeting = getNativeTargeting({...bid, native: {...bid.native, displayUrl: null}});
    expect(targeting.hb_native_displayurl).to.not.be.ok;
  })

  it('sends placeholders for configured assets', function () {
    const adUnit = {
      adUnitId: 'au',
      nativeParams: {
        body: { sendId: true },
        clickUrl: { sendId: true },
        ext: {
          foo: {
            sendId: false,
          },
          baz: {
            sendId: true,
          },
        },
      },
    };
    const targeting = getNativeTargeting(bid, deps(adUnit));

    expect(targeting[NATIVE_KEYS.title]).to.equal(bid.native.title);
    expect(targeting[NATIVE_KEYS.body]).to.equal(
      'hb_native_body:123'
    );
    expect(targeting[NATIVE_KEYS.clickUrl]).to.equal(
      'hb_native_linkurl:123'
    );
    expect(targeting.hb_native_foo).to.equal(bid.native.ext.foo);
    expect(targeting.hb_native_baz).to.equal('hb_native_baz:123');
  });

  it('sends placeholdes targetings with ortb native response', function () {
    const targeting = getNativeTargeting(completeNativeBid);

    expect(targeting[NATIVE_KEYS.title]).to.equal('Native Creative');
    expect(targeting[NATIVE_KEYS.body]).to.equal('Cool description great stuff');
    expect(targeting[NATIVE_KEYS.clickUrl]).to.equal('https://www.link.example');
  });

  it('should only include native targeting keys with values', function () {
    const adUnit = {
      adUnitId: 'au',
      nativeParams: {
        body: { sendId: true },
        clickUrl: { sendId: true },
        ext: {
          foo: {
            required: false,
          },
          baz: {
            required: false,
          },
        },
      },
    };

    const targeting = getNativeTargeting(bidWithUndefinedFields, deps(adUnit));

    expect(Object.keys(targeting)).to.deep.equal([
      NATIVE_KEYS.title,
      NATIVE_KEYS.sponsoredBy,
      NATIVE_KEYS.clickUrl,
      'hb_native_foo',
    ]);
  });

  it('should only include targeting that has sendTargetingKeys set to true', function () {
    const adUnit = {
      adUnitId: 'au',
      nativeParams: {
        image: {
          required: true,
          sizes: [150, 50],
        },
        title: {
          required: true,
          len: 80,
          sendTargetingKeys: true,
        },
        sendTargetingKeys: false,
      },
    };
    const targeting = getNativeTargeting(bid, deps(adUnit));

    expect(Object.keys(targeting)).to.deep.equal([NATIVE_KEYS.title]);
  });

  it('should only include targeting if sendTargetingKeys not set to false', function () {
    const adUnit = {
      adUnitId: 'au',
      nativeParams: {
        image: {
          required: true,
          sizes: [150, 50],
        },
        title: {
          required: true,
          len: 80,
        },
        body: {
          required: true,
        },
        clickUrl: {
          required: true,
        },
        icon: {
          required: false,
          sendTargetingKeys: false,
        },
        cta: {
          required: false,
          sendTargetingKeys: false,
        },
        sponsoredBy: {
          required: false,
          sendTargetingKeys: false,
        },
        privacyLink: {
          required: false,
          sendTargetingKeys: false,
        },
        ext: {
          foo: {
            required: false,
            sendTargetingKeys: true,
          },
        },
      },
    };
    const targeting = getNativeTargeting(bid, deps(adUnit));

    expect(Object.keys(targeting)).to.deep.equal([
      NATIVE_KEYS.title,
      NATIVE_KEYS.body,
      NATIVE_KEYS.image,
      NATIVE_KEYS.clickUrl,
      'hb_native_foo',
    ]);
  });

  it('should include rendererUrl in targeting', function () {
    const rendererUrl = 'https://www.renderer.com/';
    const targeting = getNativeTargeting({...bid, native: {...bid.native, rendererUrl: {url: rendererUrl}}}, deps({}));
    expect(targeting[NATIVE_KEYS.rendererUrl]).to.eql(rendererUrl);
  });

  it('fires impression trackers', function () {
    fireNativeTrackers({}, bid);
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.impressionTrackers[0]);
    sinon.assert.calledWith(
      insertHtmlIntoIframeStub,
      bid.native.javascriptTrackers
    );
  });

  it('fires click trackers', function () {
    const trackerType = fireNativeTrackers({ action: 'click' }, bid);
    expect(trackerType).to.equal('click');
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.clickTrackers[0]);
  });

  describe('native postMessages', () => {
    let adUnit;
    beforeEach(() => {
      adUnit = {};
      sinon.stub(auctionManager, 'index').get(() => ({
        getAdUnit: () => adUnit
      }))
    });

    it('creates native asset message', function () {
      const messageRequest = {
        message: 'Prebid Native',
        action: 'assetRequest',
        adId: '123',
        assets: ['hb_native_body', 'hb_native_image', 'hb_native_linkurl'],
      };

      const message = getAssetMessage(messageRequest, bid);

      expect(message.assets.length).to.equal(3);
      expect(message.assets).to.deep.include({
        key: 'body',
        value: bid.native.body,
      });
      expect(message.assets).to.deep.include({
        key: 'image',
        value: bid.native.image.url,
      });
      expect(message.assets).to.deep.include({
        key: 'clickUrl',
        value: bid.native.clickUrl,
      });
    });

    it('creates native all asset message', function () {
      const messageRequest = {
        message: 'Prebid Native',
        action: 'allAssetRequest',
        adId: '123',
      };

      const message = getAllAssetsMessage(messageRequest, bid);

      expect(message.assets.length).to.equal(10);
      expect(message.assets).to.deep.include({
        key: 'body',
        value: bid.native.body,
      });
      expect(message.assets).to.deep.include({
        key: 'image',
        value: bid.native.image.url,
      });
      expect(message.assets).to.deep.include({
        key: 'clickUrl',
        value: bid.native.clickUrl,
      });
      expect(message.assets).to.deep.include({
        key: 'title',
        value: bid.native.title,
      });
      expect(message.assets).to.deep.include({
        key: 'icon',
        value: bid.native.icon.url,
      });
      expect(message.assets).to.deep.include({
        key: 'cta',
        value: bid.native.cta,
      });
      expect(message.assets).to.deep.include({
        key: 'sponsoredBy',
        value: bid.native.sponsoredBy,
      });
      expect(message.assets).to.deep.include({
        key: 'foo',
        value: bid.native.ext.foo,
      });
      expect(message.assets).to.deep.include({
        key: 'baz',
        value: bid.native.ext.baz,
      });
    });

    it('creates native all asset message with only defined fields', function () {
      const messageRequest = {
        message: 'Prebid Native',
        action: 'allAssetRequest',
        adId: '123',
      };

      const message = getAllAssetsMessage(messageRequest, bidWithUndefinedFields);

      expect(message.assets.length).to.equal(4);
      expect(message.assets).to.deep.include({
        key: 'clickUrl',
        value: bid.native.clickUrl,
      });
      expect(message.assets).to.deep.include({
        key: 'title',
        value: bid.native.title,
      });
      expect(message.assets).to.deep.include({
        key: 'sponsoredBy',
        value: bid.native.sponsoredBy,
      });
      expect(message.assets).to.deep.include({
        key: 'foo',
        value: bid.native.ext.foo,
      });
    });

    it('creates native all asset message with complete format', function () {
      const messageRequest = {
        message: 'Prebid Native',
        action: 'allAssetRequest',
        adId: '123',
      };

      const message = getAllAssetsMessage(messageRequest, completeNativeBid);

      expect(message.assets.length).to.equal(10);
      expect(message.assets).to.deep.include({
        key: 'body',
        value: bid.native.body,
      });
      expect(message.assets).to.deep.include({
        key: 'image',
        value: bid.native.image.url,
      });
      expect(message.assets).to.deep.include({
        key: 'clickUrl',
        value: bid.native.clickUrl,
      });
      expect(message.assets).to.deep.include({
        key: 'title',
        value: bid.native.title,
      });
      expect(message.assets).to.deep.include({
        key: 'icon',
        value: bid.native.icon.url,
      });
      expect(message.assets).to.deep.include({
        key: 'cta',
        value: bid.native.cta,
      });
      expect(message.assets).to.deep.include({
        key: 'sponsoredBy',
        value: bid.native.sponsoredBy,
      });
      expect(message.assets).to.deep.include({
        key: 'privacyLink',
        value: ortbBid.native.ortb.privacy,
      });
      expect(message.assets).to.deep.include({
        key: 'foo',
        value: bid.native.ext.foo,
      });
      expect(message.assets).to.deep.include({
        key: 'baz',
        value: bid.native.ext.baz,
      });
    });

    it('if necessary, adds ortb response when the request was in ortb', () => {
      const messageRequest = {
        message: 'Prebid Native',
        action: 'allAssetRequest',
        adId: '123',
      };
      adUnit = {mediaTypes: {native: {ortb: ortbRequest}}, nativeOrtbRequest: ortbRequest}
      const message = getAllAssetsMessage(messageRequest, bid);
      const expected = toOrtbNativeResponse(bid.native, ortbRequest)
      expect(message.ortb).to.eql(expected);
    })
  })

  const SAMPLE_ORTB_REQUEST = toOrtbNativeRequest({
    title: 'vtitle',
    body: 'vbody'
  });
  const SAMPLE_ORTB_RESPONSE = {
    link: {
      url: 'url'
    },
    assets: [
      {
        id: 0,
        title: {
          text: 'vtitle'
        }
      },
      {
        id: 1,
        data: {
          value: 'vbody'
        }
      }
    ],
    eventtrackers: [
      { event: 1, method: 1, url: 'https://sampleurl.com' },
      { event: 1, method: 2, url: 'https://sampleurljs.com' }
    ],
    imptrackers: [ 'https://sample-imp.com' ]
  }
  describe('toLegacyResponse', () => {
    it('returns assets in legacy format for ortb responses', () => {
      const actual = toLegacyResponse(SAMPLE_ORTB_RESPONSE, SAMPLE_ORTB_REQUEST);
      expect(actual.body).to.equal('vbody');
      expect(actual.title).to.equal('vtitle');
      expect(actual.clickUrl).to.equal('url');
      expect(actual.javascriptTrackers).to.equal('<script async src="https://sampleurljs.com"></script>');
      expect(actual.impressionTrackers.length).to.equal(2);
      expect(actual.impressionTrackers).to.contain('https://sampleurl.com');
      expect(actual.impressionTrackers).to.contain('https://sample-imp.com');
    });
  });

  describe('setNativeResponseProperties', () => {
    let adUnit;
    beforeEach(() => {
      adUnit = {
        mediaTypes: {
          native: {},
        },
        nativeParams: {}
      };
    });
    it('sets legacy response', () => {
      adUnit.nativeOrtbRequest = {
        assets: [{
          id: 1,
          data: {
            type: 2
          }
        }]
      };
      const ortbBid = {
        ...bid,
        native: {
          ortb: {
            link: {
              url: 'clickurl'
            },
            assets: [{
              id: 1,
              data: {
                value: 'body'
              }
            }]
          }
        }
      };
      setNativeResponseProperties(ortbBid, adUnit);
      expect(ortbBid.native.clickUrl).to.eql('clickurl');
      expect(ortbBid.native.body).to.eql('body');
    });

    it('sets rendererUrl', () => {
      adUnit.nativeParams.rendererUrl = {url: 'renderer'};
      setNativeResponseProperties(bid, adUnit);
      expect(bid.native.rendererUrl).to.eql('renderer');
    });
    it('sets adTemplate', () => {
      adUnit.nativeParams.adTemplate = 'template';
      setNativeResponseProperties(bid, adUnit);
      expect(bid.native.adTemplate).to.eql('template');
    });
  });
});

describe('validate native openRTB', function () {
  it('should validate openRTB request', function () {
    let openRTBNativeRequest = { assets: [] };
    // assets array can't be empty
    expect(isOpenRTBBidRequestValid(openRTBNativeRequest)).to.eq(false);
    openRTBNativeRequest.assets.push({
      id: 1.5,
      required: 1,
      title: {},
    });

    // asset.id must be integer
    expect(isOpenRTBBidRequestValid(openRTBNativeRequest)).to.eq(false);
    openRTBNativeRequest.assets[0].id = 1;
    // title must have 'len' property
    expect(isOpenRTBBidRequestValid(openRTBNativeRequest)).to.eq(false);
    openRTBNativeRequest.assets[0].title.len = 140;
    // openRTB request is valid
    expect(isOpenRTBBidRequestValid(openRTBNativeRequest)).to.eq(true);

    openRTBNativeRequest.assets.push({
      id: 2,
      required: 1,
      video: {
        mimes: [],
        protocols: [],
        minduration: 50,
      },
    });
    // video asset should have all required properties
    expect(isOpenRTBBidRequestValid(openRTBNativeRequest)).to.eq(false);
    openRTBNativeRequest.assets[1].video.maxduration = 60;
    expect(isOpenRTBBidRequestValid(openRTBNativeRequest)).to.eq(true);
  });

  it('should validate openRTB native bid', function () {
    const openRTBRequest = {
      assets: [
        {
          id: 1,
          required: 1,
        },
        {
          id: 2,
          required: 0,
        },
        {
          id: 3,
          required: 1,
        },
      ],
    };
    let openRTBBid = {
      assets: [
        {
          id: 1,
        },
        {
          id: 2,
        },
      ],
    };

    // link is missing
    expect(isNativeOpenRTBBidValid(openRTBBid, openRTBRequest)).to.eq(false);
    openRTBBid.link = { url: 'www.foo.bar' };
    // required id == 3 is missing
    expect(isNativeOpenRTBBidValid(openRTBBid, openRTBRequest)).to.eq(false);

    openRTBBid.assets[1].id = 3;
    expect(isNativeOpenRTBBidValid(openRTBBid, openRTBRequest)).to.eq(true);
  });
});

describe('validate native', function () {
  const adUnit = {
    adUnitId: 'test_adunit',
    mediaTypes: {
      native: {
        title: {
          required: true,
        },
        body: {
          required: true,
        },
        image: {
          required: true,
          sizes: [150, 50],
          aspect_ratios: [150, 50],
        },
        icon: {
          required: true,
          sizes: [50, 50],
        },
      },
    },
  };

  let validBid = {
    adId: 'abc123',
    requestId: 'test_bid_id',
    adUnitId: 'test_adunit',
    adUnitCode: '123/prebid_native_adunit',
    bidder: 'test_bidder',
    native: {
      body:
        'This is a Prebid Native Creative. There are many like it, but this one is mine.',
      clickTrackers: ['http://my.click.tracker/url'],
      icon: {
        url: 'http://my.image.file/ad_image.jpg',
        height: 75,
        width: 75,
      },
      image: {
        url: 'http://my.icon.file/ad_icon.jpg',
        height: 2250,
        width: 3000,
      },
      clickUrl: 'http://prebid.org/dev-docs/show-native-ads.html',
      impressionTrackers: ['http://my.imp.tracker/url'],
      javascriptTrackers: '<script src="http://www.foobar.js"></script>',
      title: 'This is an example Prebid Native creative',
    },
  };

  let noIconDimBid = {
    adId: 'abc234',
    requestId: 'test_bid_id',
    adUnitId: 'test_adunit',
    adUnitCode: '123/prebid_native_adunit',
    bidder: 'test_bidder',
    native: {
      body:
        'This is a Prebid Native Creative. There are many like it, but this one is mine.',
      clickTrackers: ['http://my.click.tracker/url'],
      icon: 'http://my.image.file/ad_image.jpg',
      image: {
        url: 'http://my.icon.file/ad_icon.jpg',
        height: 2250,
        width: 3000,
      },
      clickUrl: 'http://prebid.org/dev-docs/show-native-ads.html',
      impressionTrackers: ['http://my.imp.tracker/url'],
      javascriptTrackers: '<script src="http://www.foobar.js"></script>',
      title: 'This is an example Prebid Native creative',
    },
  };

  let noImgDimBid = {
    adId: 'abc345',
    requestId: 'test_bid_id',
    adUnitId: 'test_adunit',
    adUnitCode: '123/prebid_native_adunit',
    bidder: 'test_bidder',
    native: {
      body:
        'This is a Prebid Native Creative. There are many like it, but this one is mine.',
      clickTrackers: ['http://my.click.tracker/url'],
      icon: {
        url: 'http://my.image.file/ad_image.jpg',
        height: 75,
        width: 75,
      },
      image: 'http://my.icon.file/ad_icon.jpg',
      clickUrl: 'http://prebid.org/dev-docs/show-native-ads.html',
      impressionTrackers: ['http://my.imp.tracker/url'],
      javascriptTrackers: '<script src="http://www.foobar.js"></script>',
      title: 'This is an example Prebid Native creative',
    },
  };

  beforeEach(function () {});

  afterEach(function () {});

  it('should accept bid if no image sizes are defined', function () {
    decorateAdUnitsWithNativeParams([adUnit]);
    const index = stubAuctionIndex({ adUnits: [adUnit] });
    let result = nativeBidIsValid(validBid, { index });
    expect(result).to.be.true;
    result = nativeBidIsValid(noIconDimBid, { index });
    expect(result).to.be.true;
    result = nativeBidIsValid(noImgDimBid, { index });
    expect(result).to.be.true;
  });

  it('should convert from old-style native to OpenRTB request', () => {
    const adUnit = {
      adUnitId: 'test_adunit',
      mediaTypes: {
        native: {
          title: {
            required: true,
          },
          body: {
            required: true,
            len: 45
          },
          image: {
            required: true,
            sizes: [150, 50],
            aspect_ratios: [{
              min_width: 150,
              min_height: 50
            }]
          },
          icon: {
            required: true,
            aspect_ratios: [{
              min_width: 150,
              min_height: 50
            }]
          },
          address: {},
          privacyLink: {
            required: true
          }
        },
      },
    };

    const ortb = toOrtbNativeRequest(adUnit.mediaTypes.native);
    expect(ortb).to.be.a('object');
    expect(ortb.assets).to.be.a('array');

    // title
    expect(ortb.assets[0]).to.deep.include({
      id: 0,
      required: 1,
      title: {
        len: 140
      }
    });

    // body => data
    expect(ortb.assets[1]).to.deep.include({
      id: 1,
      required: 1,
      data: {
        type: 2,
        len: 45
      }
    });

    // image => image
    expect(ortb.assets[2]).to.deep.include({
      id: 2,
      required: 1,
      img: {
        type: 3, // Main Image
        w: 150,
        h: 50,
      }
    });

    expect(ortb.assets[3]).to.deep.include({
      id: 3,
      required: 1,
      img: {
        type: 1, // Icon Image
        wmin: 150,
        hmin: 50,
      }
    });

    expect(ortb.assets[4]).to.deep.include({
      id: 4,
      required: 0,
      data: {
        type: 9,
      }
    });
    expect(ortb.privacy).to.equal(1);
  });

  ['bogusKey', 'clickUrl', 'privacyLink'].forEach(nativeKey => {
    it(`should not generate an empty asset for key ${nativeKey}`, () => {
      const ortbReq = toOrtbNativeRequest({
        [nativeKey]: {
          required: true
        }
      });
      expect(ortbReq.assets.length).to.equal(0);
    });
  })

  it('should convert from ortb to old-style native request', () => {
    const openRTBRequest = {
      'ver': '1.2',
      'context': 2,
      'contextsubtype': 20,
      'plcmttype': 11,
      'plcmtcnt': 1,
      'aurlsupport': 0,
      'privacy': 1,
      'eventrackers': [
        {
          'event': 1,
          'methods': [1, 2]
        },
        {
          'event': 2,
          'methods': [1]
        }
      ],
      'assets': [
        {
          'id': 123,
          'required': 1,
          'title': {
            'len': 140
          }
        },
        {
          'id': 128,
          'required': 0,
          'img': {
            'wmin': 836,
            'hmin': 627,
            'type': 3
          }
        },
        {
          'id': 124,
          'required': 1,
          'img': {
            'wmin': 50,
            'hmin': 50,
            'type': 1
          }
        },
        {
          'id': 126,
          'required': 1,
          'data': {
            'type': 1,
            'len': 25
          }
        },
        {
          'id': 127,
          'required': 1,
          'data': {
            'type': 2,
            'len': 140
          }
        }
      ]
    };

    const oldNativeRequest = fromOrtbNativeRequest(openRTBRequest);

    expect(oldNativeRequest).to.be.a('object');
    expect(oldNativeRequest.title).to.include({
      required: true,
      len: 140
    });

    expect(oldNativeRequest.image).to.deep.include({
      required: false,
      aspect_ratios: [{
        min_width: 836,
        min_height: 627,
        ratio_width: 4,
        ratio_height: 3
      }]
    });

    expect(oldNativeRequest.icon).to.deep.include({
      required: true,
      aspect_ratios: [{
        min_width: 50,
        min_height: 50,
        ratio_width: 1,
        ratio_height: 1
      }]
    });
    expect(oldNativeRequest.sponsoredBy).to.include({
      required: true,
      len: 25
    });
    expect(oldNativeRequest.body).to.include({
      required: true,
      len: 140
    });
    expect(oldNativeRequest.privacyLink).to.include({
      required: false
    });
  });

  if (FEATURES.NATIVE) {
    it('should convert ortb bid requests to proprietary requests', () => {
      const validBidRequests = [{
        bidId: 'bidId3',
        adUnitCode: 'adUnitCode3',
        adUnitId: 'transactionId3',
        mediaTypes: {
          banner: {}
        },
        params: {
          publisher: 'publisher2',
          placement: 'placement3'
        }
      }];
      const resultRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
      expect(resultRequests).to.be.deep.equals(validBidRequests);

      validBidRequests[0].mediaTypes.native = {
        ortb: {
          ver: '1.2',
          context: 2,
          contextsubtype: 20,
          plcmttype: 11,
          plcmtcnt: 1,
          aurlsupport: 0,
          privacy: 1,
          eventrackers: [
            {
              event: 1,
              methods: [1, 2]
            },
            {
              event: 2,
              methods: [1]
            }
          ],
          assets: [
            {
              id: 123,
              required: 1,
              title: {
                len: 140
              }
            },
            {
              id: 128,
              required: 0,
              img: {
                wmin: 836,
                hmin: 627,
                type: 3
              }
            },
            {
              id: 124,
              required: 1,
              img: {
                wmin: 50,
                hmin: 50,
                type: 1
              }
            },
            {
              id: 126,
              required: 1,
              data: {
                type: 1,
                len: 25
              }
            },
            {
              id: 127,
              required: 1,
              data: {
                type: 2,
                len: 140
              }
            }
          ]
        }
      };

      const resultRequests2 = convertOrtbRequestToProprietaryNative(validBidRequests);
      expect(resultRequests2[0].mediaTypes.native).to.deep.include({
        title: {
          required: true,
          len: 140
        },
        icon: {
          required: true,
          aspect_ratios: [{
            min_width: 50,
            min_height: 50,
            ratio_width: 1,
            ratio_height: 1
          }]
        },
        sponsoredBy: {
          required: true,
          len: 25
        },
        body: {
          required: true,
          len: 140
        }
      });
    });
  }
});

describe('legacyPropertiesToOrtbNative', () => {
  describe('click trakckers', () => {
    it('should convert clickUrl to link.url', () => {
      const native = legacyPropertiesToOrtbNative({clickUrl: 'some-url'});
      expect(native.link.url).to.eql('some-url');
    });
    it('should convert single clickTrackers to link.clicktrackers', () => {
      const native = legacyPropertiesToOrtbNative({clickTrackers: 'some-url'});
      expect(native.link.clicktrackers).to.eql([
        'some-url'
      ])
    });
    it('should convert multiple clickTrackers into link.clicktrackers', () => {
      const native = legacyPropertiesToOrtbNative({clickTrackers: ['url1', 'url2']});
      expect(native.link.clicktrackers).to.eql([
        'url1',
        'url2'
      ])
    })
  });
  describe('impressionTrackers', () => {
    it('should convert a single tracker into an eventtracker entry', () => {
      const native = legacyPropertiesToOrtbNative({impressionTrackers: 'some-url'});
      expect(native.eventtrackers).to.eql([
        {
          event: 1,
          method: 1,
          url: 'some-url'
        }
      ]);
    });

    it('should convert an array into corresponding eventtracker entries', () => {
      const native = legacyPropertiesToOrtbNative({impressionTrackers: ['url1', 'url2']});
      expect(native.eventtrackers).to.eql([
        {
          event: 1,
          method: 1,
          url: 'url1'
        },
        {
          event: 1,
          method: 1,
          url: 'url2'
        }
      ])
    })
  });
  describe('javascriptTrackers', () => {
    it('should convert a single value into jstracker', () => {
      const native = legacyPropertiesToOrtbNative({javascriptTrackers: 'some-markup'});
      expect(native.jstracker).to.eql('some-markup');
    })
    it('should merge multiple values into a single jstracker', () => {
      const native = legacyPropertiesToOrtbNative({javascriptTrackers: ['some-markup', 'some-other-markup']});
      expect(native.jstracker).to.eql('some-markupsome-other-markup');
    })
  });
  describe('privacylink', () => {
    it('should convert privacyLink to privacy', () => {
      const native = legacyPropertiesToOrtbNative({privacyLink: 'https:/my-privacy-link.com'});
      expect(native.privacy).to.eql('https:/my-privacy-link.com');
    })
  })
});

describe('fireImpressionTrackers', () => {
  let runMarkup, fetchURL;
  beforeEach(() => {
    runMarkup = sinon.stub();
    fetchURL = sinon.stub();
  })

  function runTrackers(resp) {
    fireImpressionTrackers(resp, {runMarkup, fetchURL})
  }

  it('should run markup in jstracker', () => {
    runTrackers({
      jstracker: 'some-markup'
    });
    sinon.assert.calledWith(runMarkup, 'some-markup');
  });

  it('should fetch each url in imptrackers', () => {
    const urls = ['url1', 'url2'];
    runTrackers({
      imptrackers: urls
    });
    urls.forEach(url => sinon.assert.calledWith(fetchURL, url));
  });

  it('should fetch each url in eventtrackers that use the image method', () => {
    const urls = ['url1', 'url2'];
    runTrackers({
      eventtrackers: urls.map(url => ({event: 1, method: 1, url}))
    });
    urls.forEach(url => sinon.assert.calledWith(fetchURL, url))
  });

  it('should load as a script each url in eventtrackers that use the js method', () => {
    const urls = ['url1', 'url2'];
    runTrackers({
      eventtrackers: urls.map(url => ({event: 1, method: 2, url}))
    });
    urls.forEach(url => sinon.assert.calledWith(runMarkup, sinon.match(`script async src="${url}"`)))
  });

  it('should not fire trackers that are not impression trakcers', () => {
    runTrackers({
      link: {
        clicktrackers: ['click-url']
      },
      eventtrackers: [{
        event: 2, // not imp
        method: 1,
        url: 'some-url'
      }]
    });
    sinon.assert.notCalled(fetchURL);
    sinon.assert.notCalled(runMarkup);
  })
})

describe('fireClickTrackers', () => {
  let fetchURL;
  beforeEach(() => {
    fetchURL = sinon.stub();
  });

  function runTrackers(resp, assetId = null) {
    fireClickTrackers(resp, assetId, {fetchURL});
  }

  it('should load each URL in link.clicktrackers', () => {
    const urls = ['url1', 'url2'];
    runTrackers({
      link: {
        clicktrackers: urls
      }
    });
    urls.forEach(url => sinon.assert.calledWith(fetchURL, url));
  })

  it('should load each URL in asset.link.clicktrackers, when response is ORTB', () => {
    const urls = ['asset_url1', 'asset_url2'];
    runTrackers({
      assets: [
        {
          id: 1,
          link: {
            clicktrackers: urls
          }
        }
      ],
    }, 1);
    urls.forEach(url => sinon.assert.calledWith(fetchURL, url));
  })
})

describe('toOrtbNativeResponse', () => {
  it('should work when there are unrequested assets in the response', () => {
    const legacyResponse = {
      'title': 'vtitle',
      'body': 'vbody'
    }
    const request = toOrtbNativeRequest({
      title: {
        required: 'true'
      },

    });
    const ortbResponse = toOrtbNativeResponse(legacyResponse, request);
    expect(ortbResponse.assets.length).to.eql(1);
  });

  it('should not modify the request', () => {
    const legacyResponse = {
      title: 'vtitle'
    }
    const request = toOrtbNativeRequest({
      title: {
        required: true
      }
    });
    const requestCopy = JSON.parse(JSON.stringify(request));
    const response = toOrtbNativeResponse(legacyResponse, request);
    expect(request).to.eql(requestCopy);
    sinon.assert.match(response.assets[0], {
      title: {
        text: 'vtitle'
      }
    })
  });

  it('should accept objects as legacy assets', () => {
    const legacyResponse = {
      icon: {
        url: 'image-url'
      }
    }
    const request = toOrtbNativeRequest({
      icon: {
        required: true
      }
    });
    const response = toOrtbNativeResponse(legacyResponse, request);
    sinon.assert.match(response.assets[0], {
      img: {
        url: 'image-url'
      }
    })
  })
})
