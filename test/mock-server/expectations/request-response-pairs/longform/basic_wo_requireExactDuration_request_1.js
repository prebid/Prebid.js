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
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '8905202273088829598',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCLWXp_AFEJ7x1-ORyejKexiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIWlEeE84Z2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFhV09TRWpDY09NXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0BBRHdQdy4umgKJASFQZzlaRjo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56YzNRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0DgFlQUEu2AIA4AKtmEjqAlpodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX3JlcXVpcmVFeGFjdER1cmF0aW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc3N9oEAggA4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAZWQU8D_SBQkJBQt4AAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgEgMAAA8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=21195aa3e27f8eb88ba43d5da32e6b78c2aa03f8',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQm1ywleAAAAABGe-HUcSaKVexm1ywleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=3c05b8509dd5c7c4459886f4c69fdd9cd07caa66&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCLWXp_AFEJ7x1-ORyejKexiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV41rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiFpRHhPOGdpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBYVdPU0VqQ2NPTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjM04tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCYWtscVFVCRNAQUR3UHcuLpoCiQEhUGc5WkY6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlpodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX3JlcXVpcmVFeGFjdER1cmF0aW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTQUWPExFQUZfTkFNRRIA8gIeChoyMwDwwkxBU1RfTU9ESUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBNXmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0Nzc32gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAGXObNgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYFISwA8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=203ae79160a460b18f20165e5de53bb1f45e4933'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '2428831247136753876',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFENSR0sfppLzaIRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCIXRUeV9FQWlta184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFTek5nNXJvQi0wXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFVUThpSFE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NzfaBAIIAOAEAPAE39-fR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=af2d5096aa4f934e84b59ad16cd18dfe5b9bbc77',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABHUiPSYJvG0IRm1ywleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=440a389c7f556dac70c650bb1e593a10cbcdf2af&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6COh6BAAAAwDWAAUBCLWXp_AFENSR0sfppLzaIRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV41rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiF0VHlfRUFpbWtfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBU3pOZzVyb0ItMF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjM04tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCYWtscVFVCRNEQUR3UHcuLpoCiQEhVVE4aUhRNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpjM1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc3N9oEAggB4AQA8ATf359HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlznDYBQHgBQHwBay8FPoFBAgAEACQBgGYBgC4BgDBBgUiLADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=9b00ed17c420f328d63b72519d2d578c5921d0d7'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '1625697369389546128',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFEJD1gLbO5OjHFhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIXVqeHMtUWlua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFhcDVwSkxuSXVVXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFBQTlhQUE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NzfaBAIIAOAEAPAEi-GfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=0e70f535a95c82238d685147f41e0bd2f86631c0',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABGQOsDmJKOPFhm1ywleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=144214d77cc4ced0893c9fe64132ad01c429c43c&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6COh6BAAAAwDWAAUBCLWXp_AFEJD1gLbO5OjHFhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV41rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiF1anhzLVFpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBYXA1cEpMbkl1VV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjM04tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCYWtscVFVCRNEQUR3UHcuLpoCiQEhQUE5YUFBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpjM1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc3N9oEAggB4AQA8ASL4Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlznDYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgUiLADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=f6bc475b66c167036dcb9f10c7c5f176124829a6'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '5434800203981031918',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCLWXp_AFEO6TivzZv5K2Sxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIW5Ud3I5QWlta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFXVVcwV1Y1LU9JXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFKdzh1RGc2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NzfaBAIIAOAEAPAEr-WfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULeAAAANgFAeAFAfAF4Fj6BQQIABAAkAYBmAYAuAYAwQYBIDAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=c3ba85f0eb0293896e02066385f82b4450af2cfb',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQm1ywleAAAAABHuiYKf_UlsSxm1ywleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=9eb2d880fa9b524a6a0807eef0c65b7b1393f48a&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCLWXp_AFEO6TivzZv5K2Sxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV41rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiFuVHdyOUFpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBV1VXMFdWNS1PSV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjM04tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCYWtscVFVCRNEQUR3UHcuLpoCiQEhSnc4dURnNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpjM1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc3N9oEAggB4AQA8ASv5Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlzmzYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGBSEsAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=17038c2671b58d2fd6ea98dd3f3e1166ee664dd0'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '8071104954749355970',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFEMKP7OWZ5pSBcBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIXBUeEJEQWlsa184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFRbWtta1pXNGVZXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFSZ19sR1E2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NzfaBAIIAOAEAPAE0uyfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=005579c0ff91586a887354409f637a63a1d69031',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABHCB7ucMVMCcBm1ywleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=edbfae73be0f41d672298d5c3ec9dd28a5307233&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149419602,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6CKB6BAAAAwDWAAUBCLWXp_AFEMKP7OWZ5pSBcBiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MNbJqwc47UhA7UhIAlDS7J9HWJzxW2AAaM26dXjWuAWAAQGKAQNVU0SSAQEG8FWYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjx1ZignYScsIDI1Mjk4ODUsIDE1Nzc3MDAyNzcpO3VmKCdyJywgMTQ5NDE5NjAyLCAxNRkf8P2SArkCIXBUeEJEQWlsa184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFRbWtta1pXNGVZXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFSZ19sR1E2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlpodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX3JlcXVpcmVFeGFjdER1cmF0aW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTQUWPExFQUZfTkFNRRIA8gIeChoyMwDwwkxBU1RfTU9ESUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBNXmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0Nzc32gQCCAHgBADwBNLsn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAGXOcNgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGBSIsAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=0ac18b64a6c0d58a114085d8b565b4c98de56448'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '6893555531330982923',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFEIuopuO2h7XVXxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE0MTg4Nh8A8P2SArkCIVFqd1R0Z2lHa184UEVLekNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFFajRyM1ZBQUFxUU1FQkktSzkxUUFBS2tESkFZS1J6NEZQV2V3XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRGhwUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASEzUTZnOHc2PQEkblBGYklBUW9BRBVIVHFRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NzfaBAIIAOAEAPAErMKfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAF8owB-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=f9ddb1066825dfc556d108168ffc0d16cf567ae8',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABELlGlsO9SqXxm1ywleAAAAACCswp9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jyjAFiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAazCn0ewAQE.&s=db3a0d52f97edd94aa7e4213c437d8e4a5bd16ce&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6COh6BAAAAwDWAAUBCLWXp_AFEIuopuO2h7XVXxiq5MnUovf28WEqNgmOWItPAQAqQBGOWItPAQAqQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQrMKfR1ic8VtgAGjNunV41rgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxNDE4OCwgMTUZH_D9kgK5AiFRandUdGdpR2tfOFBFS3pDbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRRWo0cjNWQUFBcVFNRUJJLUs5MVFBQUtrREpBWUtSejRGUFdld18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RocFBfRDdvRENWTkpUak02TkRjM04tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCYWtscVFVCRNEQUR3UHcuLpoCiQEhM1E2Zzh3Nj0BJG5QRmJJQVFvQUQVSFRxUURvSlUwbE9Nem8wTnpjM1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc3N9oEAggB4AQA8ASswp9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlznDYBQHgBQHwBfKMAfoFBAgAEACQBgGYBgC4BgDBBgUiLADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=917c8192c7dc7e382c0bb7296ab0df261e69f572'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '5615186251901272031',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '6647218197537074925',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '4707051182303115567',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '4831890668873532085',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '7151522995196673389',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '4077353832159380438',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFENaHwKvS9urKOBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE3NjY5Nh8A8P2SArkCIWJqeHo1UWlsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFZd1VQNVZMNi1VXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFLZzhBRUE2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NzfaBAIIAOAEAPAExd2fR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAFwvIX-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=e96d121a0a7d49e05c1d2b4fab2da60d0b544287',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABHWA3AltauVOBm1ywleAAAAACDF3Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jC8hdiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAcXdn0ewAQE.&s=8d90e3ce42fe47da19cb85f8fb2d78822c590464&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6CKB6BAAAAwDWAAUBCLWXp_AFENaHwKvS9urKOBiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MNbJqwc47UhA7UhIAlDF3Z9HWJzxW2AAaM26dXjWuAWAAQGKAQNVU0SSAQEG8FWYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjx1ZignYScsIDI1Mjk4ODUsIDE1Nzc3MDAyNzcpO3VmKCdyJywgMTQ5NDE3NjY5LCAxNRkf8P2SArkCIWJqeHo1UWlsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFZd1VQNVZMNi1VXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGMzTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJha2xxUVUJE0RBRHdQdy4umgKJASFLZzhBRUE2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOemMzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlpodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX3JlcXVpcmVFeGFjdER1cmF0aW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTQUWPExFQUZfTkFNRRIA8gIeChoyMwDwwkxBU1RfTU9ESUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBNXmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0Nzc32gQCCAHgBADwBMXdn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAGXOcNgFAeAFAfAFwvIX-gUECAAQAJAGAZgGALgGAMEGBSIsAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=db30796cc71c3bee3aa8fc2890c75ad7186f9d73'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '2099457773367093540',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '7214207858308840891',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '4564285281969145467',
          'nobid': true,
          'ad_profile_id': 1182765
        }]
      }
    }
  }
}
