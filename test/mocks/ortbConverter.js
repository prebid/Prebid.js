import {defaultProcessors} from '../../libraries/ortbConverter/converter.js';
import {pbsExtensions} from '../../libraries/pbsExtensions/pbsExtensions.js';

beforeEach(() => {
  // disable caching of default processors so that tests do not freeze a subset for other tests
  defaultProcessors.clear();
  pbsExtensions.clear();
});
