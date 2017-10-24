import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';
import adloader from 'src/adloader';

function OptimeraBidAdapter() {
  function _callBids(params) {
    // Vars
    var OptimeraClientId = '';
    window.oDv = [];
    // Consider adding oVa placeholder var? If file doesn't return any dependant code will fail. Specifically in the oPS for consoling historic viewability score 20170628
    var bidderRequestIds = [];
    var bidderRequestDivs = [];
    var OptimeraClientIdValid;
    //
    for (var i = 0; i < params.bids.length; i++) {
      if (OptimeraClientId == '') {
        OptimeraClientId = params.bids[i].params.clientId;
        OptimeraClientIdValid = isNaN(OptimeraClientId);
        if (OptimeraClientIdValid === false) {
          oDv.unshift(OptimeraClientId);
          // Call Score File
          var optimeraHost = window.location.host;
          var optimeraPathName = window.location.pathname;
          var rand = Math.random();
          adloader.loadScript('https://s3.amazonaws.com/elasticbeanstalk-us-east-1-397719490216/json/client/' + oDv[0] + '/' + optimeraHost + optimeraPathName + '.js?t=' + rand, OptimeraCreateBids(), false);
        }
      }
      oDv.splice(1, 0, params.bids[i].placementCode);
      bidderRequestIds[i] = params.bids[i].bidderRequestId;
      bidderRequestDivs[i] = params.bids[i].placementCode;
    }
    if (typeof oDv !== 'undefined' && OptimeraClientIdValid === false) {
      // Call oPS
      var optimeraOpsScript = document.createElement('script');
      optimeraOpsScript.async = true;
      optimeraOpsScript.type = 'text/javascript';
      optimeraOpsScript.src = 'https://s3.amazonaws.com/elasticbeanstalk-us-east-1-397719490216/external_json/oPS.js';
      document.head.appendChild(optimeraOpsScript);
      //
    }
    function OptimeraCreateBids() {
      function checkRequestProgress() {
        var T = setInterval(
          function() {
            if (window.oVa) {
              clearInterval(T);
              // Push Bids
              for (var i = 0; i < bidderRequestDivs.length; i++) {
                // Check if Score Exists For Position
                if (oVa[bidderRequestDivs[i]].length > 0) {
                  var bidRequest = utils.getBidRequest(bidderRequestIds[i]);
                  var bidObject = bidfactory.createBid(STATUS.GOOD, bidRequest);
                  bidObject.bidderCode = 'optimera';
                  bidObject.cpm = 0.01;
                  bidObject.ad = '<html></html>';
                  bidObject.width = 0;
                  bidObject.height = 0;
                  bidObject.dealId = oVa[bidderRequestDivs[i]];
                  bidmanager.addBidResponse(bidderRequestDivs[i], bidObject);
                }
              }
            }
            if (T >= 20) { // T is number of times interval ran
              clearInterval(T);
            }
          }, 100);
      }
      checkRequestProgress();
    }
  }
  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new OptimeraBidAdapter(), 'optimera');
module.exports = OptimeraBidAdapter;
