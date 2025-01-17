import {config} from 'src/config.js';
import {ruleRegistry} from '../../../src/activities/rules.js';
import {updateRulesFromConfig} from '../../../modules/allowActivities.js';
import {activityParams} from '../../../src/activities/activityParams.js';

describe('allowActivities config', () => {
  const MODULE_TYPE = 'test'
  const MODULE_NAME = 'testMod';
  const ACTIVITY = 'testActivity';

  let isAllowed, params;

  beforeEach(() => {
    let registerRule;
    [registerRule, isAllowed] = ruleRegistry();
    updateRulesFromConfig(registerRule);
    params = activityParams(MODULE_TYPE, MODULE_NAME)
  });

  afterEach(() => {
    config.resetConfig();
  });

  function setupActivityConfig(cfg) {
    config.setConfig({
      allowActivities: {
        [ACTIVITY]: cfg
      }
    })
  }

  describe('default = false', () => {
    it('should deny activites with no other rules', () => {
      setupActivityConfig({
        default: false
      })
      expect(isAllowed(ACTIVITY, {})).to.be.false;
    });
    it('should not deny activities that are explicitly allowed', () => {
      setupActivityConfig({
        default: false,
        rules: [
          {
            condition({componentName}) {
              return componentName === MODULE_NAME
            },
            allow: true
          }
        ]
      })
      expect(isAllowed(ACTIVITY, params)).to.be.true;
    });
    it('should be removable by a config update', () => {
      setupActivityConfig({
        default: false
      });
      setupActivityConfig({});
      expect(isAllowed(ACTIVITY, params)).to.be.true;
    })
  });

  describe('rules', () => {
    it('are tested for their condition', () => {
      setupActivityConfig({
        rules: [{
          condition({flag}) { return flag },
          allow: false
        }]
      });
      expect(isAllowed(ACTIVITY, params)).to.be.true;
      params.flag = true;
      expect(isAllowed(ACTIVITY, params)).to.be.false;
    });

    it('always apply if they have no condition', () => {
      setupActivityConfig({
        rules: [{allow: false}]
      });
      expect(isAllowed(ACTIVITY, params)).to.be.false;
    });

    it('do not choke when the condition throws', () => {
      setupActivityConfig({
        rules: [{
          condition() {
            throw new Error()
          },
          allow: true
        }]
      });
      expect(isAllowed(ACTIVITY, params)).to.be.false;
    });

    it('does not pass private (underscored) parameters to condition', () => {
      setupActivityConfig({
        rules: [{
          condition({_priv}) { return _priv },
          allow: false
        }]
      });
      params._priv = true;
      expect(isAllowed(ACTIVITY, params)).to.be.true;
    })

    it('are evaluated in order of priority', () => {
      setupActivityConfig({
        rules: [{
          priority: 1000,
          allow: false
        }, {
          priority: 100,
          allow: true
        }]
      });
      expect(isAllowed(ACTIVITY, params)).to.be.true;
    });

    it('can be set with priority 0', () => {
      setupActivityConfig({
        rules: [{
          allow: false
        }, {
          priority: 0,
          allow: true
        }]
      });
      expect(isAllowed(ACTIVITY, params)).to.be.true;
    })

    it('can be reset with a config update', () => {
      setupActivityConfig({
        allow: false
      });
      config.setConfig({allowActivities: {}});
      expect(isAllowed(ACTIVITY, params)).to.be.true;
    });
  });
});
