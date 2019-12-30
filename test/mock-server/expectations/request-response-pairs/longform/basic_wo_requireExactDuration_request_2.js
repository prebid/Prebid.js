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
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '2704229116537156015',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFEK_j3NPcwdbDJRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE3OTUxNh8A8P2SArkCIXpUczJvQWlta184UEVOX2ZuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFURVBwVy1oVE9ZXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwT2VBRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZMGxxUVUJE0BBRHdQdy4umgKJASFVQV9qSDo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56UTVRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0DgFlQUEu2AIA4AKtmEjqAlpodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX3JlcXVpcmVFeGFjdER1cmF0aW9uLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0OdoEAggA4AQA8ATf359HiAUBmAUAoAX___________8BwAUAyQUAZWQU8D_SBQkJBQt8AAAA2AUB4AUB8AWsvBT6BQQIABAAkAYBmAYAuAYAwQYBITAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=64565aadf65d370e9730e9ce82c93c9bd2fcfc14',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABGvMXfKDVqHJRm1ywleAAAAACDf359HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1isvBRiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAd_fn0ewAQE.&s=3b1f10f67b3253e38770fff694edbe6052795602&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6COh6BAAAAwDWAAUBCLWXp_AFEK_j3NPcwdbDJRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ39-fR1ic8VtgAGjNunV4t7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxNzk1MSwgMTUZH_D9kgK5AiF6VHMyb0FpbWtfOFBFTl9mbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVEVQcFctaFRPWV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME9lQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTBscVFVCRNAQUR3UHcuLpoCiQEhVUFfakg6PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelE1UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8ItlQUEu2AIA4AKtmEjqAlpodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dvX3JlcXVpcmVFeGFjdER1cmF0aW9uLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTQUWPExFQUZfTkFNRRIA8gIeChoyMwDwwkxBU1RfTU9ESUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBNXmBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQ52gQCCAHgBADwBN_fn0eIBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAGXOcNgFAeAFAfAFrLwU-gUECAAQAJAGAZgGALgGAMEGBSIsAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=5316c3262f36e4d89735b1ba252c64651a84f479'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '7987581685263122854',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFEKaDmaSQ5-Xsbhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIU16MXpZd2lua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYLVkxZU5tY3VRXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwT2VBRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZMGxxUVUJE0RBRHdQdy4umgKJASFVUTgySFE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelE1UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDnaBAIIAOAEAPAE0uyfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=17f2a3f5e78c188cc6ca23e677ced305198a8a05',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABGmQYYEOZfZbhm1ywleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=28e8f96efdfb9bc1e33e4d087ff5ed992e4692b1&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6COh6BAAAAwDWAAUBCLWXp_AFEKaDmaSQ5-Xsbhiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4t7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFNejF6WXdpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWC1ZMWVObWN1UV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME9lQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTBscVFVCRNEQUR3UHcuLpoCiQEhVVE4MkhRNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRNVFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0OdoEAggB4AQA8ATS7J9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlznDYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgUiLADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=89d4586d9597cd2f9a4a918d1e6985aee45ade01'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '653115326806257319',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCLWXp_AFEKfdmd3enZWICRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCITlEd0hNZ2lta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFjTnlESmJxeS13XzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwT2VBRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZMGxxUVUJE0RBRHdQdy4umgKJASFKZ192RFE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelE1UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDnaBAIIAOAEAPAEr-WfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULeAAAANgFAeAFAfAF4Fj6BQQIABAAkAYBmAYAuAYAwQYBIDAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=1928a9daadbd431792adace7620880dda961eefb',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQm1ywleAAAAABGnbqbr7VQQCRm1ywleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=7617d08e0c16fe1dea8ec80cd6bf73ec0a736b41&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCLWXp_AFEKfdmd3enZWICRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4t7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiE5RHdITWdpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBY055REpicXktd18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME9lQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTBscVFVCRNEQUR3UHcuLpoCiQEhSmdfdkRRNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRNVFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0OdoEAggB4AQA8ASv5Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlzmzYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGBSEsAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=0d1d3f42fa225995a2f57ab84877dce3d24e9901'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '866435845408148233',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKeCKAeBAAAAwDWAAUBCLWXp_AFEImW35H52YyDDBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIXJEenNfZ2lua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFjMmZTZ1BpMi1BXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwT2VBRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZMGxxUVUJE0RBRHdQdy4umgKJASFfdzRiQUE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelE1UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDnaBAIIAOAEAPAEi-GfR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULfAAAANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=83f65f38b4fd56344b3aceb70df7bac1b9b5f229',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQm1ywleAAAAABEJyzeSzzIGDBm1ywleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=9130c13cca7a1d3eb05c2b96585ccfdc2faa6844&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL6COh6BAAAAwDWAAUBCLWXp_AFEImW35H52YyDDBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4t7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFyRHpzX2dpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBYzJmU2dQaTItQV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME9lQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTBscVFVCRNEQUR3UHcuLpoCiQEhX3c0YkFBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRNVFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0OdoEAggB4AQA8ASL4Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlznDYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgUiLADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=1f88d8b0a467d528291f90a54fd810b8fdac4488'
              }
            }
          }]
        }, {
          'uuid': '2022b6b1fcf477',
          'tag_id': 15394006,
          'auction_id': '1540903203561034860',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QKdCKAdBAAAAwDWAAUBCLWXp_AFEOyokYzL6ZixFRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIXdUekVId2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCd3FjRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFaeE00NUxjRXVNXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwT2VBRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZMGxxUVUJE0RBRHdQdy4umgKJASFQUThhRmc2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelE1UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gE1eYEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDnaBAIIAOAEAPAExOefR4gFAZgFAKAF____________AcAFAMkFAGVkFPA_0gUJCQULeAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYBIDAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=a4de0e4084ce04a5cb2d347c07fde867aa9ff5c1',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQm1ywleAAAAABFsVISxTGNiFRm1ywleAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=cf600d825cec85f83c06119e5e383f8548b469a2&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_wo_requireExactDuration.html&e=wqT_3QL5COh5BAAAAwDWAAUBCLWXp_AFEOyokYzL6ZixFRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4t7gFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3NzAwMjc3KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiF3VHpFSHdpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQndxY0RrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWnhNNDVMY0V1TV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME9lQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWTBscVFVCRNEQUR3UHcuLpoCiQEhUFE4YUZnNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRNVFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCLZUFBLtgCAOACrZhI6gJaaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193b19yZXF1aXJlRXhhY3REdXJhdGlvbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX00FFjxMRUFGX05BTUUSAPICHgoaMjMA8MJMQVNUX01PRElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qATV5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0OdoEAggB4AQA8ATE559HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAABlzmzYBQHgBQHwBZk9-gUECAAQAJAGAZgGALgGAMEGBSEsAPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=17c466ea45d5d4beff02aa2b0eb87bc6c4d5aff3'
              }
            }
          }]
        }]
      }
    }
  }
}
