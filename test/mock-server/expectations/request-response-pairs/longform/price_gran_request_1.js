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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'id': 15394006,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {
            'maxduration': 30
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
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '1249897353793397796',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEKTIuZTW4KGsERiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCITFqdjBlZ2lta184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFXU1JOVU1OTk9jXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFTUTgtR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAE39-fR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkdADYBQHgBQHwBay8FPoFBAgAEACQBgGYBgC4BgDBBgkkKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=e9887c670ae9fcb7eb2a0253037c64c3587f4bcb',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnKwgleAAAAABEkZI5iBYdYERnJwgleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=68a5c49da3a6ecf3dfc0835cb3da72b3b2c7b080&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149417951,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 15.000010,
            'cpm_publisher_currency': 15.000010,
            'publisher_currency_code': '$',
            'brand_category_id': 33,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFEKTIuZTW4KGsERiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV4w7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiExanYwZWdpbWtfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBV1NSTlVNTk5PY18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhU1E4LUd3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMeAAA2AUB4AUB8AWsvBT6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=9514ae5f8aae1ee9dddd24dce3e812ae76e0e783'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '4278372095219023172',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEMT65MOLmPWvOxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIUxEeUhqUWlua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFaQWJScDluWS1FXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASEtQTVuX2c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAEi-GfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkdADYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgkkKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=987d4bb0c7611d41b5974ec412469da2241084cd',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnKwgleAAAAABFEPXm4wNRfOxnJwgleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=75aaa9ec84807690ceff60e39fbba6625240f9f3&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149418123,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 15.000010,
            'cpm_publisher_currency': 15.000010,
            'publisher_currency_code': '$',
            'brand_category_id': 12,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 15000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFEMT65MOLmPWvOxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4w7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFMRHlIalFpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWkFiUnA5blktRV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhLUE1bl9nNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMeAAA2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=9872a378866ce61fc366ca8c34bdd9302fa41a9b'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '8860024420878272196',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKRCKARBAAAAwDWAAUBCMmFp_AFEMSN8Z3LqMj6ehiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIU9EMjhLZ2lta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFkZExBS3hfN09nXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFIdzlLREE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAEr-WfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkcADYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGCSMo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=1289862cbe265fd9af13d2aab9635e3232421ec1',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQnKwgleAAAAABHERryzRCH1ehnJwgleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=0b094204d5c18803149e081bd2bc0077d25ebb14&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149418671,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 15.000010,
            'cpm_publisher_currency': 15.000010,
            'publisher_currency_code': '$',
            'brand_category_id': 30,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLtCOhtBAAAAwDWAAUBCMmFp_AFEMSN8Z3LqMj6ehiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4w7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiFPRDI4S2dpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZGRMQUt4XzdPZ18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhSHc5S0RBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMdAAA2AUB4AUB8AXgWPoFBAgAEACQBgGYBgC4BgDBBgkkKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=f35771975371bb250fd6701914534b4f595fcf68'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '5236733650551797458',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKRCKARBAAAAwDWAAUBCMmFp_AFENLt5YOosKfWSBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIThUMjJsZ2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFkczByb2Ytbk9VXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFOZzkxRkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAExOefR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkcADYBQHgBQHwBZk9-gUECAAQAJAGAZgGALgGAMEGCSMo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=e997907677e4e2f9b641d51b522a901b85944899',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQnKwgleAAAAABHSdnmAgp2sSBnJwgleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=d70eef0df40cece50465a13d05a2dc11b65eadeb&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149418948,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 15.000010,
            'cpm_publisher_currency': 15.000010,
            'publisher_currency_code': '$',
            'brand_category_id': 1,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLtCOhtBAAAAwDWAAUBCMmFp_AFENLt5YOosKfWSBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4w7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiE4VDIybGdpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZHMwcm9mLW5PVV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhTmc5MUZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_DtSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPA_0Ab1L9oGFgoQAGn1FQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=e8b6716ad3d2fcbdb79976f72d60f8e90ce8f5a6'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '4987762881548953446',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '201567478388503336',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEKjm-NzbkYfmAhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIXV6NlFDd2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFkejE5MUdLNk8wXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0BBRHdQdy4umgKJASFTZy1SRzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56TXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0DgFlQUEu2AIA4AKtmEjqAk5odHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcHJpY2VHcmFuLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qASv5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggA4AQA8ATS7J9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAaWR0ANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=4a887316a3197dfae07c1443a4debc62a2f17fef',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnKwgleAAAAABEoM567jRzMAhnJwgleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=eef6278d136f8df4879846840f97933e9d67388a&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149419602,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 15.000010,
            'cpm_publisher_currency': 15.000010,
            'publisher_currency_code': '$',
            'brand_category_id': 24,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 15000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFEKjm-NzbkYfmAhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4w7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiF1ejZRQ3dpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZHoxOTFHSzZPMF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNAQUR3UHcuLpoCiQEhU2ctUkc6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8JplQUEu2AIA4AKtmEjqAk5odHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcHJpY2VHcmFuLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTU9ERUxfTEVBRl9OQU1FEgDyAh4KGkNVU1RPTREdCEFTVAEL8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAeAEAPAEYYIgiAUBmAUAoAX_EQEUAcAFAMkFabMU8D_SBQkJCQx4AADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=e68b089e4fc94aa7566784ccbff299e50c8bc090'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '3876520534914199302',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '4833995299234629234',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '8352235304492782614',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEJaok6aeuMb0cxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE0MTg4Nh8A8P2SArkCIUpUMS1FZ2lHa184UEVLekNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFFajRyM1ZBQUFxUU1FQkktSzkxUUFBS2tESkFmQ1lIN1I1bmVzXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRGhwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASExUTY4OFE2PQEkblBGYklBUW9BRBVIVHFRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAErMKfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkdADYBQHgBQHwBfKMAfoFBAgAEACQBgGYBgC4BgDBBgkkKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=7081f4ad4ae9837aaff4b4f59abc4ce7f8b02cb6',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnKwgleAAAAABEW1MTkwRnpcxnJwgleAAAAACCswp9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jyjAFiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAazCn0ewAQE.&s=71f281c81d1ae269bde275b84aa955c833ab1dea&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149414188,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 13.000010,
            'cpm_publisher_currency': 13.000010,
            'publisher_currency_code': '$',
            'brand_category_id': 32,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 29000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFEJaok6aeuMb0cxiq5MnUovf28WEqNgmOWItPAQAqQBGOWItPAQAqQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQrMKfR1ic8VtgAGjNunV4w7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxNDE4OCwgMTUZH_D9kgK5AiFKVDEtRWdpR2tfOFBFS3pDbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRRWo0cjNWQUFBcVFNRUJJLUs5MVFBQUtrREpBZkNZSDdSNW5lc18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RocFBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhMVE2ODhRNj0BJG5QRmJJQVFvQUQVSFRxUURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMeAAA2AUB4AUB8AXyjAH6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=05fc37623521011853ff69d194aa6d692b6c0504'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '2318891724556922037',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '5654583906891472332',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEMy7oJeqw8e8Thiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE3NjY5Nh8A8P2SArkCIXZ6Ml9mZ2lsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFhYzY5MFRlZi1rXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0BBRHdQdy4umgKJASFJZzhjRDo9ASRuUEZiSUFRb0FEFUhUa1FEb0pVMGxPTXpvME56TXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0DgFlQUEu2AIA4AKtmEjqAk5odHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcHJpY2VHcmFuLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qASv5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggA4AQA8ATF3Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAaWR0ANgFAeAFAfAFwvIX-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=f929565158c7caa5b85e88fa456cdd04d0e4b6d8',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnKwgleAAAAABHMHeiiGh55ThnJwgleAAAAACDF3Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jC8hdiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAcXdn0ewAQE.&s=a93773067b8588465b9c007e19970bd9e08c1b6c&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149417669,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 4,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCKBuBAAAAwDWAAUBCMmFp_AFEMy7oJeqw8e8Thiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MNbJqwc47UhA7UhIAlDF3Z9HWJzxW2AAaM26dXjDuAWAAQGKAQNVU0SSAQEG8FWYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjx1ZignYScsIDI1Mjk4ODUsIDE1Nzc2OTc5OTMpO3VmKCdyJywgMTQ5NDE3NjY5LCAxNRkf8P2SArkCIXZ6Ml9mZ2lsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFhYzY5MFRlZi1rXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0BBRHdQdy4umgKJASFJZzhjRDo9ASRuUEZiSUFRb0FEFUhUa1FEb0pVMGxPTXpvME56TXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQzwmmVBQS7YAgDgAq2YSOoCTmh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvbG9uZ2Zvcm0vYmFzaWNfd19wcmljZUdyYW4uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTV9NT0RFTF9MRUFGX05BTUUSAPICHgoaQ1VTVE9NER0IQVNUAQvwkElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qASv5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggB4AQA8ARhgiCIBQGYBQCgBf8RARQBwAUAyQVpsxTwP9IFCQkJDHgAANgFAeAFAfAFwvIX-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=a3a24cbf148bb959f539e883af3d118f64e81bc9'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '2268711976967571175',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '8379392370800588084',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '6225030428438795793',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '1592368529919250324',
          'nobid': true,
          'ad_profile_id': 1182765
        }]
      }
    }
  }
}
