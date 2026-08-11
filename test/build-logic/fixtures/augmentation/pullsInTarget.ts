// core does not have the orphan, but this pulls it in itself, so it is in the program of anyone
// who imports this
import './orphan.js';

declare module './orphan' {
  interface Orphan { addedByImporter?: number }
}
