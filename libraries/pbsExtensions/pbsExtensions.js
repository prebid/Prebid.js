import {mergeProcessors} from '../ortbConverter/lib/mergeProcessors.js';
import {PBS_PROCESSORS} from './processors/pbs.js';
import {getProcessors, PBS} from '../../src/pbjsORTB.js';
import {defaultProcessors} from '../ortbConverter/converter.js';
import {memoize} from '../../src/utils.js';

/**
 * ORTB converter processor set that understands Prebid Server extensions.
 *
 * Pass this as the `processors` option to `ortbConverter` if your backend is a PBS instance.
 */
export const pbsExtensions = memoize(() => mergeProcessors(defaultProcessors(), PBS_PROCESSORS, getProcessors(PBS)));
