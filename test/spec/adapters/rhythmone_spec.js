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
						assert.equal(adResponse.bidderCode, "rhythmone");
					});
				}
			},
			function(){this.send = function(cl, callback){if(typeof callback === "function") callback({ip:"127.0.0.1"});};},
			function(){this.get = function(){}; this.set = function(){};},
      {
        "XMLHttpRequest":function(){
		
          var events = [];
        
          this.addEventListener = function(ev, f){
            events.push({
              type: ev,
              callback: f
            });
          };
          this.readyState = 4;
          this.status = 200;
          this.responseText = JSON.stringify(fakeResponse);
          this.setRequestHeader = function(){};
          this.open = function(){};
          this.send = function(){
            for(var i=0; i<events.length; i++){
              if(events[i].type.toLowerCase() === "readystatechange")
                events[i].callback();
            }
          };
        },
        "navigator":{}
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
    
    var z2 = new r1(
			{
				addBidResponse: function(placementcode, adResponse){
					it("should echo placementcode div-gpt-ad-1438287399331-0 in msie 8", function(){
						assert.equal(placementcode, "div-gpt-ad-1438287399331-0");
					});
					it("should have the expected ad response in msie 8", function(){
            var expected = "<div id=\"div-gpt-ad-1438287399331-0_wrapper\"></div>";
						assert.equal(adResponse.ad.substring(0, expected.length), expected);
						assert.equal(adResponse.width, 300);
						assert.equal(adResponse.height, 250);
						assert.equal(adResponse.bidderCode, "rhythmone");
					});
				}
			},
			function(){this.send = function(cl, callback){if(typeof callback === "function") callback({ip:"127.0.0.1"});};},
			function(){this.get = function(){}; this.set = function(){};},
      {
        "XDomainRequest":function(){
          this.responseText = JSON.stringify(fakeResponse);
          this.open = function(){};
          this.send = function(){this.onload();};
        },
        "navigator":{}
      });
    
		z2.callBids({
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
	});
});