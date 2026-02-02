import {metadataRepository} from '../../../libraries/metadata/metadata.js';
import {
  checkDisclosure, dynamicDisclosureCollector, ENFORCE_ALIAS,
  ENFORCE_OFF,
  ENFORCE_STRICT,
  getDisclosures,
  storageControlRule
} from '../../../modules/storageControl.js';
import {
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE, ACTIVITY_PARAM_STORAGE_KEY,
  ACTIVITY_PARAM_STORAGE_TYPE
} from '../../../src/activities/params.js';
import {MODULE_TYPE_BIDDER} from '../../../src/activities/modules.js';
import {STORAGE_TYPE_COOKIES} from '../../../src/storageManager.js';

describe('storageControl', () => {
  describe('getDisclosures', () => {
    let metadata;
    beforeEach(() => {
      metadata = metadataRepository();
    })

    function mkParams(type = STORAGE_TYPE_COOKIES, key = undefined, bidder = 'mockBidder') {
      return {
        [ACTIVITY_PARAM_COMPONENT_TYPE]: MODULE_TYPE_BIDDER,
        [ACTIVITY_PARAM_COMPONENT_NAME]: bidder,
        [ACTIVITY_PARAM_STORAGE_TYPE]: type,
        [ACTIVITY_PARAM_STORAGE_KEY]: key
      }
    }

    it('should return null when no metadata is available', () => {
      expect(getDisclosures(mkParams(), metadata)).to.be.null;
    });

    describe('when metadata is available', () => {
      beforeEach(() => {
        metadata.register('mockModule', {
          disclosures: {
            'mock.url': {
              disclosures: [
                {
                  identifier: 'mockCookie',
                  type: 'cookie'
                },
                {
                  identifier: 'mockKey',
                  type: 'web'
                },
                {
                  identifier: 'wildcard*',
                  type: 'cookie'
                },
                {
                  identifier: 'wrongType',
                  type: 'wrong'
                }
              ]
            }
          },
          components: [
            {
              [ACTIVITY_PARAM_COMPONENT_TYPE]: MODULE_TYPE_BIDDER,
              [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockBidder',
              disclosureURL: 'mock.url'
            },
            {
              [ACTIVITY_PARAM_COMPONENT_TYPE]: MODULE_TYPE_BIDDER,
              [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockAlias',
              disclosureURL: null,
              aliasOf: 'mockBidder'
            },
            {
              [ACTIVITY_PARAM_COMPONENT_TYPE]: MODULE_TYPE_BIDDER,
              [ACTIVITY_PARAM_COMPONENT_NAME]: 'noDisclosureBidder',
              disclosureURL: null,
            },
          ]
        });
      });

      it('should return an empty array when bidder has no disclosure', () => {
        expect(getDisclosures(mkParams(STORAGE_TYPE_COOKIES, 'mockCookie', 'noDisclosureBidder'), metadata)).to.eql({
          disclosureURLs: {
            noDisclosureBidder: null
          },
          matches: []
        });
      });

      it('should return an empty array if the type is neither web nor cookie', () => {
        expect(getDisclosures(mkParams(STORAGE_TYPE_COOKIES, 'wrongType', 'mockBidder'), metadata).matches).to.eql([]);
      })

      Object.entries({
        'its own module': 'mockBidder',
        'the parent module, when an alias': 'mockAlias'
      }).forEach(([t, bidderCode]) => {
        it(`should return matching disclosures for ${t}`, () => {
          expect(getDisclosures(mkParams(STORAGE_TYPE_COOKIES, 'mockCookie', bidderCode), metadata).matches).to.eql(
            [
              {
                componentName: 'mockBidder',
                disclosureURL: 'mock.url',
                disclosure: {
                  identifier: 'mockCookie',
                  type: 'cookie'
                },
              }
            ]
          )
        });
      });

      [
        'wildcard',
        'wildcard_any',
        'wildcard*'
      ].forEach(key => {
        it(`can match wildcard disclosure (${key})`, () => {
          expect(getDisclosures(mkParams(STORAGE_TYPE_COOKIES, key), metadata)).to.eql({
            disclosureURLs: {
              mockBidder: 'mock.url'
            },
            matches: [
              {
                componentName: 'mockBidder',
                disclosureURL: 'mock.url',
                disclosure: {
                  identifier: 'wildcard*',
                  type: 'cookie'
                },
              }
            ]
          })
        })
      })

      it('should not match when storage type differs', () => {
        expect(getDisclosures(mkParams(STORAGE_TYPE_COOKIES, 'mockKey'), metadata)).to.eql({
          disclosureURLs: {
            mockBidder: 'mock.url',
          },
          matches: []
        });
      })
    });
  });
  describe('checkDisclosure', () => {
    let disclosures;
    beforeEach(() => {
      disclosures = sinon.stub();
    })
    it('should not check when no key is present (e.g. cookiesAreEnabled)', () => {
      expect(checkDisclosure({
        [ACTIVITY_PARAM_COMPONENT_TYPE]: 'bidder',
        [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockBidder',
        [ACTIVITY_PARAM_STORAGE_TYPE]: STORAGE_TYPE_COOKIES
      }, disclosures).disclosed).to.be.null;
      sinon.assert.notCalled(disclosures);
    });

    it('should return true when key is disclosed', () => {
      const params = {
        [ACTIVITY_PARAM_COMPONENT_TYPE]: 'bidder',
        [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockBidder',
        [ACTIVITY_PARAM_STORAGE_TYPE]: STORAGE_TYPE_COOKIES,
        [ACTIVITY_PARAM_STORAGE_KEY]: 'mockCookie'
      }
      disclosures.returns({
        matches: [{
          componentName: 'mockBidder',
          identifier: 'mockCookie'
        }]
      })
      expect(checkDisclosure(params, disclosures).disclosed).to.be.true;
      sinon.assert.calledWith(disclosures, params);
    })
  });
  describe('storageControlRule', () => {
    let enforcement, checkResult, rule;
    beforeEach(() => {
      rule = storageControlRule(() => enforcement, () => checkResult);
    });

    it('should allow when disclosed is null', () => {
      enforcement = ENFORCE_STRICT;
      checkResult = {disclosed: null};
      expect(rule()).to.not.exist;
    });

    it('should allow when there is no disclosure, but enforcement is off', () => {
      enforcement = ENFORCE_OFF;
      checkResult = {disclosed: false, parent: false};
      expect(rule()).to.not.exist;
    });

    it('should allow when disclosed is true', () => {
      enforcement = ENFORCE_STRICT;
      checkResult = {disclosed: true};
      expect(rule()).to.not.exist;
    });

    it('should deny when enforcement is strict and disclosure is done by the aliased module', () => {
      enforcement = ENFORCE_STRICT;
      checkResult = {disclosed: false, parent: true, reason: 'denied'};
      expect(rule()).to.eql({allow: false, reason: 'denied'});
    });

    it('should allow when enforcement is allowAliases and disclosure is done by the aliased module', () => {
      enforcement = ENFORCE_ALIAS;
      checkResult = {disclosed: false, parent: true, reason: 'allowed'};
      expect(rule()).to.not.exist;
    });
  });

  describe('dynamic disclosures', () => {
    let next, hook, getDisclosures;
    beforeEach(() => {
      next = sinon.stub();
      ({hook, getDisclosures} = dynamicDisclosureCollector());
    });
    it('should collect and return disclosures', () => {
      const disclosure = {identifier: 'mock', type: 'web', purposes: [1]};
      hook(next, 'module', disclosure);
      sinon.assert.calledWith(next, 'module', disclosure);
      expect(getDisclosures()).to.eql([
        {
          disclosedBy: ['module'],
          ...disclosure
        }
      ]);
    });
    it('should update disclosures for the same identifier', () => {
      hook(next, 'module1', {identifier: 'mock', type: 'cookie', maxAgeSeconds: 10, cookieRefresh: true, purposes: [1]});
      hook(next, 'module2', {identifier: 'mock', type: 'cookie', maxAgeSeconds: 1, cookieRefresh: true, purposes: [2]});
      expect(getDisclosures()).to.eql([{
        disclosedBy: ['module1', 'module2'],
        identifier: 'mock',
        type: 'cookie',
        maxAgeSeconds: 10,
        cookieRefresh: true,
        purposes: [1, 2]
      }])
    });
    it('should not repeat the same module', () => {
      const disclosure = {
        identifier: 'mock', type: 'web', purposes: [1]
      }
      hook(next, 'module', disclosure);
      hook(next, 'module', disclosure);
      expect(getDisclosures()).to.eql([{
        disclosedBy: ['module'],
        ...disclosure
      }])
    })
    it('should treat web and cookie disclosures as separate', () => {
      hook(next, 'module1', {identifier: 'mock', type: 'cookie', purposes: [1]});
      hook(next, 'module2', {identifier: 'mock', type: 'web', purposes: [2]});
      expect(getDisclosures()).to.have.deep.members([
        {
          disclosedBy: ['module1'],
          identifier: 'mock',
          type: 'cookie',
          purposes: [1],
        },
        {
          disclosedBy: ['module2'],
          identifier: 'mock',
          type: 'web',
          purposes: [2]
        }
      ])
    })
  });
})
