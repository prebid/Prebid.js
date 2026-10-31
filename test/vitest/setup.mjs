import sinon from 'sinon';

// Existing specs expect Sinon as a global; Karma's karma-sinon plugin supplies it.
// Vitest provides Mocha-style describe/it/hooks and Chai-style expect with globals:true.
globalThis.sinon = sinon;
