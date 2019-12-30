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
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '198494455120718841',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKcCKAcBAAAAwDWAAUBCM2Op_AFEPnX6_r7tMzgAhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIXpUMDRwQWlta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFhejg2NVNoMGVJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZc2xxUVUJE0RBRHdQdy4umgKJASFKQTkzRFE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelEzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQ32gQCCADgBADwBK_ln0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx0AADYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=645b6e0a37eb3a315bc3208365bd4fc03e1ecd18',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQlNxwleAAAAABH561q_pzHBAhlNxwleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=35a21bf0bef1ca2c138e37a2e025ad523b5a1db2&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL4COh4BAAAAwDWAAUBCM2Op_AFEPnX6_r7tMzgAhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4xbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiF6VDA0cEFpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBYXo4NjVTaDBlSV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME4tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWXNscVFVCRNEQUR3UHcuLpoCiQEhSkE5M0RRNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRM1FNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBeZUFBLtgCAOACrZhI6gJZaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3JlcXVpcmVFeGFjdER1cmEBLnwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7wkElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATC5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0N9oEAggB4AQA8ARhjSCIBQGYBQCgBf8RARQBwAUAyQVpvhTwP9IFCQkJDHQAANgFAeAFAfAF4Fj6BQQIABAAkAYBmAYAuAYAwQYJJCjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=cf3130989b2b4fe5271240d65055b85d1192b78a'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '998265386177420565',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCM2Op_AFEJW6sbXGoqPtDRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCIVdqM1Jid2lHa184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFFajRyM1ZBQUFxUU1FQkktSzkxUUFBS2tESkFmcXpCNjduMU9rXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRGhwUF9EN29EQ1ZOSlRqTTZORGMwTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZc2xxUVUJE0BBRHdQdy4umgKJASFLZzlMRDo9ASRuUEZiSUFRb0FEFUhUcVFEb0pVMGxPTXpvME56UTNRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQzwXmVBQS7YAgDgAq2YSOoCWWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvbG9uZ2Zvcm0vYmFzaWNfd19yZXF1aXJlRXhhY3REdXJhAS7wny5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEwuYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDfaBAIIAOAEAPAE39-fR4gFAZgFAKAF______8BBRQBwAUAyQVpYhTwP9IFCQkJDHgAANgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGCSUo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=33f01ddfb15bc84d7bf134a168aeb9d9de76fa57',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQlNxwleAAAAABEVXaxmFI3aDRlNxwleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=023640de7c18a0d0e80b2456144b89a351455cda&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149417951,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 13.000010,
            'cpm_publisher_currency': 13.000010,
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCM2Op_AFEJW6sbXGoqPtDRiq5MnUovf28WEqNgmOWItPAQAqQBGOWItPAQAqQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV4xbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiFXajNSYndpR2tfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRRWo0cjNWQUFBcVFNRUJJLUs5MVFBQUtrREpBZnF6QjY3bjFPa18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RocFBfRDdvRENWTkpUak02TkRjME4tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWXNscVFVCRNAQUR3UHcuLpoCiQEhS2c5TEQ6PQEkblBGYklBUW9BRBVIVHFRRG9KVTBsT016bzBOelEzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEufC5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAIExFQUZfTkFNRQEdCB4KGjYdAAhBU1QBPvCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQ32gQCCAHgBADwBGGNIIgFAZgFAKAF_xEBFAHABQDJBWm-FPA_0gUJCQkMeAAA2AUB4AUB8AWsvBT6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=515ab42a7fdcad8fcf34e4fb98b1e076a75006a9'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '8884527464400177295',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKcCKAcBAAAAwDWAAUBCM2Op_AFEI-RmcaB1Yumexiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCITVqcmtHUWlta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYb0paejlaR09NXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZc2xxUVUJE0BBRHdQdy4umgKJASFPdy1pRjo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56UTNRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQzwXmVBQS7YAgDgAq2YSOoCWWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvbG9uZ2Zvcm0vYmFzaWNfd19yZXF1aXJlRXhhY3REdXJhAS7wny5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEwuYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDfaBAIIAOAEAPAExOefR4gFAZgFAKAF______8BBRQBwAUAyQVpYhTwP9IFCQkJDHQAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYJJCjwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=dc7d874e52ac39980ec1070a7769632be56a2f00',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQlNxwleAAAAABGPSMYYqC5MexlNxwleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=9fd739e9f0a6054296f9bb5168c49a89a425795c&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL4COh4BAAAAwDWAAUBCM2Op_AFEI-RmcaB1Yumexiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4xbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiE1anJrR1FpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWG9KWno5WkdPTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME4tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWXNscVFVCRNAQUR3UHcuLpoCiQEhT3ctaUY6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelEzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEufC5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAIExFQUZfTkFNRQEdCB4KGjYdAAhBU1QBPvDtSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQ32gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPA_0Ab1L9oGFgoQAIkAFQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=1f8ea8f07f781fe149beb0d65dd25ad725a12f3b'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '1279521442385130931',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCM2Op_AFELPr8f6Pv_HgERiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE3NjY5Nh8A8P2SArkCIW9EeDJEQWlsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFkb01fcFZkVGVVXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGMwTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZc2xxUVUJE0RBRHdQdy4umgKJASFKdzlKRHc2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOelEzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQ32gQCCADgBADwBMXdn0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx4AADYBQHgBQHwBcLyF_oFBAgAEACQBgGYBgC4BgDBBgklKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=4b14660ae659b3d301ec6c40f0f096bb88db145b',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQlNxwleAAAAABGzddz_-MXBERlNxwleAAAAACDF3Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jC8hdiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAcXdn0ewAQE.&s=5f277bcab624f05c9d3a3a9c111961f3f33ccca2&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL5CKB5BAAAAwDWAAUBCM2Op_AFELPr8f6Pv_HgERiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MNbJqwc47UhA7UhIAlDF3Z9HWJzxW2AAaM26dXjFuAWAAQGKAQNVU0SSAQEG8FWYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjx1ZignYScsIDI1Mjk4ODUsIDE1Nzc2OTkxNDkpO3VmKCdyJywgMTQ5NDE3NjY5LCAxNRkf8P2SArkCIW9EeDJEQWlsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFkb01fcFZkVGVVXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGMwTi1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZc2xxUVUJE0RBRHdQdy4umgKJASFKdzlKRHc2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOelEzUU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEufC5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAIExFQUZfTkFNRQEdCB4KGjYdAAhBU1QBPvDeSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQ32gQCCAHgBADwBMXdn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXC8hf6BQQIABAAkAYBmAYAuAYAwQYAAGHxKPA_0Ab1L9oGFgoQAQ8uAQBQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=7bb7b75e4769a1260eaed2c79752ee542b4d28ce'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '7664937561033023835',
          'nobid': true,
          'ad_profile_id': 1182765
        }]
      }
    }
  }
}
