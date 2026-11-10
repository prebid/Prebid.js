/**
 * Compile-time expectations for the publisher-facing configuration of some widely used core modules:
 * fpdModule, allowActivities, gppControl_usnat and sizeMappingV2.
 *
 * Not a unit test - `tsc` (`gulp ts`) compiles this along with the rest of the project, and fails
 * the build if any expectation below stops holding. The `@ts-expect-error` directives assert in
 * both directions: tsc reports an unused directive if the line under it stops being an error.
 * Valid examples are taken from the modules' documentation on docs.prebid.org.
 */
import type { Config } from '../../src/config.ts';
import type { AdUnitDefinition } from '../../src/adUnits.ts';
import type { AllowActivitiesConfig } from '../../modules/allowActivities.d.ts';
import type { MSPAConfig } from '../../modules/gppControl_usnat.ts';
import type { BidderSizeConfig } from '../../modules/sizeMappingV2.d.ts';

type Assert<T extends true> = T;
export type AllowActivitiesIsTyped = Assert<'allowActivities' extends keyof Config ? true : false>;
export type FirstPartyDataIsTyped = Assert<'firstPartyData' extends keyof Config ? true : false>;
export type MSPAIsTyped = Assert<'restrictActivities' extends keyof MSPAConfig ? true : false>;
export type BidderSizeConfigIsTyped = Assert<BidderSizeConfig extends { relevantMediaTypes: unknown } ? true : false>;

// fpdModule: `firstPartyData` (declared by core and the FPD submodules)

export const fpdConfig: Partial<Config> = {
  firstPartyData: {
    skipValidations: true,
    uaHints: ['architecture', 'model'],
    keywords: { meta: false, json: true }
  }
};
export const fpdBadHints: Partial<Config> = {
  firstPartyData: {
    // @ts-expect-error uaHints is an array of hint names
    uaHints: 'model'
  }
};

// allowActivities

export const allowActivities: Partial<Config> = {
  allowActivities: {
    accessDevice: {
      default: false,
      rules: [{
        condition({ storageType }) {
          return storageType === 'html5';
        },
        allow: true,
        priority: 20
      }]
    },
    fetchBids: {
      rules: [{
        condition: ({ componentName }) => componentName === 'bidderA',
        allow: true
      }]
    },
    syncUser: {
      default: false,
      rules: [{
        condition: ({ syncUrl }) => typeof syncUrl === 'string' && syncUrl.startsWith('https://example-domain.org'),
        allow: true
      }]
    },
    transmitEids: {
      rules: [{ allow: true }]
    }
  }
};
export const badActivityDefault: AllowActivitiesConfig = {
  enrichEids: {
    // @ts-expect-error default is a boolean
    default: 'false'
  }
};
export const unknownActivity: AllowActivitiesConfig = {
  // @ts-expect-error not an activity name
  accessDevices: { default: false }
};

// gppControl_usnat: `consentManagement.gpp.mspa`

export const usnatConfig: Partial<Config> = {
  consentManagement: {
    gpp: {
      cmpApi: 'iab',
      timeout: 3000,
      mspa: {
        restrictActivities: ['accessDevice', 'accessRequestCredentials']
      }
    }
  }
};
export const usnatBadRestrict: Partial<Config> = {
  consentManagement: {
    gpp: {
      mspa: {
        // @ts-expect-error restrictActivities is an array
        restrictActivities: 'accessDevice'
      }
    }
  }
};

// sizeMappingV2: `sizeConfig` on media types and bids

export const sizeMappedAdUnit: AdUnitDefinition = {
  code: 'ad-code-2',
  mediaTypes: {
    banner: {
      sizeConfig: [
        { minViewPort: [0, 0], sizes: [] },
        { minViewPort: [900, 0], sizes: [[300, 200], [300, 600]] }
      ]
    },
    video: {
      context: 'instream',
      sizeConfig: [
        { minViewPort: [0, 0], playerSize: [] },
        { minViewPort: [1200, 0], playerSize: [640, 400] }
      ]
    },
    native: {
      type: 'image',
      sizeConfig: [
        { minViewPort: [0, 0], active: false },
        { minViewPort: [600, 0], active: true }
      ]
    }
  },
  labelAny: ['visitor-us', 'visitor-uk'],
  bids: [{
    bidder: 'bidderA',
    params: { placementId: 123 },
    labelAny: ['visitor-us'],
    sizeConfig: [
      { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
      { minViewPort: [700, 0], relevantMediaTypes: ['banner'] },
      { minViewPort: [1300, 0], relevantMediaTypes: ['video', 'native'] }
    ]
  }]
};
export const badMinViewPort: AdUnitDefinition = {
  code: 'ad-code-3',
  mediaTypes: {
    banner: {
      // @ts-expect-error minViewPort is [width, height]
      sizeConfig: [{ minViewPort: 750, sizes: [[300, 250]] }]
    }
  }
};
export const badRelevantMediaTypes: BidderSizeConfig = {
  minViewPort: [0, 0],
  // @ts-expect-error not a media type
  relevantMediaTypes: ['audio']
};
