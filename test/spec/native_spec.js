import { expect } from 'chai';
import { fireNativeTrackers, getNativeTargeting, nativeBidIsValid, getAssetMessage } from 'src/native.js';
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
