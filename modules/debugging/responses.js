import {BANNER, NATIVE, VIDEO} from '../../src/mediaTypes.js';
import {Renderer} from '../../src/Renderer.js';
import {getGptSlotInfoForAdUnitCode} from '../../libraries/gptUtils/gptUtils.js';

const ORTB_NATIVE_ASSET_TYPES = ['img', 'video', 'link', 'data', 'title'];

export default {
  [BANNER]: (bid, bidResponse) => {
    if (!bidResponse.hasOwnProperty('ad') && !bidResponse.hasOwnProperty('adUrl')) {
      const [size, repeat] = bidResponse.width < bidResponse.height ? [bidResponse.width, 'repeat-y'] : [bidResponse.height, 'repeat-x'];
      bidResponse.ad = `<html><body><div style="display: inline-block; height: ${bidResponse.height}px; width: ${bidResponse.width}px; background-image: url(https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png); background-size: ${size}px; background-repeat: ${repeat}"></div></body></html>`;
    }
  },
  [VIDEO]: (bid, bidResponse) => {
    if (!bidResponse.hasOwnProperty('vastXml') && !bidResponse.hasOwnProperty('vastUrl')) {
      bidResponse.vastXml = '<?xml version="1.0" encoding="UTF-8"?><VAST version="3.0"><Ad><InLine><AdSystem>GDFP</AdSystem><AdTitle>Demo</AdTitle><Description><![CDATA[Demo]]></Description><Creatives><Creative><Linear ><Duration>00:00:11</Duration><VideoClicks><ClickThrough><![CDATA[https://prebid.org/]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" width="640" height="360" type="video/mp4" scalable="true" maintainAspectRatio="true"><![CDATA[https://s3.amazonaws.com/files.prebid.org/creatives/PrebidLogo.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>';
      bidResponse.renderer = Renderer.install({
        url: 'https://cdn.jwplayer.com/libraries/l5MchIxB.js',
      });
      bidResponse.renderer.setRender(function (bid, doc) {
        const parentId = getGptSlotInfoForAdUnitCode(bid.adUnitCode).divId ?? bid.adUnitCode;
        const div = doc.createElement('div');
        div.id = `${parentId}-video-player`;
        doc.getElementById(parentId).appendChild(div);
        const player = window.jwplayer(div.id).setup({
          debug: true,
          width: bidResponse.width,
          height: bidResponse.height,
          advertising: {
            client: 'vast',
            outstream: true,
            endstate: 'close'
          },
        });
        player.on('ready', async function () {
          if (bid.vastUrl) {
            player.loadAdTag(bid.vastUrl);
          } else {
            player.loadAdXml(bid.vastXml);
          }
        });
      })
    }
  },
  [NATIVE]: (bid, bidResponse) => {
    if (!bidResponse.hasOwnProperty('native')) {
      bidResponse.native = {
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
