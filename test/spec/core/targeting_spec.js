import { expect } from 'chai';
import Targeting from 'src/targeting';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';

const bid1 = {
  'bidderCode': 'rubicon',
  'width': '300',
  'height': '250',
  'statusMessage': 'Bid available',
  'adId': '148018fe5e',
  'cpm': 0.537234,
  'ad': 'markup',
  'ad_id': '3163950',
  'sizeId': '15',
  'requestTimestamp': 1454535718610,
  'responseTimestamp': 1454535724863,
  'timeToRespond': 123,
  'pbLg': '0.50',
  'pbMg': '0.50',
  'pbHg': '0.53',
  'adUnitCode': '/123456/header-bid-tag-0',
  'bidder': 'rubicon',
  'size': '300x250',
  'adserverTargeting': {
    'hb_bidder': 'rubicon',
    'hb_adid': '148018fe5e',
    'hb_pb': '0.53',
    'foobar': '300x250'
  }
};

const bid2 = {
  'bidderCode': 'rubicon',
  'width': '300',
  'height': '250',
  'statusMessage': 'Bid available',
  'adId': '5454545',
  'cpm': 0.25,
  'ad': "<script>rubicon_cb = Math.random(); rubicon_rurl = document.referrer; if(top.location==document.location){rubicon_rurl = document.location;} rubicon_rurl = escape(rubicon_rurl);\nwindow.rubicon_ad = \"3163950\" + \".\" + \"js\"; window.rubicon_creative = \"3173401\" + \".\" + \"js\"; document.write(\"\\n<div style=\\\"width: 0; height: 0; overflow: hidden;\\\">\\n<img border=\\\"0\\\" width=\\\"1\\\" height=\\\"1\\\" src=\\\"http://beacon-us-west.rubiconproject.com/beacon/d/3570c4f1-e036-422d-a09d-bbe0f4f41403?accountId=9707&siteId=17955&zoneId=50983&e=6A1E40E384DA563BE533C55CD10D0B0C0756673C53CF8B80824FBAD54B5E3FE64BED1169A019C299077F9DD8533D5478DE1E5EF33DB42713D976A676F4DE896561E72A5E23EA1F4D79AC619AC2CA097CDD3CD102CF565E8781201FCEFCBFE4DD3D1BC319EE6D0D2371FDE702F86E14E285C6C3B5FFF617207FB1D5123979548CA22A101AE4B31B2FB2260C21CEF7D595\\\" alt=\\\"\\\" />\\n</div>\\n\\n\"); rubicon_tag_code = \"%3c!DOCTYPE%20html%3e%0a%0a%0a%3cdiv%20style=%22height:%20250px%3b%20width:%20300px%3b%20display:%20table-cell%3b%20vertical-align:%20middle%3b%22%3e%0a%3cdiv%20style=%22width:%20300px%3b%20margin-left:%20auto%3b%20margin-right:%20auto%3b%22%3e%20%20%0a%3cdiv%20id=%22qc-ad-size%22%20class=%22qc-ad-300x250%22%3e%0a%20%20%3clink%20href=%22http://content.quantcount.com/adchoices/v2/css/300x250.css%22%20rel=%22stylesheet%22%20type=%22text/css%22/%3e%0a%0a%20%20%3c!--%5bif%20lte%20IE%208%5d%3e%0a%20%20%3clink%20href=%22http://content.quantcount.com/adchoices/v2/css/ie.css%22%20rel=%22stylesheet%22%20type=%22text/css%22/%3e%0a%20%20%3c!%5bendif%5d--%3e%0a%0a%20%20%3c!--%5bif%20lte%20IE%206%5d%3e%0a%20%20%3clink%20href=%22http://content.quantcount.com/adchoices/v2/css/ie6.css%22%20rel=%22stylesheet%22%20type=%22text/css%22/%3e%0a%20%20%3c!%5bendif%5d--%3e%0a%0a%20%20%3cdiv%20class=%22quantcast-ad-div%22%3e%0a%3cscript%20src=%22http://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST%3b%3bsize=300x250%3btarget=_blank%3balias=p36-05cfseeevn69c10t%3bkvp36=p36-05cfseeevn69c10t%3bsub1=p-G84dHbkXmCUEt%3bkvl=170895%3bkvc=800255%3bkvs=300x250%3bkvi=46876d51d638cce3c218a9d7da4457fd5c835403%3bkva=p-G84dHbkXmCUEt%3brdclick=http://exch.quantserve.com/r%3fa=p-G84dHbkXmCUEt%3blabels=_qc.clk,_click.adserver.rtb,_click.rand.85227%3brtbip=64.7.198.35%3brtbdata2=EAQaJUNvbWNhc3RSZXNpZGVudGlhbF9XZXN0Q29yZUFDUV9RMTIwMTYg1J4XKI-3CjD_6zA6HGh0dHA6Ly93d3cubW9kZW1lZGlhY29ycC5jb21aKEpLUGFBU2lnZ2xJOG9kY0JKZkhPVVNQdzExdzhvZEVDZFBINUVCeFp15H3YQIABt6PIjgmgAZ-TAqgBmKS3AroBKEpLUGFBU2lnZ2xJOG9kY0JKZkhPVVNQdzExdzhvZEVDZFBINUVCeFrAAcqfLMgBmvDWyKoq2gEoNDY4NzZkNTFkNjM4Y2NlM2MyMThhOWQ3ZGE0NDU3ZmQ1YzgzNTQwM-UB8Vm2PegBMpgCmdoKqAIFqAIGsAIIugIEQAfGI8ACAsgCANACtdHIiPDd-tOqAQ%3bredirecturl2=%22%20type=%22text/javascript%22%3e%3c/scr\"+\"ipt%3e%0a%3cimg%20src=%22http://exch.quantserve.com/pixel/p-G84dHbkXmCUEt.gif%3fmedia=ad&p=ED36050CBC1B1755&r=&rand=85227&labels=_qc.imp,_imp.adserver.rtb&rtbip=64.7.198.35&rtbdata2=EAQaJUNvbWNhc3RSZXNpZGVudGlhbF9XZXN0Q29yZUFDUV9RMTIwMTYg1J4XKI-3CjD_6zA6HGh0dHA6Ly93d3cubW9kZW1lZGlhY29ycC5jb21aKEpLUGFBU2lnZ2xJOG9kY0JKZkhPVVNQdzExdzhvZEVDZFBINUVCeFp15H3YQIABt6PIjgmgAZ-TAqgBmKS3AroBKEpLUGFBU2lnZ2xJOG9kY0JKZkhPVVNQdzExdzhvZEVDZFBINUVCeFrAAcqfLMgBmvDWyKoq2gEoNDY4NzZkNTFkNjM4Y2NlM2MyMThhOWQ3ZGE0NDU3ZmQ1YzgzNTQwM-UB8Vm2PegBMpgCmdoKqAIFqAIGsAIIugIEQAfGI8ACAsgCANACtdHIiPDd-tOqAQ%22%20style=%22display:%20none%3b%22%20border=%220%22%20height=%221%22%20width=%221%22%20alt=%22Quantcast%22/%3e%0a%20%20%3c/div%3e%0a%20%20%3cdiv%20class=%22border-div%22%3e%3c/div%3e%0a%3c/div%3e%0a%0a%3c/div%3e%0a%3c/div%3e%0a%3cscript%20src=%22https://z.moatads.com/quantcastv2691176990399/moatad.js%23moatClientLevel1=p-G84dHbkXmCUEt&moatClientLevel2=$%7bCAMPAIGN_ID%7d&moatClientLevel3=170895&moatClientLevel4=800255&uid=46876d51d638cce3c218a9d7da4457fd5c835403%22%20type=%22text/javascript%22%3e%3c/scr\"+\"ipt%3e\"; rubicon_tag_code = rubicon_tag_code.replace(/##RUBICON_CB##/g,rubicon_cb); document.write(unescape(rubicon_tag_code)); document.write(\"<div style=\\\"height: 0px; width: 0px; overflow: hidden\\\">\\n<script>\\n(function() {var proto = document.location.protocol; var server=\\\"http://tap2-cdn.rubiconproject.com\\\"; if (proto == \\\"https:\\\") server=\\\"https://tap-secure.rubiconproject.com\\\"; document.write(\\'<iframe src=\\\"\\'+server+\\'/partner/scr\"+\"ipts/rubicon/emily.html?rtb_ext=1&pc=9707/17955&geo=na&co=us\\\" frameborder=\\\"0\\\" marginwidth=\\\"0\\\" marginheight=\\\"0\\\" scrolling=\\\"NO\\\" width=\\\"0\\\" height=\\\"0\\\" style=\\\"height: 0px; width: 0px\\\"></iframe>\\'); })();\\n<\\/scr\"+\"ipt>\\n\\n</div>\");</script>",
  'ad_id': '3163950',
  'sizeId': '15',
  'requestTimestamp': 1454535718610,
  'responseTimestamp': 1454535724863,
  'timeToRespond': 123,
  'pbLg': '0.25',
  'pbMg': '0.25',
  'pbHg': '0.25',
  'adUnitCode': '/123456/header-bid-tag-0',
  'bidder': 'rubicon',
  'size': '300x250',
  'adserverTargeting': {
    'hb_bidder': 'rubicon',
    'hb_adid': '5454545',
    'hb_pb': '0.25',
    'foobar': '300x250'
  }
};

