import { expect } from 'chai';
import { fireNativeTrackers, getNativeTargeting, nativeBidIsValid, getAssetMessage, getAllAssetsMessage } from 'src/native.js';
import CONSTANTS from 'src/constants.json';
const utils = require('src/utils');

const bid = {
  adId: '123',
  native: {
    title: 'Native Creative',
    body: 'Cool description great stuff',
    cta: 'Do it',
    image: {
      url: 'http://cdn.example.com/p/creative-image/image.png',
      height: 83,
      width: 127
    },
    icon: {
      url: 'http://cdn.example.com/p/creative-image/icon.jpg',
      height: 742,
      width: 989
    },
    sponsoredBy: 'AppNexus',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
    javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>'
  }
};

const bidWithUndefinedFields = {
  native: {
    title: 'Native Creative',
    body: undefined,
    cta: undefined,
    sponsoredBy: 'AppNexus',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
    javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>'
  }
};

describe('native.js', function () {
  let triggerPixelStub;
  let insertHtmlIntoIframeStub;

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
    expect(targeting[CONSTANTS.NATIVE_KEYS.title]).to.equal(bid.native.title);
    expect(targeting[CONSTANTS.NATIVE_KEYS.body]).to.equal(bid.native.body);
    expect(targeting[CONSTANTS.NATIVE_KEYS.clickUrl]).to.equal(bid.native.clickUrl);
  });

  it('sends placeholders for configured assets', function () {
    const bidRequest = {
      mediaTypes: {
        native: {
          body: { sendId: true },
          clickUrl: { sendId: true },
        }
      }
    };
    const targeting = getNativeTargeting(bid, bidRequest);

    expect(targeting[CONSTANTS.NATIVE_KEYS.title]).to.equal(bid.native.title);
    expect(targeting[CONSTANTS.NATIVE_KEYS.body]).to.equal('hb_native_body:123');
    expect(targeting[CONSTANTS.NATIVE_KEYS.clickUrl]).to.equal('hb_native_linkurl:123');
  });

  it('should only include native targeting keys with values', function () {
    const targeting = getNativeTargeting(bidWithUndefinedFields);

    expect(Object.keys(targeting)).to.deep.equal([
      CONSTANTS.NATIVE_KEYS.title,
      CONSTANTS.NATIVE_KEYS.sponsoredBy,
      CONSTANTS.NATIVE_KEYS.clickUrl
    ]);
  });

  it('should only include targeting that has sendTargetingKeys set to true', function () {
    const bidRequest = {
      nativeParams: {
        image: {
          required: true,
          sizes: [150, 50]
        },
        title: {
          required: true,
          len: 80,
          sendTargetingKeys: true
        },
        sendTargetingKeys: false,
      }

    };
    const targeting = getNativeTargeting(bid, bidRequest);

    expect(Object.keys(targeting)).to.deep.equal([
      CONSTANTS.NATIVE_KEYS.title
    ]);
  });

  it('should only include targeting if sendTargetingKeys not set to false', function () {
    const bidRequest = {
      nativeParams: {
        image: {
          required: true,
          sizes: [150, 50]
        },
        title: {
          required: true,
          len: 80
        },
        body: {
          required: true
        },
        clickUrl: {
          required: true
        },
        icon: {
          required: false,
          sendTargetingKeys: false
        },
        cta: {
          required: false,
          sendTargetingKeys: false
        },
        sponsoredBy: {
          required: false,
          sendTargetingKeys: false
        }
      }

    };
    const targeting = getNativeTargeting(bid, bidRequest);

    expect(Object.keys(targeting)).to.deep.equal([
      CONSTANTS.NATIVE_KEYS.title,
      CONSTANTS.NATIVE_KEYS.body,
      CONSTANTS.NATIVE_KEYS.image,
      CONSTANTS.NATIVE_KEYS.clickUrl
    ]);
  });

  it('should copy over rendererUrl to bid object and include it in targeting', function () {
    const bidRequest = {
      nativeParams: {
        image: {
          required: true,
          sizes: [150, 50]
        },
        title: {
          required: true,
          len: 80,
        },
        rendererUrl: {
          url: 'https://www.renderer.com/'
        }
      }

    };
    const targeting = getNativeTargeting(bid, bidRequest);

    expect(Object.keys(targeting)).to.deep.equal([
      CONSTANTS.NATIVE_KEYS.title,
      CONSTANTS.NATIVE_KEYS.body,
      CONSTANTS.NATIVE_KEYS.cta,
      CONSTANTS.NATIVE_KEYS.image,
      CONSTANTS.NATIVE_KEYS.icon,
      CONSTANTS.NATIVE_KEYS.sponsoredBy,
      CONSTANTS.NATIVE_KEYS.clickUrl,
      CONSTANTS.NATIVE_KEYS.rendererUrl
    ]);

    expect(bid.native.rendererUrl).to.deep.equal('https://www.renderer.com/');
    delete bid.native.rendererUrl;
  });

  it('should copy over adTemplate to bid object and include it in targeting', function () {
    const bidRequest = {
      nativeParams: {
        image: {
          required: true,
          sizes: [150, 50]
        },
        title: {
          required: true,
          len: 80,
        },
        adTemplate: '<div><p>##hb_native_body##<\/p><\/div>'
      }

    };
    const targeting = getNativeTargeting(bid, bidRequest);

    expect(Object.keys(targeting)).to.deep.equal([
      CONSTANTS.NATIVE_KEYS.title,
      CONSTANTS.NATIVE_KEYS.body,
      CONSTANTS.NATIVE_KEYS.cta,
      CONSTANTS.NATIVE_KEYS.image,
      CONSTANTS.NATIVE_KEYS.icon,
      CONSTANTS.NATIVE_KEYS.sponsoredBy,
      CONSTANTS.NATIVE_KEYS.clickUrl
    ]);

    expect(bid.native.adTemplate).to.deep.equal('<div><p>##hb_native_body##<\/p><\/div>');
    delete bid.native.adTemplate;
  });

  it('fires impression trackers', function () {
    fireNativeTrackers({}, bid);
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.impressionTrackers[0]);
    sinon.assert.calledWith(insertHtmlIntoIframeStub, bid.native.javascriptTrackers);
  });

  it('fires click trackers', function () {
    const trackerType = fireNativeTrackers({ action: 'click' }, bid);
    expect(trackerType).to.equal('click');
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.clickTrackers[0]);
  });

  it('creates native asset message', function() {
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
      value: bid.native.body
    });
    expect(message.assets).to.deep.include({
      key: 'image',
      value: bid.native.image.url
    });
    expect(message.assets).to.deep.include({
      key: 'clickUrl',
      value: bid.native.clickUrl
    });
  });

  it('creates native all asset message', function() {
    const messageRequest = {
      message: 'Prebid Native',
      action: 'allAssetRequest',
      adId: '123',
    };

    const message = getAllAssetsMessage(messageRequest, bid);

    expect(message.assets.length).to.equal(7);
    expect(message.assets).to.deep.include({
      key: 'body',
      value: bid.native.body
    });
    expect(message.assets).to.deep.include({
      key: 'image',
      value: bid.native.image.url
    });
    expect(message.assets).to.deep.include({
      key: 'clickUrl',
      value: bid.native.clickUrl
    });
    expect(message.assets).to.deep.include({
      key: 'title',
      value: bid.native.title
    });
    expect(message.assets).to.deep.include({
      key: 'icon',
      value: bid.native.icon.url
    });
    expect(message.assets).to.deep.include({
      key: 'cta',
      value: bid.native.cta
    });
    expect(message.assets).to.deep.include({
      key: 'sponsoredBy',
      value: bid.native.sponsoredBy
    });
  });

  it('creates native all asset message with only defined fields', function() {
    const messageRequest = {
      message: 'Prebid Native',
      action: 'allAssetRequest',
      adId: '123',
    };

    const message = getAllAssetsMessage(messageRequest, bidWithUndefinedFields);

    expect(message.assets.length).to.equal(3);
    expect(message.assets).to.deep.include({
      key: 'clickUrl',
      value: bid.native.clickUrl
    });
    expect(message.assets).to.deep.include({
      key: 'title',
      value: bid.native.title
    });
    expect(message.assets).to.deep.include({
      key: 'sponsoredBy',
      value: bid.native.sponsoredBy
    });
  });
});

