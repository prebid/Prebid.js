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
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '6316075342634007031',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEPfztqL2oc3TVxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIV96eWNLZ2lua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFZYkYwSW1fZGU0XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0BBRHdQdy4umgKJASE5dzR0Xzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56VXdRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0UwFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCADgBADwBIvhn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAaakRAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=bb81a081c756fd493253bf765c06ff46888f009a',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABH3uU1kDzWnVxk3yQleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=a3da30186f69a5ce2edcfc14fa3a31b92ee70060&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEPfztqL2oc3TVxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFfenljS2dpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWWJGMEltX2RlNF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNAQUR3UHcuLpoCiQEhOXc0dF86PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTDaBAIIAeAEAPAEYZAgiAUBmAUAoAX_EQEUAcAFAMkFacEU8D_SBQkJCQx4AADYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=62b9db151b3739399e0970c74fafc4bb61486510'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '8259815099516488747',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKfCKAfBAAAAwDWAAUBCLeSp_AFEKuY2qihwrDQchiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIW1UeUFCd2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYNml4eGFGdE8wXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFOUTg3RkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAAGmpDQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=8a55db8e788616ef057647b49c0560296fdacb65',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQk3yQleAAAAABErjBYVEsKgchk3yQleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=75d46be63f76fd4062f354a56c692855da366148&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL7COh7BAAAAwDWAAUBCLeSp_AFEKuY2qihwrDQchiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiFtVHlBQndpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWDZpeHhhRnRPMF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhTlE4N0ZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPDtSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPA_0Ab1L9oGFgoQAIkDFQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=59e0ab1f626c2e4dc5c4f6e6837b77559cf502b4'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '7960926407704980889',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEJnboLK5jLm9bhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCIUZEeFl4QWlta184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFhSUpVQVhXMC1JXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFTQThFR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATf359HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=8d00bc7576c3cc19fe8b3fb4aa42966583741dfa',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABGZLUiWY-R6bhk3yQleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=c813392cbb81d43466d5d949b9bebc2305e6fe7d&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEJnboLK5jLm9bhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiFGRHhZeEFpbWtfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBYUlKVUFYVzAtSV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhU0E4RUd3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AWsvBT6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=284760a6e2d4f226b639d29237e9c1aa25ca49a9'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '7561862402601574638',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEO7By9umucj4aBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCITREcWpId2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFTSVA1dzg5RGVRXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0BBRHdQdy4umgKJASFTUTlYRzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56VXdRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0UwFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCADgBADwBNLsn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAaakRAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=917e8af2ed1c82091f487b6abd78de47b99e9e46',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABHu4HJryiHxaBk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=ff73768bfb14e9ae603064fc91e95b60c8d872e2&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEO7By9umucj4aBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiE0RHFqSHdpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBU0lQNXc4OURlUV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNAQUR3UHcuLpoCiQEhU1E5WEc6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTDaBAIIAeAEAPAEYZAgiAUBmAUAoAX_EQEUAcAFAMkFacEU8D_SBQkJCQx4AADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=84c66b632a2930d28092e00985ee154ba2e97288'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '6577796711489765634',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEIKC0sii6MGkWxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIVBUem53UWlua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFlaE5hMWl1Y3V3XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASE5dzR0X2c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ASL4Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=ea4a54786a8f3cf5177b3372ce97682da060c358',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABECgRQpQgdJWxk3yQleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=778fbf3014328ec0b01d6ebd7b306be32cf79950&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEIKC0sii6MGkWxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFQVHpud1FpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZWhOYTFpdWN1d18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhOXc0dF9nNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=28a3b583912b95528519f63a75c0fe2d06064e7b'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '2418275491761094586',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFELr_z7v0l9zHIRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIUF6MUJSZ2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFVNUE2dXpUVy1ZXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFTUTlYR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATS7J9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=c563626304ebb31fd6f1644cc2d4098133dec096',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABG6_3NHv3CPIRk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=88c9fbb2b9dc273865a5f9238543a29224908b26&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFELr_z7v0l9zHIRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFBejFCUmdpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVTVBNnV6VFctWV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhU1E5WEd3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=e76aeb8daad477f4428631fc89d277d4a4646ded'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '5990197965284733361',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFELHjwfj9qd2QUxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIURUeDF3d2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFmWXBYSEoxUGVNXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0BBRHdQdy4umgKJASFTUTlYRzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56VXdRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0UwFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCADgBADwBNLsn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAaakRAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=e443347514ff5f6a52a2811f591f9a346061a756',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABGxcRDfT3UhUxk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=50348eb78116f7d35ca5ac6f6fa4c5548a6ceffc&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFELHjwfj9qd2QUxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFEVHgxd3dpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZllwWEhKMVBlTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNAQUR3UHcuLpoCiQEhU1E5WEc6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTDaBAIIAeAEAPAEYZAgiAUBmAUAoAX_EQEUAcAFAMkFacEU8D_SBQkJCQx4AADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=a24f331ff55f96c5afe5134762f8d8e230b6287c'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '4399290132982250349',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEO32psKU4tqGPRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCITN6dDlwd2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFRWlZqbkpncmV3XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0BBRHdQdy4umgKJASFTUTlYRzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56VXdRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0UwFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCADgBADwBNLsn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAaakRAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=0d9b0a06992ff427d281fae8d8b18d4e6838b944',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABFtu0lIEWsNPRk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=52a446d84f5e9a2baa068760c4406f4a567a911a&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEO32psKU4tqGPRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiEzenQ5cHdpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBUVpWam5KZ3Jld18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNAQUR3UHcuLpoCiQEhU1E5WEc6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTDaBAIIAeAEAPAEYZAgiAUBmAUAoAX_EQEUAcAFAMkFacEU8D_SBQkJCQx4AADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgklKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=e6ae592b5fc3de0053b5acd46294b83549aa00c8'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '8677372908685012092',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEPzYku74lY62eBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIVVEeGp5d2lua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFVN29abmh2c09RXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASE5dzR0X2c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ASL4Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=522b764f2276ce75053a55a0198b79fb8d1d39d5',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABF8rMSNrzhseBk3yQleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=02b75d0ecc71c7897b9590be5e50b094158c8097&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEPzYku74lY62eBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFVRHhqeXdpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVTdvWm5odnNPUV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhOXc0dF9nNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=0ae5558a7b0cc87eaa0c6811522629963b41bac5'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '617065604518434488',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFELitu4PevJDICBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIUFqMVNSZ2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFaUzdZYTg5Ny13XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFTUTlYR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9HYBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATS7J9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAAAAAAAAAAAAAAAAAAAAEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=f59bdb7b0f7020f75c6019f23686915b72d61779',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABG41m7g5UGQCBk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=912a721db8e85d4d64a8869d7cf9b56cd0c24907&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFELitu4PevJDICBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFBajFTUmdpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWlM3WWE4OTctd18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhU1E5WEd3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBGAHABQDJBQAFARTwP9IFCQkFC3wAAADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgEhMAAA8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=9b4372ae0674305d9cd7152959910d1fa7d4daec'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '8957511111704921777',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKfCKAfBAAAAwDWAAUBCLeSp_AFELGNpebanN6nfBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIXVqdHppQWlta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFUM1dNOVpkQU9JXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0BBRHdQdy4umgKJASFIZzhRRDo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56VXdRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0UwFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCADgBADwBK_ln0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXgWPoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPC_0Ab1L9oGFgoQAAAAaakNAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=a8817d9dc3326ba1b59fe308f126ddaca5710a9c',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQk3yQleAAAAABGxRsms5XhPfBk3yQleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=a0ac94e902cbc609881fa9f39537bbc67ba046e7&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL7COh7BAAAAwDWAAUBCLeSp_AFELGNpebanN6nfBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiF1anR6aUFpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVDNXTTlaZEFPSV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNAQUR3UHcuLpoCiQEhSGc4UUQ6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTDaBAIIAeAEAPAEYZAgiAUBmAUAoAX_EQEUAcAFAMkFacEU8D_SBQkJCQx0AADYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGCSQo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=75b3ad3e867323196da165cd655b3ae51c8b44d0'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '2680240375770812721',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKfCKAfBAAAAwDWAAUBCLeSp_AFELGi6rO9jYiZJRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIWd6eTMtZ2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYcFdVTk9rai1jXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFOUTg3RkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAAGmpDQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=f8458c6a48fed591c269169a9744aba11cb90285',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQk3yQleAAAAABExkXrWayAyJRk3yQleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=e2dbd082b353a37db9f632efc2532913a0c48166&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL7COh7BAAAAwDWAAUBCLeSp_AFELGi6rO9jYiZJRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiFnenkzLWdpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWHBXVU5Pa2otY18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhTlE4N0ZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPDtSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPA_0Ab1L9oGFgoQAIkDFQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=5475ac640321ae51a06b5c05ac62519e97e90114'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '8439286287321689724',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKfCKAfBAAAAwDWAAUBCLeSp_AFEPzciY2kxZePdRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIU1UeWZ6d2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFWalR1QThjek9FXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFOUTg3RkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAAGmpDQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=73e760427d2aec3d47824994cf35c35f1eeddcf8',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQk3yQleAAAAABF8bqJBKl4edRk3yQleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=dac1e836a6f2c4dc036c50d0b3128dfefb34915d&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL7COh7BAAAAwDWAAUBCLeSp_AFEPzciY2kxZePdRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiFNVHlmendpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVmpUdUE4Y3pPRV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhTlE4N0ZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPDtSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPA_0Ab1L9oGFgoQAIkDFQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=6c1fb35564d2ffd08fb4c5b290aadd6e1e3d83ec'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '5519278898732145414',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEIa29Pmn3ZrMTBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCITFEc0hwUWlta184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFkQUZ3YVliRWVNXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFTQThFR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATf359HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=d01f411e7cc9126e912daca85136b2ca6f99a347',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABEGGz1_6mqYTBk3yQleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=81115280cee86ae0bc259627410fa5dbbc178646&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEIa29Pmn3ZrMTBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiExRHNIcFFpbWtfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZEFGd2FZYkVlTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhU0E4RUd3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AWsvBT6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=90f21feeb2c798cd77b3cadbc961240238825f0d'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '6754624236211478320',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKfCKAfBAAAAwDWAAUBCLeSp_AFELC-hPXI3s_eXRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIVJqc0hVUWlta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFaRjJPd05MVnVvXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTU9BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZNGxxUVUJE0RBRHdQdy4umgKJASFOUTg3RkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV3UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc1MNoEAggA4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAAGmpDQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=34811f7e5c917550619274f5b75a0cd214119812',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQk3yQleAAAAABEwH6GO9D69XRk3yQleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=d811faa48963b18d33c0a1f9d1e64ff97640a415&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL7COh7BAAAAwDWAAUBCLeSp_AFELC-hPXI3s_eXRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4ybgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiFSanNIVVFpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWkYyT3dOTFZ1b18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU1PQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTRscVFVCRNEQUR3UHcuLpoCiQEhTlE4N0ZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVd1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPDtSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUw2gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPA_0Ab1L9oGFgoQAIkDFQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=c0a0a2d65dd091bd2ed81f95da1a9f7ff16ad70e'
              }
            }
          }]
        }]
      }
    }
  }
}
