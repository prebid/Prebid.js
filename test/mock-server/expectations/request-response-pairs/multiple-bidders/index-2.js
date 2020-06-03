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
            'width': 300,
            'height': 250
          }, {
            'width': 300,
            'height': 600
          }],
          'primary_size': {
            'width': 300,
            'height': 250
          },
          'ad_types': ['banner'],
          'id': 13232392,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'hb_source': 1
        }, {
          'sizes': [{
            'width': 1,
            'height': 1
          }],
          'ad_types': ['native'],
          'id': 13232354,
          'allow_smaller_sizes': true,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true,
          'native': {
            'layouts': [{
              'title': {
                'required': true
              },
              'description': {
                'required': true
              },
              'main_image': {
                'required': true
              },
              'sponsored_by': {
                'required': true
              },
              'icon': {
                'required': false
              }
            }]
          },
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
          'uuid': '28ae233df319a1',
          'tag_id': 13232392,
          'auction_id': '6917498423334366136',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QLBCKBBBAAAAwDWAAUBCNGcpvEFELjXrYmmhfn_Xxi7_-bKzp3kuD8qNgkAAAkCABEJBwgAABkJCQgkQCEJCQgAACkRCQAxCQn0gQEkQDCI0qcGOO1IQO1ISABQAFic8VtgAGjNunV4AIABAYoBAJIBA1VTRJgBrAKgAfoBqAEBsAEAuAEBwAEAyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5NzgxNzEzKTt1ZigncicsIDk2ODQ2MDM1LCAxNTc5NzgxNzEzKTuSArUCITZEb2NyZ2lILWJ3S0VOT0JseTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFpTktuQmxnQVlLc0dhQUJ3R25oaWdBR1lBWWdCWXBBQkFKZ0JBS0FCQWFnQkE3QUJBTGtCODYxcXBBQUFKRURCQWZPdGFxUUFBQ1JBeVFHQ1VBT2x6Q0xkUDlrQkFBQUFBQUFBOERfZ0FRRDFBUUFBQUFDWUFnQ2dBZ0MxQWdBQUFBQzlBZ0FBQUFEZ0FnRG9BZ0Q0QWdDQUF3R1lBd0dvQTRmNXZBcTZBd2xUU1U0ek9qUTNNem5nQV9nWmlBUUFrQVFBbUFRQndRUQFNCQEITWtFCQkBARhEWUJBRHhCAQsNASwtQVFBaUFXREpha0YNE0BBOEQ4LpoCiQEhOEE1YjlRaTI5ASRuUEZiSUFRb0FEFVhYa1FEb0pVMGxPTXpvME56TTVRUGdaU1ENTwxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EZlQUEuwgI1aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy1tdWx0aS1mb3JtYXQtYWRzLmh0bWzYAgDgAq2YSOoCSw1ASHRlc3QubG9jYWxob3N0Ojk5OTkFFBgvcGFnZXMvBUYocGxlX2JpZGRlcnMFRvBAP3BianNfZGVidWc9dHJ1ZYADAIgDAZADAJgDF6ADAaoDAMADrALIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMNtvBhmAQAogQOMTAzLjc5LjEwMC4xODCoBJ9EsgQSCAQQARisAiD6ASgBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MznaBAIIAOAEAfAE04GXLogFAZgFAKAF______8BAxQBwAUAyQVpiBTwP9IFCQkJDHAAANgFAeAFAfAFAfoFBAgAEACQBgCYBgC4BgDBBgkjKPC_0Ab1L9oGFgoQCREZAVAQABgA4AYB8gYCCACABwGIBwCgBwE.&s=8d42ac30ca2d2a8a63215f5aba2a43bd23af0023',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'banner',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 96846035,
            'media_type_id': 1,
            'media_subtype_id': 1,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 0,
            'client_initiated_ad_counting': true,
            'rtb': {
              'banner': {
                'content': "<!-- Creative 96846035 served by Member 9325 via AppNexus --><a href=\"https://sin3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQLhrK2Eq5P9fu79Z6eyQcT9RjileAAAAAAjpyQBtJAAAbSQAAAIAAADTwMUFnPgWAAAAAABVU0QAVVNEACwB-gBNXQAAAAABAQMCAAAAALoArRcI3AAAAAA./bcr=AAAAAAAA8D8=/cnd=%218A5b9QiH-bwKENOBly4YnPFbIAQoADEAAAAAAAAkQDoJU0lOMzo0NzM5QPgZSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ3Mzk=/bn=89116/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fshow-multi-format-ads.html\" target=\"_blank\"><img width=\"300\" height=\"250\" style=\"border-style: none\" src=\"https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png\"/></a><iframe src=\"https://acdn.adnxs.com/dmp/async_usersync.html?gdpr=0&seller_id=9325&pub_id=1193043\" width=\"1\" height=\"1\" frameborder=\"0\" scrolling=\"no\" marginheight=\"0\" marginwidth=\"0\" topmargin=\"0\" leftmargin=\"0\" style=\"position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0;\"></iframe><script>try {!function(){function e(e,t){return\"function\"==typeof __an_obj_extend_thunk?__an_obj_extend_thunk(e,t):e}function t(e,t){\"function\"==typeof __an_err_thunk&&__an_err_thunk(e,t)}function n(e,t){if(\"function\"==typeof __an_redirect_thunk)__an_redirect_thunk(e);else{var n=navigator.connection;navigator.__an_connection&&(n=navigator.__an_connection),window==window.top&&n&&n.downlinkMax<=.115&&\"function\"==typeof HTMLIFrameElement&&HTMLIFrameElement.prototype.hasOwnProperty(\"srcdoc\")?(window.__an_resize=function(e,t,n){var r=e.frameElement;r&&\"__an_if\"==r.getAttribute(\"name\")&&(t&&(r.style.width=t+\"px\"),n&&(r.style.height=n+\"px\"))},document.write('<iframe name=\"__an_if\" style=\"width:0;height:0\" srcdoc=\"<script type=\\'text/javascript\\' src=\\''+e+\"&\"+t.bdfif+\"=1'></sc\"),document.write('ript>\" frameborder=\"0\" scrolling=\"no\" marginheight=0 marginwidth=0 topmargin=\"0\" leftmargin=\"0\" allowtransparency=\"true\"></iframe>')):document.write('<script language=\"javascript\" src=\"'+e+'\"></scr'+'ipt>')}};var r=function(e){this.rdParams=e};r.prototype={constructor:r,walkAncestors:function(e){try{if(!window.location.ancestorOrigins)return;for(var t=0,n=window.location.ancestorOrigins.length;n>t;t++)e.call(null,window.location.ancestorOrigins[t],t)}catch(r){\"undefined\"!=typeof console}return[]},walkUpWindows:function(e){var t,n=[];do try{t=t?t.parent:window,e.call(null,t,n)}catch(r){return\"undefined\"!=typeof console,n.push({referrer:null,location:null,isTop:!1}),n}while(t!=window.top);return n},getPubUrlStack:function(e){var n,r=[],o=null,i=null,a=null,c=null,d=null,s=null,u=null;for(n=e.length-1;n>=0;n--){try{a=e[n].location}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: location\")}if(a)i=encodeURIComponent(a),r.push(i),u||(u=i);else if(0!==n){c=e[n-1];try{d=c.referrer,s=c.ancestor}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: prevFrame\")}d?(i=encodeURIComponent(d),r.push(i),u||(u=i)):s?(i=encodeURIComponent(s),r.push(i),u||(u=i)):r.push(o)}else r.push(o)}return{stack:r,detectUrl:u}},getLevels:function(){var e=this.walkUpWindows(function(e,n){try{n.push({referrer:e.document.referrer||null,location:e.location.href||null,isTop:e==window.top})}catch(r){n.push({referrer:null,location:null,isTop:e==window.top}),\"undefined\"!=typeof console,t(r,\"AnRDModule::getLevels\")}});return this.walkAncestors(function(t,n){e[n].ancestor=t}),e},getRefererInfo:function(){var e=\"\";try{var n=this.getLevels(),r=n.length-1,o=null!==n[r].location||r>0&&null!==n[r-1].referrer,i=this.getPubUrlStack(n);e=this.rdParams.rdRef+\"=\"+i.detectUrl+\"&\"+this.rdParams.rdTop+\"=\"+o+\"&\"+this.rdParams.rdIfs+\"=\"+r+\"&\"+this.rdParams.rdStk+\"=\"+i.stack+\"&\"+this.rdParams.rdQs}catch(a){e=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::getRefererInfo\")}return e}};var o=function(n){var o=\"\";try{n=e(n,0);var i=e(new r(n),1);return i.getRefererInfo()}catch(a){o=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::executeRD\")}return o};;var c=\"https://sin3-ib.adnxs.com/rd_log?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QLACqBABQAAAwDWAAUBCNGcpvEFELjXrYmmhfn_Xxi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIjSpwY47UhA7UhIAlDTgZcuWJzxW2AAaM26dXicuAWAAQGKAQNVU0SSAQEG8FKYAawCoAH6AagBAbABALgBAcABA8gBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3OTc4MTcxMyk7dWYoJ3InLCA5Njg0NjAzNTYeAPCakgK1AiE2RG9jcmdpSC1id0tFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRaU5LbkJsZ0FZS3NHYUFCd0duaGlnQUdZQVlnQllwQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRR0NVQU9sekNMZFA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BNGY1dkFxNkF3bFRTVTR6T2pRM016bmdBX2daaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVdESmFrRg0TPEE4RDgumgKJASE4QTViOVE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBOek01UVBnWlNRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBGZUFBLsICNWh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctbXVsdGktZm9ybWF0LWFkcy5odG1s2AIA4AKtmEjqAksNQEh0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLwVGKHBsZV9iaWRkZXJzBUZ8P3BianNfZGVidWc9dHJ1ZfICEQoGQURWX0lEEgcyNTJBlAUUCENQRwUUGDU3NTk0MDQBFAgFQ1ABEzQIMjE5NzAwNTXyAg4KCAE8aEZSRVESAjc28gINCghSRU1fVVNFUhIBMPICDAkhFENPREUSAAUPAVgRDxALCgdDUBUOEAkKBUlPAWEEAPIBGgRJTxUaOBMKD0NVU1RPTV9NT0RFTA0kCBoKFjIWABxMRUFGX05BTQVqCB4KGjYdAAhBU1QBPuBJRklFRBIAgAMAiAMBkAMAmAMXoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My8prfBhmAQAogQOMTAzLjc5LjEwMC4xODCoBJ9EsgQSCAQQARisAiD6ASgBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MznaBAIIAeAEAfAE04GXLogFAZgFAKAF______8BAxQBwAUAyQWJhxTwP9IFCQkJDHAAANgFAeAFAfAFAfoFBAgAEACQBgCYBgC4BgDBBgkjKPA_0Ab1L9oGFgoQCREZAVAQABgA4AYB8gYCCACABwGIBwCgBwE.&s=ed5f46b966082cdaa8a03097e61912d616d63ddb\";c+=\"&\"+o({rdRef:\"bdref\",rdTop:\"bdtop\",rdIfs:\"bdifs\",rdStk:\"bstk\",rdQs:\"\"}),n(c,{bdfif:\"bdfif\"})}();} catch (e) { }</script><div name=\"anxv\" lnttag=\"v;tv=view7-1hs;st=0;d=300x250;vc=iab;vid_ccr=1;tag_id=13232392;cb=https%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Fmultiple_bidders.html%253Fpbjs_debug%253Dtrue%26e%3DwqT_3QLJCKBJBAAAAwDWAAUBCNGcpvEFELjXrYmmhfn_Xxi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIjSpwY47UhA7UhIAlDTgZcuWJzxW2AAaM26dXicuAWAAQGKAQNVU0SSAQEG8FKYAawCoAH6AagBAbABALgBAcABA8gBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3OTc4MTcxMyk7dWYoJ3InLCA5Njg0NjAzNTYeAPCakgK1AiE2RG9jcmdpSC1id0tFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRaU5LbkJsZ0FZS3NHYUFCd0duaGlnQUdZQVlnQllwQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRR0NVQU9sekNMZFA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BNGY1dkFxNkF3bFRTVTR6T2pRM016bmdBX2daaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVdESmFrRg0TPEE4RDgumgKJASE4QTViOVE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBOek01UVBnWlNRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBGZUFBLsICNWh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctbXVsdGktZm9ybWF0LWFkcy5odG1s2AIA4AKtmEjqAksNQEh0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLwVGKHBsZV9iaWRkZXJzBUbwQD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDbbwYZgEAKIEDjEwMy43OS4xMDAuMTgwqASfRLIEEggEEAEYrAIg-gEoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM52gQCCAHgBAHwBNOBly6IBQGYBQCgBf______AQMUAcAFAMkFaZAU8D_SBQkJCQxwAADYBQHgBQHwBQH6BQQIABAAkAYAmAYAuAYAwQYJIyjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGAfIGAggAgAcBiAcAoAcB%26s%3D0129cf8e57f06500d02fb27316142b07d331714e;ts=1579781713;cet=0;cecb=\" width=\"0\" height=\"0\" style=\"display: block; margin: 0; padding: 0; height: 0; width: 0;\"><script type=\"text/javascript\" async=\"true\" src=\"https://cdn.adnxs.com/v/s/182/trk.js\"></script></div>",
                'width': 300,
                'height': 250
              },
              'trackers': [{
                'impression_urls': ['https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QLJCKBJBAAAAwDWAAUBCNGcpvEFELjXrYmmhfn_Xxi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMIjSpwY47UhA7UhIAlDTgZcuWJzxW2AAaM26dXicuAWAAQGKAQNVU0SSAQEG8FKYAawCoAH6AagBAbABALgBAcABBMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3OTc4MTcxMyk7dWYoJ3InLCA5Njg0NjAzNTYeAPCakgK1AiE2RG9jcmdpSC1id0tFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRaU5LbkJsZ0FZS3NHYUFCd0duaGlnQUdZQVlnQllwQUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRR0NVQU9sekNMZFA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BNGY1dkFxNkF3bFRTVTR6T2pRM016bmdBX2daaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVdESmFrRg0TPEE4RDgumgKJASE4QTViOVE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBOek01UVBnWlNRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDPBGZUFBLsICNWh0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL3Nob3ctbXVsdGktZm9ybWF0LWFkcy5odG1s2AIA4AKtmEjqAksNQEh0ZXN0LmxvY2FsaG9zdDo5OTk5BRQYL3BhZ2VzLwVGKHBsZV9iaWRkZXJzBUbwQD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDbbwYZgEAKIEDjEwMy43OS4xMDAuMTgwqASfRLIEEggEEAEYrAIg-gEoASgCMAA4A7gEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM52gQCCAHgBAHwBNOBly6IBQGYBQCgBf______AQMUAcAFAMkFaZAU8D_SBQkJCQxwAADYBQHgBQHwBQH6BQQIABAAkAYAmAYAuAYAwQYJIyjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGAfIGAggAgAcBiAcAoAcB&s=6c6fb8a005b60bc5535b528c16ed74cd66c08dd0'],
                'video_events': {}
              }]
            }
          }]
        }, {
          'uuid': '375d249fda4d84',
          'tag_id': 13232354,
          'auction_id': '2793298983265666969',
          'nobid': false,
          'no_ad_url': 'https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKGCKAGBAAAAwDWAAUBCNGcpvEFEJmPioiD1PLhJhi7_-bKzp3kuD8qNgkAAAkCABEJBwgAABkJCQgkQCEJCQgAACkRCQAxCQnwaSRAMOLRpwY47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEBwAEAyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5NzgxNzEzKTsBHSxyJywgOTc0OTQyMDQ2HgDw0JICtQIhZ2oxVmFnajgtTHdLRUx6SnZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWUtzR2FBQndCbmlhQklBQm1BR0lBV0tRQVFDWUFRQ2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCQXNyenVXOVg0RF9aQVFBQUFBQUFBUEFfNEFFQTlRRUFBQUFBbUFJQW9BSUF0UUlBQUFBQXZRSUFBQUFBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVA4AcSIdWdNSlUwbE9Nem8wTnpNNTRBUDRHWWdFQUpBRUFKZ0VBY0UJXQUBCERKQgUICQEYMkFRQThRUQkNAQEsUGdFQUlnRmd5V3BCERc0UEFfmgKJASF2QS1kUHc2OQEkblBGYklBUW9BRBVkDGtRRG8ykQAQUVBnWlMdTQBVEQwMQUFBVx0MAFkdDABhHQwAYx0MoGVBQS7YAgDgAq2YSOoCS2h0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5BRT0DgEvcGFnZXMvbXVsdGlwbGVfYmlkZGVycy5odG1sP3BianNfZGVidWc9dHJ1ZYADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIEDjEwMy43OS4xMDAuMTgwqASfRLIEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MznaBAIIAOAEAfAEvMm-LogFAZgFAKAF____________AcAFAMkFAAAAAAAA8D_SBQkJAAAAAAAAAADYBQHgBQHwBZn0IfoFBAgAEACQBgGYBgC4BgDBBgAAAAAAAPC_0Ab1L9oGFgoQCREZAVAQABgA4AYM8gYCCACABwGIBwCgB0E.&s=acd26154fe24e1ce797e3016322901140c18ce65',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'native',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 97494204,
            'media_type_id': 12,
            'media_subtype_id': 65,
            'cpm': 10.000000,
            'cpm_publisher_currency': 10.000000,
            'publisher_currency_code': '$',
            'brand_category_id': 53,
            'client_initiated_ad_counting': true,
            'viewability': {
              'config': '<script type="text/javascript" async="true" src="https://cdn.adnxs.com/v/s/182/trk.js#v;vk=appnexus.com-omid;tv=native1-18hs;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Fmultiple_bidders.html%253Fpbjs_debug%253Dtrue%26e%3DwqT_3QKOCKAOBAAAAwDWAAUBCNGcpvEFEJmPioiD1PLhJhi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXicuAWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1Nzk3ODE3MTMpO3VmKCdyJywgOTc0OTQyMDQsIC4eAPDQkgK1AiFnajFWYWdqOC1Md0tFTHpKdmk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRNHRHbkJsZ0FZS3NHYUFCd0JuaWFCSUFCbUFHSUFXS1FBUUNZQVFDZ0FRR29BUU93QVFDNUFmT3RhcVFBQUNSQXdRSHpyV3FrQUFBa1FNa0JBc3J6dVc5WDREX1pBUUFBQUFBQUFQQV80QUVBOVFFQUFBQUFtQUlBb0FJQXRRSUFBQUFBdlFJQUFBQUE0QUlBNkFJQS1BSUFnQU1CbUFNQnFBUDgBxIh1Z01KVTBsT016bzBOek01NEFQNEdZZ0VBSkFFQUpnRUFjRQldBQEIREpCBQgJARgyQVFBOFFRCQ0BASxQZ0VBSWdGZ3lXcEIRFzRQQV-aAokBIXZBLWRQdzY5ASRuUEZiSUFRb0FEFWQMa1FEbzKRABBRUGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQygZUFBLtgCAOACrZhI6gJLaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkFFPQOAS9wYWdlcy9tdWx0aXBsZV9iaWRkZXJzLmh0bWw_cGJqc19kZWJ1Zz10cnVlgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQOMTAzLjc5LjEwMC4xODCoBJ9EsgQOCAAQARgAIAAoADAAOAK4BADABADIBADSBA45MzI1I1NJTjM6NDczOdoEAggB4AQB8AS8yb4uiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8D_QBvUv2gYWChAJERkBUBAAGADgBgzyBgIIAIAHAYgHAKAHQQ..%26s%3D2d3f9336af4da684d7733e29f53bbb80bf69a18c;ts=1579781713;cet=0;cecb="></script>'
            },
            'rtb': {
              'native': {
                'title': 'This is a Prebid Native Creative',
                'desc': 'This is a Prebid Native Creative.  There are many like it, but this one is mine.',
                'sponsored': 'Prebid.org',
                'icon': {
                  'url': 'https://vcdn.adnxs.com/p/creative-image/1a/3e/e9/5b/1a3ee95b-06cd-4260-98c7-0258627c9197.png',
                  'width': 127,
                  'height': 83,
                  'prevent_crop': false
                },
                'main_img': {
                  'url': 'https://vcdn.adnxs.com/p/creative-image/f8/7f/0f/13/f87f0f13-230c-4f05-8087-db9216e393de.jpg',
                  'width': 989,
                  'height': 742,
                  'prevent_crop': false
                },
                'link': {
                  'url': 'http://prebid.org/dev-docs/show-native-ads.html',
                  'click_trackers': ['https://sin3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQJmHAjGgysMmu79Z6eyQcT9RjileAAAAAOLoyQBtJAAAbSQAAAIAAAC8pM8FnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAQQCAAAAALoAxBbHxgAAAAA./bcr=AAAAAAAA8D8=/cnd=%21vA-dPwj8-LwKELzJvi4YnPFbIAQoADEAAAAAAAAkQDoJU0lOMzo0NzM5QPgZSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ3Mzk=/bn=89116/']
                },
                'impression_trackers': ['https://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmultiple_bidders.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKOCKAOBAAAAwDWAAUBCNGcpvEFEJmPioiD1PLhJhi7_-bKzp3kuD8qNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXicuAWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1Nzk3ODE3MTMpO3VmKCdyJywgOTc0OTQyMDQsIC4eAPDQkgK1AiFnajFWYWdqOC1Md0tFTHpKdmk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRNHRHbkJsZ0FZS3NHYUFCd0JuaWFCSUFCbUFHSUFXS1FBUUNZQVFDZ0FRR29BUU93QVFDNUFmT3RhcVFBQUNSQXdRSHpyV3FrQUFBa1FNa0JBc3J6dVc5WDREX1pBUUFBQUFBQUFQQV80QUVBOVFFQUFBQUFtQUlBb0FJQXRRSUFBQUFBdlFJQUFBQUE0QUlBNkFJQS1BSUFnQU1CbUFNQnFBUDgBxIh1Z01KVTBsT016bzBOek01NEFQNEdZZ0VBSkFFQUpnRUFjRQldBQEIREpCBQgJARgyQVFBOFFRCQ0BASxQZ0VBSWdGZ3lXcEIRFzRQQV-aAokBIXZBLWRQdzY5ASRuUEZiSUFRb0FEFWQMa1FEbzKRABBRUGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQygZUFBLtgCAOACrZhI6gJLaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkFFPQOAS9wYWdlcy9tdWx0aXBsZV9iaWRkZXJzLmh0bWw_cGJqc19kZWJ1Zz10cnVlgAMAiAMBkAMAmAMXoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwGABACSBA0vdXQvdjMvcHJlYmlkmAQAogQOMTAzLjc5LjEwMC4xODCoBJ9EsgQOCAAQARgAIAAoADAAOAK4BADABADIBADSBA45MzI1I1NJTjM6NDczOdoEAggB4AQB8AS8yb4uiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAAAAAAAAAANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8D_QBvUv2gYWChAJERkBUBAAGADgBgzyBgIIAIAHAYgHAKAHQQ..&s=2d3f9336af4da684d7733e29f53bbb80bf69a18c'],
                'id': 97494204
              }
            }
          }]
        }]
      }
    }
  }
}
