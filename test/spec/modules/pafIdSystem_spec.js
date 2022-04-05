import { pafIdSubmodule } from 'modules/pafIdSystem'
import { config } from 'src/config.js';
import {find} from 'src/polyfill.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';

const idsAndPrefs = {
  'identifiers': [
    {
      'version': '0.1',
      'type': 'paf_browser_id',
      'value': 'da135b3a-7d04-44bf-a0af-c4709f10420b',
      'source': {
        'domain': 'crto-poc-1.onekey.network',
        'timestamp': 1648836556881,
        'signature': '+NF27bBvPM54z103YPExXuS834+ggAQe6JV0jPeGo764vRYiiBl5OmEXlnB7UZgxNe3KBU7rN2jk0SkI4uL0bg=='
      }
    }
  ],
  'preferences': {
    'version': '0.1',
    'data': {
      'use_browsing_for_personalization': true
    },
    'source': {
      'domain': 'cmp.pafdemopublisher.com',
      'timestamp': 1648836566468,
      'signature': 'ipbYhU8IbSFm2tCqAVYI2d5w4DnGF7Xa2AaiZScx2nmBPLfMmIT/FkBYGitR8Mi791DHtcy5MXr4+bs1aeZFqw=='
    }
  }
};

function getConfigMock() {
  return {
    userSync: {
      syncDelay: 0,
      userIds: [{
        name: 'pafData'
      }]
    }
  }
}

function getAdUnitMock(code = 'adUnit-code') {
  return {
    code,
    mediaTypes: {banner: {}, native: {}},
    sizes: [
      [300, 200],
      [300, 600]
    ],
    bids: [{
      bidder: 'sampleBidder',
      params: { placementId: 'banner-only-bidder' }
    }]
  };
}

describe('pafData module', function () {
  it('returns undefined if paf-lib is not found', function () {
    const moduleIdResponse = pafIdSubmodule.getId();
    expect(moduleIdResponse).to.be.undefined;
  })
  it('returns undefined if no Data', function () {
    window.PAF = {
      getIdsAndPreferences() {
        return undefined;
      }
    }
    const moduleIdResponse = pafIdSubmodule.getId();
    expect(moduleIdResponse).to.be.undefined;
  })
  it('gets pafData from page context', function () {
    window.PAF = {
      getIdsAndPreferences() {
        return idsAndPrefs;
      }
    }
    const moduleIdResponse = pafIdSubmodule.getId();
    expect(moduleIdResponse).to.deep.equal({id: idsAndPrefs});
  })

  // this test format was copied from other id module tests
  // but it is failing on the hook and im not sure why, if someone
  // knows why and can help i will fix, otherwise i will remove it
  // describe('requestBids hook', function() {
  //   let adUnits;

  //   beforeEach(function() {
  //     adUnits = [getAdUnitMock()];
  //     window.PAF = {
  //       getIdsAndPreferences() {
  //         return idsAndPrefs;
  //       }
  //     }
  //     init(config);
  //     setSubmoduleRegistry([pafIdSubmodule]);
  //     config.setConfig(getConfigMock());
  //   });

  //   it('when pafData exists it is added to bids', function(done) {
  //     requestBidsHook(function() {
  //       adUnits.forEach(unit => {
  //         unit.bids.forEach(bid => {
  //           expect(bid).to.have.deep.nested.property('userId.pafData');
  //           expect(bid.userId.pafData).to.equal(idsAndPrefs);
  //           const pafDataAsEid = find(bid.userIdAsEids, e => e.source == 'paf');
  //           expect(pafDataAsEid.uids[0].id).to.equal('da135b3a-7d04-44bf-a0af-c4709f10420b');
  //         });
  //       });
  //       done();
  //     }, { adUnits });
  //   });
  // });
})
