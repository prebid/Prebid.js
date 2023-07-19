import {
  getTopics,
  getTopicsData,
  processFpd,
  hasGDPRConsent,
  getCachedTopics,
  receiveMessage,
  topicStorageName
} from '../../../modules/topicsFpdModule.js';
import {deepClone, safeJSONParse} from '../../../src/utils.js';
import {gdprDataHandler} from 'src/adapterManager.js';
import {getCoreStorageManager} from 'src/storageManager.js';

describe('getTopicsData', () => {
  function makeTopic(topic, modelv, taxv = '1') {
    return {
      topic,
      taxonomyVersion: taxv,
      modelVersion: modelv
    };
  }

  function byTaxClass(segments) {
    return segments.reduce((memo, segment) => {
      memo[`${segment.ext.segtax}:${segment.ext.segclass}`] = segment;
      return memo;
    }, {});
  }

  [
    {
      t: 'no topics',
      topics: [],
      expected: []
    },
    {
      t: 'single topic',
      topics: [makeTopic(123, 'm1')],
      expected: [
        {
          ext: {
            segtax: 600,
            segclass: 'm1'
          },
          segment: [
            {id: '123'}
          ]
        }
      ]
    },
    {
      t: 'multiple topics with the same model version',
      topics: [makeTopic(123, 'm1'), makeTopic(321, 'm1')],
      expected: [
        {
          ext: {
            segtax: 600,
            segclass: 'm1'
          },
          segment: [
            {id: '123'},
            {id: '321'}
          ]
        }
      ]
    },
    {
      t: 'multiple topics with different model versions',
      topics: [makeTopic(1, 'm1'), makeTopic(2, 'm1'), makeTopic(3, 'm2')],
      expected: [
        {
          ext: {
            segtax: 600,
            segclass: 'm1'
          },
          segment: [
            {id: '1'},
            {id: '2'}
          ]
        },
        {
          ext: {
            segtax: 600,
            segclass: 'm2'
          },
          segment: [
            {id: '3'}
          ]
        }
      ]
    },
    {
      t: 'multiple topics, some with a taxonomy version other than "1"',
      topics: [makeTopic(123, 'm1'), makeTopic(321, 'm1', 'other')],
      expected: [
        {
          ext: {
            segtax: 600,
            segclass: 'm1'
          },
          segment: [
            {id: '123'}
          ]
        }
      ]
    },
    {
      t: 'multiple topics in multiple taxonomies',
      taxonomies: {
        '1': 600,
        '2': 601
      },
      topics: [
        makeTopic(123, 'm1', '1'),
        makeTopic(321, 'm1', '2'),
        makeTopic(213, 'm2', '1'),
      ],
      expected: [
        {
          ext: {
            segtax: 600,
            segclass: 'm1'
          },
          segment: [
            {id: '123'}
          ]
        },
        {
          ext: {
            segtax: 601,
            segclass: 'm1',
          },
          segment: [
            {id: '321'}
          ]
        },
        {
          ext: {
            segtax: 600,
            segclass: 'm2'
          },
          segment: [
            {id: '213'}
          ]
        }
      ]
    }
  ].forEach(({t, topics, expected, taxonomies}) => {
    describe(`on ${t}`, () => {
      it('should convert topics to user.data segments correctly', () => {
        const actual = getTopicsData('mockName', topics, taxonomies);
        expect(actual.length).to.eql(expected.length);
        expected = byTaxClass(expected);
        Object.entries(byTaxClass(actual)).forEach(([key, datum]) => {
          sinon.assert.match(datum, expected[key]);
          expect(datum.name).to.equal('mockName');
        });
      });

      it('should not set name if null', () => {
        getTopicsData(null, topics).forEach((data) => {
          expect(data.hasOwnProperty('name')).to.be.false;
        });
      });
    });
  });
});

