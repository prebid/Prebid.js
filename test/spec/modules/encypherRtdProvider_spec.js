import assert from 'assert';
import {
  encypherSubmodule,
  getCanonicalUrl,
  MODULE_NAME,
  resetProviderState,
  sha256,
} from '../../../modules/encypherRtdProvider.js';
import * as ajaxModule from 'src/ajax.js';
import { server } from 'test/mocks/xhr.js';
import { GreedyPromise } from 'libraries/greedy/greedyPromise.js';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};
const API_ISSUER = 'https://api.encypher.com';
const PINNED_JWKS_URL = API_ISSUER + '/api/v1/public/provenance/jwks.json';
const SIGNAL_ORIGIN = 'https://signals.encypher.com';
const TRUSTED_JWK = {
  kty: 'EC',
  crv: 'P-256',
  alg: 'ES256',
  use: 'sig',
  kid: 'encypher-attestation-test',
  x: 'j9xua-aq-3EounwfIMfY384Tjwg_NqreCG3TD6WLxCE',
  y: 'oRMmulqdsg3Wc8gfcNyYhsYmpLdNVIMJdZifLP1g-VY',
};
const JWKS = { keys: [TRUSTED_JWK] };

const STORY_URL = 'https://publisher.example/news/story';
const STORY_HASH = 'YwYup-oKQVmF441UPY_xsaQOgkvLeMgO6TtSTGbE4NM';
const STORY_ATT = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImVuY3lwaGVyLWF0dGVzdGF0aW9uLXRlc3QiLCJ0eXAiOiJlcGF0K2p3cyJ9.eyJjb250ZW50X2hhc2giOiJJTEdLX3F0MEQxWTV4VGhZT2lTUlpQTjRkd3VZY04za3VUd19YZVNncFA0IiwiZGVjbGFyYXRpb24iOnsibGFiZWwiOiJodW1hbl9kZWNsYXJlZCIsInNvdXJjZV9hc3NlcnRpb24iOiJjMnBhIn0sImV4cCI6NDEwMjQ0NDgwMCwiaWF0IjoxNzA0MDY3MjAwLCJpc3MiOiJodHRwczovL2FwaS5lbmN5cGhlci5jb20iLCJtYW5pZmVzdF9kaWdlc3QiOiJiTnYwWU9aTXFpRFBtbFcwaGYwaW1fQWtZS0o1M0daeHVKSXNvZHloTVJnIiwicHVibGlzaGVyX2RvbWFpbiI6InB1Ymxpc2hlci5leGFtcGxlIiwicmVjb3JkX3JldmlzaW9uIjoxLCJzdWIiOiJlcGFfcyIsInRydXN0X3BvbGljeV92ZXJzaW9uIjoidjEiLCJ1cmxfaGFzaCI6Ill3WXVwLW9LUVZtRjQ0MVVQWV94c2FRT2drdkxlTWdPNlR0U1RHYkU0Tk0iLCJ2YWxpZGF0aW9uX3Jlc3VsdHMiOnsiY29kZXMiOlsidmFsaWQiXSwic3RhdHVzIjoidmFsaWQifX0.IK4fVNiciTbvNdPr6PO79B8VPIJVe0G0fcaJlWIBnPKkpQhnIbaqZQUUTdXg4rOvvRZE0Kr7LguR6jiuX6hfXg';
const STORY_SIGNAL = {
  v: 1,
  id: 'epa_s',
  ref: API_ISSUER + '/api/v1/public/provenance/attestations/epa_s',
  att: STORY_ATT,
};

const PAGE_URL = 'https://publisher.example/security/pinned-trust';
const PAGE_HASH = '1q1b1Xp1WxrlV3fXBmso8ipBZim9402-ELdZgMlkk20';
const PAGE_ATT = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImVuY3lwaGVyLWF0dGVzdGF0aW9uLXRlc3QiLCJ0eXAiOiJlcGF0K2p3cyJ9.eyJjb250ZW50X2hhc2giOiI3WEFDdERucHJJUmZJalY5Z2l1c0ZFUnpENzIyQVcwLXlVTWlsN25zbjNNIiwiZGVjbGFyYXRpb24iOnsibGFiZWwiOiJodW1hbl9kZWNsYXJlZCIsInNvdXJjZV9hc3NlcnRpb24iOiJjMnBhIn0sImV4cCI6NDEwMjQ0NDgwMCwiaWF0IjoxNzA0MDY3MjAwLCJpc3MiOiJodHRwczovL2FwaS5lbmN5cGhlci5jb20iLCJtYW5pZmVzdF9kaWdlc3QiOiJCYk9yOGxlYVhyWmtBODE0dmxWXzJHQmpPaF9pRUR4MlFnTU43LU1zWlg4IiwicHVibGlzaGVyX2RvbWFpbiI6InB1Ymxpc2hlci5leGFtcGxlIiwicmVjb3JkX3JldmlzaW9uIjo3LCJzdWIiOiJlcGFfMSIsInRydXN0X3BvbGljeV92ZXJzaW9uIjoidjEiLCJ1cmxfaGFzaCI6IjFxMWIxWHAxV3hybFYzZlhCbXNvOGlwQlppbTk0MDItRUxkWmdNbGtrMjAiLCJ2YWxpZGF0aW9uX3Jlc3VsdHMiOnsiY29kZXMiOlsidmFsaWQiXSwic3RhdHVzIjoidmFsaWQifX0.fsDUCUcWwTG-F69lf330v7fIqCT2sg0clak9BWWfjAbFGu-msrIZSu11gn9puGx-lzopvSxYxXEXoEGRBzWggg';
const PAGE_SIGNAL = {
  v: 1,
  id: 'epa_1',
  ref: API_ISSUER + '/api/v1/public/provenance/attestations/epa_1',
  att: PAGE_ATT,
};
const ATTACKER_ATT = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImF0dGFja2VyLWtleSIsInR5cCI6ImVwYXQrandzIn0.eyJjb250ZW50X2hhc2giOiI3WEFDdERucHJJUmZJalY5Z2l1c0ZFUnpENzIyQVcwLXlVTWlsN25zbjNNIiwiZGVjbGFyYXRpb24iOiJodW1hbl9kZWNsYXJlZCIsImV4cCI6NDEwMjQ0NDgwMCwiaWF0IjoxNzA0MDY3MjAwLCJpc3MiOiJodHRwczovL2F0dGFja2VyLmV4YW1wbGUiLCJtYW5pZmVzdF9kaWdlc3QiOiJCYk9yOGxlYVhyWmtBODE0dmxWXzJHQmpPaF9pRUR4MlFnTU43LU1zWlg4IiwicHVibGlzaGVyX2RvbWFpbiI6InB1Ymxpc2hlci5leGFtcGxlIiwicmVjb3JkX3JldmlzaW9uIjo3LCJzdWIiOiJlcGFfYXR0YWNrZXJfMSIsInRydXN0X3BvbGljeV92ZXJzaW9uIjoxLCJ1cmxfaGFzaCI6IjFxMWIxWHAxV3hybFYzZlhCbXNvOGlwQlppbTk0MDItRUxkWmdNbGtrMjAiLCJ2YWxpZGF0aW9uX3Jlc3VsdHMiOlsiY2xhaW1TaWduYXR1cmUudmFsaWQiXX0.Zi0M0Q9zAx0MAWPck9fw-aWsYYjNtDNOn5HZssJpK1syfBRxbQn2trYl2Fi96R41IDhBjvBJ_EKqg-bnrSUHsw';
const ATTACKER_SIGNAL = {
  v: 1,
  id: 'epa_attacker_1',
  ref: API_ISSUER + '/api/v1/public/provenance/attestations/epa_attacker_1',
  att: ATTACKER_ATT,
};

