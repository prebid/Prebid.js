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
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '6123799897847039642',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKRCKARBAAAAwDWAAUBCMmFp_AFEJqN_JX98Yb-VBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIUN6dzV3Z2lta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFYQm5aNWdRbi1NXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0RBRHdQdy4umgKJASFJQS1IREE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDPaBAIIAOAEAPAEr-WfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkcADYBQHgBQHwBeBY-gUECAAQAJAGAZgGALgGAMEGCSMo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=a7e4ff14c60153db90971365f90e514f45875324',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQnJwgleAAAAABGaBr_Sjxv8VBnJwgleAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICSU5oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=842283d9de78fba7e92fac09f95bb63902a0b54a&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLtCOhtBAAAAwDWAAUBCMmFp_AFEJqN_JX98Yb-VBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4zrgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiFDenc1d2dpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWEJuWjVnUW4tTV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNEQUR3UHcuLpoCiQEhSUEtSERBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMdAAA2AUB4AUB8AXgWPoFBAgAEACQBgGYBgC4BgDBBgkkKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=0fb74d544be103e1440c3ee8f7abc14d2c322d15'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '889501690217653627',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEPvKoYSxoomsDBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIWt6eTlHUWlua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFRSzgzNzR1VnVVXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0RBRHdQdy4umgKJASFTd19PR3c2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDPaBAIIAOAEAPAE0uyfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkdADYBQHgBQHwBdm6BvoFBAgAEACQBgGYBgC4BgDBBgkkKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=78ac70aeeae1da43c90efd248fb30a4ee630ffd5',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnJwgleAAAAABF7ZYgQEyVYDBnJwgleAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=f21e2a522ddcaf0a67bc7d52f70288fdf7e6f3dd&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFEPvKoYSxoomsDBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4zrgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFrenk5R1FpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBUUs4Mzc0dVZ1VV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNEQUR3UHcuLpoCiQEhU3dfT0d3Nj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpRelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMeAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=69611db1024ddb77e0754087ddbeae68a00633a1'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '2793012314322059080',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFEMj-1IPuvLHhJhiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE0MTg4Nh8A8P2SArkCIXhqb2ZBZ2lHa184UEVLekNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFFajRyM1ZBQUFxUU1FQkktSzkxUUFBS2tESkFRQWhlSGt0VHVRXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRGhwUF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0RBRHdQdy4umgKJASExZzc1OFE2PQEkblBGYklBUW9BRBVIVHFRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9A4BZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1sgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDPaBAIIAOAEAPAErMKfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAGlkdADYBQHgBQHwBfKMAfoFBAgAEACQBgGYBgC4BgDBBgkkKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=243f58d85b09468de2fe485662c950a86b5d90fb',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnJwgleAAAAABFIP3Xg5sXCJhnJwgleAAAAACCswp9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jyjAFiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAazCn0ewAQE.&s=99dd40ab6ae736c6aa7c96b5319e1723ea581e0d&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFEMj-1IPuvLHhJhiq5MnUovf28WEqNgmOWItPAQAqQBGOWItPAQAqQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQrMKfR1ic8VtgAGjNunV4zrgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxNDE4OCwgMTUZH_D9kgK5AiF4am9mQWdpR2tfOFBFS3pDbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRRWo0cjNWQUFBcVFNRUJJLUs5MVFBQUtrREpBUUFoZUhrdFR1UV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RocFBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNEQUR3UHcuLpoCiQEhMWc3NThRNj0BJG5QRmJJQVFvQUQVSFRxUURvSlUwbE9Nem8wTnpRelFNSVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJOaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X3ByaWNlR3Jhbi5odG1s8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWQ1VTVE9NX01PREVMX0xFQUZfTkFNRRIA8gIeChpDVVNUT00RHQhBU1QBC_CQSUZJRUQSAIADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDTIwMi41OS4yMzEuNDeoBK_mBLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzQz2gQCCAHgBADwBGGCIIgFAZgFAKAF_xEBFAHABQDJBWmzFPA_0gUJCQkMeAAA2AUB4AUB8AXyjAH6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=d9a3c817696f263b6e6d81f7251827fa54a47c37'
              }
            }
          }]
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '45194178065897765',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '2def02900a6cda',
          'tag_id': 15394006,
          'auction_id': '3805126675549039795',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QKSCKASBAAAAwDWAAUBCMmFp_AFELPZ2uvQ0aHnNBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTsBHTByJywgMTQ5NDE4MTIzNh8A8P2SArkCIWNUM1hkZ2lua184UEVJdmhuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOXFZRGtBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFjbUQzMExTME9VXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMwTS1BRHdoaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJZY2xxUVUJE0BBRHdQdy4umgKJASEtUTZrXzo9ASRuUEZiSUFRb0FEFUhUdVFEb0pVMGxPTXpvME56UXpRTUlZUxF4DFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0DgFlQUEu2AIA4AKtmEjqAk5odHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcHJpY2VHcmFuLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA0yMDIuNTkuMjMxLjQ3qASv5gSyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDc0M9oEAggA4AQA8ASL4Z9HiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAaWR0ANgFAeAFAfAF2tYC-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgTyBgIIAIAHAYgHAKAHQA..&s=bbeaa584bea9afedf6dcab51b1616988441dfa22',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQnJwgleAAAAABGzrHYNjYbONBnJwgleAAAAACCL4Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1ja1gJiAklOaAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAYvhn0ewAQE.&s=b7e937b5acc3d8b910f6b08c3a40e04aa10818cd&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_priceGran.html&e=wqT_3QLuCOhuBAAAAwDWAAUBCMmFp_AFELPZ2uvQ0aHnNBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQi-GfR1ic8VtgAGjNunV4zrgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3Njk3OTkzKTt1ZigncicsIDE0OTQxODEyMywgMTUZH_D9kgK5AiFjVDNYZGdpbmtfOFBFSXZobjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjlxWURrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBY21EMzBMUzBPVV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjME0tQUR3aGlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWWNscVFVCRNAQUR3UHcuLpoCiQEhLVE2a186PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelF6UU1JWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8JplQUEu2AIA4AKtmEjqAk5odHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2xvbmdmb3JtL2Jhc2ljX3dfcHJpY2VHcmFuLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTU9ERUxfTEVBRl9OQU1FEgDyAh4KGkNVU1RPTREdCEFTVAEL8N5JRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQNMjAyLjU5LjIzMS40N6gEr-YEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NDPaBAIIAeAEAPAEi-GfR4gFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAAAAAAADYBQHgBQHwBdrWAvoFBAgAEACQBgGYBgC4BgDBBgAAYeYo8D_QBvUv2gYWChABDy4BAFAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=279827127eba3204bc3a152b8abaf701260eb494'
              }
            }
          }]
        }]
      }
    }
  }
}
