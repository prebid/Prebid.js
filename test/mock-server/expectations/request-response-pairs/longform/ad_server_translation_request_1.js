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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 15,
            'maxduration': 15
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
            'minduration': 30,
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
            'minduration': 30,
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
            'minduration': 30,
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
            'minduration': 30,
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
            'minduration': 30,
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
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '7360998998672342781',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QKiCKAiBAAAAwDWAAUBCN73l_AFEP39-97ssuGTZhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIVNqMmZTQWlua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCdXVZQ2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFaQmtTcHl1c2Q4XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGN6TS1BRHJoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFOZzhKRnc2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UUs0WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8GVlQUEu2AIA4AKtmEjqAmBodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfY3VzdG9tX2Fkc2VydmVyX3RyYW5zbGEBNfC2Lmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagEksYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAE0uyfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAZXZw2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYFIiwA8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=c92cbcde5c8bf8e053f86493dd4c4698da0392de',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQne-wVeAAAAABH9_t7LloUnZhne-wVeAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=8e35c1264cd1b4f1d89f929c3a4a334cf6a68eca&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
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
                'asset_url': 'http://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QL-COh-BAAAAwDWAAUBCN73l_AFEP39-97ssuGTZhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV40rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFTajJmU0FpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnV1WUNrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWkJrU3B5dXNkOF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjek0tQURyaGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhTmc4SkZ3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFLNFlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBlZUFBLtgCAOACrZhI6gJgaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2N1c3RvbV9hZHNlcnZlcl90cmFuc2xhATV8Lmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChYyFgAgTEVBRl9OQU1FAR0IHgoaNh0ACEFTVAE-8J9JRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBJLGBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBNLsn0eIBQGYBQCgBf______AQUUAcAFAMkFacMU8D_SBQkJCQx4AADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=ca640dffaea7bfcf2b0f2e11d8877821189b74bb'
              }
            }
          }]
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '1919339751435064934',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QKiCKAiBAAAAwDWAAUBCN73l_AFEOasy7zbqrfRGhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIU1EMUZJQWlua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCdXVZQ2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFRclZ0ZGpIUGVBXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGN6TS1BRHJoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASE1QTdmLVE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UUs0WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8GVlQUEu2AIA4AKtmEjqAmBodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfY3VzdG9tX2Fkc2VydmVyX3RyYW5zbGEBNfC2Lmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagEksYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAEi-GfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAZXZw2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYFIiwA8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=c3130de64bc0b8df258e603dfb96f78550ab0c3c',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQne-wVeAAAAABFm1pK3Vd2iGhne-wVeAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=2c3cee10303d9b93531bed443c0781d905270598&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
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
                'asset_url': 'http://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QL-COh-BAAAAwDWAAUBCN73l_AFEOasy7zbqrfRGhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV40rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFNRDFGSUFpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnV1WUNrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBUXJWdGRqSFBlQV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjek0tQURyaGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhNUE3Zi1RNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFLNFlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBlZUFBLtgCAOACrZhI6gJgaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2N1c3RvbV9hZHNlcnZlcl90cmFuc2xhATV8Lmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChYyFgAgTEVBRl9OQU1FAR0IHgoaNh0ACEFTVAE-8J9JRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBJLGBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBIvhn0eIBQGYBQCgBf______AQUUAcAFAMkFacMU8D_SBQkJCQx4AADYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=996a3937245f03e5eefb0cb69917d2d8d7f60424'
              }
            }
          }]
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '3257875652791896280',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '5756905673624319729',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '4205438746002589111',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '204849530930208960',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '3482944224379652843',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '2123689132466331410',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '6150444453316813936',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '2810956382376737966',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '7164199537578897638',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QKhCKAhBAAAAwDWAAUBCN73l_AFEObhocvZsJa2Yxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIXNENXVfQWlta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCdXVZQ2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYSEZfdmZOei1NXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHJoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFDd19DQnc2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UUs0WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8GVlQUEu2AIA4AKtmEjqAmBodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfY3VzdG9tX2Fkc2VydmVyX3RyYW5zbGEBNfC2Lmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagEksYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAEr-WfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAZXZs2AUB4AUB8AXgWPoFBAgAEACQBgGYBgC4BgDBBgUhLADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=2b9ed1e2e7f27fea52cbdc64cb700195bbd14d75',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQne-wVeAAAAABHmcGiZhVlsYxne-wVeAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICLS1oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=8ba7f141449cb45f8b6e12361a62d8d68aa9c812&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
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
                'asset_url': 'http://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QL9COh9BAAAAwDWAAUBCN73l_AFEObhocvZsJa2Yxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV40rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiFzRDV1X0FpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnV1WUNrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWEhGX3ZmTnotTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjek0tQURyaGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhQ3dfQ0J3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFLNFlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBlZUFBLtgCAOACrZhI6gJgaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2N1c3RvbV9hZHNlcnZlcl90cmFuc2xhATV8Lmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChYyFgAgTEVBRl9OQU1FAR0IHgoaNh0ACEFTVAE-8J9JRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBJLGBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBK_ln0eIBQGYBQCgBf______AQUUAcAFAMkFacMU8D_SBQkJCQx0AADYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGCSQo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=527640949733fba32740156d743d421eb1fe2863'
              }
            }
          }]
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '8404712946290777461',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QKiCKAiBAAAAwDWAAUBCN73l_AFEPW6p5bQvOLRdBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCIWp6MkdiZ2lta184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCdXVZQ2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFaQ0RhTlBDYk9NXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHJoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0BBRHdQdy4umgKJASFOUS0yRjo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56TXpRSzRZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQzwZWVBQS7YAgDgAq2YSOoCYGh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvbG9uZ2Zvcm0vYmFzaWNfd19jdXN0b21fYWRzZXJ2ZXJfdHJhbnNsYQE18LYuaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECzEwLjc1Ljc0LjY5qASSxgSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggA4AQA8ATf359HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABldnDYBQHgBQHwBay8FPoFBAgAEACQBgGYBgC4BgDBBgUiLADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=ed84428f432d6e743bcad6f7862aed957bece82b',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQne-wVeAAAAABF13ckC5YmjdBne-wVeAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=7024b063fcacac27e184ed097ad5878c4dd4dc1d&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
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
                'asset_url': 'http://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QL-COh-BAAAAwDWAAUBCN73l_AFEPW6p5bQvOLRdBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV40rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiFqejJHYmdpbWtfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnV1WUNrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWkNEYU5QQ2JPTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjek0tQURyaGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNAQUR3UHcuLpoCiQEhTlEtMkY6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UUs0WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8GVlQUEu2AIA4AKtmEjqAmBodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfY3VzdG9tX2Fkc2VydmVyX3RyYW5zbGEBNXwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7wn0lGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagEksYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAeAEAPAE39-fR4gFAZgFAKAF______8BBRQBwAUAyQVpwxTwP9IFCQkJDHgAANgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=aefe9625d8e866e048a156abdf26d7c626e6a398'
              }
            }
          }]
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '4063389973481762703',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QKiCKAiBAAAAwDWAAUBCN73l_AFEI_fjorv9IOyOBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NDUwNDYyKTsBHTByJywgMTQ5NDE3NjY5Nh8A8P2SArkCIV96eHRIQWlsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCdXVZQ2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFSVExWM2x4c2VJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHJoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFEZy1VQ1E2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOek16UUs0WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8GVlQUEu2AIA4AKtmEjqAmBodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfY3VzdG9tX2Fkc2VydmVyX3RyYW5zbGEBNfC2Lmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagEksYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAExd2fR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAZXZw2AUB4AUB8AXC8hf6BQQIABAAkAYBmAYAuAYAwQYFIiwA8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=2fb33b5204f9b75c58d89487725a9d55139f9ff4',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQne-wVeAAAAABGPr0Pxpg9kOBne-wVeAAAAACDF3Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jC8hdiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAcXdn0ewAQE.&s=f9ec8d0b81c1cf4eefc58a7990f4a0a78440725f&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
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
                'asset_url': 'http://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_custom_adserver_translation.html&e=wqT_3QL-CKB-BAAAAwDWAAUBCN73l_AFEI_fjorv9IOyOBiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MNbJqwc47UhA7UhIAlDF3Z9HWJzxW2AAaM26dXjSuAWAAQGKAQNVU0SSAQEG8FWYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjx1ZignYScsIDI1Mjk4ODUsIDE1Nzc0NTA0NjIpO3VmKCdyJywgMTQ5NDE3NjY5LCAxNRkf8P2SArkCIV96eHRIQWlsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCdXVZQ2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFSVExWM2x4c2VJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHJoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFEZy1VQ1E2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOek16UUs0WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8GVlQUEu2AIA4AKtmEjqAmBodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfY3VzdG9tX2Fkc2VydmVyX3RyYW5zbGEBNXwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7wn0lGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagEksYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAeAEAPAExd2fR4gFAZgFAKAF______8BBRQBwAUAyQVpwxTwP9IFCQkJDHgAANgFAeAFAfAFwvIX-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=6b79542e3cee0319d8cb83d1daf127c3aeea9b28'
              }
            }
          }]
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '5097385192927446024',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '201bba5bb8827',
          'tag_id': 15394006,
          'auction_id': '2612757136292876686',
          'nobid': true,
          'ad_profile_id': 1182765
        }]
      }
    }
  }
}