describe('validate native', function () {
  let bidReq = [{
    bids: [{
      bidderCode: 'test_bidder',
      bidId: 'test_bid_id',
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
            aspect_ratios: [150, 50]
          },
          icon: {
            required: true,
            sizes: [50, 50]
          },
        }
      }
    }]
  }];

  let validBid = {
    adId: 'abc123',
    requestId: 'test_bid_id',
    adUnitCode: '123/prebid_native_adunit',
    bidder: 'test_bidder',
    native: {
      body: 'This is a Prebid Native Creative. There are many like it, but this one is mine.',
      clickTrackers: ['http://my.click.tracker/url'],
      icon: {
        url: 'http://my.image.file/ad_image.jpg',
        height: 75,
        width: 75
      },
      image: {
        url: 'http://my.icon.file/ad_icon.jpg',
        height: 2250,
        width: 3000
      },
      clickUrl: 'http://prebid.org/dev-docs/show-native-ads.html',
      impressionTrackers: ['http://my.imp.tracker/url'],
      javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>',
      title: 'This is an example Prebid Native creative'
    }
  };

  let noIconDimBid = {
    adId: 'abc234',
    requestId: 'test_bid_id',
    adUnitCode: '123/prebid_native_adunit',
    bidder: 'test_bidder',
    native: {
      body: 'This is a Prebid Native Creative. There are many like it, but this one is mine.',
      clickTrackers: ['http://my.click.tracker/url'],
      icon: {
        url: 'http://my.image.file/ad_image.jpg',
        height: 0,
        width: 0
      },
      image: {
        url: 'http://my.icon.file/ad_icon.jpg',
        height: 2250,
        width: 3000
      },
      clickUrl: 'http://prebid.org/dev-docs/show-native-ads.html',
      impressionTrackers: ['http://my.imp.tracker/url'],
      javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>',
      title: 'This is an example Prebid Native creative'
    }
  };

  let noImgDimBid = {
    adId: 'abc345',
    requestId: 'test_bid_id',
    adUnitCode: '123/prebid_native_adunit',
    bidder: 'test_bidder',
    native: {
      body: 'This is a Prebid Native Creative. There are many like it, but this one is mine.',
      clickTrackers: ['http://my.click.tracker/url'],
      icon: {
        url: 'http://my.image.file/ad_image.jpg',
        height: 75,
        width: 75
      },
      image: {
        url: 'http://my.icon.file/ad_icon.jpg',
        height: 0,
        width: 0
      },
      clickUrl: 'http://prebid.org/dev-docs/show-native-ads.html',
      impressionTrackers: ['http://my.imp.tracker/url'],
      javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>',
      title: 'This is an example Prebid Native creative'
    }
  };

  beforeEach(function () {});

  afterEach(function () {});

  it('should reject bid if no image sizes are defined', function () {
    let result = nativeBidIsValid(validBid, bidReq);
    expect(result).to.be.true;
    result = nativeBidIsValid(noIconDimBid, bidReq);
    expect(result).to.be.false;
    result = nativeBidIsValid(noImgDimBid, bidReq);
    expect(result).to.be.false;
  });
});
