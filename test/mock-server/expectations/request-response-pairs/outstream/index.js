var app = require('../../../index');

/**
 * This file will have the fixtures for request and response. Each one has to export two functions getRequest and getResponse.
 * expectation directory will hold all the request reponse pairs of different types. middlewares added to the server will parse
 * these files and return the response when expecation is met
 *
 */

/**
 * This function will return the request object with all the entities method, path, body, header etc.
 *
 * @return {object} Request object
 */
exports.getRequest = function() {
  return {
    'httpRequest': {
      'method': 'POST',
      'path': '/',
      'body': {
        'tags': [{
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 13232385,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'video': {
            'skippable': true,
            'playback_method': ['auto_play_sound_off']
          }
        }, {
          'sizes': [{
            'width': 640,
            'height': 480
          }],
          'primary_size': {
            'width': 640,
            'height': 480
          },
          'ad_types': ['video'],
          'id': 13232385,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'video': {
            'skippable': true,
            'playback_method': ['auto_play_sound_off']
          }
        }],
        'user': {}
      }
    }
  }
}

/**
 * This function will return the response object with all the entities method, path, body, header etc.
 *
 * @return {object} Response object
 */
exports.getResponse = function() {
  return {
    'httpResponse': {
      'body': {
        'version': '3.0.0',
        'tags': [{
          'uuid': '223e8549781f2e',
          'tag_id': 13232385,
          'auction_id': '527250675737245396',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Foutstream.html&e=wqT_3QKwCKAwBAAAAwDWAAUBCOiWpO8FENTtnJej9sqoBxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQgkQCEJCQgAACkRCQAxCQnwaSRAMIHSpwY47UhA7UhIAFAAWJzxW2AAaOWljwF4AIABAYoBAJIBA1VTRJgBAaABAagBAbABALgBA8ABAMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3NTU1Mzg5NikFHTRyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFUenpuS1FqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSG5NQW5aODYzalA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TOEE4RDgumgKJASFXdzkxSDo5ASRuUEZiSUFRb0FEFVhYa1FEb0pVMGxPTXpvME9ETTBRUGtXU1ENTwxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EllQUEuwgI4aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy1vdXRzdHJlYW0tdmlkZW8tYWRzLmh0bWzYAgDgAq2YSOoCNA1DSHRlc3QubG9jYWxob3N0Ojk5OTkFFBgvcGFnZXMvFUkALgE_yIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzLwmj8F6YBACiBAsxMC43NS43NC42OagEmM8CsgQSCAQQBBiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ4MzTaBAIIAOAEAPAEy4HALogFAZgFAKAF_____wUDFAHABQDJBWlyFPA_0gUJCQkMeAAA2AUB4AUB8AXDlQv6BQQIABAAkAYBmAYAuAYAwQYJJTTwv8gGANAG9S_aBhYKEAkUGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=9953ce4d94992db04897ab580bf81b3e274b2601',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 97517771,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 36,
            'renderer_url': 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
            'renderer_id': 2,
            'renderer_config': '{"skippable":{"videoThreshold":null,"skipLocation":"top-right"}}',
            'client_initiated_ad_counting': true,
            'viewability': {
              'config': 'tv=vh2-121&d=1x1&s=3479483&st=0&vctx=4&ts=1575553896&vc=iab;vid_ccr=1&vjs=http%3A%2F%2Fcdn.adnxs.com%2Fv%2Fvideo%2F182%2Ftrk.js&cb=http%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Foutstream.html%26e%3DwqT_3QK4CKA4BAAAAwDWAAUBCOiWpO8FENTtnJej9sqoBxiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIHSpwY47UhA7UhIAlDLgcAuWJzxW2AAaOWljwF4urgFgAEBigEDVVNEkgUG8FKYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzU1NTM4OTYpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFUenpuS1FqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSG5NQW5aODYzalA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TOEE4RDgumgKJASFXdzkxSDo5ASRuUEZiSUFRb0FEFVhYa1FEb0pVMGxPTXpvME9ETTBRUGtXU1ENTwxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EllQUEuwgI4aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy1vdXRzdHJlYW0tdmlkZW8tYWRzLmh0bWzYAgDgAq2YSOoCNA1DSHRlc3QubG9jYWxob3N0Ojk5OTkFFBgvcGFnZXMvFUkALgE_yIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzLwmj8F6YBACiBAsxMC43NS43NC42OagEmM8CsgQSCAQQBBiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ4MzTaBAIIAeAEAPAEy4HALogFAZgFAKAF_____wUDFAHABQDJBWl6FPA_0gUJCQkMeAAA2AUB4AUB8AXDlQv6BQQIABAAkAYBmAYAuAYAwQYJJTTwP8gGANAG9S_aBhYKEAkUGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA%26s%3D5adef946cd5f0d8db86d67860914e02ef6f91d6b&cet=0&cecb=&rdcb=http%3A%2F%2Fsin3-ib.adnxs.com%2Frd_log%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Foutstream.html%26e%3DwqT_3QKMCaCMBAAAAwDWAAUBCOiWpO8FENTtnJej9sqoBxiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIHSpwY47UhA7UhIAlDLgcAuWJzxW2AAaOWljwF4urgFgAEBigEDVVNEkgUG8FKYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzU1NTM4OTYpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFUenpuS1FqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSG5NQW5aODYzalA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TOEE4RDgumgKJASFXdzkxSDo5ASRuUEZiSUFRb0FEFVhYa1FEb0pVMGxPTXpvME9ETTBRUGtXU1ENTwxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EllQUEuwgI4aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy1vdXRzdHJlYW0tdmlkZW8tYWRzLmh0bWzYAgDgAq2YSOoCNA1DSHRlc3QubG9jYWxob3N0Ojk5OTkFFBgvcGFnZXMvFUkALgE_aPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7gSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDffwXpgEAKIECzEwLjc1Ljc0LjY5qASYzwKyBBIIBBAEGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDgzNNoEAggB4AQA8ATLgcAuiAUBmAUAoAX_____BQMUAcAFAMkFac4U8D_SBQkJCQx4AADYBQHgBQHwBcOVC_oFBAgAEACQBgGYBgC4BgDBBgklNPA_yAYA0Ab1L9oGFgoQCRQZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.%26s%3Df2a73057b50fb0c9e98a6093141472a4ed2e401e&bridge=1.11.0&rblog=auc=527250675737245396;bm=9325;sm=9325;cr=97517771;pl=13232385&vid_context=anoutstream;anbannerstream;anoverlayplayer'
            },
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_off'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'content': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><VAST version="3.0"><Ad id="97517771"><InLine><AdSystem>adnxs</AdSystem><AdTitle><![CDATA[Prebid Video Skippable -- Avocados From Mexico]]></AdTitle><Error><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=4&error_code=[ERRORCODE]]]></Error><Impression id="adnxs"><![CDATA[http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Foutstream.html&e=wqT_3QK4CKA4BAAAAwDWAAUBCOiWpO8FENTtnJej9sqoBxiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIHSpwY47UhA7UhIAlDLgcAuWJzxW2AAaOWljwF4urgFgAEBigEDVVNEkgUG8FKYAQGgAQGoAQGwAQC4AQPAAQPIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzU1NTM4OTYpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFUenpuS1FqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSG5NQW5aODYzalA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TOEE4RDgumgKJASFXdzkxSDo5ASRuUEZiSUFRb0FEFVhYa1FEb0pVMGxPTXpvME9ETTBRUGtXU1ENTwxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EllQUEuwgI4aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy1vdXRzdHJlYW0tdmlkZW8tYWRzLmh0bWzYAgDgAq2YSOoCNA1DSHRlc3QubG9jYWxob3N0Ojk5OTkFFBgvcGFnZXMvFUkALgE_yIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzLwmj8F6YBACiBAsxMC43NS43NC42OagEmM8CsgQSCAQQBBiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ4MzTaBAIIAeAEAPAEy4HALogFAZgFAKAF_____wUDFAHABQDJBWl6FPA_0gUJCQkMeAAA2AUB4AUB8AXDlQv6BQQIABAAkAYBmAYAuAYAwQYJJTTwP8gGANAG9S_aBhYKEAkUGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=d697bfa81eb51bf0ed2fb8c507f1147cf4854f2d]]></Impression><Creatives><Creative id="70944" adID="97517771"><Linear skipoffset="00:00:05"><Duration>00:00:30.000</Duration><TrackingEvents><Tracking event="start"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=2]]></Tracking><Tracking event="skip"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=5]]></Tracking><Tracking event="midpoint"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=6]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=7]]></Tracking><Tracking event="complete"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABHUNucysitRBxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=979aee1106a0bea5609a3c23fdc46153ad6d9eec&event_type=8]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[http://prebid.org/dev-docs/show-outstream-video-ads.html]]></ClickThrough><ClickTracking id="adnxs"><![CDATA[http://sin3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQNQ25zKyK1EHKnKSKrrb42FoC-ldAAAAAAHpyQBtJAAAbSQAAAIAAADLANAFnPgWAAAAAABVU0QAVVNEAAEAAQDl0gAAAAABAwMCAAAAAMYAuBX-UQAAAAA./bcr=AAAAAAAA8D8=/cnd=%21Ww91HQjY-LwKEMuBwC4YnPFbIAQoADEAAAAAAAAkQDoJU0lOMzo0ODM0QPkWSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ4MzQ=/bn=89146/]]></ClickTracking></VideoClicks><MediaFiles><MediaFile id="824647" delivery="progressive" type="video/mp4" width="768" height="432" scalable="true" bitrate="1700" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1700k.mp4]]></MediaFile><MediaFile id="824648" delivery="progressive" type="video/x-flv" width="768" height="432" scalable="true" bitrate="1100" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1100k.flv]]></MediaFile><MediaFile id="824649" delivery="progressive" type="video/mp4" width="768" height="432" scalable="true" bitrate="1100" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1100k.mp4]]></MediaFile><MediaFile id="824650" delivery="progressive" type="video/mp4" width="768" height="432" scalable="true" bitrate="500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_500k.mp4]]></MediaFile><MediaFile id="824651" delivery="progressive" type="video/x-flv" width="768" height="432" scalable="true" bitrate="500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_500k.flv]]></MediaFile><MediaFile id="824652" delivery="progressive" type="video/webm" width="768" height="432" scalable="true" bitrate="500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_500k.webm]]></MediaFile><MediaFile id="824653" delivery="progressive" type="video/webm" width="768" height="432" scalable="true" bitrate="1500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1500k.webm]]></MediaFile><MediaFile id="824654" delivery="progressive" type="video/mp4" width="960" height="540" scalable="true" bitrate="1775" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>'
              }
            }
          }]
        }, {
          'uuid': '3acfd472dd4bdf',
          'tag_id': 13232385,
          'auction_id': '3449642271543746980',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Foutstream.html&e=wqT_3QKwCKAwBAAAAwDWAAUBCOiWpO8FEKTDpazn6-XvLxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQgkQCEJCQgAACkRCQAxCQnwaSRAMIHSpwY47UhA7UhIAFAAWJzxW2AAaOWljwF4AIABAYoBAJIBA1VTRJgBAaABAagBAbABALgBA8ABAMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3NTU1Mzg5NikFHTRyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFvendNV2dqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSHIwdDF2TTdMaVA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TPEE4RDgumgKJASFXdzkxSFE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBPRE0wUVBrV1NRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBJZUFBLsICOGh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctb3V0c3RyZWFtLXZpZGVvLWFkcy5odG1s2AIA4AKtmEjqAjQNQ0h0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLxVJAC4BP8iAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My8Jo_BemAQAogQLMTAuNzUuNzQuNjmoBJjPArIEEggEEAQYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0ODM02gQCCADgBADwBMuBwC6IBQGYBQCgBf____8FAxQBwAUAyQVpchTwP9IFCQkJDHgAANgFAeAFAfAFw5UL-gUECAAQAJAGAZgGALgGAMEGCSU08L_IBgDQBvUv2gYWChAJFBkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=e43b45a2391036da6d93eda546d8808de0169bb1',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 97517771,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 36,
            'renderer_url': 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
            'renderer_id': 2,
            'renderer_config': '{"skippable":{"videoThreshold":null,"skipLocation":"top-right"}}',
            'client_initiated_ad_counting': true,
            'viewability': {
              'config': 'tv=vh2-121&d=1x1&s=3479483&st=0&vctx=4&ts=1575553896&vc=iab;vid_ccr=1&vjs=http%3A%2F%2Fcdn.adnxs.com%2Fv%2Fvideo%2F182%2Ftrk.js&cb=http%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Foutstream.html%26e%3DwqT_3QK4CKA4BAAAAwDWAAUBCOiWpO8FEKTDpazn6-XvLxiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIHSpwY47UhA7UhIAlDLgcAuWJzxW2AAaOWljwF4urgFgAEBigEDVVNEkgUG8FKYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzU1NTM4OTYpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFvendNV2dqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSHIwdDF2TTdMaVA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TPEE4RDgumgKJASFXdzkxSFE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBPRE0wUVBrV1NRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBJZUFBLsICOGh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctb3V0c3RyZWFtLXZpZGVvLWFkcy5odG1s2AIA4AKtmEjqAjQNQ0h0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLxVJAC4BP8iAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My8Jo_BemAQAogQLMTAuNzUuNzQuNjmoBJjPArIEEggEEAQYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0ODM02gQCCAHgBADwBMuBwC6IBQGYBQCgBf____8FAxQBwAUAyQVpehTwP9IFCQkJDHgAANgFAeAFAfAFw5UL-gUECAAQAJAGAZgGALgGAMEGCSU08D_IBgDQBvUv2gYWChAJFBkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..%26s%3Dc2a8dac8959d9366981afc868ec5b54853090944&cet=0&cecb=&rdcb=http%3A%2F%2Fsin3-ib.adnxs.com%2Frd_log%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Foutstream.html%26e%3DwqT_3QKMCaCMBAAAAwDWAAUBCOiWpO8FEKTDpazn6-XvLxiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIHSpwY47UhA7UhIAlDLgcAuWJzxW2AAaOWljwF4urgFgAEBigEDVVNEkgUG8FKYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzU1NTM4OTYpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFvendNV2dqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSHIwdDF2TTdMaVA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TPEE4RDgumgKJASFXdzkxSFE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBPRE0wUVBrV1NRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBJZUFBLsICOGh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctb3V0c3RyZWFtLXZpZGVvLWFkcy5odG1s2AIA4AKtmEjqAjQNQ0h0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLxVJAC4BP2jyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChYyFgAgTEVBRl9OQU1FAR0IHgoaNh0ACEFTVAE-4ElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92Mw338F6YBACiBAsxMC43NS43NC42OagEmM8CsgQSCAQQBBiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ4MzTaBAIIAeAEAPAEy4HALogFAZgFAKAF_____wUDFAHABQDJBWnOFPA_0gUJCQkMeAAA2AUB4AUB8AXDlQv6BQQIABAAkAYBmAYAuAYAwQYJJTTwP8gGANAG9S_aBhYKEAkUGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA%26s%3D4e9e218d8f075cb19c4a4e8da2a7e716fa15d3c5&bridge=1.11.0&rblog=auc=3449642271543746980;bm=9325;sm=9325;cr=97517771;pl=13232385&vid_context=anoutstream;anbannerstream;anoverlayplayer'
            },
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_off'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'content': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><VAST version="3.0"><Ad id="97517771"><InLine><AdSystem>adnxs</AdSystem><AdTitle><![CDATA[Prebid Video Skippable -- Avocados From Mexico]]></AdTitle><Error><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=4&error_code=[ERRORCODE]]]></Error><Impression id="adnxs"><![CDATA[http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Foutstream.html&e=wqT_3QK4CKA4BAAAAwDWAAUBCOiWpO8FEKTDpazn6-XvLxiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIHSpwY47UhA7UhIAlDLgcAuWJzxW2AAaOWljwF4urgFgAEBigEDVVNEkgUG8FKYAQGgAQGoAQGwAQC4AQPAAQPIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzU1NTM4OTYpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPCakgK1AiFvendNV2dqWS1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRZ2RLbkJsZ0FZSUlDYUFCd0FIZ0FnQUhBQVlnQkFKQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRSHIwdDF2TTdMaVA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BOWo0dkFxNkF3bFRTVTR6T2pRNE16VGdBX2tXaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhpSmFrRg0TPEE4RDgumgKJASFXdzkxSFE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBPRE0wUVBrV1NRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBJZUFBLsICOGh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctb3V0c3RyZWFtLXZpZGVvLWFkcy5odG1s2AIA4AKtmEjqAjQNQ0h0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLxVJAC4BP8iAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My8Jo_BemAQAogQLMTAuNzUuNzQuNjmoBJjPArIEEggEEAQYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0ODM02gQCCAHgBADwBMuBwC6IBQGYBQCgBf____8FAxQBwAUAyQVpehTwP9IFCQkJDHgAANgFAeAFAfAFw5UL-gUECAAQAJAGAZgGALgGAMEGCSU08D_IBgDQBvUv2gYWChAJFBkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=10050237c0d67842d2f81e2415dd6065d7cb08af]]></Impression><Creatives><Creative id="70944" adID="97517771"><Linear skipoffset="00:00:05"><Duration>00:00:30.000</Duration><TrackingEvents><Tracking event="start"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=2]]></Tracking><Tracking event="skip"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=5]]></Tracking><Tracking event="midpoint"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=6]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=7]]></Tracking><Tracking event="complete"><![CDATA[http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQloC-ldAAAAABGkYYl1XpffLxloC-ldAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQgdKnBljDlQtiAi0taAFwAXgAgAECiAEEkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=414834fdc6e268f284292aedf8b01ee525c3e999&event_type=8]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[http://prebid.org/dev-docs/show-outstream-video-ads.html]]></ClickThrough><ClickTracking id="adnxs"><![CDATA[http://sin3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQKRhiXVel98vKnKSKrrb42FoC-ldAAAAAAHpyQBtJAAAbSQAAAIAAADLANAFnPgWAAAAAABVU0QAVVNEAAEAAQDl0gAAAAABAwMCAAAAAMYAZhZeiAAAAAA./bcr=AAAAAAAA8D8=/cnd=%21Ww91HQjY-LwKEMuBwC4YnPFbIAQoADEAAAAAAAAkQDoJU0lOMzo0ODM0QPkWSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ4MzQ=/bn=89146/]]></ClickTracking></VideoClicks><MediaFiles><MediaFile id="824647" delivery="progressive" type="video/mp4" width="768" height="432" scalable="true" bitrate="1700" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1700k.mp4]]></MediaFile><MediaFile id="824648" delivery="progressive" type="video/x-flv" width="768" height="432" scalable="true" bitrate="1100" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1100k.flv]]></MediaFile><MediaFile id="824649" delivery="progressive" type="video/mp4" width="768" height="432" scalable="true" bitrate="1100" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1100k.mp4]]></MediaFile><MediaFile id="824650" delivery="progressive" type="video/mp4" width="768" height="432" scalable="true" bitrate="500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_500k.mp4]]></MediaFile><MediaFile id="824651" delivery="progressive" type="video/x-flv" width="768" height="432" scalable="true" bitrate="500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_500k.flv]]></MediaFile><MediaFile id="824652" delivery="progressive" type="video/webm" width="768" height="432" scalable="true" bitrate="500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_500k.webm]]></MediaFile><MediaFile id="824653" delivery="progressive" type="video/webm" width="768" height="432" scalable="true" bitrate="1500" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7_768_432_1500k.webm]]></MediaFile><MediaFile id="824654" delivery="progressive" type="video/mp4" width="960" height="540" scalable="true" bitrate="1775" maintainAspectRatio="true"><![CDATA[http://vcdn.adnxs.com/p/creative-video/c7/84/47/f8/c78447f8-84f7-400b-aacf-39a87d9e1fb7/c78447f8-84f7-400b-aacf-39a87d9e1fb7.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>'
              }
            }
          }]
        }]
      }
    }
  }
}
