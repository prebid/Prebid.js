import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';

const ORTB_NATIVE_ASSET_TYPES = ['img', 'video', 'link', 'data', 'title'];

export default {
  [BANNER]: () => `<html><head><body><img src="https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png"/></body></html>`,
  [VIDEO]: () => '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST version=\"3.0\"><Ad><InLine><AdSystem>GDFP</AdSystem><AdTitle>Demo</AdTitle><Description><![CDATA[Demo]]></Description><Creatives><Creative><Linear ><Duration>00:00:11</Duration><VideoClicks><ClickThrough><![CDATA[https://prebid.org/]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery=\"progressive\" width=\"640\" height=\"360\" type=\"video/mp4\" scalable=\"true\" maintainAspectRatio=\"true\"><![CDATA[https://s3.amazonaws.com/files.prebid.org/creatives/PrebidLogo.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
  [NATIVE]: (bid) => {
    return {
      ortb: {
        link: {
          url: 'https://www.link.example',
          clicktrackers: ['https://impression.example']
        },
        assets: bid.nativeOrtbRequest.assets.map(mapDefaultNativeOrtbAsset)
      }
    }
  }
}

function mapDefaultNativeOrtbAsset(asset) {
  const assetType = ORTB_NATIVE_ASSET_TYPES.find(type => asset.hasOwnProperty(type));
  switch (assetType) {
    case 'img':
      return {
        ...asset,
        img: {
          type: 3,
          w: 600,
          h: 500,
          url: 'https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png',
        }
      }
    case 'video':
      return {
        ...asset,
        video: {
          vasttag: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST version=\"3.0\"><Ad><InLine><AdSystem>GDFP</AdSystem><AdTitle>Demo</AdTitle><Description><![CDATA[Demo]]></Description><Creatives><Creative><Linear ><Duration>00:00:11</Duration><VideoClicks><ClickThrough><![CDATA[https://prebid.org/]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery=\"progressive\" width=\"640\" height=\"360\" type=\"video/mp4\" scalable=\"true\" maintainAspectRatio=\"true\"><![CDATA[https://s3.amazonaws.com/files.prebid.org/creatives/PrebidLogo.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>'
        }
      }
    case 'data': {
      return {
        ...asset,
        data: {
          value: '5 stars'
        }
      }
    }
    case 'title': {
      return {
        ...asset,
        title: {
          text: 'Prebid Native Example'
        }
      }
    }
  }
}
