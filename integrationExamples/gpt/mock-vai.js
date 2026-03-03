/**
 * Mock VAI script for integration testing.
 *
 * Simulates what the real vai.js (from /pw/vai.js) would do:
 *   1. Classify the actor (vat/act)
 *   2. Build a signed assertion
 *   3. Set window.__PW_VAI__ with the full payload
 *   4. Call window.__PW_VAI_HOOK__ if registered
 *   5. Cache in localStorage
 *
 * All JWT/JWS values are dummy strings — this is for structural
 * verification only, not cryptographic validation.
 */
(function () {
  'use strict';

  var payload = {
    // Actor classification (user.ext.vai)
    vat: 'HUMAN',
    act: 'ACT-1',
    // Domain provenance (site.ext.vai)
    iss: 'paywalls.net',
    dom: location.hostname,
    // Signed assertion (user.ext.vai)
    jws: 'eyJhbGciOiJFZERTQSIsImtpZCI6InRlc3Qta2V5LTAwMSJ9.eyJpc3MiOiJwYXl3YWxscy5uZXQifQ.mock-signature',
    // Meter/session token (user.ext.vai)
    mstk: 'mock-mstk-token-001',
    // Per-view token (imp[].ext.vai)
    pvtk: 'mock-pvtk-token-001',
    // Expiry — 1 hour from now
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // Set window global
  window.__PW_VAI__ = payload;

  // Notify hook if registered
  if (typeof window.__PW_VAI_HOOK__ === 'function') {
    window.__PW_VAI_HOOK__(payload);
  }

  // Cache in localStorage
  try {
    localStorage.setItem('__pw_vai__', JSON.stringify(payload));
  } catch (e) {
    // Ignore — storage may be unavailable
  }

  console.log('[mock-vai.js] VAI payload set:', payload);
})();
