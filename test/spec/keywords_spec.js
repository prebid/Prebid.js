import {getAllOrtbKeywords, mergeKeywords} from '../../libraries/keywords/keywords.js';

describe('mergeKeywords', () => {
  Object.entries({
    'single list': {
      input: [
        'one, two'
      ],
      output: [
        'one',
        'two'
      ]
    },
    'multiple lists': {
      input: [
        'one, two',
        'two, three'
      ],
      output: [
        'one',
        'two',
        'three'
      ]
    },
    'null lists': {
      input: [
        undefined,
        'one, two',
        null,
        'three'
      ],
      output: [
        'one',
        'two',
        'three'
      ]
    },
    'empty keywords': {
      input: [
        'one,,two'
      ],
      output: [
        'one',
        'two'
      ]
    },
    'extra whitespace': {
      input: [
        ' one,  two  ,   three  '
      ],
      output: [
        'one',
        'two',
        'three'
      ]
    },
    'mixed with arrays': {
      input: [
        ['one'],
        'one, two',
        ['three', 'two']
      ],
      output: [
        'one',
        'two',
        'three'
      ]
    }
  }).forEach(([t, {input, output}]) => {
    it(`can merge ${t}`, () => {
      expect(mergeKeywords(...input)).to.have.members(output);
    })
  })
});

describe('getAllOrtbKeywodrs', () => {
  const SAMPLE_ORTB = {
    app: {
      keywords: 'one, two'
    },
    site: {
      content: {
        keywords: 'one, three'
      }
    },
    user: {
      keywords: 'four'
    }
  }

  it('can extract keywords from ortb', () => {
    expect(getAllOrtbKeywords(SAMPLE_ORTB)).to.have.members([
      'one', 'two', 'three', 'four'
    ]);
  });

  it('merges with extra comma-separated keywords', () => {
    expect(getAllOrtbKeywords(SAMPLE_ORTB, 'two,five')).to.have.members([
      'one', 'two', 'three', 'four', 'five'
    ])
  })
})
