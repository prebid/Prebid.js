import { spec } from 'modules/aniviewBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
const { expect } = require('chai');

describe('ANIVIEW Bid Adapter Test', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'aniview',
      'params': {
        'AV_PUBLISHERID': '123456',
        'AV_CHANNELID': '123456'
      },
      'adUnitCode': 'video1',
      'sizes': [[300, 250], [640, 480]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
      'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        something: 'is wrong'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bid2Requests = [
      {
        'bidder': 'aniview',
        'params': {
          'AV_PUBLISHERID': '123456',
          'AV_CHANNELID': '123456'
        },
        'adUnitCode': 'test1',
        'sizes': [[300, 250], [640, 480]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
        'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
      }
    ];
    let bid1Request = [
      {
        'bidder': 'aniview',
        'params': {
          'AV_PUBLISHERID': '123456',
          'AV_CHANNELID': '123456'
        },
        'adUnitCode': 'test1',
        'sizes': [640, 480],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
        'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
      }
    ];

    it('Test 2 requests', function () {
      const requests = spec.buildRequests(bid2Requests);
      expect(requests.length).to.equal(2);
	  const r1 = requests[0];
      const d1 = requests[0].data;
      expect(d1).to.have.property('AV_PUBLISHERID');
      expect(d1.AV_PUBLISHERID).to.equal('123456');
      expect(d1).to.have.property('AV_CHANNELID');
      expect(d1.AV_CHANNELID).to.equal('123456');
      expect(d1).to.have.property('AV_WIDTH');
      expect(d1.AV_WIDTH).to.equal(300);
      expect(d1).to.have.property('AV_HEIGHT');
      expect(d1.AV_HEIGHT).to.equal(250);
      expect(d1).to.have.property('AV_URL');
      expect(d1).to.have.property('cb');
      expect(d1).to.have.property('s2s');
      expect(d1.s2s).to.equal('1');
      expect(d1).to.have.property('pbjs');
      expect(d1.pbjs).to.equal(1);
      expect(r1).to.have.property('url');
      expect(r1.url).to.contain('https://gov.aniview.com/api/adserver/vast3/');
      const r2 = requests[1];
	  const d2 = requests[1].data;
      expect(d2).to.have.property('AV_PUBLISHERID');
      expect(d2.AV_PUBLISHERID).to.equal('123456');
      expect(d2).to.have.property('AV_CHANNELID');
      expect(d2.AV_CHANNELID).to.equal('123456');
      expect(d2).to.have.property('AV_WIDTH');
      expect(d2.AV_WIDTH).to.equal(640);
      expect(d2).to.have.property('AV_HEIGHT');
      expect(d2.AV_HEIGHT).to.equal(480);
      expect(d2).to.have.property('AV_URL');
      expect(d2).to.have.property('cb');
      expect(d2).to.have.property('s2s');
      expect(d2.s2s).to.equal('1');
      expect(d2).to.have.property('pbjs');
      expect(d2.pbjs).to.equal(1);
      expect(r2).to.have.property('url');
      expect(r2.url).to.contain('https://gov.aniview.com/api/adserver/vast3/');
    });

    it('Test 1 request', function () {
      const requests = spec.buildRequests(bid1Request);
      expect(requests.length).to.equal(1);
      const r = requests[0];
      const d = requests[0].data;
      expect(d).to.have.property('AV_PUBLISHERID');
      expect(d.AV_PUBLISHERID).to.equal('123456');
      expect(d).to.have.property('AV_CHANNELID');
      expect(d.AV_CHANNELID).to.equal('123456');
      expect(d).to.have.property('AV_WIDTH');
      expect(d.AV_WIDTH).to.equal(640);
      expect(d).to.have.property('AV_HEIGHT');
      expect(d.AV_HEIGHT).to.equal(480);
      expect(d).to.have.property('AV_URL');
      expect(d).to.have.property('cb');
      expect(d).to.have.property('s2s');
      expect(d.s2s).to.equal('1');
      expect(d).to.have.property('pbjs');
      expect(d.pbjs).to.equal(1);
      expect(r).to.have.property('url');
      expect(r.url).to.contain('https://gov.aniview.com/api/adserver/vast3/');
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = {
      'url': 'https://gov.aniview.com/api/adserver/vast3/',
      'data': {
        'bidId': '253dcb69fb2577',
        AV_PUBLISHERID: '55b78633181f4603178b4568',
        AV_CHANNELID: '55b7904d181f46410f8b4568',
      }
    };
    let serverResponse = {};
    serverResponse.body = '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0"><Ad id="FORD"><InLine><AdSystem>FORD</AdSystem><AdTitle>FORD</AdTitle><Impression><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=impression]]></Impression><Creatives><Creative><Linear><Duration>00:00:15</Duration><TrackingEvents><Tracking event="start"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=start]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=firstQuartile]]></Tracking><Tracking event="midpoint"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=midpoint]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=thirdQuartile]]></Tracking><Tracking event="complete"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=complete]]></Tracking><Tracking event="mute"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=mute]]></Tracking><Tracking event="unmute"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=unmute]]></Tracking><Tracking event="pause"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=pause]]></Tracking><Tracking event="resume"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=resume]]></Tracking><Tracking event="fullscreen"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=fullscreen]]></Tracking></TrackingEvents><VideoClicks><ClickTracking><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=click]]></ClickTracking><ClickThrough id="VideoHub"><![CDATA[http://www.ford.com/]]></ClickThrough></VideoClicks><MediaFiles><MediaFile height="360" width="480" bitrate="527" type="video/mp4" delivery="progressive"><![CDATA[https://play.aniview.com/clients/ford2.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives><Extensions><Extension type="ANIVIEW"><AdServingData><Asid><![CDATA[55b78d94181f46290f8b456a]]></Asid><Nasid><![CDATA[55b78d94181f46290f8b456a]]></Nasid><Cpm><![CDATA[2]]></Cpm><PlayerSettings><![CDATA[{"vpp":1,"fp":0,"maxRPM":0,"vit":3,"nc":"1","mips":0,"mrqs":0,"vpm":0,"vi":0,"t": 1,"res": 5}]]></PlayerSettings></AdServingData></Extension></Extensions></InLine></Ad></VAST>';

    it('Check bid interpretResponse', function () {
      const BIDDER_CODE = 'aniview';
      let bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(1);
      let bidResponse = bidResponses[0];
      expect(bidResponse.requestId).to.equal(bidRequest.data.bidId);
      expect(bidResponse.cpm).to.equal('2');
      expect(bidResponse.ttl).to.equal(600);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.mediaType).to.equal('video');
      expect(bidResponse.meta.advertiserDomains).to.be.an('array').that.is.empty;
    });

    it('safely handles XML parsing failure from invalid bid response', function () {
      let invalidServerResponse = {};
      invalidServerResponse.body = '<Ad id="677477"><InLine></AdSystem></InLine></Ad>';

      let result = spec.interpretResponse(invalidServerResponse, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('handles nobid responses', function () {
      let nobidResponse = {};
      nobidResponse.body = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'2.0\'></VAST>';

      let result = spec.interpretResponse(nobidResponse, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('should add renderer if outstream context', function () {
      const bidRequest = spec.buildRequests([
        {
          bidId: '253dcb69fb2577',
          params: {
            playerDomain: 'example.com',
            AV_PUBLISHERID: '55b78633181f4603178b4568',
            AV_CHANNELID: '55b7904d181f46410f8b4568'
          },
          mediaTypes: {
            video: {
              playerSize: [[640, 480]],
              context: 'outstream'
            }
          }
        }
      ])[0]
      const bidResponse = spec.interpretResponse(serverResponse, bidRequest)[0]

      expect(bidResponse.renderer.url).to.equal('https://example.com/script/6.1/prebidRenderer.js')
      expect(bidResponse.renderer.config.AV_PUBLISHERID).to.equal('55b78633181f4603178b4568')
      expect(bidResponse.renderer.config.AV_CHANNELID).to.equal('55b7904d181f46410f8b4568')
      expect(bidResponse.renderer.loaded).to.equal(false)
      expect(bidResponse.width).to.equal(640)
      expect(bidResponse.height).to.equal(480)
    });

    it('Support banner format', function () {
      const bidRequest = spec.buildRequests([
        {
          bidId: '253dcb69fb2577',
          params: {
            playerDomain: 'example.com',
            AV_PUBLISHERID: '55b78633181f4603178b4568',
            AV_CHANNELID: '55b7904d181f46410f8b4568'
          },
          mediaTypes: {
            banner: {
              sizes: [[640, 480]],
            }
          }
        }
      ])[0]
      const bidResponse = spec.interpretResponse(serverResponse, bidRequest)[0]

      expect(bidResponse.ad).to.have.string('https://example.com/script/6.1/prebidRenderer.js');
      expect(bidResponse.width).to.equal(640)
      expect(bidResponse.height).to.equal(480)
    })
  });

  describe('getUserSyncs', function () {
    let pixelUrl = 'https://sync.pixel.url/sync';
    function createBidResponse (pixelEvent, pixelType) {
      let pixelStr = '{"url":"' + pixelUrl + '", "e":"' + pixelEvent + '", "t":' + pixelType + '}';
      return '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0"><Ad id="FORD"><InLine><AdSystem>FORD</AdSystem><AdTitle>FORD</AdTitle><Impression><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=impression]]></Impression><Creatives><Creative><Linear><Duration>00:00:15</Duration><TrackingEvents><Tracking event="start"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=start]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=firstQuartile]]></Tracking><Tracking event="midpoint"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=midpoint]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=thirdQuartile]]></Tracking><Tracking event="complete"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=complete]]></Tracking><Tracking event="mute"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=mute]]></Tracking><Tracking event="unmute"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=unmute]]></Tracking><Tracking event="pause"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=pause]]></Tracking><Tracking event="resume"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=resume]]></Tracking><Tracking event="fullscreen"><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=fullscreen]]></Tracking></TrackingEvents><VideoClicks><ClickTracking><![CDATA[http://manage.newmanage.aniview.com/track?d=&cou=IL&cos=Android&r=play.aniview.com&rs=play.aniview.com&sid=71720&t=1549448635&cip=46.116.196.171&sn=&tgt=0&osv=6&bv=&brn=Chrome&wi=640&he=480&app=&AV_PUBLISHERID=55b78633181f4603178b4568&test=&aafaid=&cb=4293171175&asid=55b78d94181f46290f8b456a&pid=55b78633181f4603178b4568&cid=55b7904d181f46410f8b4568&h=b304444f9f8c28b12421555fef487f08e954c587&e=click]]></ClickTracking><ClickThrough id="VideoHub"><![CDATA[http://www.ford.com/]]></ClickThrough></VideoClicks><MediaFiles><MediaFile height="360" width="480" bitrate="527" type="video/mp4" delivery="progressive"><![CDATA[https://play.aniview.com/clients/ford2.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives><Extensions><Extension type="ANIVIEW"><AdServingSync><![CDATA[{"trackers":[' + pixelStr + ']}]]></AdServingSync><AdServingData><Asid><![CDATA[55b78d94181f46290f8b456a]]></Asid><Nasid><![CDATA[55b78d94181f46290f8b456a]]></Nasid><Cpm><![CDATA[2]]></Cpm><PlayerSettings><![CDATA[{"vpp":1,"fp":0,"maxRPM":0,"vit":3,"nc":"1","mips":0,"mrqs":0,"vpm":0,"vi":0,"t": 1,"res": 5}]]></PlayerSettings></AdServingData></Extension></Extensions></InLine></Ad></VAST>';
    }

    it('Check get iframe sync pixels from response on inventory', function () {
      let pixelEvent = 'inventory';
      let pixelType = '3';
      let bidResponse = createBidResponse(pixelEvent, pixelType);
      let serverResponse = [
        {body: bidResponse}
      ];
      let syncPixels = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, serverResponse);
      expect(syncPixels.length).to.equal(1);
      let pixel = syncPixels[0];
      expect(pixel.url).to.equal(pixelUrl);
      expect(pixel.type).to.equal('iframe');
    });

    it('Check get image sync pixels from response on sync', function () {
      let pixelEvent = 'sync';
      let pixelType = '1';
      let bidResponse = createBidResponse(pixelEvent, pixelType);
      let serverResponse = [
        {body: bidResponse}
      ];
      let syncPixels = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, serverResponse);
      expect(syncPixels.length).to.equal(1);
      let pixel = syncPixels[0];
      expect(pixel.url).to.equal(pixelUrl);
      expect(pixel.type).to.equal('image');
    });
  });
});
