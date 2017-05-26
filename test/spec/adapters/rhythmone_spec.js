var r1 = require('../../../src/adapters/rhythmone.js');
var assert = require('assert');

describe('rhythmone adapter tests', function () {
  describe('rhythmoneResponse', function () {
    var fakeResponse = {
      'id': '1fe94c2e-4b31-4e09-b074-ba90fe7ce92d',
      'seatbid': [
        {
          'bid': [
            {
              'id': 'ff8b09b1-5264-52be-4b7b-0156526452bf',
              'impid': 'div-gpt-ad-1438287399331-0',
              'price': 1.0,
              'adid': '35858',
              'adm': "<a href=\"http://tag.1rx.io/rmp/34887/0/ch?ajkey=V12FF640238J-573H14H141407CFD01K3585…0H16X12iamspartacus2EW3comH16X12iamspartacus2EW3comG0QG0Q919191I72600005A\" target=\"_blank\"><img src=\"http://img.1rx.io/banners/media/0/14/0/78/1464186216852_1R-300x250_border.png\" height=\"250\" width=\"300\" border=\"0\" alt=\"\"></a><script src=\"http://tag.1rx.io/rmp/34887/0/impr?ajkey=V12FF640238J-573H14H141407CFD01K35…3comH16X12iamspartacus2EW3comG0QG0Q919191I72600005A&obid=${AUCTION_PRICE}\" type=\"text/javascript\"></script><script type=\"text/javascript\">\n  setTimeout(function() {\n    var iframe = document.createElement('iframe');\n    var xpr9190 = \"http\";\n    if (window.location.protocol == 'https:') xpr9190 += \"s\";\n    iframe.id = iframe.tagName+\"_\"+(Math.random() * 1000000000);\n    iframe.style.display = \"block\";\n    iframe.style.width = \"0px\";\n    iframe.style.height = \"0px\";\n    iframe.src = xpr9190 + \"://sync.1rx.io/usersync2/rmp\";\n    if ((document.body === undefined) || (document.body == null )) {  \n      var iframeHtml = iframe.outerHTML || (function(n){ /**/\n          var div = document.createElement('div');\n          div.appendChild( n.cloneNode(true) );\n          return div.innerHTML;\n      })(iframe);\n      document.write(iframeHtml);\n    } else {\n      /**/\n      document.body.appendChild(iframe);\n    }\n  }, (Math.floor(Math.random() * 5)+1));\n</script>",
              'adomain': ['www.rhythmone.com'],
              'cid': '35857',
              'cat': [],
              'h': 250,
              'w': 300
            }
          ],
          'seat': '14',
          'group': 0
        }
      ],
      'bidid': 'ff8b09b1-5264-52be-4b7b-0156526452bf'
    };

    var endEvent = function() {},
      wonEvent = function() {}; ;

    var z = new r1(
      {
        addBidResponse: function(placementcode, adResponse) {
          it('should echo placementcode div-gpt-ad-1438287399331-0', function() {
            assert.equal(placementcode, 'div-gpt-ad-1438287399331-0');
          });
          it('should have the expected ad response', function() {
            assert.equal((adResponse.ad === undefined || adResponse.ad.length > 0), true);
            assert.equal(adResponse.width, 300);
            assert.equal(adResponse.height, 250);
            assert.equal(adResponse.cpm, 1);
            assert.equal(adResponse.bidderCode, 'rhythmone');
          });
        }
      },
      {
        'navigator': {},
        'pbjs': {
          'onEvent': function(e, f) {
            if (e.toLowerCase() === 'auctionend') endEvent = f;
            if (e.toLowerCase() === 'bidwon') wonEvent = f;
          },
          'getBidResponses': function() { return {'div-gpt-ad-1438287399331-0': {'bids': [{cpm: 1, bidderCode: 'rhythmone'}, {cpm: 2, bidderCode: 'rhythmone'}]}}; },
		  'version': 'v0.20.0-pre'
        }
      },
      function(url, callback) {
        callback(JSON.stringify(fakeResponse), {status: 200, responseText: JSON.stringify(fakeResponse)});
      });

    z.callBids({
      'bidderCode': 'rhythmone',
      'bids': [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'xyz',
            'keywords': '',
            'categories': [],
            'trace': true,
            'method': 'get',
            'endpoint': 'http://fakedomain.com'
          },
          'mediaType': 'video',
          'placementCode': 'div-gpt-ad-1438287399331-0',
          'sizes': [[300, 250]]
        }
      ]
    });

    endEvent();
    wonEvent({
      bidderCode: 'rhythmone',
      adUnitCode: 'div-gpt-ad-1438287399331-0'
    });
  });
});
