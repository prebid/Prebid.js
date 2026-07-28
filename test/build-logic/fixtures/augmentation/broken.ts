// deliberately augments a module that neither core nor this file pulls in; the check under test
// reports it. unrelated.ts does import the orphan, which is exactly the kind of import that does
// not help: a consumer importing this file does not get unrelated.ts with it.
import './inCore.js';

declare module './orphan' {
  interface Orphan { addedByBroken?: number }
}
