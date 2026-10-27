// the same violation as broken.ts, behind a disable directive - test data for the assertion that
// the check behind `gulp check-declarations` does not honour directives
/* eslint-disable prebid/augmentation-reachable */
import './inCore.js';

declare module './orphan' {
  interface Orphan { addedByDisabled?: number }
}
