import { expect } from 'chai';
import { tripleliftAdapterSpec } from 'modules/tripleliftBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';
import prebid from '../../../package.json';

const ENDPOINT = 'https://tlx.3lift.com/header/auction?';
const GDPR_CONSENT_STR = 'BOONm0NOONm0NABABAENAa-AAAARh7______b9_3__7_9uz_Kv_K7Vf7nnG072lPVA9LTOQ6gEaY';

describe('triplelift adapter', function () {
  const adapter = newBidder(tripleliftAdapterSpec);
  let bid, instreamBid;

  this.beforeEach(() => {
    bid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: '12345',
        floor: 1.0,
      },
      mediaTypes: {
        banner: {
          sizes: [
            [970, 250],
            [1, 1]
          ]
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    instreamBid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: 'insteam_test',
        floor: 1.0,
        video: {
          mimes: ['video/mp4'],
          maxduration: 30,
          minduration: 6,
          w: 640,
          h: 480
        }
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480]
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };
  })

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for valid bid request', function () {
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      bid.params.inventoryCode = 'another_inv_code';
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found - instream', function () {
      expect(tripleliftAdapterSpec.isBidRequestValid(instreamBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      delete bid.params.inventoryCode;
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed - instream', function () {
      delete instreamBid.mediaTypes.playerSize;
      delete instreamBid.params.video.w;
      delete instreamBid.params.video.h;
      expect(tripleliftAdapterSpec.isBidRequestValid(instreamBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    let bidderRequest;
    const schain = {
      validation: 'strict',
      config: {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1,
          }
        ]
      }
    };

    this.beforeEach(() => {
      bidRequests = [
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: '12345',
            floor: 1.0,
          },
          mediaTypes: {
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            }
          },
          adUnitCode: 'adunit-code',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'insteam_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [640, 480]
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        }
      ];

      bidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
        bidderRequestId: '5c55612f99bc11',
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 250,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
          },
          {
            imp_id: 1,
            crid: '10092_76480_i2j6qm8u',
            cpm: 0.01,
            ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
            tlx_source: 'hdx'
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        },
        gdprConsent: {
          consentString: GDPR_CONSENT_STR,
          gdprApplies: true
        },
      };
    });

    it('exists and is an object', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.exist.and.to.be.a('object');
    });

    it('should be able find video object from the instream request', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[1].video).to.exist.and.to.be.a('object');
    });

    it('should only parse sizes that are of the proper length and format', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].banner.format).to.have.length(2);
      expect(request.data.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
    });

    it('should be a post request and populate the payload', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.imp[0].tagid).to.equal('12345');
      expect(payload.imp[0].floor).to.equal(1.0);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(payload.imp[1].tagid).to.equal('insteam_test');
      expect(payload.imp[1].floor).to.equal(1.0);
      expect(payload.imp[1].video).to.exist.and.to.be.a('object');
    });

    it('should add tdid to the payload if included', function () {
      const id = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      bidRequests[0].userId.tdid = id;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'adserver.org', uids: [{id, ext: {rtiPartner: 'TDID'}}]}]}});
    });

    it('should add idl_env to the payload if included', function () {
      const id = 'XY6104gr0njcH9UDIR7ysFFJcm2XNpqeJTYslleJ_cMlsFOfZI';
      bidRequests[0].userId.idl_env = id;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'liveramp.com', uids: [{id, ext: {rtiPartner: 'idl'}}]}]}});
    });

    it('should add criteoId to the payload if included', function () {
      const id = '53e30ea700424f7bbdd793b02abc5d7';
      bidRequests[0].userId.criteoId = id;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'criteo.com', uids: [{id, ext: {rtiPartner: 'criteoId'}}]}]}});
    });

    it('should add tdid, idl_env and criteoId to the payload if both are included', function () {
      const tdidId = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      const idlEnvId = 'XY6104gr0njcH9UDIR7ysFFJcm2XNpqeJTYslleJ_cMlsFOfZI';
      const criteoId = '53e30ea700424f7bbdd793b02abc5d7';
      bidRequests[0].userId.tdid = tdidId;
      bidRequests[0].userId.idl_env = idlEnvId;
      bidRequests[0].userId.criteoId = criteoId;

      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({
        ext: {
          eids: [
            {
              source: 'adserver.org',
              uids: [
                {
                  id: tdidId,
                  ext: { rtiPartner: 'TDID' }
                }
              ],
            },
            {
              source: 'liveramp.com',
              uids: [
                {
                  id: idlEnvId,
                  ext: { rtiPartner: 'idl' }
                }
              ]
            },
            {
              source: 'criteo.com',
              uids: [
                {
                  id: criteoId,
                  ext: { rtiPartner: 'criteoId' }
                }
              ]
            }
          ]
        }
      });
    });

    it('should add user ids from multiple bid requests', function () {
      const tdidId = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      const idlEnvId = 'XY6104gr0njcH9UDIR7ysFFJcm2XNpqeJTYslleJ_cMlsFOfZI';
      const criteoId = '53e30ea700424f7bbdd793b02abc5d7';

      const bidRequestsMultiple = [
        { ...bidRequests[0], userId: { tdid: tdidId } },
        { ...bidRequests[0], userId: { idl_env: idlEnvId } },
        { ...bidRequests[0], userId: { criteoId: criteoId } }
      ];

      const request = tripleliftAdapterSpec.buildRequests(bidRequestsMultiple, bidderRequest);
      const payload = request.data;

      expect(payload.user).to.deep.equal({
        ext: {
          eids: [
            {
              source: 'adserver.org',
              uids: [
                {
                  id: tdidId,
                  ext: { rtiPartner: 'TDID' }
                }
              ],
            },
            {
              source: 'liveramp.com',
              uids: [
                {
                  id: idlEnvId,
                  ext: { rtiPartner: 'idl' }
                }
              ]
            },
            {
              source: 'criteo.com',
              uids: [
                {
                  id: criteoId,
                  ext: { rtiPartner: 'criteoId' }
                }
              ]
            }
          ]
        }
      });
    });

    it('should return a query string for TL call', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.exist;
      expect(url).to.be.a('string');
      expect(url).to.match(/(?:tlx.3lift.com\/header\/auction)/)
      expect(url).to.match(/(?:lib=prebid)/)
      expect(url).to.match(new RegExp('(?:' + prebid.version + ')'))
      expect(url).to.match(/(?:referrer)/);
    });
    it('should return us_privacy param when CCPA info is available', function() {
      bidderRequest.uspConsent = '1YYY';
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.match(/(\?|&)us_privacy=1YYY/);
    });
    it('should return coppa param when COPPA config is set to true', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      config.getConfig.restore();
      const url = request.url;
      expect(url).to.match(/(\?|&)coppa=true/);
    });
    it('should not return coppa param when COPPA config is set to false', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(false);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      config.getConfig.restore();
      const url = request.url;
      expect(url).not.to.match(/(\?|&)coppa=/);
    });
    it('should return schain when present', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const { data: payload } = request;
      expect(payload.ext.schain).to.deep.equal(schain);
    });
    it('should not create root level ext when schain is not present', function() {
      bidRequests[0].schain = undefined;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const { data: payload } = request;
      expect(payload.ext).to.deep.equal(undefined);
    });
    it('should get floor from floors module if available', function() {
      const floorInfo = {
        currency: 'USD',
        floor: 1.99
      };
      bidRequests[0].getFloor = () => floorInfo;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].floor).to.equal(1.99);
    });
  });

  describe('interpretResponse', function () {
    let response, bidderRequest;
    this.beforeEach(() => {
      response = {
        body: {
          bids: [
            {
              imp_id: 0,
              cpm: 1.062,
              width: 300,
              height: 250,
              ad: 'ad-markup',
              iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg',
              tl_source: 'tlx',
            },
            {
              imp_id: 1,
              crid: '10092_76480_i2j6qm8u',
              cpm: 9.99,
              ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
              tlx_source: 'hdx'
            }
          ]
        }
      };
      bidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
        bidderRequestId: '5c55612f99bc11',
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 250,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg',
            tl_source: 'tlx',
            mediaTypes: {
              banner: {
                sizes: [
                  [970, 250],
                  [1, 1]
                ]
              }
            },
            bidId: '30b31c1838de1e',
          },
          {
            imp_id: 1,
            crid: '10092_76480_i2j6qm8u',
            cpm: 9.99,
            ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
            tlx_source: 'hdx',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [640, 480]
              }
            },
            bidId: '30b31c1838de1e',
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        },
        gdprConsent: {
          consentString: GDPR_CONSENT_STR,
          gdprApplies: true
        }
      };
    })

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: 1.062,
          width: 300,
          height: 250,
          netRevenue: true,
          ad: 'ad-markup',
          creativeId: 29681110,
          dealId: '',
          currency: 'USD',
          ttl: 33,
          tl_source: 'tlx',
        },
        {
          requestId: '30b31c1838de1e',
          cpm: 1.062,
          width: 300,
          height: 250,
          netRevenue: true,
          ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
          creativeId: 29681110,
          dealId: '',
          currency: 'USD',
          ttl: 33,
          tl_source: 'hdx',
          mediaType: 'video',
          vastXml: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
        }
      ];
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result).to.have.length(2);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(Object.keys(result[1])).to.have.members(Object.keys(expectedResponse[1]));
    });

    it('should return multiple responses to support SRA', function () {
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result).to.have.length(2);
    });
  });

  describe('getUserSyncs', function() {
    let expectedIframeSyncUrl = 'https://eb2.3lift.com/sync?gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';
    let expectedImageSyncUrl = 'https://eb2.3lift.com/sync?px=1&src=prebid&gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';

    it('returns undefined when syncing is not enabled', function() {
      expect(tripleliftAdapterSpec.getUserSyncs({})).to.equal(undefined);
      expect(tripleliftAdapterSpec.getUserSyncs()).to.equal(undefined);
    });

    it('returns iframe user sync pixel when iframe syncing is enabled', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });

    it('returns image user sync pixel when iframe syncing is disabled', function() {
      let syncOptions = {
        pixelEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('image')
      expect(result[0].url).to.equal(expectedImageSyncUrl);
    });

    it('returns iframe user sync pixel when both options are enabled', function() {
      let syncOptions = {
        pixelEnabled: true,
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });
    it('sends us_privacy param when info is available', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions, null, null, '1YYY');
      expect(result[0].url).to.match(/(\?|&)us_privacy=1YYY/);
    });
  });
});
