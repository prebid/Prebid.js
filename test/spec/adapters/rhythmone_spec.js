var r1 = require('../../../src/adapters/rhythmone.js');
var assert = require('assert');

describe('rhythmone adapter tests', function () {
	describe('rhythmoneResponse', function () {

		var fakeResponse = {
			"id": "1fe94c2e-4b31-4e09-b074-ba90fe7ce92d",
			"seatbid": [
				{
					"bid": [
						{
							"id": "ff8b09b1-5264-52be-4b7b-0156526452bf",
							"impid": "iab115pj833962aic3jcpdnmhm",
							"price": 1.0,
							"adid": "35858",
							"adm": "<a href=\"http://tag.1rx.io/rmp/34887/0/ch?ajkey=V12FF640238J-573H14H141407CFD01K3585…0H16X12iamspartacus2EW3comH16X12iamspartacus2EW3comG0QG0Q919191I72600005A\" target=\"_blank\"><img src=\"http://img.1rx.io/banners/media/0/14/0/78/1464186216852_1R-300x250_border.png\" height=\"250\" width=\"300\" border=\"0\" alt=\"\"></a><script src=\"http://tag.1rx.io/rmp/34887/0/impr?ajkey=V12FF640238J-573H14H141407CFD01K35…3comH16X12iamspartacus2EW3comG0QG0Q919191I72600005A&obid=${AUCTION_PRICE}\" type=\"text/javascript\"></script><script type=\"text/javascript\">\n  setTimeout(function() {\n    var iframe = document.createElement('iframe');\n    var xpr9190 = \"http\";\n    if (window.location.protocol == 'https:') xpr9190 += \"s\";\n    iframe.id = iframe.tagName+\"_\"+(Math.random() * 1000000000);\n    iframe.style.display = \"block\";\n    iframe.style.width = \"0px\";\n    iframe.style.height = \"0px\";\n    iframe.src = xpr9190 + \"://sync.1rx.io/usersync2/rmp\";\n    if ((document.body === undefined) || (document.body == null )) {  \n      var iframeHtml = iframe.outerHTML || (function(n){ /**/\n          var div = document.createElement('div');\n          div.appendChild( n.cloneNode(true) );\n          return div.innerHTML;\n      })(iframe);\n      document.write(iframeHtml);\n    } else {\n      /**/\n      document.body.appendChild(iframe);\n    }\n  }, (Math.floor(Math.random() * 5)+1));\n</script>",
							"adomain": ["www.rhythmone.com"],
							"cid": "35857",
							"cat": [],
							"h": 250,
							"w": 300
						}
					],
					"seat": "14",
					"group": 0
				}
			],
			"bidid": "ff8b09b1-5264-52be-4b7b-0156526452bf"
		};
	
		var z = new r1(
			{
				addBidResponse: function(placementcode, adResponse){
					it("should echo placementcode div-gpt-ad-1438287399331-0", function(){
						assert.equal(placementcode, "div-gpt-ad-1438287399331-0");
					});
					it("should have the expected ad response", function(){
            var expected = "<div id=\"div-gpt-ad-1438287399331-0_wrapper\"></div>";
						assert.equal(adResponse.ad.substring(0, expected.length), expected);
						assert.equal(adResponse.width, 300);
						assert.equal(adResponse.height, 250);
						assert.equal(adResponse.cpm, 1);
						assert.equal(adResponse.bidderCode, "rhythmone");
					});
				}
			},
			function(){this.send = function(cl, callback){if(typeof callback === "function") callback({ip:"127.0.0.1"});};},
			function(){this.get = function(){}; this.set = function(){};},
      {
        "navigator":{},
        "pbjs":{
          "onEvent":function(){}
        }
      },
      function(url, callback){
        callback(JSON.stringify(fakeResponse), {status:200, responseText: JSON.stringify(fakeResponse)});
      }); 
    
		z.callBids({
			"bidderCode":"rhythmone",
			"bids":[
				{
					"bidder":"rhythmone",
					"params":{
						"placementId":"xyz",
						"keywords":"",
						"categories":[],
            "trace":true,
            "endpoint":"http://fakedomain.com",
            "page":"http://fakedomain.com/default.htm",
            "domain":"www.bloomberg.com",
            "ip":"127.0.0.1",
            "btype":["foo"],
            "battr":["bar"]
					},
					"placementCode":"div-gpt-ad-1438287399331-0",
					"sizes":[[300,250]]
				}
			]
		});
    
    var d = window.document.createElement("div");
    d.style.display = "none";
    d.id = "div-gpt-ad-1438287399331-0_wrapper";
    window.document.body.appendChild(d);
    
    var adMarkup = z.testAdWrapper(
      "<a href=\"http://tag.1rx.io/rmp/34887/0/ch?ajkey=V12A0DACED8J-573H15H141CEA99C02K3585…16X12iamspartacus2EW3comH16X12iamspartacus2EW3comG0QG0Q919191I9140000G43A\" target=\"_blank\"><img src=\"http://img.1rx.io/banners/media/0/14/0/78/1464186216852_1R-300x250_border.png\" height=\"250\" width=\"300\" border=\"0\" alt=\"\"></a><script src=\"http://tag.1rx.io/rmp/34887/0/impr?ajkey=V12A0DACED8J-573H15H141CEA99C02K35…omH16X12iamspartacus2EW3comG0QG0Q919191I9140000G43A&obid=${AUCTION_PRICE}\" type=\"text/javascript\"></script><script type=\"text/javascript\"> setTimeout(function() { var iframe = document.createElement('iframe'); var xpr9190 = \"http\"; if (window.location.protocol == 'https:') xpr9190 += \"s\"; iframe.id = iframe.tagName+\"_\"+(Math.random() * 1000000000); iframe.style.display = \"block\"; iframe.style.width = \"0px\"; iframe.style.height = \"0px\"; iframe.src = xpr9190 + \"://sync.1rx.io/usersync2/rmp\"; if ((document.body === undefined) || (document.body == null )) { var iframeHtml = iframe.outerHTML || (function(n){ /**/ var div = document.createElement('div'); div.appendChild( n.cloneNode(true) ); return div.innerHTML; })(iframe); document.write(iframeHtml); } else { /**/ document.body.appendChild(iframe); } }, (Math.floor(Math.random() * 5)+1)); </script>",
      false,
      {
        "id": "520a3dbe-c403-a1e2-44dc-0157c403a1e3",
        "impid": "0m0gbo80cp9l21eo0ac3b6kj8i",
        "price": 1,
        "adid": "35858",
        "adm": "<a href=\"http://tag.1rx.io/rmp/34887/0/ch?ajkey=V12A0DACED8J-573H15H141CEA99C02K3585…16X12iamspartacus2EW3comH16X12iamspartacus2EW3comG0QG0Q919191I9140000G43A\" target=\"_blank\"><img src=\"http://img.1rx.io/banners/media/0/14/0/78/1464186216852_1R-300x250_border.png\" height=\"250\" width=\"300\" border=\"0\" alt=\"\"></a><script src=\"http://tag.1rx.io/rmp/34887/0/impr?ajkey=V12A0DACED8J-573H15H141CEA99C02K35…omH16X12iamspartacus2EW3comG0QG0Q919191I9140000G43A&obid=${AUCTION_PRICE}\" type=\"text/javascript\"></script><script type=\"text/javascript\">\n  setTimeout(function() {\n    var iframe = document.createElement('iframe');\n    var xpr9190 = \"http\";\n    if (window.location.protocol == 'https:') xpr9190 += \"s\";\n    iframe.id = iframe.tagName+\"_\"+(Math.random() * 1000000000);\n    iframe.style.display = \"block\";\n    iframe.style.width = \"0px\";\n    iframe.style.height = \"0px\";\n    iframe.src = xpr9190 + \"://sync.1rx.io/usersync2/rmp\";\n    if ((document.body === undefined) || (document.body == null )) {  \n      var iframeHtml = iframe.outerHTML || (function(n){ /**/\n          var div = document.createElement('div');\n          div.appendChild( n.cloneNode(true) );\n          return div.innerHTML;\n      })(iframe);\n      document.write(iframeHtml);\n    } else {\n      /**/\n      document.body.appendChild(iframe);\n    }\n  }, (Math.floor(Math.random() * 5)+1));\n</script>",
        "adomain": ["www.rhythmone.com"],
        "cid": "35857",
        "cat": [],
        "h": 250,
        "w": 300
      },
      {
        "site": {
          "publisher": {
            "id": "39483"
          },
          "page": "http://www.iamspartacus.com/prebid.htm?endpoint=http%3A%2F%2Ftag.1rx.io%2Fr…vo%3Fz%3Dtest&placementid=39483&ip=&domain=&height=250&width=300&keywords=",
          "domain": "www.iamspartacus.com",
          "name": ""
        },
        "device": {
          "js": 1,
          "langauge": "en-US",
          "ua": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36",
          "dnt": 0,
          "ip": "206.169.156.2",
          "geo": {},
          "devicetype": 2,
          "h": 1200,
          "w": 1920
        },
        "user": {
          "id": "ec7035fe-3bca-4901-9724-5c7b6c0f900b"
        },
        "imp": [{
          "id": "0m0gbo80cp9l21eo0ac3b6kj8i",
          "tagId": "div-gpt-ad-1438287399331-0",
          "bidfloor": 0,
          "bidfloorcur": "USD",
          "banner": {
            "id": "dvw4ry0jtf3szo2gk5a5smsq241rrb9s0wpo",
            "pos": 0,
            "w": 300,
            "h": 250
          }
        }],
        "at": 2,
        "tmax": 3000,
        "cur": ["USD"],
        "id": "f90093d3-b219-4339-ba2f-68d65245320f"
      },
      "div-gpt-ad-1438287399331-0",
      {
        "id": "f90093d3-b219-4339-ba2f-68d65245320f",
        "seatbid": [{
          "bid": [{
            "id": "520a3dbe-c403-a1e2-44dc-0157c403a1e3",
            "impid": "0m0gbo80cp9l21eo0ac3b6kj8i",
            "price": 1,
            "adid": "35858",
            "adm": "<a href=\"http://tag.1rx.io/rmp/34887/0/ch?ajkey=V12A0DACED8J-573H15H141CEA99C02K3585…16X12iamspartacus2EW3comH16X12iamspartacus2EW3comG0QG0Q919191I9140000G43A\" target=\"_blank\"><img src=\"http://img.1rx.io/banners/media/0/14/0/78/1464186216852_1R-300x250_border.png\" height=\"250\" width=\"300\" border=\"0\" alt=\"\"></a><script src=\"http://tag.1rx.io/rmp/34887/0/impr?ajkey=V12A0DACED8J-573H15H141CEA99C02K35…omH16X12iamspartacus2EW3comG0QG0Q919191I9140000G43A&obid=${AUCTION_PRICE}\" type=\"text/javascript\"></script><script type=\"text/javascript\">\n  setTimeout(function() {\n    var iframe = document.createElement('iframe');\n    var xpr9190 = \"http\";\n    if (window.location.protocol == 'https:') xpr9190 += \"s\";\n    iframe.id = iframe.tagName+\"_\"+(Math.random() * 1000000000);\n    iframe.style.display = \"block\";\n    iframe.style.width = \"0px\";\n    iframe.style.height = \"0px\";\n    iframe.src = xpr9190 + \"://sync.1rx.io/usersync2/rmp\";\n    if ((document.body === undefined) || (document.body == null )) {  \n      var iframeHtml = iframe.outerHTML || (function(n){ /**/\n          var div = document.createElement('div');\n          div.appendChild( n.cloneNode(true) );\n          return div.innerHTML;\n      })(iframe);\n      document.write(iframeHtml);\n    } else {\n      /**/\n      document.body.appendChild(iframe);\n    }\n  }, (Math.floor(Math.random() * 5)+1));\n</script>",
            "adomain": ["www.rhythmone.com"],
            "cid": "35857",
            "cat": [],
            "h": 250,
            "w": 300
          }],
          "seat": "14",
          "group": 0
        }],
        "bidid": "520a3dbe-c403-a1e2-44dc-0157c403a1e3"
      },
      "undefined"
    );
    
    it("should apply OPENRTB macros to ad markup", function(){
      assert.equal(adMarkup.indexOf("${AUCTION_PRICE}"), -1);
    });
	});
});