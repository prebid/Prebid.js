import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'example';
const ENDPOINT_URL = '//local.freestar.io/projects/pubfig.js/examples/ffa.json' //@TODO: update this to the proper URL for data dispensary
export const spec = {
  code: BIDDER_CODE,
  aliases: ['ffa'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: {
        validBidRequests
      },
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    // @TODO: handle real payload from data dispensary
    const bidResponses = [];
    bidRequest.data.validBidRequests.forEach((bidRequest) => {
      let cpm = 0;
      if(typeof serverResponse.body.ffa != 'undefined') {
        cpm = serverResponse.body.ffa;
      } else {
        freestar.log({styles:'background: black; color: #fff; border-radius: 3px; padding: 3px'}, 'Freestar Floor Adapter', 'FFA floor not found...');
        if(typeof freestar.networkFloor != 'undefined') {
          cpm = [];
          Object.keys(freestar.networkFloor).forEach((bidder) => {
            freestar.log({styles:'background: black; color: #fff; border-radius: 3px; padding: 3px'}, 'Freestar Floor Adapter', bidder, freestar.networkFloor[bidder]);
            cpm.push(freestar.networkFloor[bidder])
          })
          let len = cpm.length
          cpm = (cpm.reduce((a, b) => a + b, 0) / cpm.length);
        }
        freestar.log({styles:'background: black; color: #fff; border-radius: 3px; padding: 3px'}, 'Freestar Floor Adapter', 'AVG CPM.', cpm);
      }
      bidResponses.push({
          requestId: bidRequest.bidId,
          cpm: cpm,
          width: bidRequest.sizes[0][0],
          height: bidRequest.sizes[0][1],
          creativeId: bidRequest.auctionId,
          currency: 'USD',
          netRevenue: true,
          ttl: 60,
          ad: `
            <script type="text/javascript">
                let winner = ${JSON.stringify(bidRequest)}, bids = parent.pbjs.getBidResponsesForAdUnitCode(winner.adUnitCode).bids.filter((bid) => {
                    if(bid.status != 'rendered') {
                        return bid;
                    }
                }).sort((a,b) => {
                    return (a.cpm < b.cpm) ? 1 : ((b.cpm < a.cpm) ? -1 : 0);
                });
                if(bids.length > 1) {
                    parent.freestar.log({styles:'background: black; color: #fff; border-radius: 3px; padding: 3px'}, 'Freestar Floor Adapter', 'Rendering Next Ad...', bids[1].cpm, bids[1].adId);
                    parent.pbjs.renderAd(parent.document.getElementById(winner.adUnitCode).querySelector('iframe').contentWindow.document, bids[1].adId);
                    // @TODO: this seems to not work, same ad is used each time after first load
                    parent.pbjs.markWinningBidAsUsed({
                        adUnitCode: winner.adUnitCode,
                        adId: bids[1].adId
                    });
                } else {
                    parent.freestar.log({styles:'background: red; color: #fff; border-radius: 3px; padding: 3px'}, 'Freestar Floor Adapter', 'NO OTHER BIDS FOUND');
                }
            </script>
          `
        });
    })
    return bidResponses;
  },

    /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    return;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function(data) {
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
    */
    onBidWon: function(bid) {
      // Bidder specific code
      parent.freestar.log({styles:'background: black; color: #fff; border-radius: 3px; padding: 3px'}, 'Freestar Floor Adapter', 'onBidWon', bid);
      // @TODO: phone home with the winning message
    }
}
registerBidder(spec);