describe('getTopics', () => {
  Object.entries({
    'document with no browsingTopics': {},
    'document that disallows topics': {
      featurePolicy: {
        allowsFeature: sinon.stub().returns(false)
      }
    },
    'document that throws on featurePolicy': {
      browsingTopics: sinon.stub(),
      get featurePolicy() {
        throw new Error();
      }
    },
    'document that throws on browsingTopics': {
      browsingTopics: sinon.stub().callsFake(() => {
        throw new Error();
      }),
      featurePolicy: {
        allowsFeature: sinon.stub().returns(true)
      }
    },
  }).forEach(([t, doc]) => {
    it(`should resolve to an empty list on ${t}`, () => {
      return getTopics(doc).then((topics) => {
        expect(topics).to.eql([]);
      });
    });
  });

  it('should call `document.browsingTopics` when allowed', () => {
    const topics = ['t1', 't2'];
    return getTopics({
      browsingTopics: sinon.stub().returns(Promise.resolve(topics)),
      featurePolicy: {
        allowsFeature: sinon.stub().returns(true)
      }
    }).then((actual) => {
      expect(actual).to.eql(topics);
    });
  });
});

describe('processFpd', () => {
  const mockData = [
    {
      name: 'domain',
      segment: [{id: 123}]
    },
    {
      name: 'domain',
      segment: [{id: 321}]
    }
  ];

  it('should add topics data', () => {
    return processFpd({}, {global: {}}, {data: Promise.resolve(mockData)})
      .then(({global}) => {
        expect(global.user.data).to.eql(mockData);
      });
  });

  it('should apppend to existing user.data', () => {
    const global = {
      user: {
        data: [
          {name: 'preexisting'},
        ]
      }
    };
    return processFpd({}, {global: deepClone(global)}, {data: Promise.resolve(mockData)})
      .then((data) => {
        expect(data.global.user.data).to.eql(global.user.data.concat(mockData));
      });
  });

  it('should not modify fpd when there is no data', () => {
    return processFpd({}, {global: {}}, {data: Promise.resolve([])})
      .then((data) => {
        expect(data.global).to.eql({});
      });
  });
});

describe('Topics Module GDPR consent check', () => {
  let gdprDataHdlrStub;
  beforeEach(() => {
    gdprDataHdlrStub = sinon.stub(gdprDataHandler, 'getConsentData');
  });

  afterEach(() => {
    gdprDataHdlrStub.restore();
  });

  it('should return false when GDPR is applied but consent string is not present', () => {
    const consentString = '';
    const consentConfig = {
      consentString: consentString,
      gdprApplies: true,
      vendorData: {}
    };
    gdprDataHdlrStub.returns(consentConfig);
    expect(hasGDPRConsent()).to.equal(false);
  });

  it('should return true when GDPR doesn\'t apply', () => {
    const consentString = 'CPi8wgAPi8wgAADABBENCrCsAP_AAH_AAAAAISNB7D==';
    const consentConfig = {
      consentString: consentString,
      gdprApplies: false,
      vendorData: {}
    };

    gdprDataHdlrStub.returns(consentConfig);
    expect(hasGDPRConsent()).to.equal(true);
  });

  it('should return true when GDPR is applied and purpose consent is true for all purpose[1,2,3,4]', () => {
    const consentString = 'CPi8wgAPi8wgAADABBENCrCsAP_AAH_AAAAAISNB7D==';
    const consentConfig = {
      consentString: consentString,
      gdprApplies: true,
      vendorData: {
        metadata: consentString,
        gdprApplies: true,
        purpose: {
          consents: {
            1: true,
            2: true,
            3: true,
            4: true
          }
        }
      }
    };

    gdprDataHdlrStub.returns(consentConfig);
    expect(hasGDPRConsent()).to.equal(true);
  });

  it('should return false when GDPR is applied and purpose consent is false for one of the purpose[1,2,3,4]', () => {
    const consentString = 'CPi8wgAPi8wgAADABBENCrCsAP_AAH_AAAAAISNB7D==';
    const consentConfig = {
      consentString: consentString,
      gdprApplies: true,
      vendorData: {
        metadata: consentString,
        gdprApplies: true,
        purpose: {
          consents: {
            1: true,
            2: true,
            3: true,
            4: false
          }
        }
      }
    };

    gdprDataHdlrStub.returns(consentConfig);
    expect(hasGDPRConsent()).to.equal(false);
  });
});

