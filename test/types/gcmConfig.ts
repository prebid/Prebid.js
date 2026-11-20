/**
 * Compile-time expectations for the publisher-facing configuration of consentManagementGcm and gcmControl.
 *
 * Not a unit test - `tsc` (`gulp ts`) compiles this along with the rest of the project, and fails
 * the build if any expectation below stops holding.
 */
import type { Config } from '../../src/config.ts';
import type { GCMConsentData } from '../../modules/consentManagementGcm.ts';
import type { GCMRules } from '../../modules/gcmControl.ts';

export const gcmConfig: Config = {
  consentManagement: {
    gcm: {
      timeout: 500,
      defaultWhenAbsent: 'denied',
      region: 'US-CA',
      rules: {
        ad_personalization: ['transmitUfpd'],
        ad_storage: [{ activity: 'accessDevice', componentTypes: ['bidder', 'userId', 'rtd'] }],
      }
    }
  }
};

export const gcmStatic: Config = {
  consentManagement: {
    gcm: {
      cmpApi: 'static',
      consentData: { ad_storage: 'denied', ad_user_data: 'granted' }
    }
  }
};

export const badDefaultWhenAbsent: Config = {
  consentManagement: {
    gcm: {
      // @ts-expect-error defaultWhenAbsent is null or 'denied'
      defaultWhenAbsent: 'granted'
    }
  }
};

export const badSignalValue: GCMConsentData = {
  // @ts-expect-error signals are 'granted' or 'denied'
  ad_storage: 'yes'
};

export const badActivity: GCMRules = {
  // @ts-expect-error not an activity name
  ad_storage: ['accessDevices']
};
