import {DEFAULT_SID_MAPPING, getSections, NORMALIZATIONS, normalizer} from '../../../modules/gppControl_usstates.js';

describe('normalizer', () => {
  it('sets nullify fields to null', () => {
    const res = normalizer({
      nullify: [
        'field',
        'arr.1'
      ]
    }, {
      untouched: 0,
      field: 0,
      arr: 3
    })({
      untouched: 1,
      field: 2,
      arr: ['a', 'b', 'c']
    });
    sinon.assert.match(res, {
      untouched: 1,
      field: null,
      arr: ['a', null, 'c']
    });
  });
  it('initializes scalar fields to null', () => {
    const res = normalizer({}, {untouched: 0, f1: 0, f2: 0})({untouched: 0});
    expect(res).to.eql({
      untouched: 0,
      f1: null,
      f2: null,
    })
  })
  it('initializes list fields to null-array with correct size', () => {
    const res = normalizer({}, {'l1': 2, 'l2': 3})({});
    expect(res).to.eql({
      l1: [null, null],
      l2: [null, null, null]
    });
  });
  Object.entries({
    'arrays of the same size': [
      [1, 2],
      [1, 2]
    ],
    'arrays of the same size, with moves': [
      [1, 2, 3],
      [1, 3, 2],
      {2: 3, 3: 2}
    ],
    'original larger than normal': [
      [1, 2, 3],
      [1, 2]
    ],
    'original larger than normal, with moves': [
      [1, 2, 3],
      [null, 1],
      {1: 2}
    ],
    'normal larger than original': [
      [1, 2],
      [1, 2, null]
    ],
    'normal larger than original, with moves': [
      [1, 2],
      [2, null, 2],
      {2: [1, 3]}
    ],
    'original is scalar': [
      'value',
      [null, null]
    ],
    'normalized is scalar': [
      [0, 1],
      null
    ]
  }).forEach(([t, [from, to, move]]) => {
    it(`carries over values for list fields - ${t}`, () => {
      const res = normalizer({move: {field: move || {}}}, {field: Array.isArray(to) ? to.length : 0})({field: from});
      expect(res.field).to.eql(to);
    });
  });

  it('runs fn as a final step', () => {
    const fn = sinon.stub().callsFake((orig, normalized) => {
      normalized.fn = true;
    });
    const orig = {
      untouched: 0,
      nulled: 1,
      multi: ['a', 'b', 'c']
    };
    const res = normalizer({
      nullify: ['nulled'],
      move: {
        multi: {1: 2}
      },
      fn
    }, {nulled: 0, untouched: 0, multi: 2})(orig);
    const transformed = {
      nulled: null,
      untouched: 0,
      multi: [null, 'a']
    };
    sinon.assert.calledWith(fn, orig, sinon.match(transformed));
    expect(res).to.eql(Object.assign({fn: true}, transformed));
  });
});

