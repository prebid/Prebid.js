import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';

export default {
  [BANNER]: () => `<html><head><body><img src="https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png"/></body></html>`,
  [VIDEO]: () => '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST version=\"3.0\"><Ad><InLine><AdSystem>GDFP</AdSystem><AdTitle>Demo</AdTitle><Description><![CDATA[Demo]]></Description><Creatives><Creative><Linear ><Duration>00:00:11</Duration><VideoClicks><ClickThrough><![CDATA[https://prebid.org/]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery=\"progressive\" width=\"640\" height=\"360\" type=\"video/mp4\" scalable=\"true\" maintainAspectRatio=\"true\"><![CDATA[https://s3.amazonaws.com/files.prebid.org/creatives/PrebidLogo.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
  [NATIVE]: () => ({
    ortb: {
      link: {
        url: 'https://www.link.example',
        clicktrackers: ['https://impression.example']
      },
      imptrackers: ['https://impression.example'],
      assets: [
        {
          id: 0,
          required: 1,
          img: {
            type: 3,
            w: 600,
            h: 500,
            url: 'https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png',
          }
        }
      ]
    },
    title: 'Native Creative',
    body: 'Cool description great stuff',
    cta: 'Do it',
    image: {
      url: 'https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png',
      height: 500,
      width: 600,
    },
    sponsoredBy: 'Prebid.org',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
    javascriptTrackers: '<script src="http://www.foobar.js"></script>',
    privacyLink: 'https://privacy-link.example',
    ext: {
      foo: 'foo-value',
      baz: 'baz-value',
    }
  })
}
