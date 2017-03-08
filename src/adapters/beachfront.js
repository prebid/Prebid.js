import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//ads.bf.rebel.ai/bid.json?exchange_id=';

//tag id: 0a47f4ce-d91f-48d0-bd1c-64fa2c196f13

function BeachfrontAdapter() {
  var baseAdapter = Adapter.createNew('beachfront'),
    bidRequest;


  // take bid requests and send them out to get bid responses.
  baseAdapter.callBids = function (bidRequests) {
    if (!bidRequests || !bidRequests.bids || bidRequests.bids.length === 0) {
      return;
    }

    var RTBDataParams = prepareAndSaveRTBRequestParams(bidRequests.bids[0]);

    // This log makes sure we have parameters to put in the ad request.
    // console.log("RTB Data Params are: " + JSON.stringify(RTBDataParams));

    if (!RTBDataParams) {
      return;
    }

    var BID_URL = ENDPOINT + RTBDataParams.appId;

    ajax(BID_URL, handleResponse, JSON.stringify(RTBDataParams), {
      contentType: 'text/plain',
      withCredentials: true
    });
  };


  //Example response from updated adapter:
  // {
  //  "bidPrice": 0.83502,
  //  "url": "http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da:0a47f4ce-d91f-48d0-bd1c-64fa2c196f13:$%7BAUCTION_PRICE%7D&dsp=58bf26882aba5e6ad608beda,0.612&i_type=pre"
  // }



  function prepareAndSaveRTBRequestParams(bid) {
    if (!bid || !bid.params) {
      return;
    }

    bidRequest = bid;
    bidRequest.width = parseInt(bid.sizes[0], 10) || undefined;
    bidRequest.height = parseInt(bid.sizes[1], 10) || undefined;

    var bidRequestObject =  {

      isPrebid: true,
      appId: bid.params.appId || undefined,
      domain: document.location.hostname,
      imp:[{
        video:{},
        bidfloor: bid.params.bidfloor
      }],
      site:{
        page:"http://www.rebelai.com"
      },
      device:{
        ua: navigator.userAgent,
        // XXX need to get IP from device
        ip:"100.6.143.190",
        // XXX if this is anything other than 1, no ad is returned
        devicetype:1
      },
      cur:["USD"]
    };

    console.log("bid params:");
    console.log(bid.params);

    console.log("Bidfloor is $" + bid.params.bidfloor);



    console.log("XXX bidmanager object is: ");
    console.log(bidmanager);


    if (bidRequestObject.appId.length !== 36) {
      console.error("Bid request failed. Ensure your appId is accurate.");
      return bidRequestObject;
    } else if (!bid.params.bidfloor){
      console.error("Bid request failed. No bid floor specified.");
      return bidRequestObject;
    } else {
      console.log("Bid request is successful: ");
      console.log(bidRequest);
      console.log(bidRequestObject);
      return bidRequestObject;
    }
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var parsed;

    try {
      parsed = JSON.parse(response);

      console.log("Parsed response: ");
      console.log(parsed);

    } catch (error) {
      utils.logError(error);
    }

    var newBid = {};
    newBid.price = parsed.seatbid[0].bid[0].price;
    console.log("Winning bid has a CPM of $" + newBid.price);

    // The XML from bid 0 is found at: parsed.seatbid[0].bid[0].adm
    var parserBF = new DOMParser();
    var xmlBF;

    try {
      xmlBF = parserBF.parseFromString(parsed.seatbid[0].bid[0].adm,"text/xml");
    }
    catch(err){
      console.log("error object: " + err);
      parsed.error = true;
    }

    var xml_uri = xmlBF.getElementsByTagName('VASTAdTagURI')[0];
    var xml_uri_child = xml_uri.childNodes[0];
    console.log("XML URI: "+ xml_uri_child.nodeValue);
    newBid.url=xml_uri_child.nodeValue;

    // Final parsed ad tag uri in the response: xml_uri_child.nodeValue

    if (!parsed || !xml_uri || !newBid.price) {
      bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.NO_BID));
      console.log("Status is no bid. Check yourself.");
      return;
    }
    bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.GOOD, newBid));
    console.log("Status is good! Bid accepted!");
  }

  function createBid(status, tag) {
    var bid = bidfactory.createBid(status, tag);

    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = bidRequest.bidder;

    if (!tag || status !== STATUS.GOOD) {
      console.log("Failing: " + tag + status);
      return bid;
    }

    bid.cpm = tag.price;
    bid.creative_id = tag.cmpId;
    bid.width = bidRequest.width;
    bid.height = bidRequest.height;
    bid.descriptionUrl = tag.url;
    bid.vastUrl = tag.url;

    bid.mediaType = 'video';


    console.log("Bid object is ");
    console.log(bid);

    return bid;
  }

  return {
    createNew: BeachfrontAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  };
}

BeachfrontAdapter.createNew = function () {
  return new BeachfrontAdapter();
};

module.exports = BeachfrontAdapter;
