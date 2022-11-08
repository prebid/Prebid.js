<script type="text/javascript">
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

(function() {
    var pbjsEl = document.createElement('script'); pbjsEl.type = 'text/javascript';
    pbjsEl.async = true;
    pbjsEl.src = 'https://acdn.adnxs.com/prebid/not-for-prod/prebid.js'
    var pbjsTargetEl = document.getElementsByTagName('head')[0];
    pbjsTargetEl.insertBefore(pbjsEl, pbjsTargetEl.firstChild);
})();

pbjs.que.push(function() {
    var adUnits = [{
        code: '[%%adUnitCode%%]',
        sizes: [%%sizes%%],
        bids: [%%adUnitBids%%]
    }];
    pbjs.addAdUnits(adUnits);

    pbjs.requestBids({
        timeout: [%%timeout%%],
        bidsBackHandler: function() {
            var iframe = document.getElementById('postbid_if_3');
            var iframeDoc = iframe.contentWindow.document;
            var params = pbjs.getAdserverTargetingForAdUnitCode('[%%adUnitCode%%]');

            // If any bidders return any creatives
            var bid;
            if(params && params['hb_adid']){
                var bid;
                for(i=0; i< pbjs._bidsReceived.length; i++ ) {
                  if (params['hb_adid'] === pbjs._bidsReceived[i].adId) {
                    bid = pbjs._bidsReceived[i];
                    break;
                  }
                }
                pbjs.renderAd(iframeDoc, params['hb_adid']);
              } else {
                // If no bidder return any creatives,
                // Passback 3rd party tag in Javascript
                iframe.width = [%%size0%%];
                iframe.height = [%%size1%%];
                iframeDoc.write('[%%passbackTagHtml%%]');
            }

            var iframeResize = window.parent.document.getElementById('[%%targetId%%]');
            iframeResize.height = (bid.height) ? bid.height+'px' : '[%%size1%%]px';
            iframeResize.width = (bid.width) ? bid.width+'px' : '[%%size0%%]px';
          }
    });
});
</script>
<iframe id='postbid_if_3' FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="0" HEIGHT="0"></iframe>