describe('state normalizations', () => {
  Object.entries({
    'California/8': [
      8,
      {
        Version: 'version',
        SaleOptOutNotice: 'saleOON',
        SharingOptOutNotice: 'sharingOON',
        SensitiveDataLimitUseNotice: 'sensDLUN',
        SaleOptOut: 'saleOO',
        SharingOptOut: 'sharingOO',
        PersonalDataConsents: 'PDC',
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        Gpc: 'gpc',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
        ],
        KnownChildSensitiveDataConsents: [
          1,
          0
        ],
      },
      {
        Version: 'version',
        SaleOptOutNotice: 'saleOON',
        SharingOptOutNotice: 'sharingOON',
        SensitiveDataLimitUseNotice: 'sensDLUN',
        SaleOptOut: 'saleOO',
        SharingOptOut: 'sharingOO',
        Gpc: 'gpc',
        PersonalDataConsents: 'PDC',
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        SharingNotice: null,
        TargetedAdvertisingOptOutNotice: null,
        SensitiveDataProcessingOptOutNotice: null,
        TargetedAdvertisingOptOut: null,
        SensitiveDataProcessing: [
          4,
          4,
          8,
          9,
          null,
          6,
          7,
          3,
          1,
          2,
          null,
          5
        ],
        KnownChildSensitiveDataConsents: [1, 1],
      }
    ],
    'Virginia/9': [
      9,
      {
        Version: 'version',
        SharingNotice: 'sharingN',
        SaleOptOutNotice: 'saleOON',
        SaleOptOut: 'saleOO',
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
        ],
        KnownChildSensitiveDataConsents: 2,
      },
      {
        Version: 'version',
        SaleOptOutNotice: 'saleOON',
        SharingOptOutNotice: null,
        SensitiveDataLimitUseNotice: null,
        SensitiveDataProcessingOptOutNotice: null,
        SaleOptOut: 'saleOO',
        SharingOptOut: null,
        PersonalDataConsents: null,
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        Gpc: null,
        SharingNotice: 'sharingN',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          null,
          null,
          null,
          null,
        ],
        KnownChildSensitiveDataConsents: [1, 1],
      }
    ],
    'Colorado/10': [
      10,
      {
        Gpc: 'gpc',
        Version: 'version',
        SharingNotice: 'sharingN',
        SaleOptOutNotice: 'saleOON',
        SaleOptOut: 'saleOO',
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
        ],
        KnownChildSensitiveDataConsents: 2,
      },
      {
        Version: 'version',
        SaleOptOutNotice: 'saleOON',
        SharingOptOutNotice: null,
        SensitiveDataLimitUseNotice: null,
        SensitiveDataProcessingOptOutNotice: null,
        SaleOptOut: 'saleOO',
        SharingOptOut: null,
        PersonalDataConsents: null,
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        Gpc: 'gpc',
        SharingNotice: 'sharingN',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          null,
          null,
          null,
          null,
          null,
        ],
        KnownChildSensitiveDataConsents: [1, 1],
      }
    ],
    'Utah/11': [
      11,
      {
        Version: 'version',
        SharingNotice: 'sharingN',
        SaleOptOutNotice: 'saleOON',
        SaleOptOut: 'saleOO',
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SensitiveDataProcessingOptOutNotice: 'SDPOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
        ],
        KnownChildSensitiveDataConsents: 1,
      },
      {
        Gpc: null,
        Version: 'version',
        SharingNotice: 'sharingN',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SaleOptOut: 'saleOO',
        SaleOptOutNotice: 'saleOON',
        SensitiveDataProcessing: [
          1,
          2,
          5,
          3,
          4,
          6,
          7,
          8,
          null,
          null,
          null,
          null,
        ],
        KnownChildSensitiveDataConsents: [1, 1],
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        SharingOptOutNotice: null,
        SharingOptOut: null,
        SensitiveDataLimitUseNotice: null,
        SensitiveDataProcessingOptOutNotice: 'SDPOON',
        PersonalDataConsents: null,
      }
    ],
    'Connecticut/12': [
      12,
      {
        Gpc: 'gpc',
        Version: 'version',
        SharingNotice: 'sharingN',
        SaleOptOutNotice: 'saleOON',
        SaleOptOut: 'saleOO',
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
        ],
        KnownChildSensitiveDataConsents: [0, 0, 0],
      },
      {
        Gpc: 'gpc',
        Version: 'version',
        SharingNotice: 'sharingN',
        TargetedAdvertisingOptOut: 'TAOO',
        TargetedAdvertisingOptOutNotice: 'TAOON',
        SaleOptOut: 'saleOO',
        SaleOptOutNotice: 'saleOON',
        SensitiveDataProcessing: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          null,
          null,
          null,
          null,
        ],
        KnownChildSensitiveDataConsents: [0, 0],
        MspaCoveredTransaction: 'MCT',
        MspaOptOutOptionMode: 'MOOOM',
        MspaServiceProviderMode: 'MSPM',
        SharingOptOutNotice: null,
        SharingOptOut: null,
        SensitiveDataLimitUseNotice: null,
        SensitiveDataProcessingOptOutNotice: null,
        PersonalDataConsents: null,
      }
    ]
  }).forEach(([t, [sid, original, normalized]]) => {
    it(t, () => {
      expect(NORMALIZATIONS[sid](original)).to.eql(normalized);
    })
  });

  describe('child consent', () => {
    function checkChildConsent(sid, orig, normalized) {
      expect(NORMALIZATIONS[sid]({
        KnownChildSensitiveDataConsents: orig
      }).KnownChildSensitiveDataConsents).to.eql(normalized)
    }

    describe('states with single flag', () => {
      Object.entries({
        'Virginia/9': 9,
        'Colorado/10': 10,
        'Utah/11': 11,
      }).forEach(([t, sid]) => {
        describe(t, () => {
          Object.entries({
            0: [0, 0],
            1: [1, 1],
            2: [1, 1]
          }).forEach(([orig, normalized]) => {
            orig = Number(orig);
            it(`translates ${orig} to ${normalized}`, () => {
              checkChildConsent(sid, orig, normalized);
            })
          })
        })
      });
    })

    Object.entries({
      'CA/8, consent not known': [
        8,
        [0, 0],
        [0, 0]
      ],
      'CA/8, first flag applies': [
        8,
        [1, 0],
        [1, 1]
      ],
      'CA/8, second flag applies': [
        8,
        [0, 2],
        [1, 1]
      ],
      'CT/12, consent not known': [
        12,
        [0, 0, 0],
        [0, 0]
      ],
      'CT/12, teenager consent': [
        12,
        [1, 2, 2],
        [2, 1]
      ],
      'CT/12, no consent': [
        12,
        [0, 1, 2],
        [1, 1]
      ]
    }).forEach(([t, [sid, orig, normalized]]) => {
      it(t, () => {
        checkChildConsent(sid, orig, normalized);
      })
    })
  })
});

describe('getSections', () => {
  it('returns default values for all sections', () => {
    const expected = Object.entries(DEFAULT_SID_MAPPING).map(([sid, api]) => [
      api,
      [Number(sid)],
      NORMALIZATIONS[sid]
    ]);
    expect(getSections()).to.eql(expected);
  });

  it('filters by sid', () => {
    expect(getSections({sids: [8]})).to.eql([
      ['usca', [8], NORMALIZATIONS[8]]
    ]);
  });

  it('can override api name', () => {
    expect(getSections({
      sids: [8],
      sections: {
        8: {
          name: 'uspv1ca'
        }
      }
    })).to.eql([
      ['uspv1ca', [8], NORMALIZATIONS[8]]
    ])
  });

  it('can override normalization', () => {
    expect(getSections({
      sids: [8, 9],
      sections: {
        8: {
          normalizeAs: 9
        }
      }
    })).to.eql([
      ['usca', [8], NORMALIZATIONS[9]],
      ['usva', [9], NORMALIZATIONS[9]]
    ])
  });
})
