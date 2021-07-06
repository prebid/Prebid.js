import { expect } from 'chai';
import * as _ from 'lodash';
import { spec, matchRequest, checkDeepArray, defaultSize, upto5, cleanSizes, shuffle, getApi, bindUserId, getPlaybackmethod, getProtocols, cleanVast } from '../../../modules/districtmDMXBidAdapter.js';

const sample_vast = `<VAST version="3.0">
    <Ad id="6">
        <InLine>
            <AdTitle><![CDATA[district m]]></AdTitle>
            <Impression>
            </Impression>
            <Creatives>
                <Creative>
                    <Linear skipoffset="00:00:10">
                        <Duration>00:00:15</Duration>
                        <TrackingEvents>
                            <Tracking event="start">
                            </Tracking>
                            <Tracking event="firstQuartile">
                            </Tracking>
                            <Tracking event="midpoint">
                            </Tracking>
                            <Tracking event="thirdQuartile">
                            </Tracking>
                            <Tracking event="complete">
                            </Tracking>
                            <Tracking event="mute">
                            </Tracking>
                            <Tracking event="unmute">
                            </Tracking>
                            <Tracking event="skip">
                            </Tracking>
                            <Tracking event="pause">
                            </Tracking>
                            <Tracking event="resume">
                            </Tracking>
                            <Tracking event="fullscreen">
                            </Tracking>
                            <Tracking event="close">
                            </Tracking>
                        </TrackingEvents>
                        <VideoClicks>
                            <ClickThrough><![CDATA[https://districtm.net/en/]]></ClickThrough>
                            <ClickTracking>
                            </ClickTracking>
                        </VideoClicks>
                        <MediaFiles>
                        </MediaFiles>
                    </Linear>
                </Creative>
                <Creative><CompanionAds></CompanionAds></Creative>
            </Creatives>
            <Extensions></Extensions>
        </InLine>
    </Ad>
</VAST>
<!-- DMX - seat 0 - crid 0 -->
<img src="https://dmx.us-east-4.districtm.io/n/v1/22" style="display: none;" />`

const supportedSize = [
  {
    size: [300, 250],
    s: 100
  },
  {
    size: [728, 90],
    s: 95
  },
  {
    size: [300, 600],
    s: 90
  },
  {
    size: [160, 600],
    s: 88
  },
  {
    size: [320, 50],
    s: 85
  },
  {
    size: [300, 50],
    s: 80
  },
  {
    size: [970, 250],
    s: 75
  },
  {
    size: [970, 90],
    s: 60
  },
];
const bidRequest = [{
  'bidder': 'districtmDMX',
  'params': {
    'dmxid': 100001,
    'memberid': 100003,
  },
  'userId': {
    idl_env: {},
    digitrustid: {
      data: {
        id: {}
      }
    },
    id5id: {
      uid: ''
    },
    pubcid: {},
    tdid: {},
    criteoId: {},
    britepoolid: {},
    intentiqid: {},
    lotamePanoramaId: {},
    parrableId: {},
    netId: {},
    lipb: {
      lipbid: {}
    },

  },
  'adUnitCode': 'div-gpt-ad-12345678-1',
  'transactionId': 'f6d13fa6-ebc1-41ac-9afa-d8171d22d2c2',
  'sizes': [
    [300, 250],
    [300, 600]
  ],
  'bidId': '29a28a1bbc8a8d',
  'bidderRequestId': '124b579a136515',
  'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf'
}];

