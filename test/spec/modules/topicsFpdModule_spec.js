import {
  getCachedTopics,
  getTopics,
  getTopicsData,
  loadTopicsForBidders,
  processFpd,
  receiveMessage,
  reset,
  topicStorageName
} from '../../../modules/topicsFpdModule.js';
import {config} from 'src/config.js';
import {deepClone, safeJSONParse} from '../../../src/utils.js';
import {getCoreStorageManager} from 'src/storageManager.js';
import * as activities from '../../../src/activities/rules.js';
import {registerActivityControl} from '../../../src/activities/rules.js';
import {ACTIVITY_ENRICH_UFPD} from '../../../src/activities/activities.js';

describe('topics', () => {
  let unregister, enrichUfpdRule;
  before(() => {
    unregister = registerActivityControl(ACTIVITY_ENRICH_UFPD, 'test', (params) => enrichUfpdRule(params), 0)
  });
  after(() => {
    unregister()
  });

  beforeEach(() => {
    enrichUfpdRule = () => ({allow: true});
    reset();
  });

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

  describe('loadTopicsForBidders', () => {
    beforeEach(() => {
      config.setConfig({
        userSync: {
          topics: {
            bidders: [{
              bidder: 'mockBidder',
              iframeURL: 'https://mock.iframe'
            }]
          }
        }
      })
    });
    afterEach(() => {
      config.resetConfig();
    })

    Object.entries({
      'support': {},
      'allow': {
        browsingTopics: true,
        featurePolicy: {
          allowsFeature(feature) {
            return feature !== 'browsing-topics';
          }
        }
      },
    }).forEach(([t, doc]) => {
      it(`does not attempt to load frames if browser does not ${t} topics`, () => {
        doc.createElement = sinon.stub();
        loadTopicsForBidders(doc);
        sinon.assert.notCalled(doc.createElement);
      });
    });

    it('does not load frames when accessDevice is not allowed', () => {
      enrichUfpdRule = ({component}) => {
        if (component === 'bidder.mockBidder') {
          return {allow: false}
        }
      }
      const doc = {
        createElement: sinon.stub(),
        browsingTopics: true,
        featurePolicy: {
          allowsFeature: () => true
        }
      }
      doc.createElement = sinon.stub();
      loadTopicsForBidders(doc);
      sinon.assert.notCalled(doc.createElement);
    })
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

    const evt = {
      data: '{"segment":{"domain":"ads.pubmatic.com","topics":[{"configVersion":"chrome.1","modelVersion":"2206021246","taxonomyVersion":"1","topic":165,"version":"chrome.1:1:2206021246"}],"bidder":"pubmatic"},"date":1669743901858}',
      origin: 'https://ads.pubmatic.com'
    };

    afterEach(() => {
      storage.removeDataFromLocalStorage(topicStorageName);
    });

    describe('caching', () => {
      let sandbox;
      beforeEach(() => {
        sandbox = sinon.createSandbox();
      })

      afterEach(() => {
        sandbox.restore();
        config.resetConfig();
      });

      it('should return no segments when not configured', () => {
        config.setConfig({userSync: {}});
        expect(getCachedTopics()).to.eql([]);
      })

      describe('when cached data is available and not expired', () => {
        beforeEach(() => {
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
          config.setConfig({
            userSync: {
              topics: {
                maxTopicCaller: 4,
                bidders: [{
                  bidder: 'pubmatic',
                  iframeURL: 'https://ads.pubmatic.com/AdServer/js/topics/topics_frame.html'
                }]
              }
            }
          })
        });

        it('should return segments for bidder if transmitUfpd is allowed', () => {
          assert.deepEqual(getCachedTopics(), expected);
        });

        it('should NOT return segments for bidder if enrichUfpd is NOT allowed', () => {
          enrichUfpdRule = (params) => ({allow: params.component !== 'bidder.pubmatic'})
          expect(getCachedTopics()).to.eql([]);
        });
      });
    });

    it('should return empty segments for bidder if there is cached segments stored which is expired', () => {
      const storedSegments = '[["pubmatic",{"2206021246":{"ext":{"segtax":600,"segclass":"2206021246"},"segment":[{"id":"243"},{"id":"265"}],"name":"ads.pubmatic.com"},"lastUpdated":10}]]';
      storage.setDataInLocalStorage(topicStorageName, storedSegments);
      assert.deepEqual(getCachedTopics(), []);
    });

    describe('cross-frame messages', () => {
      before(() => {
        config.setConfig({
          userSync: {
            topics: {
              maxTopicCaller: 3,
              bidders: [
                {
                  bidder: 'pubmatic',
                  iframeURL: 'https://ads.pubmatic.com/AdServer/js/topics/topics_frame.html'
                }
              ],
            },
          }
        });
      });

      beforeEach(() => {
        // init iframe logic so  that the receiveMessage origin check passes
        loadTopicsForBidders({
          browsingTopics: true,
          featurePolicy: {
            allowsFeature() { return true }
          },
          createElement: sinon.stub().callsFake(() => ({style: {}})),
          documentElement: {
            appendChild() {}
          }
        });
      });

      after(() => {
        config.resetConfig();
      })

      it('should store segments if receiveMessage event is triggered with segment data', () => {
        receiveMessage(evt);
        const segments = new Map(safeJSONParse(storage.getDataFromLocalStorage(topicStorageName)));
        expect(segments.has('pubmatic')).to.equal(true);
      });

      it('should update stored segments if receiveMessage event is triggerred with segment data', () => {
        const storedSegments = '[["pubmatic",{"2206021246":{"ext":{"segtax":600,"segclass":"2206021246"},"segment":[{"id":"243"},{"id":"265"}],"name":"ads.pubmatic.com"},"lastUpdated":1669719242027}]]';
        storage.setDataInLocalStorage(topicStorageName, storedSegments);
        receiveMessage(evt);
        const segments = new Map(safeJSONParse(storage.getDataFromLocalStorage(topicStorageName)));
        expect(segments.get('pubmatic')[2206021246].segment.length).to.equal(1);
      });
    });
  });
  describe('handles fetch request for topics api headers', () => {
    let stubbedFetch;
    const storage = getCoreStorageManager('topicsFpd');

    beforeEach(() => {
      stubbedFetch = sinon.stub(window, 'fetch');
      reset();
    });

    afterEach(() => {
      stubbedFetch.restore();
      storage.removeDataFromLocalStorage(topicStorageName);
      config.resetConfig();
    });

    it('should make a fetch call when a fetchUrl is present for a selected bidder', () => {
      config.setConfig({
        userSync: {
          topics: {
            maxTopicCaller: 3,
            bidders: [
              {
                bidder: 'pubmatic',
                fetchUrl: 'http://localhost:3000/topics-server.js'
              }
            ],
          },
        }
      });

      stubbedFetch.returns(Promise.resolve(true));

      loadTopicsForBidders({
        browsingTopics: true,
        featurePolicy: {
          allowsFeature() { return true }
        }
      });
      sinon.assert.calledOnce(stubbedFetch);
      stubbedFetch.calledWith('http://localhost:3000/topics-server.js');
    });

    it('should not make a fetch call when a fetchUrl is not present for a selected bidder', () => {
      config.setConfig({
        userSync: {
          topics: {
            maxTopicCaller: 3,
            bidders: [
              {
                bidder: 'pubmatic'
              }
            ],
          },
        }
      });

      loadTopicsForBidders({
        browsingTopics: true,
        featurePolicy: {
          allowsFeature() { return true }
        }
      });
      sinon.assert.notCalled(stubbedFetch);
    });

    it('a fetch request should not be made if the configured fetch rate duration has not yet passed', () => {
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

      config.setConfig({
        userSync: {
          topics: {
            maxTopicCaller: 3,
            bidders: [
              {
                bidder: 'pubmatic',
                fetchUrl: 'http://localhost:3000/topics-server.js',
                fetchRate: 1 // in days.  1 fetch per day
              }
            ],
          },
        }
      });

      loadTopicsForBidders({
        browsingTopics: true,
        featurePolicy: {
          allowsFeature() { return true }
        }
      });
      sinon.assert.notCalled(stubbedFetch);
    });
  });
});
