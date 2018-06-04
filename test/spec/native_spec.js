import { expect } from 'chai';
import { fireNativeTrackers, getNativeTargeting, nativeBidIsValid } from 'src/native';
const utils = require('src/utils');

const bid = {
  native: {
    title: 'Native Creative',
    body: 'Cool description great stuff',
    cta: 'Do it',
    sponsoredBy: 'AppNexus',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
    javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>'
  }
};

describe('native.js', () => {
  let triggerPixelStub;
  let insertHtmlIntoIframeStub;

  beforeEach(() => {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    insertHtmlIntoIframeStub = sinon.stub(utils, 'insertHtmlIntoIframe');
  });

  afterEach(() => {
    utils.triggerPixel.restore();
    utils.insertHtmlIntoIframe.restore();
  });

  it('gets native targeting keys', () => {
    const targeting = getNativeTargeting(bid);
    expect(targeting.hb_native_title).to.equal(bid.native.title);
    expect(targeting.hb_native_body).to.equal(bid.native.body);
    expect(targeting.hb_native_linkurl).to.equal(bid.native.clickUrl);
  });

  it('fires impression trackers', () => {
    fireNativeTrackers({}, bid);
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.impressionTrackers[0]);
    sinon.assert.calledWith(insertHtmlIntoIframeStub, bid.native.javascriptTrackers);
  });

  it('fires click trackers', () => {
    fireNativeTrackers({ action: 'click' }, bid);
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.clickTrackers[0]);
  });
});

describe('validate native', () => {
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
    adId: 'test_bid_id',
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
    adId: 'test_bid_id',
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
    adId: 'test_bid_id',
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

  beforeEach(() => {});

  afterEach(() => {});

  it('should reject bid if no image sizes are defined', () => {
    let result = nativeBidIsValid(validBid, bidReq);
    expect(result).to.be.true;
    result = nativeBidIsValid(noIconDimBid, bidReq);
    expect(result).to.be.false;
    result = nativeBidIsValid(noImgDimBid, bidReq);
    expect(result).to.be.false;
  });
});
