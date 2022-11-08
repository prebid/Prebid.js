import {getTopics, getTopicsData, processFpd} from '../../../modules/topicsFpdModule.js';
import {deepClone} from '../../../src/utils.js';

describe('getTopicsData', () => {
  function makeTopic(topic, modelv, taxv = '1') {
    return {
      topic,
      taxonomyVersion: taxv,
      modelVersion: modelv
    }
  }

  function byTaxClass(segments) {
    return segments.reduce((memo, segment) => {
      memo[`${segment.ext.segtax}:${segment.ext.segclass}`] = segment;
      return memo;
    }, {})
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
        })
      });

      it('should not set name if null', () => {
        getTopicsData(null, topics).forEach((data) => {
          expect(data.hasOwnProperty('name')).to.be.false;
        })
      })
    })
  })
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
        throw new Error()
      }
    },
    'document that throws on browsingTopics': {
      browsingTopics: sinon.stub().callsFake(() => { throw new Error(); }),
      featurePolicy: {
        allowsFeature: sinon.stub().returns(true)
      }
    },
  }).forEach(([t, doc]) => {
    it(`should resolve to an empty list on ${t}`, () => {
      return getTopics(doc).then((topics) => {
        expect(topics).to.eql([]);
      });
    })
  });

  it('should call `document.browsingTopics` when allowed', () => {
    const topics = ['t1', 't2']
    return getTopics({
      browsingTopics: sinon.stub().returns(Promise.resolve(topics)),
      featurePolicy: {
        allowsFeature: sinon.stub().returns(true)
      }
    }).then((actual) => {
      expect(actual).to.eql(topics);
    })
  })
})

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
