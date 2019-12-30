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
          'auction_id': '4631210661889362034',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEPKQq-_0sdeiQBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIXF6eU1HUWlua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFVQk5fYTFxbHU0XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0RBRHdQdy4umgKJASFTd19PR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0M9oEAggA4AQA8ATS7J9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=0dae5294ed5bb48b7d3a156e5e587a26da27c7e1',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABFyyOpNj11FQBk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=9085e4dbb4849b0e6d3714d84a2754bbab578e16&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEPKQq-_0sdeiQBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4z7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFxenlNR1FpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVUJOX2ExcWx1NF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNEQUR3UHcuLpoCiQEhU3dfT0d3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=aa5533d04e16ee398f8028ab3af03a48d7d8cc17'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '714778825826946473',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEKmbi7Ph8dn1CRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIU56dmJOZ2lua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFRbjlXUzRmY09jXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0BBRHdQdy4umgKJASEtUTZrXzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56UXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0UwFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCADgBADwBIvhn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG9S_aBhYKEAAAaakRAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=8917b1722eed5b6d85c6d5a01eea7862089bee32',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABGpzWIWjmfrCRk3yQleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=9ec7e7de16b948b60d74b47f1917faf5d3b6dbf0&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEKmbi7Ph8dn1CRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4z7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFOenZiTmdpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBUW45V1M0ZmNPY18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNAQUR3UHcuLpoCiQEhLVE2a186PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8N5JRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDPaBAIIAeAEAPAEi-GfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAAAAAAADYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgAAYfQo8D_QBvUv2gYWChABDy4BAFAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=8198652a5ee16abf4595ab1bfc6b051f81f0579d'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '231404788116786844',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFEJydmpjcrYebAxiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIUVqMFlVZ2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFhLXFPTExmZ2VrXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0RBRHdQdy4umgKJASFTd19PR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0M9oEAggA4AQA8ATS7J9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=775dfc49086467337dee9a5e8d78b361931c6aaa',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABGcjgbDbR02Axk3yQleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=914256a92514df787ccb1eae7dea7578d23c8fba&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFEJydmpjcrYebAxiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4z7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFFajBZVWdpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBYS1xT0xMZmdla18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNEQUR3UHcuLpoCiQEhU3dfT0d3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCAHgBADwBGGQIIgFAZgFAKAF_xEBFAHABQDJBWnBFPA_0gUJCQkMeAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=f624619431372f9a248d0fa0dd8d09c4977bb544'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '7557072342526904599',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKfCKAfBAAAAwDWAAUBCLeSp_AFEJeS-7GaqIfwaBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIUFqdmVKQWlta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFSY2lLblVqeU9VXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0BBRHdQdy4umgKJASFJQS1IRDo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56UXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0dQFlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCADgBADwBK_ln0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXgWPoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPC_0Ab1L9oGFgoQAAAAAAAAAAAAAAAAAAAAABAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=552663ed1246fd2a3cc5824164f57d32f18078ee',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQk3yQleAAAAABEXyT6mQR3gaBk3yQleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=e1c80e622aa60bf7683413f4371b0055d0d16f47&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL7COh7BAAAAwDWAAUBCLeSp_AFEJeS-7GaqIfwaBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4z7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiFBanZlSkFpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBUmNpS25VanlPVV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNAQUR3UHcuLpoCiQEhSUEtSEQ6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlxodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX2JyYW5kQ2F0ZWdvcnlFeGNsdXNpb24uaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPTQ0WQExFQUZfTkFNRRIA8gIeChpDMh0ACEFTVAEo8JBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEy-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDPaBAIIAeAEAPAEYZAgiAUBmAUAoAX_EQEYAcAFAMkFAAUBFPA_0gUJCQULeAAAANgFAeAFAfAF4Fj6BQQIABAAkAYBmAYAuAYAwQYBIDAAAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=ccf266d1b02551a2ad0af0871d4af43e4aee4bba'
              }
            }
          }]
        }, {
          'uuid': '2c52d7d1f2f703',
          'tag_id': 15394006,
          'auction_id': '5093465143102876632',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QKgCKAgBAAAAwDWAAUBCLeSp_AFENjX7JP78efXRhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIUJUeXRwUWlua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCcktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYamVBMVdNcXUwXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0RBRHdQdy4umgKJASEtUTZrX2c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9FMBZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATL5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0M9oEAggA4AQA8ASL4Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAGmpEQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=6651c1436b699842aabb3ae53d96d07caf5b4938',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQk3yQleAAAAABHYK3uyj5-vRhk3yQleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=f62098bf5037b22ca4e5583289a1527fdfa87e43&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_brandCategoryExclusion.html&e=wqT_3QL8COh8BAAAAwDWAAUBCLeSp_AFENjX7JP78efXRhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4z7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5NjM5KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFCVHl0cFFpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQnJLY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWGplQTFXTXF1MF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNEQUR3UHcuLpoCiQEhLVE2a19nNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJcaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19icmFuZENhdGVnb3J5RXhjbHVzaW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFkBMRUFGX05BTUUSAPICHgoaQzIdAAhBU1QBKPDeSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMvmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCAHgBADwBIvhn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXa1gL6BQQIABAAkAYBmAYAuAYAwQYAAGH0KPA_0Ab1L9oGFgoQAQ8uAQBQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=4b43aaab766ee7d2e4c900ec32cb3c8b7ccef1d0'
              }
            }
          }]
        }]
      }
    }
  }
}