const CANONICAL_URL_CASES = [
  ['already-canonical', 'https://example.com/path?x=1', 'https://example.com/path?x=1', '69LqZwKj1pcnXvnq-gLo4j5UiYXZDMo31DQvuPXCuwE'],
  ['scheme-host-case', 'HTTPS://Example.COM/Path', 'https://example.com/Path', 'tsKmkx2p4Ovy2pQ0EgmFiKu76cSk3ysjx02lXaC_-sk'],
  ['default-port', 'https://example.com:443/path', 'https://example.com/path', 'X6pL9JGP9WViFBzDKFReyPe23SdHDL30p0h1k7PoNzg'],
  ['fragment', 'https://example.com/article#comments', 'https://example.com/article', 'YyU4KQRo56OcBjI8njrpjzEHLWQcuzfqN5F_VrvrVTk'],
  ['unicode-idna', 'https://bücher.example/über', 'https://xn--bcher-kva.example/%C3%BCber', 'l7L26mo5n-SzRIzEBK7cSu6CAb2DwkbK-rB7uq8tMho'],
  ['percent-encoding', 'https://example.com/%7Epublisher', 'https://example.com/~publisher', 'sj4eX-u4keaeqaOHz7e5EuB37jdalazDyQmff7mH6EE'],
  ['query-order-and-duplicates', 'https://example.com/a?b=2&a=2&a=1', 'https://example.com/a?a=1&a=2&b=2', 'FLqz_5NsYqykQVhri1MpZv598OO4EX-NpvxiQebVz58'],
];
const DIGEST_BYTES_BY_CANONICAL_URL = new Map([
  ...CANONICAL_URL_CASES.map(([, , canonicalUrl, digest]) => [canonicalUrl, digest]),
  [STORY_URL, STORY_HASH],
  [PAGE_URL, PAGE_HASH],
].map(([canonicalUrl, digest]) => [canonicalUrl, decodeBase64url(digest)]));
const FORBIDDEN_TELEMETRY_FIELD = /url|hash|content|score|billing|price|deal|user|cookie|credential|attestation|jws/i;

function ready(record, datasetVersion = 7) {
  return {
    v: 1,
    status: 'ready',
    dataset_version: datasetVersion,
    record,
  };
}

function makeAuction(gpid = '/1234/article/leaderboard') {
  return {
    ortb2Fragments: {
      global: {
        source: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [{ asi: 'ssp.example', sid: 'publisher-7', hp: 1 }],
          },
        },
        ext: { caller_global: 'keep-global' },
      },
    },
    adUnits: [{
      code: 'leaderboard',
      mediaTypes: { banner: { sizes: [[728, 90]] } },
      ortb2Imp: {
        id: 'imp-1',
        ext: { gpid, caller_imp: 'keep-one' },
      },
    }, {
      code: 'rectangle',
      caller_unit: 'keep-unit',
      ortb2Imp: {
        id: 'imp-2',
        ext: { gpid: '/1234/article/rectangle', caller_imp: 'keep-two' },
      },
    }],
  };
}

function addCanonical(url, cleanups) {
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = url;
  document.head.appendChild(link);
  cleanups.push(() => link.parentNode && link.parentNode.removeChild(link));
  return link;
}

