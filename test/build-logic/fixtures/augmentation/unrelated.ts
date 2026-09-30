// imports the orphan, and is itself in no consumer's program unless they ask for it: an import
// from here does not put the orphan in the program of someone who imports a different module
import './orphan.js';
