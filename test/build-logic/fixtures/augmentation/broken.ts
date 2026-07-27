// deliberately augments a module that nothing imports; the check under test reports it
/* eslint-disable prebid/augmentation-reachable */
import './target.js';

declare module './orphan' {
  interface Orphan { added?: number }
}
