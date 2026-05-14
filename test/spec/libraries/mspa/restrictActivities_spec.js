import { config } from '../../../../src/config.js';
import { uninstall } from '../../../../modules/tcfControl.js';
import { isActivityAllowed } from '../../../../src/activities/rules.js';
import { activityParams } from '../../../../src/activities/activityParams.js';
import 'modules/consentManagementGpp.js'
import 'modules/gppControl_usnat.js';
import 'modules/gppControl_usstates.js';

describe('restrictActivitites', () => {
  Object.entries({
    'usnat': 7,
    'state': 8
  }).forEach(([t, section]) => {
    describe(`on ${t} strings`, () => {
      afterEach(() => {
        config.resetConfig();
        uninstall(); // tcfControl, if included by other tests, activates when it sees any 'consentManagement' config
      });
      it('should block additional activities', () => {
        config.setConfig({
          consentManagement: {
            gpp: {
              cmpApi: 'static',
              consentData: {
                applicableSections: [section]
              },
              mspa: {
                restrictActivities: ['mockActivity']
              },
            }
          }
        });
        expect(isActivityAllowed('mockActivity', activityParams('bidder', 'mock'))).to.be.false;
      });
    });
  });
});
