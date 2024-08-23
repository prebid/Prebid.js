import {createEidsArray} from 'modules/userId/eids.js';

describe('eids array generation for known sub-modules', function () {
  it('pubProvidedId', function () {
    const userId = {
      pubProvidedId: [{
        source: 'example.com',
        uids: [{
          id: 'value read from cookie or local storage',
          ext: {
            stype: 'ppuid'
          }
        }]
      }, {
        source: 'id-partner.com',
        uids: [{
          id: 'value read from cookie or local storage'
        }]
      }]
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(2);
    expect(newEids[0]).to.deep.equal({
      source: 'example.com',
      uids: [{
        id: 'value read from cookie or local storage',
        ext: {
          stype: 'ppuid'
        }
      }]
    });
    expect(newEids[1]).to.deep.equal({
      source: 'id-partner.com',
      uids: [{
        id: 'value read from cookie or local storage'
      }]
    });
  });
});

describe('Negative case', function () {
  it('eids array generation for UN-known sub-module', function () {
    // UnknownCommonId
    const userId = {
      unknowncid: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
  });

  it('eids array generation for known sub-module with non-string value', function () {
    // pubCommonId
    let userId = {
      pubcid: undefined
    };
    let newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
    userId.pubcid = 123;
    newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
    userId.pubcid = [];
    newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
    userId.pubcid = {};
    newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
    userId.pubcid = null;
    newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
  });
});
