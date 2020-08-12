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
          'id': 13232361,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'require_asset_url': true,
          'video': {},
          'hb_source': 1
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
          'uuid': '206465a8c326a5',
          'tag_id': 13232361,
          'auction_id': '1398509384102899505',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Finstream.html&e=wqT_3QKxCKAxBAAAAwDWAAUBCKXQzPAFELHeg_SAnKC0ExjCs_b6q5D9_0oqNgkAAAkCABEJBywAABkAAADgehQUQCEREgApEQkAMREb8Hkw6dGnBjjtSEDtSEgAUABYnPFbYABozbp1eACAAQGKAQCSAQNVU0SYAQGgAQGoAQGwAQC4AQPAAQDIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzgzMTM3NjUpO3VmKCdyJywgOTc1MTc3NzEsIC4eAPD1kgK1AiF5andtb2dpMi1Md0tFTXVCd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRNmRHbkJsZ0FZTUlHYUFCd0tIZ0dnQUU4aUFFR2tBRUFtQUVBb0FFQnFBRURzQUVBdVFIenJXcWtBQUFVUU1FQjg2MXFwQUFBRkVESkFmZjUwcVFyNGVvXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFPQUNBT2dDQVBnQ0FJQURBWmdEQWFnRHR2aThDcm9EQ1ZOSlRqTTZORGN6T09BRC1SaUlCQUNRQkFDWUJBSEJCBUUJAQh5UVEJCQEBFE5nRUFQRRGNAZAsNEJBQ0lCWUlscVFVAREBFDx3UHcuLpoCiQEhTGc5WkRRNjkBJG5QRmJJQVFvQUQVSFRVUURvSlUwbE9Nem8wTnpNNFFQa1lTEXgMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBSZUFBLsICP2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctdmlkZW8td2l0aC1hLWRmcC12aWRlby10YWcuaHRtbNgCAOACrZhI6gIzaHQFSkh0ZXN0LmxvY2FsaG9zdDo5OTk5BRQ4L3BhZ2VzL2luc3RyZWFtBT7IgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvCanwXpgEAKIECzEwLjc1Ljc0LjY5qAS0LLIEEggBEAIYgAUg4AMoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM42gQCCADgBADwBMuBwC6IBQGYBQCgBf______AQMUAcAFAMkFaX8U8D_SBQkJCQx4AADYBQHgBQHwBcOVC_oFBAgAEACQBgGYBgC4BgDBBgklKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYE8gYCCACABwGIBwCgB0A.&s=6805157848bdfdf973d0dbafff4bb9b4c4ce7e60',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'video',
            'notify_url': 'http://sin3-ib.adnxs.com/vast_track/v2?info=aAAAAAMArgAFAQklKBNeAAAAABEx74AO4IBoExklKBNeAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQ6dGnBljDlQtiAi0taAFwAXgAgAEBiAEBkAGABZgB4AOgAQCoAcuBwC6wAQE.&s=07e6e5f2f03cc92e899c3ddbf4e2988e966caaa2&event_type=1',
            'usersync_url': 'http%3A%2F%2Facdn.adnxs.com%2Fdmp%2Fasync_usersync.html',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 97517771,
            'media_type_id': 4,
            'media_subtype_id': 64,
            'cpm': 5.000000,
            'cpm_publisher_currency': 5.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 36,
            'client_initiated_ad_counting': true,
            'rtb': {
              'video': {
                'player_width': 640,
                'player_height': 480,
                'duration_ms': 30000,
                'playback_methods': ['auto_play_sound_on'],
                'frameworks': ['vpaid_1_0', 'vpaid_2_0'],
                'asset_url': 'http://sin3-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Finstream.html&e=wqT_3QKNCaCNBAAAAwDWAAUBCKXQzPAFELHeg_SAnKC0ExjCs_b6q5D9_0oqNgkAAAECCBRAEQEHNAAAFEAZAAAA4HoUFEAhERIAKREJADERG6gw6dGnBjjtSEDtSEgCUMuBwC5YnPFbYABozbp1eJG4BYABAYoBA1VTRJIBAQbwUpgBAaABAagBAbABALgBA8ABBMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3ODMxMzc2NSk7dWYoJ3InLCA5NzUxNzc3MSwgLh4A8PWSArUCIXlqd21vZ2kyLUx3S0VNdUJ3QzRZQUNDYzhWc3dBRGdBUUFSSTdVaFE2ZEduQmxnQVlNSUdhQUJ3S0hnR2dBRThpQUVHa0FFQW1BRUFvQUVCcUFFRHNBRUF1UUh6cldxa0FBQVVRTUVCODYxcXBBQUFGRURKQWZmNTBxUXI0ZW9fMlFFQUFBQUFBQUR3UC1BQkFQVUJBQUFBQUpnQ0FLQUNBTFVDQUFBQUFMMENBQUFBQU9BQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEdHZpOENyb0RDVk5KVGpNNk5EY3pPT0FELVJpSUJBQ1FCQUNZQkFIQkIFRQkBCHlRUQkJAQEUTmdFQVBFEY0BkCw0QkFDSUJZSWxxUVUBEQEUPHdQdy4umgKJASFMZzlaRFE2OQEkblBGYklBUW9BRBVIVFVRRG9KVTBsT016bzBOek00UVBrWVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8FJlQUEuwgI_aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy12aWRlby13aXRoLWEtZGZwLXZpZGVvLXRhZy5odG1s2AIA4AKtmEjqAjNodAVKSHRlc3QubG9jYWxob3N0Ojk5OTkFFDgvcGFnZXMvaW5zdHJlYW0FPmjyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChYyFgAgTEVBRl9OQU1FAR0IHgoaNh0ACEFTVAE-4ElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92Mw398F6YBACiBAsxMC43NS43NC42OagEtCyyBBIIARACGIAFIOADKAEoAjAAOAO4BADABADIBADSBA45MzI1I1NJTjM6NDczONoEAggB4AQA8ATLgcAuiAUBmAUAoAX______wEDFAHABQDJBWnbFPA_0gUJCQkMeAAA2AUB4AUB8AXDlQv6BQQIABAAkAYBmAYAuAYAwQYJJSjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGBPIGAggAgAcBiAcAoAdA&s=68b9d39d60a72307a201e479000a8c7be5508188'
              }
            }
          }]
        }]
      }
    }
  }
}