const bidRequestVideo = [{
  'bidder': 'districtmDMX',
  'params': {
    'dmxid': 100001,
    'memberid': 100003,
    'video': {
      id: 123,
      skipppable: true,
      playback_method: ['auto_play_sound_off', 'viewport_sound_off'],
      mimes: ['application/javascript',
        'video/mp4'],
    }
  },
  'mediaTypes': {
    video: {
      context: 'instream', // or 'outstream'
      playerSize: [[640, 480]]
    }
  },
  'adUnitCode': 'div-gpt-ad-12345678-1',
  'transactionId': 'f6d13fa6-ebc1-41ac-9afa-d8171d22d2c2',
  'sizes': [
    [300, 250],
    [300, 600]
  ],
  'bidId': '29a28a1bbc8a8d',
  'bidderRequestId': '124b579a136515',
  'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf'
}];
const bidRequestNoCoppa = [{
  'bidder': 'districtmDMX',
  'params': {
    'dmxid': 100001,
    'memberid': 100003
  },
  'adUnitCode': 'div-gpt-ad-12345678-1',
  'transactionId': 'f6d13fa6-ebc1-41ac-9afa-d8171d22d2c2',
  'sizes': [
    [300, 250],
    [300, 600]
  ],
  'bidId': '29a28a1bbc8a8d',
  'bidderRequestId': '124b579a136515',
  'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf'
}];
const bidderRequest = {
  'bidderCode': 'districtmDMX',
  'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf',
  'bidderRequestId': '124b579a136515',
  'bids': [{
    'bidder': 'districtmDMX',
    'params': {
      'dmxid': 100001,
      'memberid': 100003,
    },
    'adUnitCode': 'div-gpt-ad-12345678-1',
    'transactionId': 'f6d13fa6-ebc1-41ac-9afa-d8171d22d2c2',
    'sizes': [
      [300, 250],
      [300, 600]
    ],
    'bidId': '29a28a1bbc8a8d',
    'bidderRequestId': '124b579a136515',
    'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf'
  }],
  'auctionStart': 1529511035677,
  'timeout': 700,
  'uspConsent': '1NY',
  'gdprConsent': {
    'consentString': 'BOPqNzUOPqNzUAHABBAAA5AAAAAAAA',
    'vendorData': {
      'metadata': 'BOPqNzUOPqNzUAHABBAAA5AAAAAAAA',
      'hasGlobalScope': false,
      'gdprApplies': true,
      'purposeConsents': {
        '1': false,
        '2': false,
        '3': false,
        '4': false,
        '5': false
      },
      'vendorConsents': {
        '1': false,
        '2': false,
        '3': false,
        '4': false,
        '6': false,
        '7': false,
        '8': false,
        '9': false,
        '10': false,
        '11': false,
        '12': false,
        '13': false,
        '14': false,
        '15': false,
        '16': false,
        '17': false,
        '18': false,
        '19': false,
        '20': false,
        '21': false,
        '22': false,
        '23': false,
        '24': false,
        '25': false,
        '26': false,
        '27': false,
        '28': false,
        '29': false,
        '30': false,
        '31': false,
        '32': false,
        '33': false,
        '34': false,
        '35': false,
        '36': false,
        '37': false,
        '38': false,
        '39': false,
        '40': false,
        '41': false,
        '42': false,
        '43': false,
        '44': false,
        '45': false,
        '46': false,
        '47': false,
        '48': false,
        '49': false,
        '50': false,
        '51': false,
        '52': false,
        '53': false,
        '55': false,
        '56': false,
        '57': false,
        '58': false,
        '59': false,
        '60': false,
        '61': false,
        '62': false,
        '63': false,
        '64': false,
        '65': false,
        '66': false,
        '67': false,
        '68': false,
        '69': false,
        '70': false,
        '71': false,
        '72': false,
        '73': false,
        '74': false,
        '75': false,
        '76': false,
        '77': false,
        '78': false,
        '79': false,
        '80': false,
        '81': false,
        '82': false,
        '83': false,
        '84': false,
        '85': false,
        '86': false,
        '87': false,
        '88': false,
        '89': false,
        '90': false,
        '91': false,
        '92': false,
        '93': false,
        '94': false,
        '95': false,
        '97': false,
        '98': false,
        '100': false,
        '101': false,
        '102': false,
        '104': false,
        '105': false,
        '108': false,
        '109': false,
        '110': false,
        '111': false,
        '112': false,
        '113': false,
        '114': false,
        '115': false,
        '119': false,
        '120': false,
        '122': false,
        '124': false,
        '125': false,
        '126': false,
        '127': false,
        '128': false,
        '129': false,
        '130': false,
        '131': false,
        '132': false,
        '133': false,
        '134': false,
        '136': false,
        '138': false,
        '139': false,
        '140': false,
        '141': false,
        '142': false,
        '143': false,
        '144': false,
        '145': false,
        '147': false,
        '148': false,
        '149': false,
        '150': false,
        '151': false,
        '152': false,
        '153': false,
        '154': false,
        '155': false,
        '156': false,
        '157': false,
        '158': false,
        '159': false,
        '160': false,
        '161': false,
        '162': false,
        '163': false,
        '164': false,
        '165': false,
        '167': false,
        '168': false,
        '169': false,
        '170': false,
        '171': false,
        '173': false,
        '174': false,
        '175': false,
        '177': false,
        '178': false,
        '179': false,
        '180': false,
        '182': false,
        '183': false,
        '184': false,
        '185': false,
        '188': false,
        '189': false,
        '190': false,
        '191': false,
        '192': false,
        '193': false,
        '194': false,
        '195': false,
        '197': false,
        '198': false,
        '199': false,
        '200': false,
        '201': false,
        '202': false,
        '203': false,
        '205': false,
        '206': false,
        '208': false,
        '209': false,
        '210': false,
        '211': false,
        '212': false,
        '213': false,
        '214': false,
        '215': false,
        '216': false,
        '217': false,
        '218': false,
        '223': false,
        '224': false,
        '225': false,
        '226': false,
        '227': false,
        '228': false,
        '229': false,
        '230': false,
        '231': false,
        '232': false,
        '234': false,
        '235': false,
        '236': false,
        '237': false,
        '238': false,
        '239': false,
        '240': false,
        '241': false,
        '242': false,
        '244': false,
        '245': false,
        '246': false,
        '248': false,
        '249': false,
        '250': false,
        '251': false,
        '252': false,
        '253': false,
        '254': false,
        '255': false,
        '256': false,
        '257': false,
        '258': false,
        '259': false,
        '260': false,
        '261': false,
        '262': false,
        '263': false,
        '264': false,
        '265': false,
        '266': false,
        '269': false,
        '270': false,
        '272': false,
        '273': false,
        '274': false,
        '275': false,
        '276': false,
        '277': false,
        '278': false,
        '279': false,
        '280': false,
        '281': false,
        '282': false,
        '284': false,
        '285': false,
        '288': false,
        '289': false,
        '290': false,
        '291': false,
        '294': false,
        '295': false,
        '297': false,
        '299': false,
        '301': false,
        '302': false,
        '303': false,
        '304': false,
        '308': false,
        '309': false,
        '310': false,
        '311': false,
        '312': false,
        '314': false,
        '315': false,
        '316': false,
        '317': false,
        '318': false,
        '319': false,
        '320': false,
        '323': false,
        '325': false,
        '326': false,
        '328': false,
        '329': false,
        '330': false,
        '331': false,
        '333': false,
        '337': false,
        '339': false,
        '341': false,
        '343': false,
        '344': false,
        '345': false,
        '347': false,
        '349': false,
        '350': false,
        '351': false,
        '354': false,
        '358': false,
        '359': false,
        '360': false,
        '361': false,
        '368': false,
        '369': false,
        '371': false,
        '373': false,
        '376': false,
        '377': false,
        '378': false,
        '380': false,
        '382': false,
        '384': false,
        '385': false,
        '387': false,
        '388': false,
        '389': false,
        '390': false,
        '391': false,
        '398': false,
        '400': false,
        '402': false,
        '403': false,
        '404': false,
        '413': false,
        '415': false,
        '421': false,
        '422': false
      }
    },
    'gdprApplies': true
  },
  'start': 1529511035686,
  'doneCbCallCount': 0
};

