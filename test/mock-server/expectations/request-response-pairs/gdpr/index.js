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
          'uuid': '27c4cea6dfcad4',
          'tag_id': 13144370,
          'auction_id': '6784868202366971885',
          'nobid': false,
          'no_ad_url': 'http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fgdpr_hello_world.html%3Fpbjs_debug%3Dtrue&e=wqT_3QL0CWz0BAAAAwDWAAUBCKKt0fAFEO3ftM_qtayUXhj_EQEQASo2CQANAQARDQgoABkAAACA61HgPyEREgApEQkAMREb8GkwsqKiBjjtSEDtSEgAUABYnPFbYABotc95eACAAQGKAQCSAQNVU0SYAawCoAH6AagBAbABALgBAcABAMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU3ODM5MTIwMik7AR0scicsIDk2ODQ2MDM1Nh4A9A4BkgLJAiF0ajlmS2dpdXNLNEtFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRc3FLaUJsZ0FZUF9fX184UGFBQndBWGdCZ0FFQmlBRUJrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRXBpNGlEQUFEZ1A4RUJLWXVJZ3dBQTREX0pBZWxBS28zZEV1OF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBTUFDQWNnQ0FkQUNBZGdDQWVBQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEcnJDdUNyb0RDVk5KVGpNNk5EY3pPZUFEX0JpSUJBQ1FCQUNZQkFIQkJBQUFBQQmDCHlRUQkJAQEYTmdFQVBFRQELCQEwRDRCQUNJQllNbHFRVQkTREFEd1B3Li6aAokBIWZnOFhHUTZNASRuUEZiSUFRb0FEEUhYRGdQem9KVTBsT016bzBOek01UVB3WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EBlQUEuwgIvaHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3MvZ2V0dGluZy1zdGFydGVkLmh0bWzYAgDgAq2YSOoCWA068IF0ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2dkcHJfaGVsbG9fd29ybGQuaHRtbD9wYmpzX2RlYnVnPXRydWWAAwGIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDb3wW5gEAKIECzEwLjc1Ljc0LjY5qAS_NrIEEggEEAQYrAIg-gEoASgCMAA4ArgEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM52gQCCADgBAHwBNOBly6IBQGYBQCgBf__bcwUAcAFAMkFaakU8D_SBQkJCQyIAADYBQHgBQHwBQH6BQQIABAAkAYAmAYAsgaWAUJPc3kwUXkBBixYaUFBQUJBRU5DMi0hswh0RjdhJQxfX185AQXwcV9fOXV6X092X3ZfZl9fMzNlOF9fOXZfbF83Xy1fX191Xy0zM2Q0dV8xdmY5OXlmbTEtN2V0cjN0cF84N3VlczJfWHVyX183OV9fM3ozXzlweFA3OGs4OXI3MzM3RXdfdi1fdi1iN0pDT05fQbgGAcEGAAW-KPC_0Ab1L9oGFgoQBRAdAVAQABgA4AYB8gYCCACABwGIBwCgBwE.&s=896d8d25ed5c73ed4b49adebaa58ba23ed6afa43',
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
            'cpm': 0.500000,
            'cpm_publisher_currency': 0.500000,
            'publisher_currency_code': '$',
            'brand_category_id': 0,
            'client_initiated_ad_counting': true,
            'rtb': {
              'banner': {
                'content': "<!-- Creative 96846035 served by Member 9325 via AppNexus --><a href=\"http://sin3-ib.adnxs.com/click?AAAAAAAA4D8AAAAAAADgPwAAAIDrUeA_AAAAAAAA4D8AAAAAAADgP-0v7amusShe__________-iVhReAAAAADKRyABtJAAAbSQAAAIAAADTwMUFnPgWAAAAAABVU0QAVVNEACwB-gC1ZwAAAAABAQMCAAAAALwA5SBrMAAAAAA./bcr=AAAAAAAA8D8=/cnd=%21fg8XGQiusK4KENOBly4YnPFbIAQoADEAAAAAAADgPzoJU0lOMzo0NzM5QPwYSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeAA./cca=OTMyNSNTSU4zOjQ3Mzk=/bn=89163/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fgetting-started.html\" target=\"_blank\"><img width=\"300\" height=\"250\" style=\"border-style: none\" src=\"http://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png\"/></a><script>try {!function(){function e(e,t){return\"function\"==typeof __an_obj_extend_thunk?__an_obj_extend_thunk(e,t):e}function t(e,t){\"function\"==typeof __an_err_thunk&&__an_err_thunk(e,t)}function n(e,t){if(\"function\"==typeof __an_redirect_thunk)__an_redirect_thunk(e);else{var n=navigator.connection;navigator.__an_connection&&(n=navigator.__an_connection),window==window.top&&n&&n.downlinkMax<=.115&&\"function\"==typeof HTMLIFrameElement&&HTMLIFrameElement.prototype.hasOwnProperty(\"srcdoc\")?(window.__an_resize=function(e,t,n){var r=e.frameElement;r&&\"__an_if\"==r.getAttribute(\"name\")&&(t&&(r.style.width=t+\"px\"),n&&(r.style.height=n+\"px\"))},document.write('<iframe name=\"__an_if\" style=\"width:0;height:0\" srcdoc=\"<script type=\\'text/javascript\\' src=\\''+e+\"&\"+t.bdfif+\"=1'></sc\"),document.write('ript>\" frameborder=\"0\" scrolling=\"no\" marginheight=0 marginwidth=0 topmargin=\"0\" leftmargin=\"0\" allowtransparency=\"true\"></iframe>')):document.write('<script language=\"javascript\" src=\"'+e+'\"></scr'+'ipt>')}};var r=function(e){this.rdParams=e};r.prototype={constructor:r,walkAncestors:function(e){try{if(!window.location.ancestorOrigins)return;for(var t=0,n=window.location.ancestorOrigins.length;n>t;t++)e.call(null,window.location.ancestorOrigins[t],t)}catch(r){\"undefined\"!=typeof console}return[]},walkUpWindows:function(e){var t,n=[];do try{t=t?t.parent:window,e.call(null,t,n)}catch(r){return\"undefined\"!=typeof console,n.push({referrer:null,location:null,isTop:!1}),n}while(t!=window.top);return n},getPubUrlStack:function(e){var n,r=[],o=null,i=null,a=null,c=null,d=null,s=null,u=null;for(n=e.length-1;n>=0;n--){try{a=e[n].location}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: location\")}if(a)i=encodeURIComponent(a),r.push(i),u||(u=i);else if(0!==n){c=e[n-1];try{d=c.referrer,s=c.ancestor}catch(l){\"undefined\"!=typeof console,t(l,\"AnRDModule::getPubUrlStack:: prevFrame\")}d?(i=encodeURIComponent(d),r.push(i),u||(u=i)):s?(i=encodeURIComponent(s),r.push(i),u||(u=i)):r.push(o)}else r.push(o)}return{stack:r,detectUrl:u}},getLevels:function(){var e=this.walkUpWindows(function(e,n){try{n.push({referrer:e.document.referrer||null,location:e.location.href||null,isTop:e==window.top})}catch(r){n.push({referrer:null,location:null,isTop:e==window.top}),\"undefined\"!=typeof console,t(r,\"AnRDModule::getLevels\")}});return this.walkAncestors(function(t,n){e[n].ancestor=t}),e},getRefererInfo:function(){var e=\"\";try{var n=this.getLevels(),r=n.length-1,o=null!==n[r].location||r>0&&null!==n[r-1].referrer,i=this.getPubUrlStack(n);e=this.rdParams.rdRef+\"=\"+i.detectUrl+\"&\"+this.rdParams.rdTop+\"=\"+o+\"&\"+this.rdParams.rdIfs+\"=\"+r+\"&\"+this.rdParams.rdStk+\"=\"+i.stack+\"&\"+this.rdParams.rdQs}catch(a){e=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::getRefererInfo\")}return e}};var o=function(n){var o=\"\";try{n=e(n,0);var i=e(new r(n),1);return i.getRefererInfo()}catch(a){o=\"\",\"undefined\"!=typeof console,t(a,\"AnRDModule::executeRD\")}return o};;var c=\"http://sin3-ib.adnxs.com/rd_log?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fgdpr_hello_world.html%3Fpbjs_debug%3Dtrue&e=wqT_3QLQCmxQBQAAAwDWAAUBCKKt0fAFEO3ftM_qtayUXhj_EQEQASo2CQAFAQjgPxEFCDAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUNOBly5YnPFbYABotc95eMu4BYABAYoBA1VTRJIBAQbwUpgBrAKgAfoBqAEBsAEAuAEBwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc4MzkxMjAyKTt1ZigncicsIDk2ODQ2MDM1Nh4A9A4BkgLJAiF0ajlmS2dpdXNLNEtFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRc3FLaUJsZ0FZUF9fX184UGFBQndBWGdCZ0FFQmlBRUJrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRXBpNGlEQUFEZ1A4RUJLWXVJZ3dBQTREX0pBZWxBS28zZEV1OF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBTUFDQWNnQ0FkQUNBZGdDQWVBQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEcnJDdUNyb0RDVk5KVGpNNk5EY3pPZUFEX0JpSUJBQ1FCQUNZQkFIQkJBQUFBQQmDCHlRUQkJAQEYTmdFQVBFRQELCQEwRDRCQUNJQllNbHFRVQkTREFEd1B3Li6aAokBIWZnOFhHUTZNASRuUEZiSUFRb0FEEUhYRGdQem9KVTBsT016bzBOek01UVB3WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EBlQUEuwgIvaHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3MvZ2V0dGluZy1zdGFydGVkLmh0bWzYAgDgAq2YSOoCWA068HF0ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2dkcHJfaGVsbG9fd29ybGQuaHRtbD9wYmpzX2RlYnVnPXRydWXyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDVVNUT00NFjxMRUFGX05BTUUSAPICHgoaMjMADExBU1QBKOBJRklFRBIAgAMBiAMBkAMAmAMXoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92My8pEfBbmAQAogQLMTAuNzUuNzQuNjmoBL82sgQSCAQQBBisAiD6ASgBKAIwADgCuAQAwAQAyAQA0gQOOTMyNSNTSU4zOjQ3MznaBAIIAeAEAfAE04GXLogFAZgFAKAF__-NKBQBwAUAyQWJBRTwP9IFCQkJDIgAANgFAeAFAfAFAfoFBAgAEACQBgCYBgCyBpYBQk9zeTBReQEGLFhpQUFBQkFFTkMyLUEHCHRGN2F5DF9fXzkBBfBxX185dXpfT3Zfdl9mX18zM2U4X185dl9sXzdfLV9fX3VfLTMzZDR1XzF2Zjk5eWZtMS03ZXRyM3RwXzg3dWVzMl9YdXJfXzc5X18zejNfOXB4UDc4azg5cjczMzdFd192LV92LWI3SkNPTl9BuAYBwQYABb4o8D_QBvUv2gYWChAFEB0BUBAAGADgBgHyBgIIAIAHAYgHAKAHAQ..&s=43ad9091aa22ae2525b95c231242515c2925f4c1\";c+=\"&\"+o({rdRef:\"bdref\",rdTop:\"bdtop\",rdIfs:\"bdifs\",rdStk:\"bstk\",rdQs:\"\"}),n(c,{bdfif:\"bdfif\"})}();} catch (e) { }</script><div name=\"anxv\" lnttag=\"v;tv=view7-1h;st=0;d=300x250;vc=iab;vid_ccr=1;tag_id=13144370;cb=http%3A%2F%2Fsin3-ib.adnxs.com%2Fvevent%3Fan_audit%3D0%26referrer%3Dhttp%253A%252F%252Ftest.localhost%253A9999%252FintegrationExamples%252Fgpt%252Fgdpr_hello_world.html%253Fpbjs_debug%253Dtrue%26e%3DwqT_3QL8CWz8BAAAAwDWAAUBCKKt0fAFEO3ftM_qtayUXhj_EQEQASo2CQAFAQjgPxEFCDAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUNOBly5YnPFbYABotc95eMu4BYABAYoBA1VTRJIBAQbwUpgBrAKgAfoBqAEBsAEAuAEBwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc4MzkxMjAyKTt1ZigncicsIDk2ODQ2MDM1Nh4A9A4BkgLJAiF0ajlmS2dpdXNLNEtFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRc3FLaUJsZ0FZUF9fX184UGFBQndBWGdCZ0FFQmlBRUJrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRXBpNGlEQUFEZ1A4RUJLWXVJZ3dBQTREX0pBZWxBS28zZEV1OF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBTUFDQWNnQ0FkQUNBZGdDQWVBQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEcnJDdUNyb0RDVk5KVGpNNk5EY3pPZUFEX0JpSUJBQ1FCQUNZQkFIQkJBQUFBQQmDCHlRUQkJAQEYTmdFQVBFRQELCQEwRDRCQUNJQllNbHFRVQkTREFEd1B3Li6aAokBIWZnOFhHUTZNASRuUEZiSUFRb0FEEUhYRGdQem9KVTBsT016bzBOek01UVB3WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EBlQUEuwgIvaHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3MvZ2V0dGluZy1zdGFydGVkLmh0bWzYAgDgAq2YSOoCWA068IF0ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2dkcHJfaGVsbG9fd29ybGQuaHRtbD9wYmpzX2RlYnVnPXRydWWAAwGIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDb3wW5gEAKIECzEwLjc1Ljc0LjY5qAS_NrIEEggEEAQYrAIg-gEoASgCMAA4ArgEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM52gQCCAHgBAHwBNOBly6IBQGYBQCgBf__bdQUAcAFAMkFabEU8D_SBQkJCQyIAADYBQHgBQHwBQH6BQQIABAAkAYAmAYAsgaWAUJPc3kwUXkBBixYaUFBQUJBRU5DMi0hswh0RjdhJQxfX185AQXwcV9fOXV6X092X3ZfZl9fMzNlOF9fOXZfbF83Xy1fX191Xy0zM2Q0dV8xdmY5OXlmbTEtN2V0cjN0cF84N3VlczJfWHVyX183OV9fM3ozXzlweFA3OGs4OXI3MzM3RXdfdi1fdi1iN0pDT05fQbgGAcEGAAW-KPA_0Ab1L9oGFgoQBRAdAVAQABgA4AYB8gYCCACABwGIBwCgBwE.%26s%3D2ad8dec66285ad986d2462cc6760ebcb27214b3f;ts=1578391202;cet=0;cecb=\" width=\"0\" height=\"0\" style=\"display: block; margin: 0; padding: 0; height: 0; width: 0;\"><script type=\"text/javascript\" async=\"true\" src=\"http://cdn.adnxs.com/v/s/182/trk.js\"></script></div>",
                'width': 300,
                'height': 250
              },
              'trackers': [{
                'impression_urls': ['http://sin3-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fgdpr_hello_world.html%3Fpbjs_debug%3Dtrue&e=wqT_3QL8CWz8BAAAAwDWAAUBCKKt0fAFEO3ftM_qtayUXhj_EQEQASo2CQAFAQjgPxEFCDAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUNOBly5YnPFbYABotc95eMu4BYABAYoBA1VTRJIBAQbwUpgBrAKgAfoBqAEBsAEAuAEBwAEEyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTc4MzkxMjAyKTt1ZigncicsIDk2ODQ2MDM1Nh4A9A4BkgLJAiF0ajlmS2dpdXNLNEtFTk9CbHk0WUFDQ2M4VnN3QURnQVFBUkk3VWhRc3FLaUJsZ0FZUF9fX184UGFBQndBWGdCZ0FFQmlBRUJrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRXBpNGlEQUFEZ1A4RUJLWXVJZ3dBQTREX0pBZWxBS28zZEV1OF8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBTUFDQWNnQ0FkQUNBZGdDQWVBQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEcnJDdUNyb0RDVk5KVGpNNk5EY3pPZUFEX0JpSUJBQ1FCQUNZQkFIQkJBQUFBQQmDCHlRUQkJAQEYTmdFQVBFRQELCQEwRDRCQUNJQllNbHFRVQkTREFEd1B3Li6aAokBIWZnOFhHUTZNASRuUEZiSUFRb0FEEUhYRGdQem9KVTBsT016bzBOek01UVB3WVMReAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYx0M8EBlQUEuwgIvaHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3MvZ2V0dGluZy1zdGFydGVkLmh0bWzYAgDgAq2YSOoCWA068IF0ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2dkcHJfaGVsbG9fd29ybGQuaHRtbD9wYmpzX2RlYnVnPXRydWWAAwGIAwGQAwCYAxegAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMBgAQAkgQNL3V0L3YzDb3wW5gEAKIECzEwLjc1Ljc0LjY5qAS_NrIEEggEEAQYrAIg-gEoASgCMAA4ArgEAMAEAMgEANIEDjkzMjUjU0lOMzo0NzM52gQCCAHgBAHwBNOBly6IBQGYBQCgBf__bdQUAcAFAMkFabEU8D_SBQkJCQyIAADYBQHgBQHwBQH6BQQIABAAkAYAmAYAsgaWAUJPc3kwUXkBBixYaUFBQUJBRU5DMi0hswh0RjdhJQxfX185AQXwcV9fOXV6X092X3ZfZl9fMzNlOF9fOXZfbF83Xy1fX191Xy0zM2Q0dV8xdmY5OXlmbTEtN2V0cjN0cF84N3VlczJfWHVyX183OV9fM3ozXzlweFA3OGs4OXI3MzM3RXdfdi1fdi1iN0pDT05fQbgGAcEGAAW-KPA_0Ab1L9oGFgoQBRAdAVAQABgA4AYB8gYCCACABwGIBwCgBwE.&s=1ad011df80b035fdd957f6ae84e46bdeebae9f83'],
                'video_events': {}
              }]
            }
          }]
        }]
      }
    }
  }
}
