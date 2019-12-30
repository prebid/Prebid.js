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
        'user': {},
        'brand_category_uniqueness': true
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
          'uuid': '245a09bd675168',
          'tag_id': 15394006,
          'auction_id': '3810681093956255668',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QKVCKAVBAAAAwDWAAUBCKD4kfAFELT_vOy9yJDxNBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTsBHTByJywgMTQ5NDE5NjAyNh8A8P2SArkCIUxEMWZkUWlua184UEVOTHNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOE13Q2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFZVS10N09mcU9BXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHA1UF9EN29EQ1ZOSlRqTTZORGMxTS1BRG9SaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJaRWxxUVUJE0RBRHdQdy4umgKJASFLdy1SRkE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV6UUtFWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9AUBZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagErLkEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTPaBAIIAOAEAPAE0uyfR4gFAZgFAKAF____________AcAFAMkFAGVbFPA_0gUJCQULfAAAANgFAeAFAfAF2boG-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=66ba37441db5e28c87ee52e729333fd9324333f9',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQkgfAReAAAAABG0P4_dQ0LiNBkgfAReAAAAACDS7J9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jZugZiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAdLsn0ewAQE.&s=6931bf3569012d0e1f02cb5a2e88dfcafe00dba9&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QLxCOhxBAAAAwDWAAUBCKD4kfAFELT_vOy9yJDxNBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQ0uyfR1ic8VtgAGjNunV4vLgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTt1ZigncicsIDE0OTQxOTYwMiwgMTUZH_D9kgK5AiFMRDFmZFFpbmtfOFBFTkxzbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjhNd0NrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWVUtdDdPZnFPQV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwNVBfRDdvRENWTkpUak02TkRjMU0tQURvUmlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWkVscVFVCRNEQUR3UHcuLpoCiQEhS3ctUkZBNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVelFLRVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTU9ERUxfTEVBRl9OQU1FEgDyAh4KGkMyHQDwlUFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBKy5BLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUz2gQCCAHgBADwBGGFIIgFAZgFAKAF_xEBFAHABQDJBWm2FPA_0gUJCQkMeAAA2AUB4AUB8AXZugb6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=ea46ec90cf31744c7be2af5d5f239ab4eed29098'
              }
            }
          }]
        }, {
          'uuid': '245a09bd675168',
          'tag_id': 15394006,
          'auction_id': '7325897349627488405',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QKUCKAUBAAAAwDWAAUBCKD4kfAFEJXRloy0mrTVZRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTsBHTByJywgMTQ5NDE4NjcxNh8A8P2SArkCIXJUeTNJd2lta184UEVLX2xuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOE13Q2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFVSzAtQ2hwcWRrXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTS1BRG9SaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJaRWxxUVUJE0RBRHdQdy4umgKJASFBQTlLQlE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV6UUtFWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9AUBZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagErLkEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTPaBAIIAOAEAPAEr-WfR4gFAZgFAKAF____________AcAFAMkFAGVbFPA_0gUJCQULeAAAANgFAeAFAfAF4Fj6BQQIABAAkAYBmAYAuAYAwQYBIDAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=271fd8a0ccdfc36e320f707164588ed1b33e9861',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQkgfAReAAAAABGVqIVB09CqZRkgfAReAAAAACCv5Z9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jgWGICLS1oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBr-WfR7ABAQ..&s=115ac2b842cf3efeb5acaeda94ddf05632c345ca&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QLwCOhwBAAAAwDWAAUBCKD4kfAFEJXRloy0mrTVZRiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQr-WfR1ic8VtgAGjNunV4vLgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTt1ZigncicsIDE0OTQxODY3MSwgMTUZH_D9kgK5AiFyVHkzSXdpbWtfOFBFS19sbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjhNd0NrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBVUswLUNocHFka18yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU0tQURvUmlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWkVscVFVCRNEQUR3UHcuLpoCiQEhQUE5S0JRNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVelFLRVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTU9ERUxfTEVBRl9OQU1FEgDyAh4KGkMyHQDwlUFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBKy5BLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUz2gQCCAHgBADwBGGFIIgFAZgFAKAF_xEBFAHABQDJBWm2FPA_0gUJCQkMdAAA2AUB4AUB8AXgWPoFBAgAEACQBgGYBgC4BgDBBgkkKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=f73e060b15a6bbcca65f918a296f155b78c74eca'
              }
            }
          }]
        }, {
          'uuid': '245a09bd675168',
          'tag_id': 15394006,
          'auction_id': '968802322305726102',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QKVCKAVBAAAAwDWAAUBCKD4kfAFEJbt7LTEkvi4DRiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTsBHTByJywgMTQ5NDE0MTg4Nh8A8P2SArkCIUtUejN5d2lHa184UEVLekNuMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOE13Q2tBRUFtQUVBb0FFQnFBRURzQUVBdVFFajRyM1ZBQUFxUU1FQkktSzkxUUFBS2tESkFTT3dTTWVaYnVJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRGhwUF9EN29EQ1ZOSlRqTTZORGMxTS1BRG9SaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJaRWxxUVUJE0RBRHdQdy4umgKJASF0ZzY4Nmc2PQEkblBGYklBUW9BRBVIVHFRRG9KVTBsT016bzBOelV6UUtFWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9AUBZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagErLkEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTPaBAIIAOAEAPAErMKfR4gFAZgFAKAF____________AcAFAMkFAGVbFPA_0gUJCQULfAAAANgFAeAFAfAF8owB-gUECAAQAJAGAZgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=e35825a106304da78477df1575f981395be21d5f',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQkgfAReAAAAABGWNptGlOBxDRkgfAReAAAAACCswp9HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1jyjAFiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAazCn0ewAQE.&s=677bedd5b2d21fdc3f940cbae279261c8f84c2e7&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QLxCOhxBAAAAwDWAAUBCKD4kfAFEJbt7LTEkvi4DRiq5MnUovf28WEqNgmOWItPAQAqQBGOWItPAQAqQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQrMKfR1ic8VtgAGjNunV4vLgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTt1ZigncicsIDE0OTQxNDE4OCwgMTUZH_D9kgK5AiFLVHozeXdpR2tfOFBFS3pDbjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjhNd0NrQUVBbUFFQW9BRUJxQUVEc0FFQXVRRWo0cjNWQUFBcVFNRUJJLUs5MVFBQUtrREpBU093U01lWmJ1SV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RocFBfRDdvRENWTkpUak02TkRjMU0tQURvUmlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWkVscVFVCRNEQUR3UHcuLpoCiQEhdGc2ODZnNj0BJG5QRmJJQVFvQUQVSFRxUURvSlUwbE9Nem8wTnpVelFLRVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTU9ERUxfTEVBRl9OQU1FEgDyAh4KGkMyHQDwlUFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBKy5BLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUz2gQCCAHgBADwBGGFIIgFAZgFAKAF_xEBFAHABQDJBWm2FPA_0gUJCQkMeAAA2AUB4AUB8AXyjAH6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=0707b1385afa81517cd338f1516aeccc46fe33e1'
              }
            }
          }]
        }, {
          'uuid': '245a09bd675168',
          'tag_id': 15394006,
          'auction_id': '1273216786519070425',
          'nobid': true,
          'ad_profile_id': 1182765
        }, {
          'uuid': '245a09bd675168',
          'tag_id': 15394006,
          'auction_id': '1769115862397582681',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QKUCKAUBAAAAwDWAAUBCKD4kfAFENn63YWPsMrGGBiq5MnUovf28WEqNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwaeA_MNbJqwc47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEDwAEAyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTsBHTByJywgMTQ5NDE4OTQ4Nh8A8P2SArkCIXp6djFzd2lta184UEVNVG5uMGNZQUNDYzhWc3dBRGdBUUFSSTdVaFExc21yQjFnQVlJSUNhQUJ3QUhnQWdBSElBb2dCOE13Q2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIdEJLRDJBQUF1UU1FQjdRU2c5Z0FBTGtESkFZbW5MamdJaXVRXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHBwUF9EN29EQ1ZOSlRqTTZORGMxTS1BRG9SaUlCQUNRQkFDWUJBSEJCQUFBQQ1yCHlRUQ0KJEFBQU5nRUFQRUUBCwkBMEQ0QkFDSUJaRWxxUVUJE0RBRHdQdy4umgKJASFGdzkxRFE2PQEkblBGYklBUW9BRBVIVHVRRG9KVTBsT016bzBOelV6UUtFWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M9AUBZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWyAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagErLkEsgQSCAEQAhiABSDgAygBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3NTPaBAIIAOAEAPAExOefR4gFAZgFAKAF____________AcAFAMkFAGVbFPA_0gUJCQULeAAAANgFAeAFAfAFmT36BQQIABAAkAYBmAYAuAYAwQYBIDAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=fb3a15e7ff747fccd750671b763e312d97083c72',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'https://sin3-ib.adnxs.com/vast_track/v2?info=ZwAAAAMArgAFAQkgfAReAAAAABFZfbfwgCmNGBkgfAReAAAAACDE559HKAAw7Ug47UhA0-hISLuv1AFQ1smrB1iZPWICLS1oAXABeACAAQGIAQGQAYAFmAHgA6ABAKgBxOefR7ABAQ..&s=7f4b8dd7c7dd9faecebac2e9ec6d7ef8da08da16&event_type=1',
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
                'asset_url': 'https://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Flongform%2Fbasic_w_bidderSettings.html&e=wqT_3QLwCOhwBAAAAwDWAAUBCKD4kfAFENn63YWPsMrGGBiq5MnUovf28WEqNgmOWItPAQAuQBGOWItPAQAuQBkAAAECCOA_IREbACkRCQAxARm4AADgPzDWyasHOO1IQO1ISAJQxOefR1ic8VtgAGjNunV4vLgFgAEBigEDVVNEkgEBBvBVmAEBoAEBqAEBsAEAuAEDwAEEyAEC0AEA2AEA4AEA8AEAigI8dWYoJ2EnLCAyNTI5ODg1LCAxNTc3MzUyMjI0KTt1ZigncicsIDE0OTQxODk0OCwgMTUZH_D9kgK5AiF6enYxc3dpbWtfOFBFTVRubjBjWUFDQ2M4VnN3QURnQVFBUkk3VWhRMXNtckIxZ0FZSUlDYUFCd0FIZ0FnQUhJQW9nQjhNd0NrQUVBbUFFQW9BRUJxQUVEc0FFQXVRSHRCS0QyQUFBdVFNRUI3UVNnOWdBQUxrREpBWW1uTGpnSWl1UV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBT0FDQU9nQ0FQZ0NBSUFEQVpnREFhZ0RwcFBfRDdvRENWTkpUak02TkRjMU0tQURvUmlJQkFDUUJBQ1lCQUhCQkFBQUENcgh5UVENCiRBQUFOZ0VBUEVFAQsJATBENEJBQ0lCWkVscVFVCRNEQUR3UHcuLpoCiQEhRnc5MURRNj0BJG5QRmJJQVFvQUQVSFR1UURvSlUwbE9Nem8wTnpVelFLRVlTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPCaZUFBLtgCAOACrZhI6gJTaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9sb25nZm9ybS9iYXNpY193X2JpZGRlclNldHRpbmdzLmh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT01fTU9ERUxfTEVBRl9OQU1FEgDyAh4KGkMyHQDwsEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQLMTAuNzUuNzQuNjmoBKy5BLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzUz2gQCCAHgBADwBMTnn0eIBQGYBQCgBf___________wHABQDJBWm2FPA_0gUJCQkMdAAA2AUB4AUB8AWZPfoFBAgAEACQBgGYBgC4BgDBBgkkKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=3a27c12c33ebaaae43dbce1cafb0bae43b753fa0'
              }
            }
          }]
        }]
	  }
    }
  }
}