describe('targeting tests', () => {
  describe('getAllTargeting', () => {
    beforeEach(() => {
      $$PREBID_GLOBAL$$._sendAllBids = false;
      $$PREBID_GLOBAL$$._bidsReceived = [];
    });

    it('selects the top bid when _sendAllBids true', () => {
      $$PREBID_GLOBAL$$._sendAllBids = true;
      $$PREBID_GLOBAL$$._bidsReceived.push(bid1, bid2);
      let targeting = Targeting.getAllTargeting(['/123456/header-bid-tag-0']);
      let flattened = [];
      targeting.filter(obj => obj['/123456/header-bid-tag-0'] !== undefined).forEach(item => flattened = flattened.concat(item['/123456/header-bid-tag-0']));
      let sendAllBidCpm = flattened.filter(obj => obj.hb_pb_rubicon !== undefined);
      let winningBidCpm = flattened.filter(obj => obj.hb_pb !== undefined);
      // we shouldn't get more than 1 key for hb_pb_${bidder}
      expect(sendAllBidCpm.length).to.equal(1);
      // expect the winning CPM to be equal to the sendAllBidCPM
      expect(sendAllBidCpm[0]['hb_pb_rubicon']).to.deep.equal(winningBidCpm[0]['hb_pb']);
    });
  }); // end getAllTargeting tests
});
