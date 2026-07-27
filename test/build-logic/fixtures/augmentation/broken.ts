// deliberately augments a module that nothing imports; the check under test reports it
// the directive below has no effect on that check, which is what one of the tests asserts
/* eslint-disable prebid/augmentation-reachable */
import './target.js';

declare module './orphan' {
  interface Orphan { added?: number }
}