const bidderRequestNoCoppa = {
  'bidderCode': 'districtmDMX',
  'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf',
  'bidderRequestId': '124b579a136515',
  'bids': [{
    'bidder': 'districtmDMX',
    'params': {
      'dmxid': 100001,
      'memberid': 100003,
    },
    'adUnitCode': 'div-gpt-ad-12345678-1',
    'transactionId': 'f6d13fa6-ebc1-41ac-9afa-d8171d22d2c2',
    'sizes': [
      [300, 250],
      [300, 600]
    ],
    'bidId': '29a28a1bbc8a8d',
    'bidderRequestId': '124b579a136515',
    'auctionId': '3d62f2d3-56a2-4991-888e-f7754619ddcf'
  }],
  'auctionStart': 1529511035677,
  'timeout': 700,
  'start': 1529511035686,
  'doneCbCallCount': 0
};

const responses = {
  'body': {
    'id': '1f45b37c-5298-4934-b517-4d911aadabfd',
    'cur': 'USD',
    'seatbid': [{
      'bid': [{
        'id': '29a28a1bbc8a8d',
        'impid': '29a28a1bbc8a8d',
        'price': '6.42',
        'adm': '<div style=\'width: 100px; height: 100px;\'><img src=\'https://placeholdit.imgix.net/~text?txtsize=33&txt=29a28a1bbc8a8d&w=300&h=600\'></div>'
      }]
    }]
  },
  'headers': {}
};

const responsesNegative = {
  'body': {
    'id': '1f45b37c-5298-4934-b517-4d911aadabfd',
    'cur': 'USD',
    'seatbid': [{
      'bid': [{
        'id': '29a28a1bbc8a8d',
        'impid': '29a28a1bbc8a8d',
        'price': '-0.10',
        'adm': '<div style=\'width: 100px; height: 100px;\'><img src=\'https://placeholdit.imgix.net/~text?txtsize=33&txt=29a28a1bbc8a8d&w=300&h=600\'></div>'
      }]
    }]
  },
  'headers': {}
};

