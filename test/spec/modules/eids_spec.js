import {createEidsArray} from 'modules/userId/eids.js';
import {expect} from 'chai';

//  Note: In unit tets cases for bidders, call the createEidsArray function over userId object that is used for calling fetchBids
//      this way the request will stay consistent and unit test cases will not need lots of changes.

describe('eids array generation for known sub-modules', function() {
  it('pubCommonId', function() {
    const userId = {
      pubcid: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'pubcid.org',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('unifiedId: ext generation', function() {
    const userId = {
      tdid: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'adserver.org',
      uids: [{id: 'some-random-id-value', atype: 1, ext: { rtiPartner: 'TDID' }}]
    });
  });

  it('id5Id', function() {
    const userId = {
      id5id: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'id5-sync.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('parrableId', function() {
    const userId = {
      parrableId: {
        eid: 'some-random-id-value'
      }
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'parrable.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('merkleId', function() {
    const userId = {
      merkleId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'merkleinc.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('identityLink', function() {
    const userId = {
      idl_env: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'liveramp.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('liveIntentId; getValue call and ext', function() {
    const userId = {
      lipb: {
        lipbid: 'some-random-id-value',
        segments: ['s1', 's2']
      }
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'liveintent.com',
      uids: [{id: 'some-random-id-value', atype: 1}],
      ext: {segments: ['s1', 's2']}
    });
  });

  it('liveIntentId; getValue call and NO ext', function() {
    const userId = {
      lipb: {
        lipbid: 'some-random-id-value'
      }
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'liveintent.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('britepoolId', function() {
    const userId = {
      britepoolid: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'britepool.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('lotamePanoramaId', function () {
    const userId = {
      lotamePanoramaId: 'some-random-id-value',
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'crwdcntrl.net',
      uids: [{ id: 'some-random-id-value', atype: 1 }],
    });
  });

  it('criteo', function() {
    const userId = {
      criteoId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'criteo.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('NetId', function() {
    const userId = {
      netId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'netid.de',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });
  it('Sharedid', function() {
    const userId = {
      sharedid: {
        id: 'test_sharedId',
        third: 'test_sharedId'
      }
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'sharedid.org',
      uids: [{
        id: 'test_sharedId',
        atype: 1,
        ext: {
          third: 'test_sharedId'
        }
      }]
    });
  });
  it('Sharedid: Not Synched', function() {
    const userId = {
      sharedid: {
        id: 'test_sharedId'
      }
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'sharedid.org',
      uids: [{
        id: 'test_sharedId',
        atype: 1
      }]
    });
  });

  it('zeotapIdPlus', function() {
    const userId = {
      IDP: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'zeotap.com',
      uids: [{
        id: 'some-random-id-value',
        atype: 1
      }]
    });
  });

  it('haloId', function() {
    const userId = {
      haloId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'audigent.com',
      uids: [{
        id: 'some-random-id-value',
        atype: 1
      }]
    });
  });

  it('quantcastId', function() {
    const userId = {
      quantcastId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'quantcast.com',
      uids: [{
        id: 'some-random-id-value',
        atype: 1
      }]
    });
  });
});

describe('Negative case', function() {
  it('eids array generation for UN-known sub-module', function() {
    // UnknownCommonId
    const userId = {
      unknowncid: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(0);
  });

  it('eids array generation for known sub-module with non-string value', function() {
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
