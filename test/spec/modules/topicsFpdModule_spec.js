import {getTopics, getTopicsData, processFpd, TOPICS_TAXONOMY} from '../../../modules/topicsFpdModule.js';
import {deepClone} from '../../../src/utils.js';

describe('getTopicsData', () => {
  function makeTopic(topic, taxv) {
    return {
      topic,
      taxonomyVersion: taxv
    }
  }

  [
    {
      t: 'no topics',
      topics: [],
      expected: []
    },
    {
      t: 'single topic',
      topics: [makeTopic(123, 'v1')],
      expected: [
        {
          ext: {
            segclass: 'v1'
          },
          segment: [
            {id: '123'}
          ]
        }
      ]
    },
    {
      t: 'multiple topics with the same taxonomy version',
      topics: [makeTopic(123, 'v1'), makeTopic(321, 'v1')],
      expected: [
        {
          ext: {
            segclass: 'v1'
          },
          segment: [
            {id: '123'},
            {id: '321'}
          ]
        }
      ]
    },
    {
      t: 'multiple topics with different taxonomy versions',
      topics: [makeTopic(1, 'v1'), makeTopic(2, 'v1'), makeTopic(3, 'v2')],
      expected: [
        {
          ext: {
            segclass: 'v1'
          },
          segment: [
            {id: '1'},
            {id: '2'}
          ]
        },
        {
          ext: {
            segclass: 'v2'
          },
          segment: [
            {id: '3'}
          ]
        }
      ]
    }
  ].forEach(({t, topics, expected}) => {
    it(`on ${t}`, () => {
      const actual = getTopicsData('mockName', topics);
      expect(actual.length).to.eql(expected.length);
      actual.forEach((data, i) => {
        sinon.assert.match(data, expected[i]);
        expect(data.name).to.equal('mockName');
        expect(data.ext.segtax).to.eql(TOPICS_TAXONOMY);
      })
    });

    it('should not set name if null', () => {
      getTopicsData(null, topics).forEach((data) => {
        expect(data.hasOwnProperty('name')).to.be.false;
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
