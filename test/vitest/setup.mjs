import sinon from 'sinon';

// Existing specs expect Sinon as a global; Karma's karma-sinon plugin supplies it.
// Vitest provides Mocha-style describe/it/hooks and Chai-style expect with globals:true.
globalThis.sinon = sinon;

// The Karma bootstrap loads this shared mock before any specs run. Its
// top-level hooks reset the request list between tests. Import it after
// defining global sinon so the existing module can initialize unchanged.
await import('test/mocks/xhr.js');