function base64url(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64url(value) {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(encoded + '='.repeat((4 - encoded.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function decodeClaims(compact) {
  return JSON.parse(new TextDecoder().decode(decodeBase64url(compact.split('.')[1])));
}

function replaceClaims(compact, mutate) {
  const segments = compact.split('.');
  const claims = decodeClaims(compact);
  mutate(claims);
  segments[1] = base64url(new TextEncoder().encode(JSON.stringify(claims)));
  return segments.join('.');
}

function pendingRequest(url) {
  return server.requests.slice().reverse().find(request => (
    request.url === url && request.readyState !== XMLHttpRequest.DONE
  ));
}

function pendingLookup() {
  const prefix = SIGNAL_ORIGIN + '/v1/attestations/';
  return server.requests.slice().reverse().find(request => (
    request.url.startsWith(prefix) && request.readyState !== XMLHttpRequest.DONE
  ));
}

function requestInit(url) {
  const call = ajaxModule.dep.makeRequest.getCalls().find(candidate => (
    candidate.args[0] === url && candidate.args[1]
  ));
  assert.ok(call, 'initial Request options must be captured for ' + url);
  return call.args[1];
}

function assertCanonicalLookup(lookup, hash, canonicalUrl, publisherDomain = 'publisher.example', adoptionReporting = true) {
  assert.ok(lookup, 'edge attestation lookup must be requested');
  const parsed = new URL(lookup.url);
  assert.strictEqual(parsed.origin + parsed.pathname, SIGNAL_ORIGIN + '/v1/attestations/' + hash);
  const expectedParameters = [
    ['module_version', '1.1.0'],
    ['publisher_domain', publisherDomain.toLowerCase()],
  ];
  if (adoptionReporting === false) expectedParameters.push(['adoption_reporting', '0']);
  assert.deepStrictEqual(Array.from(parsed.searchParams).sort(), expectedParameters.sort());
  assert.strictEqual(parsed.hash, '');
  assert.strictEqual(lookup.url.includes(canonicalUrl), false, 'the raw canonical URL must not be disclosed');
  assert.strictEqual(lookup.method, 'GET');
  assert.strictEqual(lookup.requestBody, undefined);
  assert.strictEqual(lookup.withCredentials, false);
  assert.strictEqual(lookup.fetch.request.credentials, 'omit');
  assert.strictEqual(lookup.fetch.request.cache, 'no-store');
  assert.strictEqual(lookup.fetch.request.redirect, 'error');
  assert.strictEqual(requestInit(lookup.url).referrerPolicy, 'no-referrer');
  assert.deepStrictEqual(
    Array.from(lookup.fetch.request.headers.entries()),
    [['accept', 'application/json']],
  );
}

async function findPending(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const request = pendingRequest(url);
    if (request) return request;
    await Promise.resolve();
  }
  return null;
}

async function respondJwksIfRequested(jwks = JWKS, headers = HEADERS) {
  const request = await findPending(PINNED_JWKS_URL);
  if (!request) return false;
  assert.strictEqual(request.fetch.request.cache, 'no-store');
  assert.strictEqual(request.fetch.request.credentials, 'omit');
  assert.strictEqual(request.fetch.request.redirect, 'error');
  assert.strictEqual(requestInit(request.url).referrerPolicy, 'no-referrer');
  request.respond(200, headers, JSON.stringify(jwks));
  return true;
}

async function respondDecision(envelope, { jwks = JWKS, headers = HEADERS } = {}) {
  const lookup = pendingLookup();
  assert.ok(lookup, 'lookup must be pending');
  lookup.respond(200, headers, JSON.stringify(envelope));
  if (envelope.status === 'ready') await respondJwksIfRequested(jwks);
}

function beginAuction(params = {}, auction = makeAuction()) {
  let callbackCount = 0;
  const completion = new Promise(resolve => {
    encypherSubmodule.getBidRequestData(auction, () => {
      callbackCount += 1;
      resolve();
    }, { params: Object.assign({ timeout: 300 }, params) });
  });
  return {
    auction,
    completion,
    callbackCount: () => callbackCount,
  };
}

function assertNoInjection(auction) {
  auction.adUnits.forEach(adUnit => {
    assert.strictEqual(adUnit.ortb2Imp && adUnit.ortb2Imp.ext && adUnit.ortb2Imp.ext.c2pa, undefined);
  });
}

function assertDiagnostic(serializedBody, event, impressionCount, datasetVersion) {
  const body = JSON.parse(serializedBody);
  const expectedKeys = [
    'duration_ms',
    'event',
    'impression_count',
    'module_version',
    'schema_version',
    'v',
  ];
  if (datasetVersion !== undefined) expectedKeys.push('dataset_version');
  assert.deepStrictEqual(Object.keys(body).sort(), expectedKeys.sort());
  assert.strictEqual(body.v, 1);
  assert.strictEqual(body.schema_version, 1);
  assert.strictEqual(body.module_version, '1.1.0');
  assert.strictEqual(body.event, event);
  assert.strictEqual(body.impression_count, impressionCount);
  assert.strictEqual(Number.isFinite(body.duration_ms), true);
  assert.strictEqual(body.duration_ms >= 0, true);
  assert.strictEqual(body.dataset_version, datasetVersion);
  assert.strictEqual(Object.keys(body).some(key => FORBIDDEN_TELEMETRY_FIELD.test(key)), false);
}

function recordWithClaims(record, mutate) {
  return Object.assign({}, record, { att: replaceClaims(record.att, mutate) });
}

function miss(status, datasetVersion) {
  return { v: 1, status, dataset_version: datasetVersion, record: null };
}

function paddedJson(value, byteLength) {
  const serialized = JSON.stringify(value);
  const padding = byteLength - new TextEncoder().encode(serialized).byteLength;
  assert.ok(padding >= 0, 'fixture must fit body limit');
  return serialized + ' '.repeat(padding);
}

function installStreamResponse(sandbox, matchingBody, spec) {
  const NativeResponse = window.Response;
  const state = { cancelCount: 0, readCount: 0 };
  sandbox.stub(window, 'Response').callsFake((body, init) => {
    if (body !== matchingBody) return new NativeResponse(body, init);
    const reader = {
      read() {
        state.readCount += 1;
        if (spec.rejectRead) return GreedyPromise.reject(new Error('reader failed'));
        if (spec.pendingRead) return new Promise(() => {});
        const chunk = spec.chunks.shift();
        return GreedyPromise.resolve(chunk
          ? { done: false, value: chunk }
          : { done: true, value: undefined });
      },
      cancel() {
        state.cancelCount += 1;
        return GreedyPromise.resolve();
      },
    };
    return {
      status: init.status,
      statusText: init.statusText,
      headers: new Headers(init.headers || {}),
      body: spec.bodyNull ? null : { getReader: () => reader },
    };
  });
  return state;
}

function utf8Chunks(text, chunkSizes = []) {
  const bytes = new TextEncoder().encode(text);
  if (chunkSizes.length === 0) return [bytes];
  const chunks = [];
  let offset = 0;
  chunkSizes.forEach(size => {
    chunks.push(bytes.slice(offset, offset + size));
    offset += size;
  });
  if (offset < bytes.byteLength) chunks.push(bytes.slice(offset));
  return chunks;
}

describe('encypherRtdProvider decision-network v1', () => {
  let sandbox;
  let cleanups;
  let digestStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    cleanups = [];
    digestStub = sandbox.stub(window.crypto.subtle, 'digest').callsFake((_algorithm, encoded) => {
      const value = new TextDecoder().decode(encoded);
      const expected = DIGEST_BYTES_BY_CANONICAL_URL.get(value);
      assert.ok(expected, 'test digest fixture missing for ' + value);
      return GreedyPromise.resolve(expected.buffer);
    });
  });

  afterEach(() => {
    sandbox.restore();
    resetProviderState();
    cleanups.forEach(cleanup => cleanup());
  });

  it('uses the exact signal origin with no configurable origin input', async () => {
    addCanonical(STORY_URL, cleanups);
    assert.strictEqual(MODULE_NAME, 'encypher');
    assert.strictEqual(encypherSubmodule.name, 'encypher');
    assert.strictEqual(encypherSubmodule.init({ params: {} }), true);

    const run = beginAuction({ adoptionReporting: false });
    const lookup = pendingLookup();
    assertCanonicalLookup(lookup, STORY_HASH, STORY_URL, 'publisher.example', false);
    assert.strictEqual(server.requests.every(request => new URL(request.url).origin === SIGNAL_ORIGIN), true);
    await respondDecision(miss('miss', 1));
    await run.completion;
    assert.strictEqual(run.callbackCount(), 1);
    assertNoInjection(run.auction);
  });

  it('matches the generated canonical URL and unpadded SHA-256 vectors', async () => {
    digestStub.restore();
    const canonical = addCanonical(CANONICAL_URL_CASES[0][1], cleanups);
    for (const [id, inputUrl, expectedUrl, expectedDigest] of CANONICAL_URL_CASES) {
      canonical.href = inputUrl;
      const canonicalUrl = getCanonicalUrl();
      const digest = base64url(await sha256(canonicalUrl));
      assert.strictEqual(canonicalUrl, expectedUrl, id + ' canonical URL');
      assert.strictEqual(digest, expectedDigest, id + ' digest');
      assert.match(digest, /^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('does no work when RTD core supplies no auction budget', () => {
    const auction = makeAuction();
    const original = structuredClone(auction);
    let callbackCount = 0;
    encypherSubmodule.getBidRequestData(auction, () => {
      callbackCount += 1;
    }, { params: { timeout: 300 } }, undefined, 0);
    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction, original);
    assert.strictEqual(digestStub.callCount, 0);
    assert.strictEqual(server.requests.length, 0);
  });

  [
    {
      name: 'crypto',
      remove() {
        sandbox.stub(window, 'crypto').value(undefined);
      },
    },
    {
      name: 'crypto.subtle',
      remove() {
        sandbox.stub(window.crypto, 'subtle').value(undefined);
      },
    },
    {
      name: 'crypto.subtle.digest',
      remove() {
        digestStub.restore();
        sandbox.stub(window.crypto.subtle, 'digest').value(undefined);
      },
    },
  ].forEach(testCase => {
    it('fails open exactly once when ' + testCase.name + ' is unavailable', async () => {
      testCase.remove();
      addCanonical(STORY_URL, cleanups);
      const run = beginAuction();
      await run.completion;
      await Promise.resolve();
      assert.strictEqual(run.callbackCount(), 1);
      assertNoInjection(run.auction);
      assert.strictEqual(server.requests.length, 0);
    });
  });

  it('fails open exactly once when the URL digest rejects', async () => {
    digestStub.rejects(new Error('digest unavailable'));
    addCanonical(STORY_URL, cleanups);
    const run = beginAuction();
    await run.completion;
    await Promise.resolve();
    assert.strictEqual(run.callbackCount(), 1);
    assertNoInjection(run.auction);
    assert.strictEqual(server.requests.length, 0);
  });

  it('clamps work to a smaller positive RTD core budget', async () => {
    const clock = sandbox.useFakeTimers();
    addCanonical(STORY_URL, cleanups);
    let callbackCount = 0;
    encypherSubmodule.getBidRequestData(makeAuction(), () => {
      callbackCount += 1;
    }, { params: { timeout: 300 } }, undefined, 25);
    clock.tick(24);
    await Promise.resolve();
    assert.strictEqual(callbackCount, 0);
    clock.tick(1);
    await Promise.resolve();
    assert.strictEqual(callbackCount, 1);
  });

  it('ignores a late digest settlement after timeout and calls back exactly once', async () => {
    const clock = sandbox.useFakeTimers();
    let resolveDigest;
    digestStub.returns(new Promise(resolve => { resolveDigest = resolve; }));
    addCanonical(STORY_URL, cleanups);
    const run = beginAuction({ timeout: 25 });
    clock.tick(25);
    await run.completion;
    assert.strictEqual(run.callbackCount(), 1);
    resolveDigest(DIGEST_BYTES_BY_CANONICAL_URL.get(STORY_URL).buffer);
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(run.callbackCount(), 1);
    assertNoInjection(run.auction);
    assert.strictEqual(server.requests.length, 0);
  });

  it('aborts a non-200 lookup transport before invoking the callback', async () => {
    addCanonical(STORY_URL, cleanups);
    let abortedAtCallback = false;
    let callbackCount = 0;
    const auction = makeAuction();
    let lookup;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        abortedAtCallback = lookup.fetch.request.signal.aborted;
        resolve();
      }, { params: { timeout: 300 } });
    });
    lookup = pendingLookup();
    lookup.respond(503, HEADERS, 'unavailable');
    await completion;
    assert.strictEqual(abortedAtCallback, true);
    assert.strictEqual(callbackCount, 1);
    assertNoInjection(auction);
  });

  it('accepts only an exact JSON ready decision and uses cache no-store for lookup and JWKS', async () => {
    addCanonical(STORY_URL, cleanups);
    const run = beginAuction();
    const lookup = pendingLookup();
    assertCanonicalLookup(lookup, STORY_HASH, STORY_URL);
    await respondDecision(ready(STORY_SIGNAL, 17));
    await run.completion;
    assert.strictEqual(run.callbackCount(), 1);
    assert.deepStrictEqual(run.auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.strictEqual(server.requests.filter(request => request.url === PINNED_JWKS_URL).length, 1);
  });

  [
    { name: 'unknown status', value: { v: 1, status: 'unknown', dataset_version: 1, record: null } },
    { name: 'missing record key', value: { v: 1, status: 'miss', dataset_version: 1 } },
    { name: 'extra key', value: { v: 1, status: 'miss', dataset_version: 1, record: null, extra: true } },
    { name: 'zero dataset version', value: { v: 1, status: 'miss', dataset_version: 0, record: null } },
    { name: 'record on miss', value: { v: 1, status: 'miss', dataset_version: 1, record: STORY_SIGNAL } },
    { name: 'null record on ready', value: { v: 1, status: 'ready', dataset_version: 1, record: null } },
  ].forEach(testCase => {
    it('fails open on a decision with ' + testCase.name, async () => {
      addCanonical(STORY_URL, cleanups);
      const run = beginAuction();
      await respondDecision(testCase.value);
      await run.completion;
      assert.strictEqual(run.callbackCount(), 1);
      assertNoInjection(run.auction);
    });
  });

  it('treats a versioned JSON miss as authoritative and HTTP 204 as invalid', async () => {
    addCanonical(STORY_URL, cleanups);
    const jsonMiss = beginAuction();
    await respondDecision(miss('miss', 4));
    await jsonMiss.completion;
    assertNoInjection(jsonMiss.auction);

    resetProviderState();
    const noContent = beginAuction();
    pendingLookup().respond(204, HEADERS, null);
    await noContent.completion;
    assertNoInjection(noContent.auction);
  });

  it('keeps the page dataset floor and stale barrier across canonical URL hashes', async () => {
    const canonical = addCanonical(STORY_URL, cleanups);
    const first = beginAuction();
    await respondDecision(ready(STORY_SIGNAL, 10));
    await first.completion;

    canonical.href = PAGE_URL;
    const stale = beginAuction();
    await respondDecision(miss('stale', 12));
    await stale.completion;

    const atBarrier = beginAuction();
    await respondDecision(ready(PAGE_SIGNAL, 12));
    await atBarrier.completion;
    assertNoInjection(atBarrier.auction);

    const aboveBarrier = beginAuction();
    await respondDecision(ready(PAGE_SIGNAL, 13));
    await aboveBarrier.completion;
    assert.deepStrictEqual(aboveBarrier.auction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);

    canonical.href = STORY_URL;
    const belowFloor = beginAuction();
    await respondDecision(miss('miss', 11));
    await belowFloor.completion;
    assertNoInjection(belowFloor.auction);
  });

  ['miss', 'revoked'].forEach(status => {
    it('keeps a page-lifetime per-hash ' + status + ' blocker and rejects ready at or below it', async () => {
      addCanonical(PAGE_URL, cleanups);
      const blocked = beginAuction();
      await respondDecision(miss(status, 20));
      await blocked.completion;

      const equalReady = beginAuction();
      await respondDecision(ready(PAGE_SIGNAL, 20));
      await equalReady.completion;
      assertNoInjection(equalReady.auction);

      const newerReady = beginAuction();
      await respondDecision(ready(PAGE_SIGNAL, 21));
      await newerReady.completion;
      assert.deepStrictEqual(newerReady.auction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
    });
  });

  it('lets an accepted blocker evict a ready decision even when its reuse window remains open', async () => {
    addCanonical(PAGE_URL, cleanups);
    const readyRun = beginAuction();
    const blockerRun = beginAuction();
    const requests = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/'));
    requests[0].respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 30)));
    await respondJwksIfRequested();
    await readyRun.completion;
    requests[1].respond(200, HEADERS, JSON.stringify(miss('revoked', 31)));
    await blockerRun.completion;

    const later = beginAuction();
    assert.ok(pendingLookup(), 'blocker must remove ready reuse');
    await respondDecision(miss('revoked', 31));
    await later.completion;
    assertNoInjection(later.auction);
  });

  it('does not let an invalid high-version ready poison any watermark or decision state', async () => {
    addCanonical(STORY_URL, cleanups);
    const invalidRecord = Object.assign({}, STORY_SIGNAL, {
      att: STORY_ATT.slice(0, -1) + (STORY_ATT.endsWith('A') ? 'B' : 'A'),
    });
    const invalid = beginAuction();
    await respondDecision(ready(invalidRecord, 100));
    await invalid.completion;
    assertNoInjection(invalid.auction);

    const valid = beginAuction();
    await respondDecision(ready(STORY_SIGNAL, 5));
    await valid.completion;
    assert.deepStrictEqual(valid.auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
  });

  it('does not let a lower blocker evict a newer ready decision', async () => {
    addCanonical(PAGE_URL, cleanups);
    const readyRun = beginAuction();
    const lowerBlocker = beginAuction();
    const requests = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/'));
    requests[0].respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 40)));
    await respondJwksIfRequested();
    await readyRun.completion;
    requests[1].respond(200, HEADERS, JSON.stringify(miss('revoked', 39)));
    await lowerBlocker.completion;

    const reused = beginAuction();
    await reused.completion;
    assert.deepStrictEqual(reused.auction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
    assert.strictEqual(server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/')).length, 2);
  });

  it('commits signed record revisions and requires byte-identical equality at equal dataset and revision', async () => {
    sandbox.stub(window.crypto.subtle, 'importKey').resolves({});
    sandbox.stub(window.crypto.subtle, 'verify').resolves(true);
    addCanonical(PAGE_URL, cleanups);
    const equal = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 7;
    });
    const conflicting = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 7;
      claims.validation_results.codes = ['valid', 'different'];
    });
    const lowerRevision = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 6;
    });
    const runs = [beginAuction(), beginAuction(), beginAuction(), beginAuction()];
    const requests = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/'));

    requests[0].respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 50)));
    await respondJwksIfRequested();
    await runs[0].completion;

    requests[1].respond(200, HEADERS, JSON.stringify(ready(equal, 50)));
    await runs[1].completion;
    assert.deepStrictEqual(runs[1].auction.adUnits[0].ortb2Imp.ext.c2pa, equal);

    requests[2].respond(200, HEADERS, JSON.stringify(ready(conflicting, 50)));
    await runs[2].completion;
    assertNoInjection(runs[2].auction);

    requests[3].respond(200, HEADERS, JSON.stringify(ready(lowerRevision, 51)));
    await runs[3].completion;
    assertNoInjection(runs[3].auction);

    const cached = beginAuction();
    await cached.completion;
    assert.deepStrictEqual(cached.auction.adUnits[0].ortb2Imp.ext.c2pa, equal);
  });

  it('retains the highest signed revision when a blocker supersedes ready state', async () => {
    sandbox.stub(window.crypto.subtle, 'importKey').resolves({});
    sandbox.stub(window.crypto.subtle, 'verify').resolves(true);
    addCanonical(PAGE_URL, cleanups);
    const lowerRevision = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 6;
    });
    const higherRevision = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 8;
    });
    const readyRun = beginAuction();
    const blockerRun = beginAuction();
    const lowerRun = beginAuction();
    const requests = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/'));

    requests[0].respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 52)));
    await respondJwksIfRequested();
    await readyRun.completion;
    requests[1].respond(200, HEADERS, JSON.stringify(miss('revoked', 53)));
    await blockerRun.completion;
    requests[2].respond(200, HEADERS, JSON.stringify(ready(lowerRevision, 54)));
    await lowerRun.completion;
    assertNoInjection(lowerRun.auction);

    const recovery = beginAuction();
    await respondDecision(ready(higherRevision, 54));
    await recovery.completion;
    assert.deepStrictEqual(recovery.auction.adUnits[0].ortb2Imp.ext.c2pa, higherRevision);
  });

  it('reuses ready status for less than 30 seconds and refreshes at the boundary', async () => {
    const clock = sandbox.useFakeTimers({ now: 1704067200 * 1000 });
    addCanonical(STORY_URL, cleanups);
    const first = beginAuction();
    await respondDecision(ready(STORY_SIGNAL, 55));
    await first.completion;
    const initialLookups = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/')).length;

    clock.tick(29999);
    const reused = beginAuction();
    await reused.completion;
    assert.deepStrictEqual(reused.auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.strictEqual(server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/')).length, initialLookups);

    clock.tick(1);
    const refreshed = beginAuction();
    assert.ok(pendingLookup());
    await respondDecision(miss('miss', 56));
    await refreshed.completion;
    assertNoInjection(refreshed.auction);
  });

  it('refreshes instead of injecting when cached verification crosses the ready-status expiry', async () => {
    const clock = sandbox.useFakeTimers({ now: 1704067200 * 1000 });
    sandbox.stub(window.crypto.subtle, 'importKey').resolves({});
    let resolveCachedVerification;
    const verify = sandbox.stub(window.crypto.subtle, 'verify');
    verify.onCall(0).resolves(true);
    verify.onCall(1).returns(new Promise(resolve => { resolveCachedVerification = resolve; }));
    addCanonical(STORY_URL, cleanups);

    const prime = beginAuction({ timeout: 40000 });
    await respondDecision(ready(STORY_SIGNAL, 55));
    await prime.completion;

    clock.tick(29999);
    const expiredDuringVerification = beginAuction({ timeout: 5000 });
    for (let attempt = 0; attempt < 20 && verify.callCount < 2; attempt += 1) await Promise.resolve();
    assert.strictEqual(verify.callCount, 2, 'cached signature verification must be pending');
    clock.tick(2);
    resolveCachedVerification(true);

    const lookup = await findPending(SIGNAL_ORIGIN + '/v1/attestations/' + STORY_HASH +
      '?publisher_domain=publisher.example&module_version=1.1.0');
    assert.ok(lookup, 'an expired cached status must trigger a fresh lookup');
    lookup.respond(200, HEADERS, JSON.stringify(miss('miss', 56)));
    await expiredDuringVerification.completion;
    assertNoInjection(expiredDuringVerification.auction);
  });

  it('rejects a signed record that expires while WebCrypto verification is pending', async () => {
    const nowSeconds = 1704067200;
    const clock = sandbox.useFakeTimers({ now: nowSeconds * 1000 });
    sandbox.stub(window.crypto.subtle, 'importKey').resolves({});
    let resolveVerification;
    const verify = sandbox.stub(window.crypto.subtle, 'verify')
      .returns(new Promise(resolve => { resolveVerification = resolve; }));
    addCanonical(STORY_URL, cleanups);
    const expiring = recordWithClaims(STORY_SIGNAL, claims => {
      claims.exp = nowSeconds + 1;
      claims.record_revision = 2;
    });

    const run = beginAuction({ timeout: 5000 });
    await respondDecision(ready(expiring, 57));
    for (let attempt = 0; attempt < 20 && verify.callCount < 1; attempt += 1) await Promise.resolve();
    assert.strictEqual(verify.callCount, 1, 'signature verification must be pending');
    clock.tick(1000);
    resolveVerification(true);

    await run.completion;
    assertNoInjection(run.auction);
  });

  it('refreshes the signal lookup when a cached JWS expires before its status TTL', async () => {
    const nowSeconds = 1704067200;
    const clock = sandbox.useFakeTimers({ now: nowSeconds * 1000 });
    sandbox.stub(window.crypto.subtle, 'importKey').resolves({});
    sandbox.stub(window.crypto.subtle, 'verify').resolves(true);
    addCanonical(STORY_URL, cleanups);
    const expiring = recordWithClaims(STORY_SIGNAL, claims => {
      claims.exp = nowSeconds + 10;
      claims.record_revision = 2;
    });
    const renewed = recordWithClaims(STORY_SIGNAL, claims => {
      claims.exp = nowSeconds + 1000;
      claims.record_revision = 3;
    });
    const first = beginAuction();
    await respondDecision(ready(expiring, 57));
    await first.completion;

    clock.tick(11000);
    const refreshed = beginAuction();
    assert.strictEqual(pendingLookup(), undefined, 'cached status is reverified before fallback lookup');
    assert.strictEqual(await respondJwksIfRequested(), true, 'failed cached verification refreshes pinned keys');
    let lookup;
    for (let attempt = 0; attempt < 30 && !lookup; attempt += 1) {
      lookup = pendingLookup();
      if (!lookup) await Promise.resolve();
    }
    assert.ok(lookup, 'expired cached JWS must trigger a fresh signal lookup');
    lookup.respond(200, HEADERS, JSON.stringify(ready(renewed, 58)));
    assert.strictEqual(await respondJwksIfRequested(), true);
    await refreshed.completion;
    assert.deepStrictEqual(refreshed.auction.adUnits[0].ortb2Imp.ext.c2pa, renewed);
  });

  it('rechecks every state comparison at commit time under reverse verification completion', async () => {
    const canonical = addCanonical(STORY_URL, cleanups);
    sandbox.stub(window.crypto.subtle, 'importKey').resolves({});
    let resolveLow;
    let resolveHigh;
    const verify = sandbox.stub(window.crypto.subtle, 'verify');
    verify.onCall(0).resolves(true);
    verify.onCall(1).returns(new Promise(resolve => { resolveLow = resolve; }));
    verify.onCall(2).returns(new Promise(resolve => { resolveHigh = resolve; }));
    verify.onCall(3).resolves(true);

    const prime = beginAuction();
    await respondDecision(ready(STORY_SIGNAL, 1));
    await prime.completion;

    canonical.href = PAGE_URL;
    const lowRecord = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 7;
    });
    const highRecord = recordWithClaims(PAGE_SIGNAL, claims => {
      claims.record_revision = 8;
    });
    const low = beginAuction();
    const high = beginAuction();
    const requests = server.requests.filter(request => (
      request.readyState !== XMLHttpRequest.DONE &&
      request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/')
    ));
    requests[0].respond(200, HEADERS, JSON.stringify(ready(lowRecord, 10)));
    requests[1].respond(200, HEADERS, JSON.stringify(ready(highRecord, 11)));
    for (let attempt = 0; attempt < 20; attempt += 1) await Promise.resolve();
    assert.ok(resolveLow && resolveHigh, 'both signature verifications must be pending');

    resolveHigh(true);
    await high.completion;
    resolveLow(true);
    await low.completion;
    assert.deepStrictEqual(high.auction.adUnits[0].ortb2Imp.ext.c2pa, highRecord);
    assertNoInjection(low.auction);

    const reused = beginAuction();
    await reused.completion;
    assert.deepStrictEqual(reused.auction.adUnits[0].ortb2Imp.ext.c2pa, highRecord);
  });

  it('orders ready, miss, revoked, and stale decisions without rolling state backward', async () => {
    addCanonical(PAGE_URL, cleanups);
    const firstReady = beginAuction();
    const missRun = beginAuction();
    const revokedRun = beginAuction();
    const staleRun = beginAuction();
    const requests = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/'));

    requests[0].respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 60)));
    await respondJwksIfRequested();
    await firstReady.completion;
    requests[1].respond(200, HEADERS, JSON.stringify(miss('miss', 61)));
    await missRun.completion;
    requests[2].respond(200, HEADERS, JSON.stringify(miss('revoked', 62)));
    await revokedRun.completion;
    requests[3].respond(200, HEADERS, JSON.stringify(miss('stale', 63)));
    await staleRun.completion;

    const belowStale = beginAuction();
    await respondDecision(ready(PAGE_SIGNAL, 63));
    await belowStale.completion;
    assertNoInjection(belowStale.auction);

    const recovery = beginAuction();
    await respondDecision(ready(PAGE_SIGNAL, 64));
    await recovery.completion;
    assert.deepStrictEqual(recovery.auction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
  });

  it('injects through auction-local copies and preserves publisher objects with missing impression containers', async () => {
    addCanonical(STORY_URL, cleanups);
    const source = makeAuction();
    source.adUnits[0].ortb2Imp.ext.c2pa = { publisher: 'keep-original' };
    source.adUnits.push({ code: 'missing-all', mediaTypes: { banner: {} } });
    source.adUnits.push({ code: 'missing-ext', ortb2Imp: { id: 'imp-4' } });
    const sourceArray = source.adUnits;
    const sourceUnits = sourceArray.slice();
    const sourceImps = sourceUnits.map(unit => unit.ortb2Imp);
    const sourceExts = sourceImps.map(imp => imp && imp.ext);
    const original = structuredClone(source);
    const run = beginAuction({}, source);
    await respondDecision(ready(STORY_SIGNAL, 70));
    await run.completion;

    assert.notStrictEqual(run.auction.adUnits, sourceArray);
    run.auction.adUnits.forEach((unit, index) => {
      assert.notStrictEqual(unit, sourceUnits[index]);
      assert.notStrictEqual(unit.ortb2Imp, sourceImps[index]);
      assert.notStrictEqual(unit.ortb2Imp.ext, sourceExts[index]);
      assert.deepStrictEqual(unit.ortb2Imp.ext.c2pa, STORY_SIGNAL);
      assert.notStrictEqual(unit.ortb2Imp.ext.c2pa, STORY_SIGNAL);
    });
    assert.deepStrictEqual(sourceArray, original.adUnits);
    assert.strictEqual(run.auction.adUnits[0].ortb2Imp.ext.caller_imp, 'keep-one');
    assert.strictEqual(run.auction.adUnits[1].caller_unit, 'keep-unit');
    assert.deepStrictEqual(run.auction.adUnits[2].mediaTypes, { banner: {} });
    assert.strictEqual(run.auction.adUnits[3].ortb2Imp.id, 'imp-4');
    assert.deepStrictEqual(sourceArray[0].ortb2Imp.ext.c2pa, { publisher: 'keep-original' });
    assert.deepStrictEqual(run.auction.ortb2Fragments, original.ortb2Fragments);
  });

  it('isolates sequential ready, miss, revoked, and wrong-page outcomes that reuse publisher ad units', async () => {
    addCanonical(STORY_URL, cleanups);
    const publisher = makeAuction();
    const sharedAdUnits = publisher.adUnits;
    const original = structuredClone(sharedAdUnits);

    const missed = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    await respondDecision(miss('miss', 71));
    await missed.completion;
    const revoked = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    await respondDecision(miss('revoked', 72));
    await revoked.completion;
    const wrongPage = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    await respondDecision(ready(PAGE_SIGNAL, 73));
    await wrongPage.completion;
    const injected = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    await respondDecision(ready(STORY_SIGNAL, 73));
    await injected.completion;

    assert.strictEqual(missed.auction.adUnits, sharedAdUnits);
    assert.strictEqual(revoked.auction.adUnits, sharedAdUnits);
    assert.strictEqual(wrongPage.auction.adUnits, sharedAdUnits);
    assertNoInjection(missed.auction);
    assertNoInjection(revoked.auction);
    assertNoInjection(wrongPage.auction);
    assert.notStrictEqual(injected.auction.adUnits, sharedAdUnits);
    assert.deepStrictEqual(injected.auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.deepStrictEqual(sharedAdUnits, original);
  });

  it('isolates concurrent ready, miss, revoked, and wrong-page auctions completed in reverse order', async () => {
    addCanonical(STORY_URL, cleanups);
    const publisher = makeAuction();
    const sharedAdUnits = publisher.adUnits;
    const original = structuredClone(sharedAdUnits);
    const injected = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    const missed = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    const revoked = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    const wrongPage = beginAuction({}, Object.assign({}, publisher, { adUnits: sharedAdUnits }));
    const requests = server.requests.filter(request => request.url.startsWith(SIGNAL_ORIGIN + '/v1/attestations/'));

    requests[3].respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 100)));
    await respondJwksIfRequested();
    await wrongPage.completion;
    requests[2].respond(200, HEADERS, JSON.stringify(miss('revoked', 82)));
    await revoked.completion;
    requests[1].respond(200, HEADERS, JSON.stringify(miss('miss', 81)));
    await missed.completion;
    requests[0].respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 84)));
    await respondJwksIfRequested();
    await injected.completion;

    assert.notStrictEqual(injected.auction.adUnits, sharedAdUnits);
    assert.deepStrictEqual(injected.auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.strictEqual(missed.auction.adUnits, sharedAdUnits);
    assert.strictEqual(revoked.auction.adUnits, sharedAdUnits);
    assert.strictEqual(wrongPage.auction.adUnits, sharedAdUnits);
    assertNoInjection(missed.auction);
    assertNoInjection(revoked.auction);
    assertNoInjection(wrongPage.auction);
    assert.deepStrictEqual(sharedAdUnits, original);
  });

  const bodyCases = [
    {
      name: 'limit plus one',
      body(limit) {
        return { matching: 'plus-one', chunks: [new Uint8Array(limit + 1)], headers: HEADERS };
      },
      cancelled: true,
    },
    {
      name: 'one oversized chunk without Content-Length',
      body(limit) {
        return { matching: 'single-oversized', chunks: [new Uint8Array(limit + 128)], headers: HEADERS };
      },
      cancelled: true,
    },
    {
      name: 'many chunks crossing the limit',
      body(limit) {
        return {
          matching: 'multiple-oversized',
          chunks: [new Uint8Array(Math.floor(limit / 2)), new Uint8Array(Math.floor(limit / 2)), new Uint8Array(2)],
          headers: HEADERS,
        };
      },
      cancelled: true,
    },
    {
      name: 'deceptive small Content-Length',
      body(limit) {
        return {
          matching: 'deceptive-length',
          chunks: [new Uint8Array(limit), new Uint8Array(1)],
          headers: Object.assign({}, HEADERS, { 'Content-Length': '1' }),
        };
      },
      cancelled: true,
    },
    {
      name: 'reader rejection',
      body() {
        return { matching: 'reader-rejection', chunks: [], headers: HEADERS, rejectRead: true };
      },
      cancelled: true,
    },
    {
      name: 'null response body',
      body() {
        return { matching: 'body-null', chunks: [], headers: HEADERS, bodyNull: true };
      },
      cancelled: false,
    },
    {
      name: 'malformed UTF-8',
      body() {
        return { matching: 'malformed-utf8', chunks: [Uint8Array.from([0xc3, 0x28])], headers: HEADERS };
      },
      cancelled: false,
    },
  ];

  ['lookup', 'JWKS'].forEach(endpoint => {
    const limit = endpoint === 'lookup' ? 4096 : 65536;

    it('accepts an exact ' + limit + '-byte ' + endpoint + ' body', async () => {
      addCanonical(STORY_URL, cleanups);
      const run = beginAuction();
      const value = endpoint === 'lookup' ? ready(STORY_SIGNAL, 80) : JWKS;
      const body = paddedJson(value, limit);
      const state = installStreamResponse(sandbox, body, { chunks: utf8Chunks(body) });
      if (endpoint === 'lookup') {
        pendingLookup().respond(200, HEADERS, body);
        await respondJwksIfRequested();
      } else {
        pendingLookup().respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 80)));
        const jwks = await findPending(PINNED_JWKS_URL);
        jwks.respond(200, HEADERS, body);
      }
      await run.completion;
      assert.deepStrictEqual(run.auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
      assert.strictEqual(state.cancelCount, 0);
    });

    it('rejects an over-limit declared Content-Length before reading the ' + endpoint + ' body', async () => {
      addCanonical(STORY_URL, cleanups);
      const run = beginAuction();
      const body = 'declared-over-limit';
      const state = installStreamResponse(sandbox, body, { chunks: [new Uint8Array(1)] });
      let request;
      if (endpoint === 'lookup') {
        request = pendingLookup();
      } else {
        pendingLookup().respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 81)));
        request = await findPending(PINNED_JWKS_URL);
      }
      request.respond(200, Object.assign({}, HEADERS, { 'Content-Length': String(limit + 1) }), body);
      await run.completion;
      assertNoInjection(run.auction);
      assert.strictEqual(state.readCount, 0);
      assert.strictEqual(state.cancelCount, 1);
      assert.strictEqual(request.fetch.request.signal.aborted, true);
    });

    bodyCases.forEach(testCase => {
      it('rejects ' + testCase.name + ' for the ' + endpoint + ' body', async () => {
        addCanonical(STORY_URL, cleanups);
        const run = beginAuction();
        const fixture = testCase.body(limit);
        const state = installStreamResponse(sandbox, fixture.matching, {
          chunks: fixture.chunks.slice(),
          rejectRead: fixture.rejectRead,
          bodyNull: fixture.bodyNull,
        });
        let request;
        if (endpoint === 'lookup') {
          request = pendingLookup();
        } else {
          pendingLookup().respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 82)));
          request = await findPending(PINNED_JWKS_URL);
        }
        request.respond(200, fixture.headers, fixture.matching);
        await run.completion;
        assertNoInjection(run.auction);
        assert.strictEqual(state.cancelCount > 0, testCase.cancelled);
        if (testCase.cancelled) assert.strictEqual(request.fetch.request.signal.aborted, true);
      });
    });

    it('cancels the ' + endpoint + ' reader and aborts its request on the deadline', async () => {
      const clock = sandbox.useFakeTimers();
      addCanonical(STORY_URL, cleanups);
      const run = beginAuction({ timeout: 100 });
      const body = 'pending-reader';
      const state = installStreamResponse(sandbox, body, { chunks: [], pendingRead: true });
      let request;
      if (endpoint === 'lookup') {
        request = pendingLookup();
      } else {
        pendingLookup().respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 83)));
        request = await findPending(PINNED_JWKS_URL);
      }
      request.respond(200, HEADERS, body);
      await Promise.resolve();
      clock.tick(100);
      await run.completion;
      assertNoInjection(run.auction);
      assert.strictEqual(state.cancelCount, 1);
      assert.strictEqual(request.fetch.request.signal.aborted, true);
    });
  });

  [
    { event: 'miss', envelope: miss('miss', 90), datasetVersion: 90 },
    { event: 'revoked', envelope: miss('revoked', 91), datasetVersion: 91 },
    { event: 'stale', envelope: miss('stale', 92), datasetVersion: 92 },
    { event: 'invalid', envelope: { v: 1, status: 'miss', dataset_version: 93 }, datasetVersion: undefined },
  ].forEach(testCase => {
    it('reports impression_count zero for the ' + testCase.event + ' diagnostic outcome', async () => {
      addCanonical(STORY_URL, cleanups);
      const run = beginAuction({ telemetry: true });
      await respondDecision(testCase.envelope);
      await run.completion;
      const telemetry = await findPending(SIGNAL_ORIGIN + '/v1/telemetry/rtd');
      assert.ok(telemetry);
      assertDiagnostic(telemetry.requestBody, testCase.event, 0, testCase.datasetVersion);
    });
  });

  it('reports the actual copied impression count only for injected diagnostics', async () => {
    addCanonical(STORY_URL, cleanups);
    const run = beginAuction({ telemetry: true });
    await respondDecision(ready(STORY_SIGNAL, 94));
    await run.completion;
    const telemetry = await findPending(SIGNAL_ORIGIN + '/v1/telemetry/rtd');
    assert.strictEqual(telemetry.fetch.request.credentials, 'omit');
    assert.strictEqual(telemetry.fetch.request.cache, 'no-store');
    assert.strictEqual(telemetry.fetch.request.redirect, 'error');
    assert.strictEqual(requestInit(telemetry.url).referrerPolicy, 'no-referrer');
    assertDiagnostic(telemetry.requestBody, 'injected', 2, 94);
  });

  it('reports impression_count zero for timeout diagnostics', async () => {
    const clock = sandbox.useFakeTimers();
    addCanonical(STORY_URL, cleanups);
    const run = beginAuction({ telemetry: true, timeout: 100 });
    clock.tick(100);
    await run.completion;
    await Promise.resolve();
    const telemetry = await findPending(SIGNAL_ORIGIN + '/v1/telemetry/rtd');
    assertDiagnostic(telemetry.requestBody, 'timeout', 0, undefined);
  });

  it('keeps issuer, reference, JWKS, claims, and ES256 verification pinned', async () => {
    addCanonical(PAGE_URL, cleanups);
    const run = beginAuction();
    await respondDecision(ready(ATTACKER_SIGNAL, 95), {
      jwks: {
        keys: [Object.assign({}, TRUSTED_JWK, { kid: 'attacker-key' })],
      },
    });
    await run.completion;
    assertNoInjection(run.auction);
    assert.deepStrictEqual(decodeClaims(PAGE_ATT).record_revision, 7);
    assert.strictEqual(server.requests.some(request => request.url.includes('/.well-known/jwks.json')), false);
  });
});
