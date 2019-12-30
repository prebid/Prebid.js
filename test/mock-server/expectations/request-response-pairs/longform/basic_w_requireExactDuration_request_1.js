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
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '4424969993715088689',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCM2Op_AFELH6mcm82Km0PRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIWhUNEwzZ2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFjek5XT196NC1VXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFTZy1SR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCADgBADwBNLsn0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx4AADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgklKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=3d8c006f4f85ecffd49c500554c3852b9079ff2b',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQlNxwleAAAAABExfSbJw6ZoPRlNxwleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=e2c6cedf67a96613ea8851673ebcfdd25a19435c&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCM2Op_AFELH6mcm82Km0PRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4lbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFoVDRMM2dpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBY3pOV09fejQtVV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhU2ctUkd3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBeZUFBLtgCAOACrZhI6gJZaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3JlcXVpcmVFeGFjdER1cmEBLnwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7wkElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATC5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggB4AQA8ARhjSCIBQGYBQCgBf8RARQBwAUAyQVpvhTwP9IFCQkJDHgAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=de23f822f483b6e85615d4297d872262310c240d'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '2013100091803497646',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '2659371493620557151',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCM2Op_AFEN_KtpiJif_zJBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIWR6eUJxQWlua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFWSHZpWGF0Q09zXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASEtQTVuX2c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCADgBADwBIvhn0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx4AADYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgklKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=eafba287adec58427d1679f43a84ebb19223c4e7',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQlNxwleAAAAABFfpQ2TSPznJBlNxwleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=b335b2c79378c1699d54cf9ffe097958bd989a0b&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCM2Op_AFEN_KtpiJif_zJBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4lbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFkenlCcUFpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVkh2aVhhdENPc18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhLUE1bl9nNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBeZUFBLtgCAOACrZhI6gJZaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3JlcXVpcmVFeGFjdER1cmEBLnwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7wkElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATC5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggB4AQA8ARhjSCIBQGYBQCgBf8RARQBwAUAyQVpvhTwP9IFCQkJDHgAANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=66b9e769da1e1d68b202605fc178fc172046e9c5'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '5424637592449788792',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '3470330348822422583',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '4415549097692431196',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '1628359298176905427',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '1949183409076770477',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '4707958683377993236',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '2499032734231846767',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '1295788165766409083',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKcCKAcBAAAAwDWAAUBCM2Op_AFEPvWpeWKj-T9ERiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCITR6eVM5d2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFlS0tONGIwQS00XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFOZzkxRkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCADgBADwBMTnn0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx0AADYBQHgBQHwBZk9-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=3cb170cdf53cd6a6bfec0676659daeb6170895e3',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQlNxwleAAAAABF7a6mseJD7ERlNxwleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=45f5cce314725120ec769afaacbb7aa92d32e674&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL4COh4BAAAAwDWAAUBCM2Op_AFEPvWpeWKj-T9ERiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4lbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiE0enlTOXdpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBZUtLTjRiMEEtNF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhTmc5MUZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBeZUFBLtgCAOACrZhI6gJZaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3JlcXVpcmVFeGFjdER1cmEBLnwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7w7UlGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATC5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggB4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwP9AG9S_aBhYKEACJABUBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=5c9f03b9c5c6cc2bf070d8cdc6c9af4b06595879'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '702761892273189154',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKcCKAcBAAAAwDWAAUBCM2Op_AFEKLi_7T7xq3gCRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE4NDg2Nh8A8P2SArkCITdUeVNDd2lva184UEVQYmpuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFHSTh5N21BQUFzUU1FQmlQTXU1Z0FBTEVESkFYQTM4QzJIcnVFXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHFKUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFaQThESlE2PQEkblBGYklBUW9BRBVIVHNRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCADgBADwBPbjn0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx0AADYBQHgBQHwBf0F-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=f459a78a1b20c9643b90d7491f22593d79cff253',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQlNxwleAAAAABEi8Z-2N7bACRlNxwleAAAAACD2459HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1j9BWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgB9uOfR7ABAQ..&s=83289d261bced5258930a1ce2464260a96565241&event_type=1',
            'usersync_url': 'https%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 149418486,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 14.000010,
            'cpm_publisher_currency': 14.000010,
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL4COh4BAAAAwDWAAUBCM2Op_AFEKLi_7T7xq3gCRiq5MnUovf28WEqNgmOWItPAQAsQBGOWItPAQAsQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ9uOfR1ic8VtgAGjNunV4lbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxODQ4NiwgMTUZH_D9kgK5AiE3VHlTQ3dpb2tfOFBFUGJqbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRR0k4eTdtQUFBc1FNRUJpUE11NWdBQUxFREpBWEEzOEMySHJ1RV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RxSlBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNEQUR3UHcuLpoCiQEhWkE4REpRNj0BJG5QRmJJQVFvQUQVSFRzUURvSlUwbE9Nem8wTnpNelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBeZUFBLtgCAOACrZhI6gJZaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3JlcXVpcmVFeGFjdER1cmEBLnwuaHRtbPICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFjIWACBMRUFGX05BTUUBHQgeCho2HQAIQVNUAT7w7UlGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATC5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczM9oEAggB4AQA8AT2459HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAF_QX6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwP9AG9S_aBhYKEACJABUBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=16a432c0a05db78fa40fefc7967796ff2a2e8444'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '8192047453391406704',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCM2Op_AFEPCMp9SW-P_XcRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCIXhUdGdYZ2lHa184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFFajRyM1ZBQUFxUU1FQkktSzkxUUFBS2tESkFSR0FWSjZORXVNXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRGhwUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0BBRHdQdy4umgKJASFKUThlRDo9ASRuUEZiSUFRb0FEFUhUcVFEb0pVMGxPTXpvME56TXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQzwXmVBQS7YAgDgAq2YSOoCWWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvbG9uZ2Zvcm0vYmFzaWNfd19yZXF1aXJlRXhhY3REdXJhAS7wny5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEwuYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzPaBAIIAOAEAPAE39-fR4gFAZgFAKAF______8BBRQBwAUAyQVpYhTwP9IFCQkJDHgAANgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGCSUo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=8bf90e0756a9265ab6ac029e883e14803447a7fb',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQlNxwleAAAAABFwxolqwf-vcRlNxwleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=cf9ea0df7655a5c6150a527399cb2852c61ec14a&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCM2Op_AFEPCMp9SW-P_XcRiq5MnUovf28WEqNgmOWItPAQAqQBGOWItPAQAqQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV4lbgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiF4VHRnWGdpR2tfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQm5LY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRRWo0cjNWQUFBcVFNRUJJLUs5MVFBQUtrREpBUkdBVko2TkV1TV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RocFBfRDdvRENWTkpUak02TkRjek0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCZjBrcVFVCRNAQUR3UHcuLpoCiQEhSlE4ZUQ6PQEkblBGYklBUW9BRBVIVHFRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEufC5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAIExFQUZfTkFNRQEdCB4KGjYdAAhBU1QBPvCQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBGGNIIgFAZgFAKAF_xEBFAHABQDJBWm-FPA_0gUJCQkMeAAA2AUB4AUB8AWsvBT6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=cefb5f476892ed335cd8b0fc20fabf7650b1d2e3'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '9041697983972949142',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCM2Op_AFEJb5yqiVjaS9fRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk5MTQ5KTsBHTByJywgMTQ5NDE3NjY5Nh8A8P2SArkCIURUMkpEd2lsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFYeHdUOEhkUmVzXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFJZzhjRGc2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEu8J8uaHRtbIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCADgBADwBMXdn0eIBQGYBQCgBf______AQUUAcAFAMkFaWIU8D_SBQkJCQx4AADYBQHgBQHwBcLyF_oFBAgAEACQBgGYBgC4BgDBBgklKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=308ea3c3363b379ef62dbb6c7a91d1d91d9ee47a',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQlNxwleAAAAABGWvBJVaZB6fRlNxwleAAAAACDF3Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jC8hdiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAcXdn0ewAQE.&s=70a33aa1a57d812d9da5c321e898197836ed16f8&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_requireExactDuration.html&e=wqT_3QL5CKB5BAAAAwDWAAUBCM2Op_AFEJb5yqiVjaS9fRiq5MnUovf28WEqNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MNbJqwc47UhA7UhIAlDF3Z9HWJzxW2AAaM26dXiVuAWAAQGKAQNVU0SSAQEG8FWYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAjx1ZignYScsIDI1Mjk4ODUsIDE1Nzc2OTkxNDkpO3VmKCdyJywgMTQ5NDE3NjY5LCAxNRkf8P2SArkCIURUMkpEd2lsa184UEVNWGRuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCbktjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFYeHdUOEhkUmVzXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBaUF9EN29EQ1ZOSlRqTTZORGN6TS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJmMGtxUVUJE0RBRHdQdy4umgKJASFJZzhjRGc2PQEkblBGYklBUW9BRBVIVGtRRG9KVTBsT016bzBOek16UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8F5lQUEu2AIA4AKtmEjqAllodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcmVxdWlyZUV4YWN0RHVyYQEufC5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAIExFQUZfTkFNRQEdCB4KGjYdAAhBU1QBPvDeSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBMLmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzMz2gQCCAHgBADwBMXdn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXC8hf6BQQIABAAkAYBmAYAuAYAwQYAAGHxKPA_0Ab1L9oGFgoQAQ8uAQBQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=ee15793b41a9d22ffad9bd46878a47821d6044fa'
              }
            }
          }]
        }, {
          'uuid': '25593f19ac7ed2',
          'tag_id': 15394006,
          'auction_id': '356000177781223639',
          'nobid': true,
          'ad_profile_id': 1182765
        }]
      }
    }
  }
}