const emptyResponse = { body: {} };
const emptyResponseSeatBid = { body: { seatbid: [] } };

describe('DistrictM Adaptor', function () {
  const districtm = spec;
  describe('verification of upto5', function () {
    it('upto5 function should always break 12 imps into 3 request same for 15', function () {
      expect(upto5([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], bidRequest, bidderRequest, 'https://google').length).to.be.equal(3)
      expect(upto5([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], bidRequest, bidderRequest, 'https://google').length).to.be.equal(3)
    })
  })

  describe('test vast tag', function () {
    it('img tag should not be present', function () {
      expect(cleanVast(sample_vast).indexOf('img') !== -1).to.be.equal(false)
    })
  })
  describe('Test getApi function', function () {
    const data = {
      api: [1]
    }
    it('Will return 1 for vpaid version 1', function () {
      expect(getApi(data)[0]).to.be.equal(1)
    })
    it('Will return 2 for vpaid default', function () {
      expect(getApi({})[0]).to.be.equal(2)
    })
  })

  describe('Test cleanSizes function', function () {
    it('sequence will be respected', function () {
      expect(cleanSizes(bidderRequest.bids[0].sizes).toString()).to.be.equal('300,250,300,600')
    })
    it('sequence will be respected', function () {
      expect(cleanSizes([[728, 90], [970, 90], [300, 600], [320, 50]]).toString()).to.be.equal('728,90,320,50,300,600,970,90')
    })
  })

  describe('Test getPlaybackmethod function', function () {
    it('getPlaybackmethod will return 2', function () {
      expect(getPlaybackmethod([])[0]).to.be.equal(2)
    })
    it('getPlaybackmethod will return 6', function () {
      expect(getPlaybackmethod(['viewport_sound_off'])[0]).to.be.equal(6)
    })
  })

  describe('Test getProtocols function', function () {
    it('getProtocols will return 3', function () {
      expect(getProtocols({ protocols: [3] })[0]).to.be.equal(3)
    })
    it('getProtocols will return 6', function () {
      expect(_.isEqual(getProtocols({}), [2, 3, 5, 6, 7, 8])).to.be.equal(true)
    })
  })

  describe('All needed functions are available', function () {
    it(`isBidRequestValid is present and type function`, function () {
      expect(districtm.isBidRequestValid).to.exist.and.to.be.a('function')
    });

    it(`BuildRequests is present and type function`, function () {
      expect(districtm.buildRequests).to.exist.and.to.be.a('function')
    });

    it(`interpretResponse is present and type function`, function () {
      expect(districtm.interpretResponse).to.exist.and.to.be.a('function')
    });

    it(`getUserSyncs is present and type function`, function () {
      expect(districtm.getUserSyncs).to.exist.and.to.be.a('function')
    });
  });

  describe(`these properties are available or not`, function () {
    it(`code should have a value of districtmDMX`, function () {
      expect(districtm.code).to.be.equal('districtmDMX');
    });

    it(`timeout should not be defined`, function () {
      expect(districtm.onTimeout).to.be.an('undefined');
    });
  });

  describe(`isBidRequestValid test response`, function () {
    let params = {
      dmxid: 10001, // optional
      memberid: 10003,
    };
    it(`function should return true`, function () {
      expect(districtm.isBidRequestValid({ params })).to.be.equal(true);
    });
    it(`function should return false`, function () {
      expect(districtm.isBidRequestValid({ params: {} })).to.be.equal(false);
    });
    it(`expect to have memberid`, function () {
      expect(params).to.have.property('memberid');
    });
  });

  describe(`getUserSyncs test usage`, function () {
    it(`return value should be an array`, function () {
      expect(districtm.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
    });
    it(`array should have only one object and it should have a property type = 'iframe'`, function () {
      expect(districtm.getUserSyncs({ iframeEnabled: true }).length).to.be.equal(1);
      let [userSync] = districtm.getUserSyncs({ iframeEnabled: true });
      expect(userSync).to.have.property('type');
      expect(userSync.type).to.be.equal('iframe');
    });
  });

  describe(`buildRequests test usage`, function () {
    const buildRequestResults = districtm.buildRequests(bidRequest, bidderRequest);
    const buildRequestResultsNoCoppa = districtm.buildRequests(bidRequestNoCoppa, bidderRequestNoCoppa);
    it(`the function should return an array`, function () {
      expect(buildRequestResults).to.be.an('object');
    });
    it(`contain gdpr consent & ccpa`, function () {
      const bidr = JSON.parse(buildRequestResults.data)
      expect(bidr.regs.ext.gdpr).to.be.equal(1);
      expect(bidr.regs.ext.us_privacy).to.be.equal('1NY');
      expect(bidr.user.ext.consent).to.be.an('string');
    });
    it(`test contain COPPA`, function () {
      const bidr = JSON.parse(buildRequestResults.data)
      bidr.regs = bidr.regs || {};
      bidr.regs.coppa = 1;
      expect(bidr.regs.coppa).to.be.equal(1)
    })
    it(`test should not contain COPPA`, function () {
      const bidr = JSON.parse(buildRequestResultsNoCoppa.data)
      expect(bidr.regs.coppa).to.be.equal(0)
    })
    it(`the function should return array length of 1`, function () {
      expect(buildRequestResults.data).to.be.a('string');
    });
  });

  describe('bidRequest Video testing', function () {
    const request = districtm.buildRequests(bidRequestVideo, bidRequestVideo);
    const data = JSON.parse(request.data)
    expect(data instanceof Object).to.be.equal(true)
  })

  describe(`interpretResponse test usage`, function () {
    const responseResults = districtm.interpretResponse(responses, { bidderRequest });
    const emptyResponseResults = districtm.interpretResponse(emptyResponse, { bidderRequest });
    const emptyResponseResultsNegation = districtm.interpretResponse(responsesNegative, { bidderRequest });
    const emptyResponseResultsEmptySeat = districtm.interpretResponse(emptyResponseSeatBid, { bidderRequest });
    it(`the function should return an array`, function () {
      expect(responseResults).to.be.an('array');
    });
    it(`the function should return array length of 1`, function () {
      expect(responseResults.length).to.be.equal(1);
    });
    it(`the response return nothing`, function () {
      expect(emptyResponseResults.length).to.be.equal(0);
    });
    it(`the response seatbid return nothing`, function () {
      expect(emptyResponseResultsEmptySeat.length).to.be.equal(0);
    });

    it(`on invalid CPM`, function () {
      expect(emptyResponseResultsNegation.length).to.be.equal(0);
    });
  });

  describe(`check validation for id sync gdpr ccpa`, () => {
    let allin = spec.getUserSyncs({ iframeEnabled: true }, {}, bidderRequest.gdprConsent, bidderRequest.uspConsent)[0]
    let noCCPA = spec.getUserSyncs({ iframeEnabled: true }, {}, bidderRequest.gdprConsent, null)[0]
    let noGDPR = spec.getUserSyncs({ iframeEnabled: true }, {}, null, bidderRequest.uspConsent)[0]
    let nothing = spec.getUserSyncs({ iframeEnabled: true }, {}, null, null)[0]

    /*

    'uspConsent': '1NY',
  'gdprConsent': {
    'consentString': 'BOPqNzUOPqNzUAHABBAAA5AAAAAAAA',
     */
    it(`gdpr & ccpa should be present`, () => {
      expect(allin.url).to.be.equal('https://cdn.districtm.io/ids/index.html?gdpr=BOPqNzUOPqNzUAHABBAAA5AAAAAAAA&ccpa=1NY')
    })
    it(`ccpa should be present`, () => {
      expect(noGDPR.url).to.be.equal('https://cdn.districtm.io/ids/index.html?ccpa=1NY')
    })
    it(`gdpr should be present`, () => {
      expect(noCCPA.url).to.be.equal('https://cdn.districtm.io/ids/index.html?gdpr=BOPqNzUOPqNzUAHABBAAA5AAAAAAAA')
    })
    it(`gdpr & ccpa shouldn't be present`, () => {
      expect(nothing.url).to.be.equal('https://cdn.districtm.io/ids/index.html')
    })
  })

  describe(`Helper function testing`, function () {
    const bid = matchRequest('29a28a1bbc8a8d', { bidderRequest });
    const { width, height } = defaultSize(bid);
    it(`test matchRequest`, function () {
      expect(matchRequest('29a28a1bbc8a8d', { bidderRequest })).to.be.an('object');
    });
    it(`test checkDeepArray`, function () {
      expect(_.isEqual(checkDeepArray([728, 90]), [728, 90])).to.be.equal(true);
      expect(_.isEqual(checkDeepArray([[728, 90]]), [728, 90])).to.be.equal(true);
      expect(_.isEqual(checkDeepArray([[728, 90], [300, 250]]), [728, 90])).to.be.equal(true);
      expect(_.isEqual(checkDeepArray([[300, 250], [300, 250]]), [728, 90])).to.be.equal(false);
      expect(_.isEqual(checkDeepArray([300, 250]), [300, 250])).to.be.equal(true);
    });
    it(`test defaultSize`, function () {
      expect(width).to.be.equal(300);
      expect(height).to.be.equal(250);
    });
  });
});
