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
          'id': 13144370,
          'allow_smaller_sizes': false,
          'use_pmt_rule': false,
          'prebid': true,
          'disable_psa': true
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
          'uuid': '232f6ceccb3749',
          'tag_id': 13144370,
          'auction_id': '4842409943576641356',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmodules%2Fcurrency.html%3Fpbjs_debug%3Dtrue&e=wqT_3QK7CKA7BAAAAwDWAAUBCNvV-_AFEMz-0f3_xeyZQxjCs_b6q5D9_0oqNgkAAAkCABEJBywAABkAAACA61HgPyEREgApEQkAMREb8GkwsqKiBjjtSEDtSEgAUABYnPFbYABotc95eACAAQGKAQCSAQNVU0SYAawCoAHYBKgBAbABALgBAcABAMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3OTA4NDUwNyk7AR0scicsIDk4NDkzNTgxNh4A8NCSArUCIVpqeldtZ2l1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlNSUdhQUJ3RG5qd0U0QUJUSWdCOEJPUUFRQ1lBUUNnQVFHb0FRT3dBUUM1QVNtTGlJTUFBT0Ffd1FFcGk0aURBQURnUDhrQmxiMDhGYV9INERfWkFRQUFBQUFBQVBBXzRBRUE5UUVBQUFBQW1BSUFvQUlBdFFJQUFBQUF2UUlBQUFBQTRBSUE2QUlBLUFJQWdBTUJtQU1CcUFPdQHEiHVnTUpVMGxPTXpvME56TTE0QU80R1lnRUFKQUVBSmdFQWNFCV0FAQhESkIFCAkBGDJBUUE4UVEJDQEBLFBnRUFJZ0ZfeVNwQhEXNFBBX5oCiQEhblE4cUxBNjkBJG5QRmJJQVFvQUQRZBBEZ1B6bzKRABBRTGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQzwQGVBQS7CAi9odHRwOi8vcHJlYmlkLm9yZy9kZXYtZG9jcy9nZXR0aW5nLXN0YXJ0ZWQuaHRtbNgCAOACrZhI6gJLDTpIdGVzdC5sb2NhbGhvc3Q6OTk5OQUUWC9wYWdlcy9tb2R1bGVzL2N1cnJlbmN5BUbwQD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDbDwXpgEAKIECzEwLjc1Ljc0LjY5qATikAGyBBIIBBAEGKwCIPoBKAEoAjAAOAK4BADABADIBADSBA45MzI1I1NJTjM6NDczNdoEAggA4AQB8ASNyfsuiAUBmAUAoAX_____BQMYAcAFAMkFAAUBFPA_0gUJCQULfAAAANgFAeAFAfAFmfQh-gUECAAQAJAGAJgGALgGAMEGASEwAADwv9AG9S_aBhYKEAkRGQFQEAAYAOAGAfIGAggAgAcBiAcAoAcB&s=16a5ea7c8d5eb050a368495961803753dd6086c2',
          'timeout_ms': 0,
          'ad_profile_id': 1182765,
          'rtb_video_fallback': false,
          'ads': [{
            'content_source': 'rtb',
            'ad_type': 'banner',
            'buyer_member_id': 9325,
            'advertiser_id': 2529885,
            'creative_id': 98493581,
            'media_type_id': 1,
            'media_subtype_id': 1,
            'cpm': 0.500000,
            'cpm_publisher_currency': 0.500000,
            'publisher_currency_code': '$',
            'brand_category_id': 53,
            'client_initiated_ad_counting': true,
            'rtb': {
              'banner': {
                'content': "<!-- Creative 98493581 served by Member 9325 via AppNexus --><a href=\"http://sin3-ib.adnxs.com/click?AAAAAAAA4D8AAAAAAADgPwAAAIDrUeA_AAAAAAAA4D8AAAAAAADgP0x_tP8vsjNDwpldv4L0_0rb6h5eAAAAADKRyABtJAAAbSQAAAIAAACN5N4FnPgWAAAAAABVU0QAVVNEACwBWAK1ZwAAAAABAQMCAAAAALwAjx2uRQAAAAA./bcr=AAAAAAAA8D8=/cnd=%21nQ8qLAiusK4KEI3J-y4YnPFbIAQoADEAAAAAAADgPzoJU0lOMzo0NzM1QLgZSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ3MzU=/bn=89118/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fgetting-started.html\" target=\"_blank\"><img width=\"300\" height=\"600\" style=\"border-style: none\" src=\"http://vcdn.adnxs.com/p/creative-image/79/0f/47/8f/790f478f-7de1-4472-9496-d21182055f90.png\"/></a><iframe src=\"http://acdn.adnxs.com/dmp/async_usersync.html?gdpr=0&seller_id=9325&pub_id=1193043\" width=\"1\" height=\"1\" frameborder=\"0\" scrolling=\"no\" marginheight=\"0\" marginwidth=\"0\" topmargin=\"0\" leftmargin=\"0\" style=\"position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0;\"></iframe><script>try {!function(){function e(e,t){return\"function\"==typeof __an_obj_extend_thunk?__an_obj_extend_thunk(e,t):e}function t(e,t){\"function\"==typeof __an_err_thunk&&__an_err_thunk(e,t)}function n(e,t){if(\"function\"==typeof __an_redirect_thunk)__an_redirect_thunk(e);else{var n=navigator.connection;navigator.__an_connection&&(n=navigator.__an_connection),window==window.top&&n&&n.downlinkMax<=.115&&\"function\"==typeof HTMLIFrameElement&&HTMLIFrameElement.prototype.hasOwnProperty(\"srcdoc\")?(window.__an_resize=function(e,t,n){var r=e.frameElement;r&&\"__an_if\"==r.getAttribute(\"name\")&&(t&&(r.style.width=t+\"px\"),n&&(r.style.height=n+\"px\"))},document.write('<iframe name=\"__an_if\" style=\"width:0;height:0\" srcdoc=\"<script type=\\'text/javascript\\' src=\\''+e+\"&\"+t.bdfif+\"=1'></sc\"),document.write('ript>\" frameborder=\"0\" scrolling=\"no\" marginheight=0 marginwidth=0 topmargin=\"0\" leftmargin=\"0\" allowtransparency=\"true\"></iframe>')):document.write('<script language=\"javascript\" src=\"'+e+'\"></scr'+'ipt>')}};var r=function(e){this.rdParams=e};r.prototype={constructor:r,walkAncestors:function(e){try{if(!window.location.ancestorOrigins)return;for(var t=0,n=window.location.ancestorOrigins.length;n>t;t++)e.call(null,window.location.ancestorOrigins[t],t)}catch(r){\"undefined\"!=typeof console}return[]},walkUpWindows:function(e){var t,n=[];do try{t=t?t.parent:window,e.call(null,t,n)}catch(r){return\"undefined\"!=typeof console,n.push({referrer:null,location:null,isTop:!1}),n}while(t!=window.top);return n},getPubUrlStack:function(e){var n,r=[],o=null,i=null,a=null,c=null,d=null,s=null,u=null;for(n=e.length-1;n>=0;n--){try{a=e[n].location}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: location\")}if(a)i=encodeURIComponent(a),r.push(i),u||(u=i);else if(0!==n){c=e[n-1];try{d=c.referrer,s=c.ancestor}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: prevFrame\")}d?(i=encodeURIComponent(d),r.push(i),u||(u=i)):s?(i=encodeURIComponent(s),r.push(i),u||(u=i)):r.push(o)}else r.push(o)}return{stack:r,detectUrl:u}},getLevels:function(){var e=this.walkUpWindows(function(e,n){try{n.push({referrer:e.document.referrer||null,location:e.location.href||null,isTop:e==window.top})}catch(r){n.push({referrer:null,location:null,isTop:e==window.top}),\"undefined\"!=typeof console,t(r,\"AnRDModule::getLevels\")}});return this.walkAncestors(function(t,n){e[n].ancestor=t}),e},getRefererInfo:function(){var e=\"\";try{var n=this.getLevels(),r=n.length-1,o=null!==n[r].location||r>0&&null!==n[r-1].referrer,i=this.getPubUrlStack(n);e=this.rdParams.rdRef+\"=\"+i.detectUrl+\"&\"+this.rdParams.rdTop+\"=\"+o+\"&\"+this.rdParams.rdIfs+\"=\"+r+\"&\"+this.rdParams.rdStk+\"=\"+i.stack+\"&\"+this.rdParams.rdQs}catch(a){e=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::getRefererInfo\")}return e}};var o=function(n){var o=\"\";try{n=e(n,0);var i=e(new r(n),1);return i.getRefererInfo()}catch(a){o=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::executeRD\")}return o};;var c=\"http://sin3-ib.adnxs.com/rd_log?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmodules%2Fcurrency.html%3Fpbjs_debug%3Dtrue&e=wqT_3QK6CqA6BQAAAwDWAAUBCNvV-_AFEMz-0f3_xeyZQxjCs_b6q5D9_0oqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eJ64BYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAEBwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5MDg0NTA3KTt1ZigncicsIDk4NDkzNTgxNh4A8NCSArUCIVpqeldtZ2l1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlNSUdhQUJ3RG5qd0U0QUJUSWdCOEJPUUFRQ1lBUUNnQVFHb0FRT3dBUUM1QVNtTGlJTUFBT0Ffd1FFcGk0aURBQURnUDhrQmxiMDhGYV9INERfWkFRQUFBQUFBQVBBXzRBRUE5UUVBQUFBQW1BSUFvQUlBdFFJQUFBQUF2UUlBQUFBQTRBSUE2QUlBLUFJQWdBTUJtQU1CcUFPdQHEiHVnTUpVMGxPTXpvME56TTE0QU80R1lnRUFKQUVBSmdFQWNFCV0FAQhESkIFCAkBGDJBUUE4UVEJDQEBLFBnRUFJZ0ZfeVNwQhEXNFBBX5oCiQEhblE4cUxBNjkBJG5QRmJJQVFvQUQRZBBEZ1B6bzKRABBRTGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQzwQGVBQS7CAi9odHRwOi8vcHJlYmlkLm9yZy9kZXYtZG9jcy9nZXR0aW5nLXN0YXJ0ZWQuaHRtbNgCAOACrZhI6gJLDTpIdGVzdC5sb2NhbGhvc3Q6OTk5OQUUWC9wYWdlcy9tb2R1bGVzL2N1cnJlbmN5BUZ8P3BianNfZGVidWc9dHJ1ZfICEQoGQURWX0lEEgcyNTJBjgUUCENQRwUUFDU2ODQ4NAUUCAVDUAETNAgyMTczMTM3NPICDgoIATxoRlJFURICMzjyAg0KCFJFTV9VU0VSEgEw8gIMCSEUQ09ERRIABQ8BWBEPEAsKB0NQFQ4QCQoFSU8BYQQA8gEaBElPFRo4EwoPQ1VTVE9NX01PREVMDSQIGgoWMhYAHExFQUZfTkFNBWoIHgoaNh0ACEFTVAE-4ElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzLymn8F6YBACiBAsxMC43NS43NC42OagE4pABsgQSCAQQBBisAiD6ASgBKAIwADgCuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MzXaBAIIAeAEAfAEjcn7LogFAZgFAKAF_____wUDGAHABQDJBQAFARTwP9IFCQkFC3wAAADYBQHgBQHwBZn0IfoFBAgAEACQBgCYBgC4BgDBBgEhMAAA8D_QBvUv2gYWChAJERkBUBAAGADgBgHyBgIIAIAHAYgHAKAHAQ..&s=5287f714a9a143f566324422562e604c776037f5\";c+=\"&\"+o({rdRef:\"bdref\",rdTop:\"bdtop\",rdIfs:\"bdifs\",rdStk:\"bstk\",rdQs:\"\"}),n(c,{bdfif:\"bdfif\"})}();} catch (e) { }</script><div name=\"anxv\" lnttag=\"v;tv=view7-1h;st=0;d=300x600;vc=iab;vid_ccr=1;tag_id=13144370;cb=http%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Fmodules%252Fcurrency.html%253Fpbjs_debug%253Dtrue%26e%3DwqT_3QLDCKBDBAAAAwDWAAUBCNvV-_AFEMz-0f3_xeyZQxjCs_b6q5D9_0oqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eJ64BYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAEBwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5MDg0NTA3KTt1ZigncicsIDk4NDkzNTgxNh4A8NCSArUCIVpqeldtZ2l1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlNSUdhQUJ3RG5qd0U0QUJUSWdCOEJPUUFRQ1lBUUNnQVFHb0FRT3dBUUM1QVNtTGlJTUFBT0Ffd1FFcGk0aURBQURnUDhrQmxiMDhGYV9INERfWkFRQUFBQUFBQVBBXzRBRUE5UUVBQUFBQW1BSUFvQUlBdFFJQUFBQUF2UUlBQUFBQTRBSUE2QUlBLUFJQWdBTUJtQU1CcUFPdQHEiHVnTUpVMGxPTXpvME56TTE0QU80R1lnRUFKQUVBSmdFQWNFCV0FAQhESkIFCAkBGDJBUUE4UVEJDQEBLFBnRUFJZ0ZfeVNwQhEXNFBBX5oCiQEhblE4cUxBNjkBJG5QRmJJQVFvQUQRZBBEZ1B6bzKRABBRTGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQzwQGVBQS7CAi9odHRwOi8vcHJlYmlkLm9yZy9kZXYtZG9jcy9nZXR0aW5nLXN0YXJ0ZWQuaHRtbNgCAOACrZhI6gJLDTpIdGVzdC5sb2NhbGhvc3Q6OTk5OQUUWC9wYWdlcy9tb2R1bGVzL2N1cnJlbmN5BUbwQD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDbDwXpgEAKIECzEwLjc1Ljc0LjY5qATikAGyBBIIBBAEGKwCIPoBKAEoAjAAOAK4BADABADIBADSBA45MzI1I1NJTjM6NDczNdoEAggB4AQB8ASNyfsuiAUBmAUAoAX_____BQMYAcAFAMkFAAUBFPA_0gUJCQULfAAAANgFAeAFAfAFmfQh-gUECAAQAJAGAJgGALgGAMEGASEwAADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGAfIGAggAgAcBiAcAoAcB%26s%3D230ed5ef831ad1a02a17f37499f93d6d3486c298;ts=1579084507;cet=0;cecb=\" width=\"0\" height=\"0\" style=\"display: block; margin: 0; padding: 0; height: 0; width: 0;\"><script type=\"text/javascript\" async=\"true\" src=\"http://cdn.adnxs.com/v/s/182/trk.js\"></script></div>",
                'width': 300,
                'height': 600
              },
              'trackers': [{
                'impression_urls': ['http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmodules%2Fcurrency.html%3Fpbjs_debug%3Dtrue&e=wqT_3QLDCKBDBAAAAwDWAAUBCNvV-_AFEMz-0f3_xeyZQxjCs_b6q5D9_0oqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eJ64BYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAEBwAEEyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5MDg0NTA3KTt1ZigncicsIDk4NDkzNTgxNh4A8NCSArUCIVpqeldtZ2l1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlNSUdhQUJ3RG5qd0U0QUJUSWdCOEJPUUFRQ1lBUUNnQVFHb0FRT3dBUUM1QVNtTGlJTUFBT0Ffd1FFcGk0aURBQURnUDhrQmxiMDhGYV9INERfWkFRQUFBQUFBQVBBXzRBRUE5UUVBQUFBQW1BSUFvQUlBdFFJQUFBQUF2UUlBQUFBQTRBSUE2QUlBLUFJQWdBTUJtQU1CcUFPdQHEiHVnTUpVMGxPTXpvME56TTE0QU80R1lnRUFKQUVBSmdFQWNFCV0FAQhESkIFCAkBGDJBUUE4UVEJDQEBLFBnRUFJZ0ZfeVNwQhEXNFBBX5oCiQEhblE4cUxBNjkBJG5QRmJJQVFvQUQRZBBEZ1B6bzKRABBRTGdaUx1NAFURDAxBQUFXHQwAWR0MAGEdDABjHQzwQGVBQS7CAi9odHRwOi8vcHJlYmlkLm9yZy9kZXYtZG9jcy9nZXR0aW5nLXN0YXJ0ZWQuaHRtbNgCAOACrZhI6gJLDTpIdGVzdC5sb2NhbGhvc3Q6OTk5OQUUWC9wYWdlcy9tb2R1bGVzL2N1cnJlbmN5BUbwQD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDbDwXpgEAKIECzEwLjc1Ljc0LjY5qATikAGyBBIIBBAEGKwCIPoBKAEoAjAAOAK4BADABADIBADSBA45MzI1I1NJTjM6NDczNdoEAggB4AQB8ASNyfsuiAUBmAUAoAX_____BQMYAcAFAMkFAAUBFPA_0gUJCQULfAAAANgFAeAFAfAFmfQh-gUECAAQAJAGAJgGALgGAMEGASEwAADwP9AG9S_aBhYKEAkRGQFQEAAYAOAGAfIGAggAgAcBiAcAoAcB&s=9c378bb4ca21a7509f69955fb4e6fe72035190c6'],
                'video_events': {}
              }]
            }
          }]
        }, {
          'uuid': '3867e6fdb23eb6',
          'tag_id': 13232354,
          'auction_id': '8100967561168057198',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmodules%2Fcurrency.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKECKAEBAAAAwDWAAUBCNvV-_AFEO7mieO34pq2cBjCs_b6q5D9_0oqNgkAAAkCABEJBwgAABkJCQgkQCEJCQgAACkRCQAxCQnwaSRAMOLRpwY47UhA7UhIAFAAWJzxW2AAaM26dXgAgAEBigEAkgEDVVNEmAEBoAEBqAEBsAEAuAEBwAEAyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc5MDg0NTA3KTsBHSxyJywgOTc0OTQyMDQ2HgDwmpICtQIhMVR6c3lRajgtTHdLRUx6SnZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1JR2FBQndBSGdBZ0FGTWlBSHdFNUFCQUpnQkFLQUJBYWdCQTdBQkFMa0I4NjFxcEFBQUpFREJBZk90YXFRQUFDUkF5UUc5QzZTMEtFampQOWtCQUFBQUFBQUE4RF9nQVFEMUFRAQ8sQ1lBZ0NnQWdDMUFnBRAAOQkI8EBEZ0FnRG9BZ0Q0QWdDQUF3R1lBd0dvQV96NHZBcTZBd2xUU1U0ek9qUTNNelhnQTdnWmlBUUFrQVFBbUFRQndRUQFNCQEITWtFCQkBARhEWUJBRHhCAQsNASwtQVFBaUFYX0pLa0YNEzxBOEQ4LpoCiQEhZUE4dE1BNjkBJG5QRmJJQVFvQUQVWFhrUURvSlUwbE9Nem8wTnpNMVFMZ1pTUQ1PDFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQygZUFBLtgCAOACrZhI6gJLaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkFFPDXL3BhZ2VzL21vZHVsZXMvY3VycmVuY3kuaHRtbD9wYmpzX2RlYnVnPXRydWWAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My9wcmViaWSYBACiBAsxMC43NS43NC42OagE4pABsgQOCAAQARgAIAAoADAAOAK4BADABADIBADSBA45MzI1I1NJTjM6NDczNdoEAggA4AQB8AS8yb4uiAUBmAUAoAX___________8BwAUAyQUAAAAAAADwP9IFCQkAaVZ0ANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGCSQo8L_QBvUv2gYWChAJERkBUBAAGADgBgzyBgIIAIAHAYgHAKAHQQ..&s=428486554947609aac96ed5569d9bb2dd2be5502',
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
              'config': '<script type="text/javascript" async="true" src="http://cdn.adnxs.com/v/s/182/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=http%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252Ftest%252Fpages%252Fmodules%252Fcurrency.html%253Fpbjs_debug%253Dtrue%26e%3DwqT_3QKMCKAMBAAAAwDWAAUBCNvV-_AFEO7mieO34pq2cBjCs_b6q5D9_0oqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXieuAWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzkwODQ1MDcpO3VmKCdyJywgOTc0OTQyMDQsIC4eAPCakgK1AiExVHpzeVFqOC1Md0tFTHpKdmk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRNHRHbkJsZ0FZTUlHYUFCd0FIZ0FnQUZNaUFId0U1QUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRRzlDNlMwS0VqalA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BX3o0dkFxNkF3bFRTVTR6T2pRM016WGdBN2daaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhfSktrRg0TPEE4RDgumgKJASFlQTh0TUE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBOek0xUUxnWlNRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDKBlQUEu2AIA4AKtmEjqAktodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OQUU8NcvcGFnZXMvbW9kdWxlcy9jdXJyZW5jeS5odG1sP3BianNfZGVidWc9dHJ1ZYADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECzEwLjc1Ljc0LjY5qATikAGyBA4IABABGAAgACgAMAA4ArgEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM12gQCCAHgBAHwBLzJvi6IBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQBpXnQA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYJJCjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGDPIGAggAgAcBiAcAoAdB%26s%3Dd6c58ebc137658c5dd258579c2575ad499e7a7b4;ts=1579084507;cet=0;cecb="></script>'
            },
            'rtb': {
              'native': {
                'title': 'This is a Prebid Native Creative',
                'desc': 'This is a Prebid Native Creative.  There are many like it, but this one is mine.',
                'sponsored': 'Prebid.org',
                'icon': {
                  'url': 'http://vcdn.adnxs.com/p/creative-image/1a/3e/e9/5b/1a3ee95b-06cd-4260-98c7-0258627c9197.png',
                  'width': 127,
                  'height': 83,
                  'prevent_crop': false
                },
                'main_img': {
                  'url': 'http://vcdn.adnxs.com/p/creative-image/f8/7f/0f/13/f87f0f13-230c-4f05-8087-db9216e393de.jpg',
                  'width': 989,
                  'height': 742,
                  'prevent_crop': false
                },
                'link': {
                  'url': 'http://prebid.org/dev-docs/show-native-ads.html',
                  'click_trackers': ['http://sin3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQG5zYnwTa2xwwpldv4L0_0rb6h5eAAAAAOLoyQBtJAAAbSQAAAIAAAC8pM8FnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAQQCAAAAALoAYBc26wAAAAA./bcr=AAAAAAAA8D8=/cnd=%21eA8tMAj8-LwKELzJvi4YnPFbIAQoADEAAAAAAAAkQDoJU0lOMzo0NzM1QLgZSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ3MzU=/bn=89118/']
                },
                'impression_trackers': ['http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2Ftest%2Fpages%2Fmodules%2Fcurrency.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKMCKAMBAAAAwDWAAUBCNvV-_AFEO7mieO34pq2cBjCs_b6q5D9_0oqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXieuAWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NzkwODQ1MDcpO3VmKCdyJywgOTc0OTQyMDQsIC4eAPCakgK1AiExVHpzeVFqOC1Md0tFTHpKdmk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRNHRHbkJsZ0FZTUlHYUFCd0FIZ0FnQUZNaUFId0U1QUJBSmdCQUtBQkFhZ0JBN0FCQUxrQjg2MXFwQUFBSkVEQkFmT3RhcVFBQUNSQXlRRzlDNlMwS0VqalA5a0JBQUFBQUFBQThEX2dBUUQxQVEBDyxDWUFnQ2dBZ0MxQWcFEAA5CQjwQERnQWdEb0FnRDRBZ0NBQXdHWUF3R29BX3o0dkFxNkF3bFRTVTR6T2pRM016WGdBN2daaUFRQWtBUUFtQVFCd1FRAU0JAQhNa0UJCQEBGERZQkFEeEIBCw0BLC1BUUFpQVhfSktrRg0TPEE4RDgumgKJASFlQTh0TUE2OQEkblBGYklBUW9BRBVYWGtRRG9KVTBsT016bzBOek0xUUxnWlNRDU8MUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDKBlQUEu2AIA4AKtmEjqAktodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OQUU8NcvcGFnZXMvbW9kdWxlcy9jdXJyZW5jeS5odG1sP3BianNfZGVidWc9dHJ1ZYADAIgDAZADAJgDF6ADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECzEwLjc1Ljc0LjY5qATikAGyBA4IABABGAAgACgAMAA4ArgEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM12gQCCAHgBAHwBLzJvi6IBQGYBQCgBf___________wHABQDJBQAAAAAAAPA_0gUJCQBpXnQA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYJJCjwP9AG9S_aBhYKEAkRGQFQEAAYAOAGDPIGAggAgAcBiAcAoAdB&s=d6c58ebc137658c5dd258579c2575ad499e7a7b4'],
                'id': 97494204
              }
            }
          }]
        }]
      }
    }
  }
}
