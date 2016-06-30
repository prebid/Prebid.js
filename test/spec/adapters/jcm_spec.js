import 'src/prebid.js'
var adapter = require('src/adapters/jcm');

window.pbjs = window.pbjs || {};
window.pbjs.que = window.pbjs.que || [];
var pbjs = window.pbjs;
pbjs._bidsReceived = []; 
pbjs._bidsRequested =[];
pbjs._adsReceived = [];

// test ad call

var params = {
  bidderCode: 'jcm',
  bidder: 'jcm',
  bidderRequestId: '2068db3c904101',
  bids: [
         {  
          bidId: '3c9408cdbf2f68',
          sizes:[[250][300]],
          bidder: 'jcm',
          params: { siteId: '3608', adSizes:'300x250' },
          requestId: '10b327aa396609',
          placementCode: '/19968336/header-bid-tag-0'
         }
        ]
}  


adapter().callBids(params);

var adUnits = new Array();
var unit1=new Object();
unit1.bids=[params];
unit1.code='/19968336/header-bid-tag-0';
unit1.sizes=[[250][300]];
adUnits.push(unit1);


//test processing ad response

var response='{"bids":[{"width":300,"cpm":3,"ad":"%3Cscript+type%3D%22text%2Fjavascript%22%3E%0D%0Adocument.write%28%27%3Cimg+src%3D%22https%3A%2F%2Fmedia.adfrontiers.com%2Fimgs%2Fpartnership_300x250.png%22%3E%27%29%3B%0D%0A%3C%2Fscript%3E%3Cscript+type%3D%22text%2Fjavascript%22%3E%0D%0Adocument.write%28%3Cimg+src%3D%27media.adfrontiers.com%2Fimgs%2Fpartnership_300x250.png%27%3E%29%3B%0D%0A%3C%2Fscript%3E%0D%0A","callbackId":"3c9408cdbf2f68","height":250}]}';

pbjs._bidsRequested=[params];
pbjs.adUnits=adUnits;
pbjs.processJCMResponse(response);
pbjs._bidsReceived=[];
  
var response='{"bids":[{"width":300,"cpm":0,"ad":"%3Cscript+type%3D%22text%2Fjavascript%22%3E%0D%0Adocument.write%28%27%3Cimg+src%3D%22https%3A%2F%2Fmedia.adfrontiers.com%2Fimgs%2Fpartnership_300x250.png%22%3E%27%29%3B%0D%0A%3C%2Fscript%3E%3Cscript+type%3D%22text%2Fjavascript%22%3E%0D%0Adocument.write%28%3Cimg+src%3D%27media.adfrontiers.com%2Fimgs%2Fpartnership_300x250.png%27%3E%29%3B%0D%0A%3C%2Fscript%3E%0D%0A","callbackId":"3c9408cdbf2f68","height":250}]}';

pbjs.processJCMResponse(response);






