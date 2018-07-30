import { expect } from 'chai';
import { spec } from 'modules/freewheelSSPBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = '//ads.stickyadstv.com/www/delivery/swfIndex.php';

describe('freewheelSSP BidAdapter Test', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'freewheel-ssp',
      'params': {
        'zoneId': '277225'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        wrong: 'missing zone id'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'gdprConsent': {
          'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
          'gdprApplies': true
        }
      }
    ];

    it('should add parameters to the tag', () => {
      const request = spec.buildRequests(bidRequests, bidRequests[0]);
      const payload = request.data;
      expect(payload.reqType).to.equal('AdsSetup');
      expect(payload.protocolVersion).to.equal('2.0');
      expect(payload.zoneId).to.equal('277225');
      expect(payload.componentId).to.equal('mustang');
      expect(payload.playerSize).to.equal('300x600');
      expect(payload._fw_gdpr).to.equal(true);
      expect(payload._fw_gdpr_consent).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests, bidRequests[0]);
      expect(request.url).to.contain(ENDPOINT);
      expect(request.method).to.equal('GET');
    });
  })

  describe('interpretResponse', () => {
    let bidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    let formattedBidRequests = [
      {
        'bidder': 'freewheel-ssp',
        'params': {
          'zoneId': '277225',
          'format': 'floorad'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[600, 250], [300, 600]],
        'bidId': '30b3other1c1838de1e',
        'bidderRequestId': '22edbae273other3bf6',
        'auctionId': '1d1a03079test0a475',
      },
      {
        'bidder': 'stickyadstv',
        'params': {
          'zoneId': '277225',
          'format': 'test'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 600]],
        'bidId': '2',
        'bidderRequestId': '3',
        'auctionId': '4',
      }
    ];

    let response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'2.0\'>' +
    '<Ad id=\'AdswizzAd28517153\'>' +
    '  <InLine>' +
    '   <AdSystem>Adswizz</AdSystem>' +
    '   <Creatives>' +
    '    <Creative id=\'28517153\' sequence=\'1\'>' +
    '     <Linear>' +
    '      <Duration>00:00:09</Duration>' +
    '      <MediaFiles>' +
    '       <MediaFile delivery=\'progressive\' bitrate=\'129\' width=\'320\' height=\'240\' type=\'video/mp4\' scalable=\'true\' maintainAspectRatio=\'true\'><![CDATA[http://cdn.stickyadstv.com/www/images/28517153-web-MP4-59e47d565b2d9.mp4]]></MediaFile>' +
    '      </MediaFiles>' +
    '     </Linear>' +
    '    </Creative>' +
    '   </Creatives>' +
    '   <Extensions>' +
    '     <Extension type=\'StickyPricing\'><Price currency="EUR">0.2000</Price></Extension>' +
    '    </Extensions>' +
    '  </InLine>' +
    ' </Ad>' +
    '</VAST>';

    let ad = '<div id="freewheelssp_prebid_target"></div><script type=\'text/javascript\'>(function() {  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;  st.src = \'http://cdn.stickyadstv.com/mustang/mustang.min.js\';  st.onload = function(){    var vastLoader = new window.com.stickyadstv.vast.VastLoader();    var vast = vastLoader.getVast();    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();    vast.setXmlString(topWindow.freeheelssp_cache["adunit-code"]);    vastLoader.parseAds(vast, {      onSuccess: function() {var config = {      preloadedVast:vast,      autoPlay:true    };    var ad = new window.com.stickyadstv.vpaid.Ad(document.getElementById("freewheelssp_prebid_target"),config);    (new window.com.stickyadstv.tools.ASLoader(277225, \'mustang\')).registerEvents(ad);    ad.initAd(300,600,"",0,"",""); }    });  };  document.head.appendChild(st);})();</script>';
    let formattedAd = '<div id="freewheelssp_prebid_target"></div><script type=\'text/javascript\'>(function() {  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;  st.src = \'http://cdn.stickyadstv.com/prime-time/floorad.min.js\';  st.onload = function(){    var vastLoader = new window.com.stickyadstv.vast.VastLoader();    var vast = vastLoader.getVast();    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();    vast.setXmlString(topWindow.freeheelssp_cache["adunit-code"]);    vastLoader.parseAds(vast, {      onSuccess: function() {var config = {  preloadedVast:vast,  ASLoader:new window.com.stickyadstv.tools.ASLoader(277225, \'floorad\'),domId:"adunit-code"};window.com.stickyadstv.floorad.start(config); }    });  };  document.head.appendChild(st);})();</script>';

    it('should get correct bid response', () => {
      var request = spec.buildRequests(formattedBidRequests, formattedBidRequests[0]);

      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: '0.2000',
          width: 300,
          height: 600,
          creativeId: '28517153',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          ad: ad
        }
      ];

      let result = spec.interpretResponse(response, request);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('should get correct bid response with formated ad', () => {
      var request = spec.buildRequests(formattedBidRequests, formattedBidRequests[0]);

      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: '0.2000',
          width: 300,
          height: 600,
          creativeId: '28517153',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          ad: formattedAd
        }
      ];

      let result = spec.interpretResponse(response, request);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      var reqest = spec.buildRequests(formattedBidRequests, formattedBidRequests[0]);
      let response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'2.0\'></VAST>';

      let result = spec.interpretResponse(response, reqest);
      expect(result.length).to.equal(0);
    });
  });
});
