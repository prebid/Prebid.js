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

  describe('id5Id', function() {
    it('does not include an ext if not provided', function() {
      const userId = {
        id5id: {
          uid: 'some-random-id-value'
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'id5-sync.com',
        uids: [{ id: 'some-random-id-value', atype: 1 }]
      });
    });

    it('includes ext if provided', function() {
      const userId = {
        id5id: {
          uid: 'some-random-id-value',
          ext: {
            linkType: 0
          }
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'id5-sync.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1,
          ext: {
            linkType: 0
          }
        }]
      });
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

  it('merkleId (legacy) - supports single id', function() {
    const userId = {
      merkleId: {
        id: 'some-random-id-value', keyID: 1
      }
    };
    const newEids = createEidsArray(userId);

    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'merkleinc.com',
      uids: [{
        id: 'some-random-id-value',
        atype: 3,
        ext: { keyID: 1 }
      }]
    });
  });

  it('merkleId supports multiple source providers', function() {
    const userId = {
      merkleId: [{
        id: 'some-random-id-value', ext: { enc: 1, keyID: 16, idName: 'pamId', ssp: 'ssp1' }
      }, {
        id: 'another-random-id-value',
        ext: {
          enc: 1,
          idName: 'pamId',
          third: 4,
          ssp: 'ssp2'
        }
      }]
    }

    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(2);
    expect(newEids[0]).to.deep.equal({
      source: 'ssp1.merkleinc.com',
      uids: [{id: 'some-random-id-value',
        atype: 3,
        ext: {
          enc: 1,
          keyID: 16,
          idName: 'pamId',
          ssp: 'ssp1'
        }
      }]
    });
    expect(newEids[1]).to.deep.equal({
      source: 'ssp2.merkleinc.com',
      uids: [{id: 'another-random-id-value',
        atype: 3,
        ext: {
          third: 4,
          enc: 1,
          idName: 'pamId',
          ssp: 'ssp2'
        }
      }]
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
      uids: [{id: 'some-random-id-value', atype: 3}]
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
      uids: [{id: 'some-random-id-value', atype: 3}],
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
      uids: [{id: 'some-random-id-value', atype: 3}]
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
      uids: [{id: 'some-random-id-value', atype: 3}]
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

  it('tapadId', function() {
    const userId = {
      tapadId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'tapad.com',
      uids: [{id: 'some-random-id-value', atype: 1}]
    });
  });

  it('deepintentId', function() {
    const userId = {
      deepintentId: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'deepintent.com',
      uids: [{id: 'some-random-id-value', atype: 3}]
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

  it('hadronId', function() {
    const userId = {
      hadronId: 'some-random-id-value'
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
  it('uid2', function() {
    const userId = {
      uid2: {'id': 'Sample_AD_Token'}
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'uidapi.com',
      uids: [{
        id: 'Sample_AD_Token',
        atype: 3
      }]
    });
  });
  it('kpuid', function() {
    const userId = {
      kpuid: 'Sample_Token'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'kpuid.com',
      uids: [{
        id: 'Sample_Token',
        atype: 3
      }]
    });
  });
  it('tncid', function() {
    const userId = {
      tncid: 'TEST_TNCID'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'thenewco.it',
      uids: [{
        id: 'TEST_TNCID',
        atype: 3
      }]
    });
  });
  it('pubProvidedId', function() {
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

  it('amxId', () => {
    const id = 'c4bcadb0-124f-4468-a91a-d3d44cf311c5'
    const userId = {
      amxId: id
    };

    const [eid] = createEidsArray(userId);
    expect(eid).to.deep.equal({
      source: 'amxrtb.com',
      uids: [{
        atype: 1,
        id,
      }]
    });
  });

  it('qid', function() {
    const userId = {
      qid: 'some-random-id-value'
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: 'adquery.io',
      uids: [{
        id: 'some-random-id-value',
        atype: 1
      }]
    });
  });

  it('33acrossId', function() {
    const userId = {
      '33acrossId': {
        envelope: 'some-random-id-value'
      }
    };
    const newEids = createEidsArray(userId);
    expect(newEids.length).to.equal(1);
    expect(newEids[0]).to.deep.equal({
      source: '33across.com',
      uids: [{
        id: 'some-random-id-value',
        atype: 1
      }]
    });
  });

  it('cpexId', () => {
    const id = 'some-random-id-value'
    const userId = { cpexId: id };
    const [eid] = createEidsArray(userId);
    expect(eid).to.deep.equal({
      source: 'czechadid.cz',
      uids: [{ id: 'some-random-id-value', atype: 1 }]
    });
  });
});

describe('Negative case', function () {
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
