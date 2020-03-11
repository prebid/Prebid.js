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
            'width': 1,
            'height': 1
          }],
          'ad_types': ['native'],
          'id': 13232392,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'native': {
            'layouts': [{
              'title': {
                'required': true
              },
              'main_image': {
                'required': true
              },
              'sponsored_by': {
                'required': true
              }
            }]
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
          'uuid': '256e5e4b136d05',
          'tag_id': 13232392,
          'auction_id': '6287559286677633407',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKICKAIBAAAAwDWAAUBCM3FpfEFEP_yg9W7u_mgVxi7_-bKzp3kuD8qNgkAAAkCABEJBwgAABkJCQgkQCEJCQgAACkRCQAxCQnwaSRAMIjSpwY47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEBwAEAyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5NzcwNTczKTsBHSxyJywgOTc1MjA0MzQ2HgDw0JICtQIhQWp4NUh3aUgtYndLRUxLV3dDNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUWlOS25CbGdBWUtzR2FBQndBbmlLQVlBQkhvZ0JpZ0dRQVFDWUFRQ2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCb2FZc1BwVDM0VF9aQVFBQUFBQUFBUEFfNEFFQTlRRUFBQUFBbUFJQW9BSUF0UUlBQUFBQXZRSUFBQUFBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQU9IAcSIdWdNSlUwbE9Nem8wT0RRMDRBUDRHWWdFQUpBRUFKZ0VBY0UJXQUBCERKQgUICQEYMkFRQThRUQkNAQEsUGdFQUlnRjdDV3BCERc0UEFfmgKJASFDZy1TX2c2OQEkblBGYklBUW9BRBVkDGtRRG8ykQAQUVBnWlMdTQBVEQwMQUFBVx0MAFkdDABhHQwAYx0MoGVBQS7YAgDgAq2YSOoCS2h0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5BRTw3i9wYWdlcy9tdWx0aXBsZV9iaWRkZXJzLmh0bWw_cGJqc19kZWJ1Zz10cnVlgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQOMTAzLjc5LjEwMC4xODCoBOZCsgQQCAQQARgAIAAoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0ODQ02gQCCADgBAHwBLKWwC6IBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQAAAAABDnDYBQHgBQHwBZn0IfoFBAgAEACQBgGYBgC4BgDBBgEhMAAA8L_QBvUv2gYWChAJERkBUBAAGADgBgzyBgIIAIAHAYgHAKAHQQ..&s=8b14b952b73092945ef66436be991786b53f7a68',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'native',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 97520434,
            'media_type_id': 12,
            'media_subtype_id': 65,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 53,
            'client_initiated_ad_counting': true,
            'viewability': {
              'config': '<script type="text/javascript" async="true" src="https://cdn.adnxs.com/v/s/182/trk.js#v;vk=appnexus.com-omid;tv=native1-18hs;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232392;cb=https%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Fmultiple_bidders.html%253Fpbjs_debug%253Dtrue%26e%3DwqT_3QKQCKAQBAAAAwDWAAUBCM3FpfEFEP_yg9W7u_mgVxi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIjSpwY47UhA7UhIAlCylsAuWJzxW2AAaM26dXiYuAWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1Nzk3NzA1NzMpO3VmKCdyJywgOTc1MjA0MzQsIC4eAPDQkgK1AiFBang1SHdpSC1id0tFTEtXd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRaU5LbkJsZ0FZS3NHYUFCd0FuaUtBWUFCSG9nQmlnR1FBUUNZQVFDZ0FRR29BUU93QVFDNUFmT3RhcVFBQUNSQXdRSHpyV3FrQUFBa1FNa0JvYVlzUHBUMzRUX1pBUUFBQUFBQUFQQV80QUVBOVFFQUFBQUFtQUlBb0FJQXRRSUFBQUFBdlFJQUFBQUE0QUlBNkFJQS1BSUFnQU1CbUFNQnFBT0gBxIh1Z01KVTBsT016bzBPRFEwNEFQNEdZZ0VBSkFFQUpnRUFjRQldBQEIREpCBQgJARgyQVFBOFFRCQ0BASxQZ0VBSWdGN0NXcEIRFzRQQV-aAokBIUNnLVNfZzY5ASRuUEZiSUFRb0FEFWQMa1FEbzKRABBRUGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQygZUFBLtgCAOACrZhI6gJLaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkFFPDeL3BhZ2VzL211bHRpcGxlX2JpZGRlcnMuaHRtbD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA4xMDMuNzkuMTAwLjE4MKgE5kKyBBAIBBABGAAgACgBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ4NDTaBAIIAeAEAfAEspbALogFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAAAEOcNgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGASEwAADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGDPIGAggAgAcBiAcAoAdB%26s%3D2061bd85ce022a41bc16ebb20c193aabbbc07809;ts=1579770573;cet=0;cecb="></script>'
            },
            'rtb': {
              'native': {
                'title': 'This is a Prebid Native Creative',
                'sponsored': 'Prebid.org',
                'main_img': {
                  'url': 'https://vcdn.adnxs.com/p/creative-image/f8/7f/0f/13/f87f0f13-230c-4f05-8087-db9216e393de.jpg',
                  'width': 989,
                  'height': 742,
                  'prevent_crop': false
                },
                'link': {
                  'url': 'http://prebid.org/dev-docs/show-multi-format-ads.html',
                  'click_trackers': ['https://sin3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQH_5oLrb5UFXu79Z6eyQcT_NYileAAAAAAjpyQBtJAAAbSQAAAIAAAAyC9AFnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAQQCAAAAALoAnRbC8wAAAAA./bcr=AAAAAAAA8D8=/cnd=%21Cg-S_giH-bwKELKWwC4YnPFbIAQoADEAAAAAAAAkQDoJU0lOMzo0ODQ0QPgZSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ4NDQ=/bn=89112/']
                },
                'impression_trackers': ['https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKQCKAQBAAAAwDWAAUBCM3FpfEFEP_yg9W7u_mgVxi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIjSpwY47UhA7UhIAlCylsAuWJzxW2AAaM26dXiYuAWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1Nzk3NzA1NzMpO3VmKCdyJywgOTc1MjA0MzQsIC4eAPDQkgK1AiFBang1SHdpSC1id0tFTEtXd0M0WUFDQ2M4VnN3QURnQVFBUkk3VWhRaU5LbkJsZ0FZS3NHYUFCd0FuaUtBWUFCSG9nQmlnR1FBUUNZQVFDZ0FRR29BUU93QVFDNUFmT3RhcVFBQUNSQXdRSHpyV3FrQUFBa1FNa0JvYVlzUHBUMzRUX1pBUUFBQUFBQUFQQV80QUVBOVFFQUFBQUFtQUlBb0FJQXRRSUFBQUFBdlFJQUFBQUE0QUlBNkFJQS1BSUFnQU1CbUFNQnFBT0gBxIh1Z01KVTBsT016bzBPRFEwNEFQNEdZZ0VBSkFFQUpnRUFjRQldBQEIREpCBQgJARgyQVFBOFFRCQ0BASxQZ0VBSWdGN0NXcEIRFzRQQV-aAokBIUNnLVNfZzY5ASRuUEZiSUFRb0FEFWQMa1FEbzKRABBRUGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQygZUFBLtgCAOACrZhI6gJLaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkFFPDeL3BhZ2VzL211bHRpcGxlX2JpZGRlcnMuaHRtbD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBA4xMDMuNzkuMTAwLjE4MKgE5kKyBBAIBBABGAAgACgBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ4NDTaBAIIAeAEAfAEspbALogFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAAAEOcNgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGASEwAADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGDPIGAggAgAcBiAcAoAdB&s=2061bd85ce022a41bc16ebb20c193aabbbc07809'],
                'id': 97520434
              }
            }
          }]
        }]
      }
    }
  }
}