describe('getCachedTopics()', () => {
  const storage = getCoreStorageManager('topicsFpd');
  const expected = [{
    ext: {
      segtax: 600,
      segclass: '2206021246'
    },
    segment: [{
      'id': '243'
    }, {
      'id': '265'
    }],
    name: 'ads.pubmatic.com'
  }];
  const consentString = 'CPi8wgAPi8wgAADABBENCrCsAP_AAH_AAAAAISNB7D==';
  const consentConfig = {
    consentString: consentString,
    gdprApplies: true,
    vendorData: {
      metadata: consentString,
      gdprApplies: true,
      purpose: {
        consents: {
          1: true,
          2: true,
          3: true,
          4: true
        }
      }
    }
  };
  const mockData = [
    {
      name: 'domain',
      segment: [{id: 123}]
    },
    {
      name: 'domain',
      segment: [{id: 321}],
    }
  ];

  const evt_pm = {
    data: '{"segment":{"domain":"ads.pubmatic.com","topics":[{"configVersion":"chrome.1","modelVersion":"2206021246","taxonomyVersion":"1","topic":165,"version":"chrome.1:1:2206021246"}],"bidder":"pubmatic"},"date":1669743901858}',
    origin: 'https://ads.pubmatic.com'
  };

  const evt_rh = {
    data: '{"segment":{"domain":"topics.authorizedvault.com","topics":[{"configVersion":"chrome.1","modelVersion":"2206021246","taxonomyVersion":"1","topic":165,"version":"chrome.1:1:2206021246"}],"bidder":"rtbhouse"},"date":1669743901858}',
    origin: 'https://topics.authorizedvault.com'
  };

  let gdprDataHdlrStub;
  beforeEach(() => {
    gdprDataHdlrStub = sinon.stub(gdprDataHandler, 'getConsentData');
  });

  afterEach(() => {
    storage.removeDataFromLocalStorage(topicStorageName);
    gdprDataHdlrStub.restore();
  });

  it('should return segments for bidder if GDPR consent is true and there is cached segments stored which is not expired', () => {
    const storedSegments = JSON.stringify(
      [['pubmatic', {
        '2206021246': {
          'ext': {'segtax': 600, 'segclass': '2206021246'},
          'segment': [{'id': '243'}, {'id': '265'}],
          'name': 'ads.pubmatic.com'
        },
        'lastUpdated': new Date().getTime()
      }]]
    );
    storage.setDataInLocalStorage(topicStorageName, storedSegments);
    gdprDataHdlrStub.returns(consentConfig);
    assert.deepEqual(getCachedTopics(), expected);
  });

  it('should return empty segments for bidder if GDPR consent is true and there is cached segments stored which is expired', () => {
    let storedSegments = '[["pubmatic",{"2206021246":{"ext":{"segtax":600,"segclass":"2206021246"},"segment":[{"id":"243"},{"id":"265"}],"name":"ads.pubmatic.com"},"lastUpdated":10}]]';
    storage.setDataInLocalStorage(topicStorageName, storedSegments);
    gdprDataHdlrStub.returns(consentConfig);
    assert.deepEqual(getCachedTopics(), []);
  });

  it('should stored segments if receiveMessage event is triggerred with segment data', () => {
    return processFpd({}, {global: {}}, {data: Promise.resolve(mockData)})
      .then(({global}) => {
        receiveMessage(evt_pm);
        receiveMessage(evt_rh);
        let segments = new Map(safeJSONParse(storage.getDataFromLocalStorage(topicStorageName)));
        expect(segments.has('pubmatic') || segments.has('rtbhouse')).to.equal(true);
      });
  });

  it('should update stored segments if receiveMessage event is triggerred with segment data', () => {
    let storedSegments = '[["pubmatic",{"2206021246":{"ext":{"segtax":600,"segclass":"2206021246"},"segment":[{"id":"243"},{"id":"265"}],"name":"ads.pubmatic.com"},"lastUpdated":1669719242027}]]';
    storage.setDataInLocalStorage(topicStorageName, storedSegments);
    return processFpd({}, {global: {}}, {data: Promise.resolve(mockData)})
      .then(({global}) => {
        receiveMessage(evt_pm);
        let segments = new Map(safeJSONParse(storage.getDataFromLocalStorage(topicStorageName)));
        expect(segments.get('pubmatic')[2206021246].segment.length).to.equal(1);
      });
  });
});
