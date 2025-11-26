const { expect } = require('chai');
const { spec, getSDKVersion, formatAdHTML, getBidFloor } = require('modules/fwsspBidAdapter');

describe('fwsspBidAdapter', () => {
  describe('isBidRequestValid', () => {
    it('should return true when all required params are present', () => {
      const bid = {
        params: {
          serverUrl: 'https://example.com/ad/g/1',
          networkId: '42015',
          profile: '42015:js_allinone_profile',
          siteSectionId: 'js_allinone_demo_site_section',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when serverUrl is missing', () => {
      const bid = {
        params: {
          networkId: '42015',
          profile: '42015:js_allinone_profile',
          siteSectionId: 'js_allinone_demo_site_section',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when networkId is missing', () => {
      const bid = {
        params: {
          serverUrl: 'https://example.com/ad/g/1',
          profile: '42015:js_allinone_profile',
          siteSectionId: 'js_allinone_demo_site_section',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when profile is missing', () => {
      const bid = {
        params: {
          serverUrl: 'https://example.com/ad/g/1',
          networkId: '42015',
          siteSectionId: 'js_allinone_demo_site_section',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when siteSectionId is missing', () => {
      const bid = {
        params: {
          serverUrl: 'https://example.com/ad/g/1',
          networkId: '42015',
          profile: '42015:js_allinone_profile',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequestsForBanner', () => {
    const getBidRequests = () => {
      return [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250], [300, 600]
            ]
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'schain': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [{
            'asi': 'example.com',
            'sid': '0',
            'hp': 1,
            'rid': 'bidrequestid',
            'domain': 'example.com'
          }]
        },
        'params': {
          'bidfloor': 2.00,
          'bidfloorcur': 'EUR',
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
          'flags': '+play',
          'timePosition': 120,
          'adRequestKeyValues': {
            '_fw_player_width': '1920',
            '_fw_player_height': '1080'
          }
        }
      }]
    };

    const bidderRequest = {
      gdprConsent: {
        consentString: 'consentString',
        gdprApplies: true
      },
      uspConsent: 'uspConsentString',
      gppConsent: {
        gppString: 'gppString',
        applicableSections: [8]
      },
      refererInfo: {
        page: 'www.test.com'
      }
    };

    it('should build a valid server request with default caid of 0', () => {
      const requests = spec.buildRequests(getBidRequests(), bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.equal('https://example.com/ad/g/1');

      const actualDataString = request.data;
      expect(actualDataString).to.include('nw=42015');
      expect(actualDataString).to.include('resp=vast4');
      expect(actualDataString).to.include('prof=42015%3Ajs_allinone_profile');
      expect(actualDataString).to.include('csid=js_allinone_demo_site_section');
      expect(actualDataString).to.include('caid=0');
      expect(actualDataString).to.include('pvrn=');
      expect(actualDataString).to.include('vprn=');
      expect(actualDataString).to.include('flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs');
      expect(actualDataString).to.include('mode=on-demand');
      expect(actualDataString).to.include(`vclr=js-7.11.0-prebid-${pbjs.version};`);
      expect(actualDataString).to.include('_fw_player_width=1920');
      expect(actualDataString).to.include('_fw_player_height=1080');
      expect(actualDataString).to.include('_fw_gdpr_consent=consentString');
      expect(actualDataString).to.include('_fw_gdpr=true');
      expect(actualDataString).to.include('_fw_us_privacy=uspConsentString');
      expect(actualDataString).to.include('gpp=gppString');
      expect(actualDataString).to.include('gpp_sid=8');
      expect(actualDataString).to.include('tpos=0');
      expect(actualDataString).to.include('ptgt=a');
      expect(actualDataString).to.include('slid=Preroll_1');
      expect(actualDataString).to.include('slau=preroll');
      expect(actualDataString).to.not.include('mind');
      expect(actualDataString).to.not.include('maxd;');
      // schain check
      const expectedEncodedSchainString = '1.0,1!example.com,0,1,bidrequestid,,example.com';
      expect(actualDataString).to.include(expectedEncodedSchainString);
    });

    it('should construct the full adrequest URL correctly', () => {
      const requests = spec.buildRequests(getBidRequests(), bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      const expectedUrl = `https://example.com/ad/g/1?nw=42015&resp=vast4&prof=42015%3Ajs_allinone_profile&csid=js_allinone_demo_site_section&caid=0&flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs&mode=on-demand&vclr=js-7.11.0-prebid-${pbjs.version};_fw_player_width=1920&_fw_player_height=1080&_fw_bidfloor=2&_fw_bidfloorcur=EUR&_fw_gdpr_consent=consentString&_fw_gdpr=true&_fw_us_privacy=uspConsentString&gpp=gppString&gpp_sid=8&schain=1.0,1!example.com,0,1,bidrequestid,,example.com;tpos=0&ptgt=a&slid=Preroll_1&slau=preroll;`;
      const actualUrl = `${request.url}?${request.data}`;
      // Remove pvrn and vprn from both URLs before comparing
      const cleanUrl = (url) => url.replace(/&pvrn=[^&]*/g, '').replace(/&vprn=[^&]*/g, '');
      expect(cleanUrl(actualUrl)).to.equal(cleanUrl(expectedUrl));
    });

    it('should use params.videoAssetId as caid', () => {
      const bidRequests = getBidRequests();
      bidRequests[0].params.videoAssetId = 10;
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      const actualDataString = request.data;
      expect(actualDataString).to.include('caid=10');
    });

    it('should return the correct width and height when _fw_player_width and _fw_player_height are not present in adRequestKeyValues', () => {
      const bidRequests = [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 600]
            ]
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'params': {
          'bidfloor': 2.00,
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
        }
      }];
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload).to.include('_fw_player_width=300');
      expect(payload).to.include('_fw_player_height=600');
    });

    it('should return image type userSyncs with gdprConsent', () => {
      const syncOptions = {
        'pixelEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, bidderRequest.gdprConsent, null, null);
      expect(userSyncs).to.deep.equal([{
        type: 'image',
        url: 'https://user-sync.fwmrm.net/ad/u?mode=auto-user-sync&gdpr=1&gdpr_consent=consentString'
      }]);
    });

    it('should return iframe type userSyncs with gdprConsent, uspConsent, gppConsent', () => {
      const syncOptions = {
        'iframeEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, bidderRequest.gdprConsent, bidderRequest.uspConsent, bidderRequest.gppConsent);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://user-sync.fwmrm.net/ad/u?mode=auto-user-sync&gdpr=1&gdpr_consent=consentString&us_privacy=uspConsentString&gpp=gppString&gpp_sid=8'
      }]);
    });

    it('should add privacy values to ad request and user sync url when present in keyValues', () => {
      const bidRequests = getBidRequests();

      bidRequests[0].params.adRequestKeyValues._fw_coppa = 1;
      bidRequests[0].params.adRequestKeyValues._fw_atts = 1;
      bidRequests[0].params.adRequestKeyValues._fw_is_lat = 1;
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const request = requests[0];
      const expectedUrl = `https://example.com/ad/g/1?nw=42015&resp=vast4&prof=42015%3Ajs_allinone_profile&csid=js_allinone_demo_site_section&caid=0&flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs&mode=on-demand&vclr=js-7.11.0-prebid-${pbjs.version};_fw_player_width=1920&_fw_player_height=1080&_fw_coppa=1&_fw_atts=1&_fw_is_lat=1&_fw_bidfloor=2&_fw_bidfloorcur=EUR&_fw_gdpr_consent=consentString&_fw_gdpr=true&_fw_us_privacy=uspConsentString&gpp=gppString&gpp_sid=8&schain=1.0,1!example.com,0,1,bidrequestid,,example.com;tpos=0&ptgt=a&slid=Preroll_1&slau=preroll;`;
      const actualUrl = `${request.url}?${request.data}`;
      // Remove pvrn and vprn from both URLs before comparing
      const cleanUrl = (url) => url.replace(/&pvrn=[^&]*/g, '').replace(/&vprn=[^&]*/g, '');
      expect(cleanUrl(actualUrl)).to.equal(cleanUrl(expectedUrl));

      const syncOptions = {
        'iframeEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, bidderRequest.gdprConsent, bidderRequest.uspConsent, bidderRequest.gppConsent);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://user-sync.fwmrm.net/ad/u?mode=auto-user-sync&_fw_coppa=1&_fw_atts=1&_fw_is_lat=1&gdpr=1&gdpr_consent=consentString&us_privacy=uspConsentString&gpp=gppString&gpp_sid=8'
      }]);
    });

    it('ortb2 values should take precedence over keyValues when present and be added to ad request and user sync url', () => {
      const bidRequests = getBidRequests();
      bidRequests[0].params.adRequestKeyValues._fw_coppa = 1;
      bidRequests[0].params.adRequestKeyValues._fw_atts = 1;
      bidRequests[0].params.adRequestKeyValues._fw_is_lat = 1;

      const bidderRequest2 = { ...bidderRequest }
      bidderRequest2.ortb2 = {
        regs: { coppa: 0 },
        device: {
          lmt: 0,
          ext: { atts: 0 }
        }
      }

      const requests = spec.buildRequests(bidRequests, bidderRequest2);
      const request = requests[0];
      const expectedUrl = `https://example.com/ad/g/1?nw=42015&resp=vast4&prof=42015%3Ajs_allinone_profile&csid=js_allinone_demo_site_section&caid=0&flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs&mode=on-demand&vclr=js-7.11.0-prebid-${pbjs.version};_fw_player_width=1920&_fw_player_height=1080&_fw_coppa=0&_fw_atts=0&_fw_is_lat=0&_fw_bidfloor=2&_fw_bidfloorcur=EUR&_fw_gdpr_consent=consentString&_fw_gdpr=true&_fw_us_privacy=uspConsentString&gpp=gppString&gpp_sid=8&schain=1.0,1!example.com,0,1,bidrequestid,,example.com;tpos=0&ptgt=a&slid=Preroll_1&slau=preroll;`;
      const actualUrl = `${request.url}?${request.data}`;
      // Remove pvrn and vprn from both URLs before comparing
      const cleanUrl = (url) => url.replace(/&pvrn=[^&]*/g, '').replace(/&vprn=[^&]*/g, '');
      expect(cleanUrl(actualUrl)).to.equal(cleanUrl(expectedUrl));

      const syncOptions = {
        'iframeEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, bidderRequest2.gdprConsent, bidderRequest2.uspConsent, bidderRequest2.gppConsent);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://user-sync.fwmrm.net/ad/u?mode=auto-user-sync&_fw_coppa=0&_fw_atts=0&_fw_is_lat=0&gdpr=1&gdpr_consent=consentString&us_privacy=uspConsentString&gpp=gppString&gpp_sid=8'
      }]);
    });

    it('should use schain from ortb2, prioritizing source.schain', () => {
      const bidRequests = getBidRequests();
      const bidderRequest2 = { ...bidderRequest }
      const schain1 = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'test1.com',
          sid: '0',
          hp: 1,
          rid: 'bidrequestid1',
          domain: 'test1.com'
        }]
      };
      const schain2 = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'test2.com',
          sid: '0',
          hp: 2,
          rid: 'bidrequestid2',
          domain: 'test2.com'
        }]
      };

      bidderRequest2.ortb2 = {
        source: {
          schain: schain1,
          ext: {
            schain: schain2
          }
        }
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest2);
      const request = requests[0];

      // schain check
      const expectedEncodedSchainString = '1.0,1!test1.com,0,1,bidrequestid1,,test1.com';
      expect(request.data).to.include(expectedEncodedSchainString);
    });

    it('should use schain from ortb2.source.ext, if source.schain is not available', () => {
      const bidRequests = getBidRequests();
      const bidderRequest2 = { ...bidderRequest }
      const schain2 = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'test2.com',
          sid: '0',
          hp: 2,
          rid: 'bidrequestid2',
          domain: 'test2.com'
        }]
      };

      bidderRequest2.ortb2 = {
        source: {
          ext: {
            schain: schain2
          }
        }
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest2);
      const request = requests[0];

      // schain check
      const expectedEncodedSchainString = '1.0,1!test2.com,0,2,bidrequestid2,,test2.com';
      expect(request.data).to.include(expectedEncodedSchainString);
    });
  });

  describe('buildRequestsForVideo', () => {
    const getBidRequests = () => {
      return [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
            'minduration': 30,
            'maxduration': 60,
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'schain': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [{
            'asi': 'example.com',
            'sid': '0',
            'hp': 1,
            'rid': 'bidrequestid',
            'domain': 'example.com'
          }]
        },
        'params': {
          'bidfloor': 2.00,
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
          'flags': '+play',
          'mode': 'live',
          'timePosition': 120,
          'tpos': 300,
          'slid': 'Midroll',
          'slau': 'midroll',
          'adRequestKeyValues': {
            '_fw_player_width': '1920',
            '_fw_player_height': '1080'
          },
          'gdpr_consented_providers': 'test_providers'
        }
      }]
    };

    const bidderRequest = {
      gdprConsent: {
        consentString: 'consentString',
        gdprApplies: true
      },
      uspConsent: 'uspConsentString',
      gppConsent: {
        gppString: 'gppString',
        applicableSections: [8]
      },
      ortb2: {
        regs: {
          gpp: 'test_ortb2_gpp',
          gpp_sid: 'test_ortb2_gpp_sid'
        },
        site: {
          content: {
            id: 'test_content_id',
            title: 'test_content_title'
          }
        }
      },
      refererInfo: {
        page: 'http://www.test.com'
      }
    };

    it('should return context and placement with default values', () => {
      const request = spec.buildRequests(getBidRequests());
      const payload = request[0].data;
      expect(payload).to.include('_fw_video_context=&');
      expect(payload).to.include('_fw_placement_type=null&');
      expect(payload).to.include('_fw_plcmt_type=null&');
    });

    it('should assign placement and context when format is inbanner', () => {
      const bidRequest = getBidRequests()[0];
      bidRequest.params.format = 'inbanner';
      bidRequest.mediaTypes.video.plcmt = 'test-plcmt-type';
      const request = spec.buildRequests([bidRequest]);
      const payload = request[0].data;
      expect(payload).to.include('_fw_video_context=In-Banner&');
      expect(payload).to.include('_fw_placement_type=2&');
      expect(payload).to.include('_fw_plcmt_type=test-plcmt-type&');
    });

    it('should build a valid server request', () => {
      const requests = spec.buildRequests(getBidRequests(), bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.equal('https://example.com/ad/g/1');

      const actualDataString = request.data;

      expect(actualDataString).to.include('nw=42015');
      expect(actualDataString).to.include('resp=vast4');
      expect(actualDataString).to.include('prof=42015%3Ajs_allinone_profile');
      expect(actualDataString).to.include('csid=js_allinone_demo_site_section');
      expect(actualDataString).to.include('caid=0');
      expect(actualDataString).to.include('pvrn=');
      expect(actualDataString).to.include('vprn=');
      expect(actualDataString).to.include('flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs');
      expect(actualDataString).to.include('mode=live');
      expect(actualDataString).to.include(`vclr=js-7.11.0-prebid-${pbjs.version};`);
      expect(actualDataString).to.include('_fw_player_width=1920');
      expect(actualDataString).to.include('_fw_player_height=1080');
      expect(actualDataString).to.include('_fw_gdpr_consent=consentString');
      expect(actualDataString).to.include('_fw_gdpr=true');
      expect(actualDataString).to.include('_fw_us_privacy=uspConsentString');
      expect(actualDataString).to.include('gpp=gppString');
      expect(actualDataString).to.include('gpp_sid=8');

      expect(actualDataString).to.include('loc=http%3A%2F%2Fwww.test.com');
      expect(actualDataString).to.include('tpos=300');
      expect(actualDataString).to.include('ptgt=a');
      expect(actualDataString).to.include('slid=Midroll');
      expect(actualDataString).to.include('slau=midroll');
      expect(actualDataString).to.include('mind=30');
      expect(actualDataString).to.include('maxd=60;');
      // schain check
      const expectedEncodedSchainString = '1.0,1!example.com,0,1,bidrequestid,,example.com';
      expect(actualDataString).to.include(expectedEncodedSchainString);
    });

    it('should construct the full adrequest URL correctly', () => {
      const requests = spec.buildRequests(getBidRequests(), bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];

      const expectedUrl = `https://example.com/ad/g/1?nw=42015&resp=vast4&prof=42015%3Ajs_allinone_profile&csid=js_allinone_demo_site_section&caid=0&flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs&mode=live&vclr=js-7.11.0-prebid-${pbjs.version};_fw_player_width=1920&_fw_player_height=1080&_fw_bidfloor=2&_fw_bidfloorcur=USD&_fw_gdpr_consent=consentString&_fw_gdpr=true&_fw_gdpr_consented_providers=test_providers&_fw_us_privacy=uspConsentString&gpp=gppString&gpp_sid=8&_fw_prebid_content=%7B%22id%22%3A%22test_content_id%22%2C%22title%22%3A%22test_content_title%22%7D&loc=http%3A%2F%2Fwww.test.com&_fw_video_context=&_fw_placement_type=null&_fw_plcmt_type=null&schain=1.0,1!example.com,0,1,bidrequestid,,example.com;tpos=300&ptgt=a&slid=Midroll&slau=midroll&mind=30&maxd=60;`;
      const actualUrl = `${request.url}?${request.data}`;
      // Remove pvrn and vprn from both URLs before comparing
      const cleanUrl = (url) => url.replace(/&pvrn=[^&]*/g, '').replace(/&vprn=[^&]*/g, '');
      expect(cleanUrl(actualUrl)).to.equal(cleanUrl(expectedUrl));
    });

    it('should use otrb2 gpp if gpp not in bidder request', () => {
      const bidderRequest2 = {
        ortb2: {
          regs: {
            gpp: 'test_ortb2_gpp',
            gpp_sid: 'test_ortb2_gpp_sid'
          },
          site: {
            content: {
              id: 'test_content_id',
              title: 'test_content_title'
            }
          }
        }
      };

      const requests = spec.buildRequests(getBidRequests(), bidderRequest2);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      const expectedUrl = `https://example.com/ad/g/1?nw=42015&resp=vast4&prof=42015%3Ajs_allinone_profile&csid=js_allinone_demo_site_section&caid=0&flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs&mode=live&vclr=js-7.11.0-prebid-${pbjs.version};_fw_player_width=1920&_fw_player_height=1080&_fw_bidfloor=2&_fw_bidfloorcur=USD&_fw_gdpr_consented_providers=test_providers&gpp=test_ortb2_gpp&gpp_sid=test_ortb2_gpp_sid&_fw_prebid_content=%7B%22id%22%3A%22test_content_id%22%2C%22title%22%3A%22test_content_title%22%7D&_fw_video_context=&_fw_placement_type=null&_fw_plcmt_type=null&schain=1.0,1!example.com,0,1,bidrequestid,,example.com;tpos=300&ptgt=a&slid=Midroll&slau=midroll&mind=30&maxd=60;`;
      const actualUrl = `${request.url}?${request.data}`;
      // Remove pvrn and vprn from both URLs before comparing
      const cleanUrl = (url) => url.replace(/&pvrn=[^&]*/g, '').replace(/&vprn=[^&]*/g, '');
      expect(cleanUrl(actualUrl)).to.equal(cleanUrl(expectedUrl));
    });

    it('should get bidfloor value from params if no getFloor method', () => {
      const request = spec.buildRequests(getBidRequests());
      const payload = request[0].data;
      expect(payload).to.include('_fw_bidfloor=2');
      expect(payload).to.include('_fw_bidfloorcur=USD');
    });

    it('should return image type userSyncs with gdprConsent', () => {
      const syncOptions = {
        'pixelEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, bidderRequest.gdprConsent, null, null);
      expect(userSyncs).to.deep.equal([{
        type: 'image',
        url: 'https://user-sync.fwmrm.net/ad/u?mode=auto-user-sync&gdpr=1&gdpr_consent=consentString'
      }]);
    });

    it('should return iframe type userSyncs with gdprConsent, uspConsent, gppConsent', () => {
      const syncOptions = {
        'iframeEnabled': true
      }
      const userSyncs = spec.getUserSyncs(syncOptions, null, bidderRequest.gdprConsent, bidderRequest.uspConsent, bidderRequest.gppConsent);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://user-sync.fwmrm.net/ad/u?mode=auto-user-sync&gdpr=1&gdpr_consent=consentString&us_privacy=uspConsentString&gpp=gppString&gpp_sid=8'
      }]);
    });
  });

  describe('buildRequestsForVideoWithContextAndPlacement', () => {
    it('should return input context and placement', () => {
      const bidRequests = [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'context': 'outstream',
            'placement': 2,
            'plcmt': 3,
            'playerSize': [300, 600],
            'minduration': 30,
            'maxduration': 60,
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'params': {
          'bidfloor': 2.00,
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
          'flags': '+play',
          'mode': 'live',
          'vclr': 'js-7.11.0-prebid-',
          'timePosition': 120,
        }
      }];
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload).to.include('_fw_video_context=outstream'); ;
      expect(payload).to.include('_fw_placement_type=2');
      expect(payload).to.include('_fw_plcmt_type=3');
    });
  });

  describe('getSDKVersion', () => {
    it('should return the default sdk version when sdkVersion is missing', () => {
      const bid = {
        params: {
          sdkVersion: ''
        }
      };
      expect(getSDKVersion(bid)).to.equal('7.11.0');
    });

    it('should return the correct sdk version when sdkVersion is higher than the default', () => {
      const bid = {
        params: {
          sdkVersion: '7.11.0'
        }
      };
      expect(getSDKVersion(bid)).to.equal('7.11.0');
    });

    it('should return the default sdk version when sdkVersion is lower than the default', () => {
      const bid = {
        params: {
          sdkVersion: '7.9.0'
        }
      };
      expect(getSDKVersion(bid)).to.equal('7.11.0');
    });

    it('should return the default sdk version when sdkVersion is an invalid string', () => {
      const bid = {
        params: {
          sdkVersion: 'abcdef'
        }
      };
      expect(getSDKVersion(bid)).to.equal('7.11.0');
    });

    it('should return the correct sdk version when sdkVersion starts with v', () => {
      const bid = {
        params: {
          sdkVersion: 'v7.11.0'
        }
      };
      expect(getSDKVersion(bid)).to.equal('7.11.0');
    });
  });

  describe('formatAdHTML', () => {
    it('should return the ad markup in formatAdHTML, with default value of false for showMuteButton and true for isMuted', () => {
      const expectedAdHtml =
`<div id='fwssp_display_base' class='ad-container' style='width:640px;height:480px;'>
  <script type='text/javascript'>
    const script = document.createElement('script');
    script.src = 'https://mssl.fwmrm.net/libs/adm/7.11.0/AdManager-prebid.js';
    script.async = true;

    const topWindow = function() {
      let res = window;
      try {
        while (top !== res) {
          if (res.parent.location.href.length) {
            res = res.parent;
          }
        }
      } catch (e) {}
      return res;
    }();
    const cache = topWindow.fwssp_cache ? topWindow.fwssp_cache['test'] : null;
    const vastResponse = cache ? cache.response : null;
    const listeners = cache ? cache.listeners : null;

    const config = {
      displayBaseId: 'fwssp_display_base',
      vastResponse: vastResponse,
      showMuteButton: false,
      startMuted: true,
      playerParams: undefined,
      format: 'outstream',
      listeners: listeners
    };

    const timeoutId = setTimeout(() => {
      console.warn('MRM AdManager load timeout: 5000 ms');
      cleanup();
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutId);
      this.prebidPlayer = window.tv.freewheel.SDK.newPrebidPlayer(config);
    };

    script.onerror = (err) => {
      cleanup();
      console.warn('MRM AdManager load failed:', err.message);
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      script.remove();
      var displayBase = document.getElementById('fwssp_display_base');
      if (displayBase) {
        displayBase.remove();
      }
    };

    document.head.appendChild(script);
  </script>
</div>`;

      const bidRequest = {
        params: {},
        adUnitCode: 'test'
      }
      const actualAdHtml = formatAdHTML(bidRequest, [640, 480], '<VAST></VAST>');
      expect(actualAdHtml).to.deep.equal(expectedAdHtml)
    });

    it('should take bid request showMuteButton, isMuted, and playerParams', () => {
      const expectedAdHtml =
`<div id='fwssp_display_base' class='ad-container' style='width:640px;height:480px;'>
  <script type='text/javascript'>
    const script = document.createElement('script');
    script.src = 'https://mssl.fwmrm.net/libs/adm/7.11.0/AdManager-prebid.js';
    script.async = true;

    const topWindow = function() {
      let res = window;
      try {
        while (top !== res) {
          if (res.parent.location.href.length) {
            res = res.parent;
          }
        }
      } catch (e) {}
      return res;
    }();
    const cache = topWindow.fwssp_cache ? topWindow.fwssp_cache['test'] : null;
    const vastResponse = cache ? cache.response : null;
    const listeners = cache ? cache.listeners : null;

    const config = {
      displayBaseId: 'fwssp_display_base',
      vastResponse: vastResponse,
      showMuteButton: true,
      startMuted: false,
      playerParams: {"test-param":"test-value"},
      format: 'outstream',
      listeners: listeners
    };

    const timeoutId = setTimeout(() => {
      console.warn('MRM AdManager load timeout: 5000 ms');
      cleanup();
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutId);
      this.prebidPlayer = window.tv.freewheel.SDK.newPrebidPlayer(config);
    };

    script.onerror = (err) => {
      cleanup();
      console.warn('MRM AdManager load failed:', err.message);
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      script.remove();
      var displayBase = document.getElementById('fwssp_display_base');
      if (displayBase) {
        displayBase.remove();
      }
    };

    document.head.appendChild(script);
  </script>
</div>`;

      const bidRequest = {
        params: {
          showMuteButton: true,
          isMuted: false,
          playerParams: { 'test-param': 'test-value' }
        },
        adUnitCode: 'test'
      }
      const actualAdHtml = formatAdHTML(bidRequest, [640, 480], '<VAST></VAST>');
      expect(actualAdHtml).to.deep.equal(expectedAdHtml)
    });

    it('should generate html with the AdManager stg url when env param has value fo stg in bid request', () => {
      const expectedAdHtml =
`<div id='fwssp_display_base' class='ad-container' style='width:640px;height:480px;'>
  <script type='text/javascript'>
    const script = document.createElement('script');
    script.src = 'https://adm.stg.fwmrm.net/libs/adm/7.11.0/AdManager-prebid.js';
    script.async = true;

    const topWindow = function() {
      let res = window;
      try {
        while (top !== res) {
          if (res.parent.location.href.length) {
            res = res.parent;
          }
        }
      } catch (e) {}
      return res;
    }();
    const cache = topWindow.fwssp_cache ? topWindow.fwssp_cache['test'] : null;
    const vastResponse = cache ? cache.response : null;
    const listeners = cache ? cache.listeners : null;

    const config = {
      displayBaseId: 'fwssp_display_base',
      vastResponse: vastResponse,
      showMuteButton: false,
      startMuted: true,
      playerParams: undefined,
      format: 'outstream',
      listeners: listeners
    };

    const timeoutId = setTimeout(() => {
      console.warn('MRM AdManager load timeout: 5000 ms');
      cleanup();
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutId);
      this.prebidPlayer = window.tv.freewheel.SDK.newPrebidPlayer(config);
    };

    script.onerror = (err) => {
      cleanup();
      console.warn('MRM AdManager load failed:', err.message);
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      script.remove();
      var displayBase = document.getElementById('fwssp_display_base');
      if (displayBase) {
        displayBase.remove();
      }
    };

    document.head.appendChild(script);
  </script>
</div>`;

      const bidRequest = {
        params: {
          env: 'stg'
        },
        adUnitCode: 'test'
      }
      const actualAdHtml = formatAdHTML(bidRequest, [640, 480], '<VAST></VAST>');
      expect(actualAdHtml).to.deep.equal(expectedAdHtml)
    });

    it('should use the correct version when sdkVersion is in bid params', () => {
      const expectedAdHtml =
`<div id='fwssp_display_base' class='ad-container' style='width:640px;height:480px;'>
  <script type='text/javascript'>
    const script = document.createElement('script');
    script.src = 'https://adm.stg.fwmrm.net/libs/adm/7.11.0/AdManager-prebid.js';
    script.async = true;

    const topWindow = function() {
      let res = window;
      try {
        while (top !== res) {
          if (res.parent.location.href.length) {
            res = res.parent;
          }
        }
      } catch (e) {}
      return res;
    }();
    const cache = topWindow.fwssp_cache ? topWindow.fwssp_cache['test'] : null;
    const vastResponse = cache ? cache.response : null;
    const listeners = cache ? cache.listeners : null;

    const config = {
      displayBaseId: 'fwssp_display_base',
      vastResponse: vastResponse,
      showMuteButton: false,
      startMuted: true,
      playerParams: undefined,
      format: 'outstream',
      listeners: listeners
    };

    const timeoutId = setTimeout(() => {
      console.warn('MRM AdManager load timeout: 5000 ms');
      cleanup();
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutId);
      this.prebidPlayer = window.tv.freewheel.SDK.newPrebidPlayer(config);
    };

    script.onerror = (err) => {
      cleanup();
      console.warn('MRM AdManager load failed:', err.message);
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      script.remove();
      var displayBase = document.getElementById('fwssp_display_base');
      if (displayBase) {
        displayBase.remove();
      }
    };

    document.head.appendChild(script);
  </script>
</div>`;

      const bidRequest = {
        params: {
          env: 'stg',
          sdkVersion: '7.11.0'
        },
        adUnitCode: 'test'
      }
      const actualAdHtml = formatAdHTML(bidRequest, [640, 480], '<VAST></VAST>');
      expect(actualAdHtml).to.deep.equal(expectedAdHtml)
    });
  });

  describe('interpretResponseForBanner', () => {
    const getBidRequests = () => {
      return [{
        'bidder': 'fwssp',
        'params': {
          'serverUrl': 'https://fwmrm.com/ad/g/1',
          'sdkVersion': ''
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 600]
            ]
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }]
    };

    const response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'4.2\'>' +
    '<Ad id=\'AdswizzAd28517153\'>' +
    '  <InLine>' +
    '   <AdSystem>Adswizz</AdSystem>' +
    '   <Impression id="dmp-1617899169-2513"></Impression>' +
    '   <Impression id="user-sync-1617899169-1">https://ads.stickyadstv.com/auto-user-sync?dealId=NRJ-PRO-12008</Impression>' +
    '   <Impression id="727435745">' +
    '   <![CDATA[ https://ads.stickyadstv.com/www/delivery/swfIndex.php?reqType=AdsDisplayStarted&dealId=NRJ-PRO-00008&campaignId=SMF-WOW-55555&adId=12345&viewKey=1607626986121029-54&sessionId=e3230a6bef6e0d2327422ff5282435&zoneId=2003&impId=1&cb=1932360&trackingIds=19651873%2C28161297%2C28161329%2C29847601%2C29967745%2C61392385&listenerId=eddf2aebad29655bb2b6abac276c50ef& ]]>' +
    '   </Impression>' +
    '   <Creatives>' +
    '    <Creative AdID=\'56600048\' id=\'28517153\' sequence=\'1\'>' +
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

    it('should get correct bid response', () => {
      const request = spec.buildRequests(getBidRequests());
      const result = spec.interpretResponse(response, request[0]);

      expect(result[0].meta.advertiserDomains).to.deep.equal([]);
      expect(result[0].dealId).to.equal('NRJ-PRO-00008');
      expect(result[0].campaignId).to.equal('SMF-WOW-55555');
      expect(result[0].bannerId).to.equal('12345');
      expect(result[0].requestId).to.equal('30b31c1838de1e');
      expect(result[0].cpm).to.equal('0.2000');
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(600);
      expect(result[0].creativeId).to.equal('[28517153]');
      expect(result[0].currency).to.equal('EUR');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(360);
    });

    it('handles nobid responses', () => {
      const request = spec.buildRequests(getBidRequests());
      const response = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'4.2\'></VAST>';
      const result = spec.interpretResponse(response, request[0]);
      expect(result.length).to.equal(0);
    });
  });

  describe('getBidFloor function tests', () => {
    const mockConfig = {
      getConfig: (key) => {
        if (key === 'floors.data.currency') return 'EUR';
        return null;
      }
    };

    it('should use params.bidfloor and params.bidfloorcur when getFloor method is not available', () => {
      const bidRequest = {
        params: {
          bidfloor: 1.5,
          bidfloorcur: 'GBP'
        }
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(1.5);
      expect(result.currency).to.equal('GBP');
    });

    it('should use default values when params are missing and no getFloor method', () => {
      const bidRequest = {
        params: {}
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(0);
      expect(result.currency).to.equal('USD');
    });

    it('should use getFloor method when available for banner mediaType', () => {
      const bidRequest = {
        params: {
          bidfloor: 1.0,
          bidfloorcur: 'USD'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        getFloor: () => ({
          floor: 2.5,
          currency: 'EUR'
        })
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(2.5);
      expect(result.currency).to.equal('EUR');
    });

    it('should use getFloor method when available for video mediaType', () => {
      const bidRequest = {
        params: {
          bidfloor: 1.0,
          bidfloorcur: 'USD'
        },
        mediaTypes: {
          video: {
            playerSize: [640, 480]
          }
        },
        getFloor: () => ({
          floor: 3.0,
          currency: 'JPY'
        })
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(3.0);
      expect(result.currency).to.equal('JPY');
    });

    it('should fallback to params when getFloor throws an error', () => {
      const bidRequest = {
        params: {
          bidfloor: 1.75,
          bidfloorcur: 'CAD'
        },
        getFloor: () => {
          throw new Error('getFloor error');
        }
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(1.75);
      expect(result.currency).to.equal('CAD');
    });

    it('should fallback to params when getFloor returns invalid floor value', () => {
      const bidRequest = {
        params: {
          bidfloor: 2.0,
          bidfloorcur: 'AUD'
        },
        getFloor: () => ({
          floor: 'invalid',
          currency: 'EUR'
        })
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(2.0);
      expect(result.currency).to.equal('AUD');
    });

    it('should use getFloor currency when floor is valid but currency is from getFloor', () => {
      const bidRequest = {
        params: {
          bidfloor: 1.0
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        getFloor: () => ({
          floor: 2.25,
          currency: 'CHF'
        })
      };
      const result = getBidFloor(bidRequest, mockConfig);
      expect(result.floor).to.equal(2.25);
      expect(result.currency).to.equal('CHF');
    });
  });

  describe('bidfloor integration in buildRequests', () => {
    it('should include bidfloor values from getBidFloor in banner requests', () => {
      const bidRequests = [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'bidId': '30b31c1838de1e',
        'params': {
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
          'bidfloor': 1.25,
          'bidfloorcur': 'GBP'
        }
      }];

      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload).to.include('_fw_bidfloor=1.25');
      expect(payload).to.include('_fw_bidfloorcur=GBP');
    });

    it('should include bidfloor values from getFloor method when available', () => {
      const bidRequests = [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480]
          }
        },
        'bidId': '30b31c1838de1e',
        'params': {
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
          'bidfloor': 1.0,
          'bidfloorcur': 'USD'
        },
        getFloor: () => ({
          floor: 2.75,
          currency: 'EUR'
        })
      }];

      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload).to.include('_fw_bidfloor=2.75');
      expect(payload).to.include('_fw_bidfloorcur=EUR');
    });

    it('should handle zero bidfloor values correctly', () => {
      const bidRequests = [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'bidId': '30b31c1838de1e',
        'params': {
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
        },
        getFloor: () => ({
          floor: 0,
          currency: 'USD'
        })
      }];

      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload).to.include('_fw_bidfloor=0');
      expect(payload).to.include('_fw_bidfloorcur=USD');
    });

    it('should include default bidfloor values when no floor configuration exists', () => {
      const bidRequests = [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'bidId': '30b31c1838de1e',
        'params': {
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
        }
      }];

      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload).to.include('_fw_bidfloor=0');
      expect(payload).to.include('_fw_bidfloorcur=USD');
    });
  });

  describe('schain tests', () => {
    const getBidRequests = () => {
      return [{
        'bidder': 'fwssp',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'video': {
            'playerSize': [300, 600],
            'minduration': 30,
            'maxduration': 60,
          }
        },
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'params': {
          'bidfloor': 2.00,
          'serverUrl': 'https://example.com/ad/g/1',
          'networkId': '42015',
          'profile': '42015:js_allinone_profile',
          'siteSectionId': 'js_allinone_demo_site_section',
          'flags': '+play',
          'videoAssetId': '0',
          'mode': 'live',
          'timePosition': 120,
          'tpos': 300,
          'slid': 'Midroll',
          'slau': 'midroll',
          'adRequestKeyValues': {
            '_fw_player_width': '1920',
            '_fw_player_height': '1080'
          },
          'gdpr_consented_providers': 'test_providers'
        }
      }]
    };

    const bidderRequest = {
      gdprConsent: {
        consentString: 'consentString',
        gdprApplies: true
      },
      uspConsent: 'uspConsentString',
      gppConsent: {
        gppString: 'gppString',
        applicableSections: [8]
      },
      ortb2: {
        regs: {
          gpp: 'test_ortb2_gpp',
          gpp_sid: 'test_ortb2_gpp_sid'
        },
        site: {
          content: {
            id: 'test_content_id',
            title: 'test_content_title'
          }
        }
      },
      refererInfo: {
        page: 'http://www.test.com'
      }
    };

    it('should not include schain in the adrequest URL if schain is missing from bidrequest', () => {
      const requests = spec.buildRequests(getBidRequests(), bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      const expectedUrl = `https://example.com/ad/g/1?nw=42015&resp=vast4&prof=42015%3Ajs_allinone_profile&csid=js_allinone_demo_site_section&caid=0&flag=%2Bplay%2Bfwssp%2Bemcr%2Bnucr%2Baeti%2Brema%2Bexvt%2Bfwpbjs&mode=live&vclr=js-7.11.0-prebid-${pbjs.version};_fw_player_width=1920&_fw_player_height=1080&_fw_bidfloor=2&_fw_bidfloorcur=USD&_fw_gdpr_consent=consentString&_fw_gdpr=true&_fw_gdpr_consented_providers=test_providers&_fw_us_privacy=uspConsentString&gpp=gppString&gpp_sid=8&_fw_prebid_content=%7B%22id%22%3A%22test_content_id%22%2C%22title%22%3A%22test_content_title%22%7D&loc=http%3A%2F%2Fwww.test.com&_fw_video_context=&_fw_placement_type=null&_fw_plcmt_type=null;tpos=300&ptgt=a&slid=Midroll&slau=midroll&mind=30&maxd=60;`;
      const actualUrl = `${request.url}?${request.data}`;
      // Remove pvrn and vprn from both URLs before comparing
      const cleanUrl = (url) => url.replace(/&pvrn=[^&]*/g, '').replace(/&vprn=[^&]*/g, '');
      expect(cleanUrl(actualUrl)).to.equal(cleanUrl(expectedUrl));
    });

    it('should only encode comma within attribute value', () => {
      const bidRequests = getBidRequests();
      const bidderRequest2 = { ...bidderRequest }
      const schain1 = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'test1.com',
          sid: '123,B',
          hp: 1,
          rid: 'bidrequestid1',
          domain: 'test1.com'
        }]
      };

      bidderRequest2.ortb2 = {
        source: {
          schain: schain1,
        }
      };
      const requests = spec.buildRequests(bidRequests, bidderRequest2);
      const request = requests[0];

      // schain check
      const expectedEncodedSchainString = '1.0,1!test1.com,123%2CB,1,bidrequestid1,,test1.com';
      expect(request.data).to.include(expectedEncodedSchainString);
    });
  });
});
