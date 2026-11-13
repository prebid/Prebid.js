import './core.d.ts';
import './modules.d.ts';

// export the complete public API type definition - for those that are interested in just the
// types and do not automatically import the right modules
export type * from './exports.d.ts';

// also export some potentially useful types from modules

// eslint-disable-next-line prebid/validate-imports
export type { UserIdConfig } from '../../../modules/userId/index.ts';
// eslint-disable-next-line prebid/validate-imports
export type { RTDProviderConfig } from '../../../modules/rtdModule/index.ts';
