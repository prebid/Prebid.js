import assert from 'assert';
import {
  encypherSubmodule,
  getCanonicalUrl,
  MODULE_NAME,
  resetBeaconState,
  sha256,
} from '../../../modules/encypherRtdProvider.js';
import * as ajaxModule from 'src/ajax.js';
import { server } from 'test/mocks/xhr.js';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};
const API_ISSUER = 'https://api.encypher.com';
const PINNED_JWKS_URL = API_ISSUER + '/api/v1/public/provenance/jwks.json';
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
const CACHE_ATT = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImVuY3lwaGVyLWF0dGVzdGF0aW9uLXRlc3QiLCJ0eXAiOiJlcGF0K2p3cyJ9.eyJjb250ZW50X2hhc2giOiI3WEFDdERucHJJUmZJalY5Z2l1c0ZFUnpENzIyQVcwLXlVTWlsN25zbjNNIiwiZGVjbGFyYXRpb24iOnsibGFiZWwiOiJodW1hbl9kZWNsYXJlZCIsInNvdXJjZV9hc3NlcnRpb24iOiJjMnBhIn0sImV4cCI6MjAwMDAwMDAxMCwiaWF0IjoxOTk5OTk5OTAwLCJpc3MiOiJodHRwczovL2FwaS5lbmN5cGhlci5jb20iLCJtYW5pZmVzdF9kaWdlc3QiOiJCYk9yOGxlYVhyWmtBODE0dmxWXzJHQmpPaF9pRUR4MlFnTU43LU1zWlg4IiwicHVibGlzaGVyX2RvbWFpbiI6InB1Ymxpc2hlci5leGFtcGxlIiwicmVjb3JkX3JldmlzaW9uIjo3LCJzdWIiOiJlcGFfYyIsInRydXN0X3BvbGljeV92ZXJzaW9uIjoidjEiLCJ1cmxfaGFzaCI6IjFxMWIxWHAxV3hybFYzZlhCbXNvOGlwQlppbTk0MDItRUxkWmdNbGtrMjAiLCJ2YWxpZGF0aW9uX3Jlc3VsdHMiOnsiY29kZXMiOlsidmFsaWQiXSwic3RhdHVzIjoidmFsaWQifX0.v76mQ53DJPz0xOKQoa10DURSl1K73rhQU-HcY77X_Vy4PphM7-ndLglRAqKQNIoC194iHCCtwhYhPjXSi0TFww';
const CACHE_SIGNAL = {
  v: 1,
  id: 'epa_c',
  ref: API_ISSUER + '/api/v1/public/provenance/attestations/epa_c',
  att: CACHE_ATT,
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

function addBrowserBait(cleanups) {
  const manifest = document.createElement('meta');
  manifest.name = 'c2pa-manifest-url';
  manifest.content = 'https://publisher.example/private/manifest';
  document.head.appendChild(manifest);
  cleanups.push(() => manifest.parentNode && manifest.parentNode.removeChild(manifest));

  const jsonLd = document.createElement('script');
  jsonLd.type = 'application/ld+json';
  jsonLd.textContent = JSON.stringify({
    '@type': 'NewsArticle',
    articleBody: 'SECRET ARTICLE TEXT THAT MUST NEVER LEAVE THE BROWSER',
  });
  document.head.appendChild(jsonLd);
  cleanups.push(() => jsonLd.parentNode && jsonLd.parentNode.removeChild(jsonLd));

  const article = document.createElement('article');
  article.textContent = 'SECRET ARTICLE TEXT THAT MUST NEVER LEAVE THE BROWSER';
  document.body.appendChild(article);
  cleanups.push(() => article.parentNode && article.parentNode.removeChild(article));
}

function base64url(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeClaims(compact) {
  const encoded = compact.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(encoded + '='.repeat((4 - encoded.length % 4) % 4)));
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

function pendingLookup(signalBase) {
  const prefix = signalBase + '/v1/attestations/';
  return server.requests.slice().reverse().find(request => (
    request.url.startsWith(prefix) && request.readyState !== XMLHttpRequest.DONE
  ));
}

function assertCanonicalLookup(lookup, signalBase, hash, canonicalUrl, publisherDomain = 'publisher.example') {
  assert.ok(lookup, 'edge attestation lookup must be requested');
  const expectedPublisherDomain = publisherDomain.toLowerCase();
  const expectedUrl = signalBase + '/v1/attestations/' + hash +
    '?publisher_domain=' + encodeURIComponent(expectedPublisherDomain);
  assert.strictEqual(lookup.url, expectedUrl);
  const parsed = new URL(lookup.url);
  assert.deepStrictEqual(Array.from(parsed.searchParams), [
    ['publisher_domain', expectedPublisherDomain],
  ]);
  assert.strictEqual(parsed.hash, '');
  assert.strictEqual(lookup.url.includes(canonicalUrl), false, 'the raw canonical URL must not be disclosed');
  assert.strictEqual(lookup.method, 'GET');
  assert.strictEqual(lookup.requestBody, undefined);
  assert.strictEqual(lookup.withCredentials, false);
  assert.strictEqual(lookup.fetch.request.credentials, 'omit');
  assert.strictEqual(lookup.fetch.request.redirect, 'error');
  assert.deepStrictEqual(
    Array.from(lookup.fetch.request.headers.entries()),
    [['accept', 'application/json']],
    'the browser Request must contain only the fixed CORS-safelisted Accept header',
  );
  assert.strictEqual(lookup.fetch.request.headers.has('x-encypher-publisher-domain'), false);
  assert.strictEqual(lookup.fetch.request.headers.has('authorization'), false);
  assert.strictEqual(lookup.fetch.request.headers.has('x-api-key'), false);
  assert.strictEqual(lookup.fetch.request.headers.has('cookie'), false);
}

function respondJwksIfRequested(jwks = JWKS) {
  const request = pendingRequest(PINNED_JWKS_URL);
  if (!request) return false;
  assert.strictEqual(request.fetch.request.credentials, 'omit');
  assert.strictEqual(request.fetch.request.headers.has('authorization'), false);
  assert.strictEqual(request.fetch.request.headers.has('cookie'), false);
  request.respond(200, HEADERS, JSON.stringify(jwks));
  return true;
}

function respondReady(signalBase, hash, canonicalUrl, record, datasetVersion = 7, publisherDomain = 'publisher.example') {
  const lookup = pendingLookup(signalBase);
  assertCanonicalLookup(lookup, signalBase, hash, canonicalUrl, publisherDomain);
  lookup.respond(200, HEADERS, JSON.stringify(ready(record, datasetVersion)));
  respondJwksIfRequested();
}

function assertNoInjection(auction) {
  auction.adUnits.forEach(adUnit => {
    assert.strictEqual(adUnit.ortb2Imp.ext.c2pa, undefined);
  });
}

function assertAuctionFieldsPreserved(auction) {
  assert.strictEqual(auction.adUnits[0].ortb2Imp.ext.gpid, '/1234/article/leaderboard');
  assert.strictEqual(auction.adUnits[0].ortb2Imp.ext.caller_imp, 'keep-one');
  assert.strictEqual(auction.adUnits[1].ortb2Imp.ext.gpid, '/1234/article/rectangle');
  assert.strictEqual(auction.adUnits[1].ortb2Imp.ext.caller_imp, 'keep-two');
  assert.strictEqual(auction.adUnits[1].caller_unit, 'keep-unit');
  assert.deepStrictEqual(auction.ortb2Fragments.global.source.schain, {
    ver: '1.0',
    complete: 1,
    nodes: [{ asi: 'ssp.example', sid: 'publisher-7', hp: 1 }],
  });
  assert.strictEqual(auction.ortb2Fragments.global.ext.caller_global, 'keep-global');
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
  assert.strictEqual(body.module_version, '1.0.0');
  assert.strictEqual(body.event, event);
  assert.strictEqual(body.impression_count, impressionCount);
  assert.strictEqual(Number.isFinite(body.duration_ms), true);
  assert.strictEqual(body.duration_ms >= 0, true);
  assert.strictEqual(body.dataset_version, datasetVersion);
  assert.strictEqual(Object.keys(body).some(key => FORBIDDEN_TELEMETRY_FIELD.test(key)), false);
}

describe('encypherRtdProvider decision-network v1', () => {
  let sandbox;
  let cleanups;
  let sendBeaconStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    cleanups = [];
    sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
  });

  afterEach(() => {
    sandbox.restore();
    if (typeof resetBeaconState === 'function') resetBeaconState();
    cleanups.forEach(cleanup => cleanup());
  });

  it('registers one Encypher provider identity', () => {
    assert.strictEqual(MODULE_NAME, 'encypher');
    assert.strictEqual(encypherSubmodule.name, 'encypher');
    assert.strictEqual(encypherSubmodule.init({ params: { signalBase: 'https://signals.encypher.com' } }), true);
  });

  it('matches the generated canonical URL and unpadded SHA-256 vectors', () => {
    const canonical = addCanonical(CANONICAL_URL_CASES[0][1], cleanups);

    CANONICAL_URL_CASES.forEach(([id, inputUrl, expectedUrl, expectedDigest]) => {
      canonical.href = inputUrl;
      const canonicalUrl = getCanonicalUrl();
      const digest = base64url(sha256(canonicalUrl));

      assert.strictEqual(canonicalUrl, expectedUrl, id + ' canonical URL');
      assert.strictEqual(digest, expectedDigest, id + ' digest');
      assert.match(digest, /^[A-Za-z0-9_-]{43}$/, id + ' unpadded base64url digest');
    });
  });

  it('performs a credentialless lookup, injects only the four-field carrier per impression, and leaves browser data untouched', (done) => {
    const signalBase = 'https://signals.encypher.com';
    addCanonical(STORY_URL, cleanups);
    addBrowserBait(cleanups);
    const storageGet = sandbox.spy(Storage.prototype, 'getItem');
    const storageSet = sandbox.spy(Storage.prototype, 'setItem');
    const auction = makeAuction();
    let callbackCount = 0;

    encypherSubmodule.getBidRequestData(auction, () => {
      callbackCount += 1;
      if (callbackCount > 1) {
        done(new Error('auction callback invoked more than once'));
        return;
      }
      try {
        auction.adUnits.forEach(adUnit => {
          assert.deepStrictEqual(adUnit.ortb2Imp.ext.c2pa, STORY_SIGNAL);
          assert.deepStrictEqual(Object.keys(adUnit.ortb2Imp.ext.c2pa).sort(), ['att', 'id', 'ref', 'v']);
        });
        assertAuctionFieldsPreserved(auction);
        assert.strictEqual(auction.ortb2Fragments.global.site, undefined);
        assert.strictEqual(storageGet.callCount, 0);
        assert.strictEqual(storageSet.callCount, 0);
        assert.strictEqual(server.requests.length, 2, 'only the signal lookup and pinned JWKS reads are allowed');
        assert.strictEqual(server.requests.some(request => /\/(?:sign|manifest)(?:\/|$)/i.test(new URL(request.url).pathname)), false);
        assert.strictEqual(server.requests.some(request => String(request.requestBody).includes('SECRET ARTICLE TEXT')), false);
        assert.strictEqual(server.requests.some(request => request.url.includes('/private/manifest')), false);
        assert.strictEqual(sendBeaconStub.callCount, 0);
        done();
      } catch (error) {
        done(error);
      }
    }, {
      params: {
        signalBase,
        telemetry: false,
        requestHeaders: {
          Authorization: 'Bearer caller-controlled',
          'X-Api-Key': 'caller-controlled',
          'X-Encypher-Publisher-Domain': 'attacker.example',
        },
      },
    });

    assert.strictEqual(callbackCount, 0, 'verification must complete before callback');
    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 17);
  });

  it('accepts exact signed claims from an authorized mirror while pinning issuer, JWKS, domain, URL hash, revision, and status', async () => {
    const signalBase = 'https://partner.signals.encypher.com';
    addCanonical(PAGE_URL, cleanups);
    assert.deepStrictEqual(decodeClaims(PAGE_ATT), {
      content_hash: '7XACtDnprIRfIjV9giusFERzD722AW0-yUMil7nsn3M',
      declaration: { label: 'human_declared', source_assertion: 'c2pa' },
      exp: 4102444800,
      iat: 1704067200,
      iss: API_ISSUER,
      manifest_digest: 'BbOr8leaXrZkA814vlV_2GBjOh_iEDx2QgMN7-MsZX8',
      publisher_domain: 'publisher.example',
      record_revision: 7,
      sub: 'epa_1',
      trust_policy_version: 'v1',
      url_hash: PAGE_HASH,
      validation_results: { codes: ['valid'], status: 'valid' },
    });
    const auction = makeAuction();
    let callbackCount = 0;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false, timeout: 100 } });
    });

    respondReady(signalBase, PAGE_HASH, PAGE_URL, PAGE_SIGNAL, 9);
    await completion;

    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
    assert.strictEqual(server.requests.some(request => request.url === signalBase + '/.well-known/jwks.json'), false);
  });

  it('rejects an attacker-signed response from an allowed signal host', async () => {
    const signalBase = 'https://attacker-signature.signals.encypher.com';
    addCanonical(PAGE_URL, cleanups);
    const auction = makeAuction();
    let callbackCount = 0;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });

    respondReady(signalBase, PAGE_HASH, PAGE_URL, ATTACKER_SIGNAL, 10);
    await completion;

    assert.strictEqual(callbackCount, 1);
    assertNoInjection(auction);
    assert.strictEqual(server.requests.some(request => request.url === signalBase + '/.well-known/jwks.json'), false);
  });

  it('rejects a mirror-substituted ref on an otherwise valid signed record', async () => {
    const signalBase = 'https://partner.signals.encypher.com/approved/reverse-proxy';
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    const substituted = Object.assign({}, STORY_SIGNAL, {
      ref: 'https://attacker.example/substituted-evidence',
    });
    let callbackCount = 0;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });

    respondReady(signalBase, STORY_HASH, STORY_URL, substituted, 11);
    await completion;

    assert.strictEqual(callbackCount, 1);
    assertNoInjection(auction);
  });

  it('bounds page-memory reuse to 30 seconds and refreshes when the canonical URL changes', async () => {
    const signalBase = 'https://lifecycle.signals.encypher.com';
    const clock = sandbox.useFakeTimers({ now: 1704067200 * 1000 });
    const canonical = addCanonical(STORY_URL, cleanups);
    const firstAuction = makeAuction();
    let firstCallbackCount = 0;
    const firstCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(firstAuction, () => {
        firstCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 31);
    await firstCompletion;

    assert.strictEqual(firstCallbackCount, 1);
    assert.deepStrictEqual(firstAuction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    const lookupCountAfterFirstAuction = server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length;

    clock.tick(10000);
    const reusedStoryAuction = makeAuction();
    let reusedStoryCallbackCount = 0;
    const reusedStoryCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(reusedStoryAuction, () => {
        reusedStoryCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    await reusedStoryCompletion;

    assert.strictEqual(reusedStoryCallbackCount, 1);
    assert.deepStrictEqual(reusedStoryAuction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.strictEqual(server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length, lookupCountAfterFirstAuction);

    canonical.href = PAGE_URL;
    const changedUrlAuction = makeAuction();
    let changedUrlCallbackCount = 0;
    const changedUrlCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(changedUrlAuction, () => {
        changedUrlCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    assert.strictEqual(changedUrlCallbackCount, 0);
    assertNoInjection(changedUrlAuction);
    respondReady(signalBase, PAGE_HASH, PAGE_URL, PAGE_SIGNAL, 32);
    await changedUrlCompletion;

    assert.strictEqual(changedUrlCallbackCount, 1);
    assert.deepStrictEqual(changedUrlAuction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
    const lookupCountAfterCanonicalChange = server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length;
    assert.strictEqual(lookupCountAfterCanonicalChange, lookupCountAfterFirstAuction + 1);

    clock.tick(29999);
    const withinTtlAuction = makeAuction();
    let withinTtlCallbackCount = 0;
    const withinTtlCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(withinTtlAuction, () => {
        withinTtlCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    await withinTtlCompletion;

    assert.strictEqual(withinTtlCallbackCount, 1);
    assert.deepStrictEqual(withinTtlAuction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
    assert.strictEqual(server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length, lookupCountAfterCanonicalChange);

    clock.tick(1);
    const staleAuction = makeAuction();
    let staleCallbackCount = 0;
    const staleCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(staleAuction, () => {
        staleCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    assert.strictEqual(staleCallbackCount, 0, 'status refresh must complete before callback');
    assertNoInjection(staleAuction);
    const staleLookup = pendingLookup(signalBase);
    assertCanonicalLookup(staleLookup, signalBase, PAGE_HASH, PAGE_URL);
    staleLookup.respond(200, HEADERS, JSON.stringify({
      v: 1,
      status: 'stale',
      dataset_version: 33,
      record: null,
    }));
    await staleCompletion;

    assert.strictEqual(staleCallbackCount, 1);
    assertNoInjection(staleAuction);
    assert.strictEqual(server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length, lookupCountAfterCanonicalChange + 1);
  });

  it('refreshes an expired page-memory record and fails open on an edge miss', async () => {
    const signalBase = 'https://expiration.signals.encypher.com';
    addCanonical(PAGE_URL, cleanups);
    const clock = sandbox.useFakeTimers({ now: 2000000000 * 1000 });
    const firstAuction = makeAuction();
    let firstCallbackCount = 0;
    const firstCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(firstAuction, () => {
        firstCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    respondReady(signalBase, PAGE_HASH, PAGE_URL, CACHE_SIGNAL, 33);
    await firstCompletion;
    assert.strictEqual(firstCallbackCount, 1);
    assert.deepStrictEqual(firstAuction.adUnits[0].ortb2Imp.ext.c2pa, CACHE_SIGNAL);
    const lookupCountAfterFirstAuction = server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length;

    clock.tick(11000);
    const expiredAuction = makeAuction();
    let expiredCallbackCount = 0;
    const expiredCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(expiredAuction, () => {
        expiredCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });

    assert.strictEqual(expiredCallbackCount, 0, 'fresh lookup must complete before callback');
    assertNoInjection(expiredAuction);
    const expiredLookup = pendingLookup(signalBase);
    assertCanonicalLookup(expiredLookup, signalBase, PAGE_HASH, PAGE_URL);
    expiredLookup.respond(204, HEADERS, null);
    await expiredCompletion;

    assert.strictEqual(expiredCallbackCount, 1);
    assertNoInjection(expiredAuction);
    assert.strictEqual(server.requests.filter(request => (
      request.url.startsWith(signalBase + '/v1/attestations/')
    )).length, lookupCountAfterFirstAuction + 1);
  });

  [
    {
      name: 'an extra ready-envelope key',
      envelope: Object.assign(ready(STORY_SIGNAL, 40), { operator_note: 'unsigned' }),
    },
    {
      name: 'an unsupported ready-envelope version',
      envelope: Object.assign(ready(STORY_SIGNAL, 40), { v: 2 }),
    },
    {
      name: 'a non-positive dataset revision',
      envelope: ready(STORY_SIGNAL, 0),
    },
    {
      name: 'an extra compact-carrier key',
      envelope: ready(Object.assign({}, STORY_SIGNAL, { score: 99 }), 40),
    },
    {
      name: 'a missing compact-carrier field',
      envelope: ready({ v: 1, id: STORY_SIGNAL.id, ref: STORY_SIGNAL.ref }, 40),
    },
    {
      name: 'an unsupported compact-carrier version',
      envelope: ready(Object.assign({}, STORY_SIGNAL, { v: 2 }), 40),
    },
    {
      name: 'a compact carrier over the 1 KiB ceiling',
      envelope: ready(Object.assign({}, STORY_SIGNAL, { att: 'x'.repeat(1100) }), 40),
    },
  ].forEach((testCase, index) => {
    it('fails open once on a ready response with ' + testCase.name, () => {
      const signalBase = 'https://invalid-ready-' + index + '.signals.encypher.com';
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
      }, { params: { signalBase, telemetry: false } });
      const lookup = pendingLookup(signalBase);
      assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
      lookup.respond(200, HEADERS, JSON.stringify(testCase.envelope));

      assert.strictEqual(callbackCount, 1);
      assertNoInjection(auction);
      assert.strictEqual(pendingRequest(PINNED_JWKS_URL), undefined);
      assert.strictEqual(sendBeaconStub.callCount, 0);
    });
  });

  [
    {
      name: 'an unparseable URL',
      signalBase: 'https://[',
    },
    {
      name: 'URL credentials',
      signalBase: 'https://user:pass@signals.encypher.com',
    },
    {
      name: 'an empty query component',
      signalBase: 'https://signals.encypher.com?',
    },
    {
      name: 'an empty query component on an allowed subdomain',
      signalBase: 'https://partner.signals.encypher.com?',
    },
    {
      name: 'a query component',
      signalBase: 'https://signals.encypher.com?tenant=publisher',
    },
    {
      name: 'an empty fragment component',
      signalBase: 'https://signals.encypher.com#',
    },
    {
      name: 'an empty fragment component on an allowed subdomain',
      signalBase: 'https://partner.signals.encypher.com#',
    },
    {
      name: 'a fragment delimiter followed only by a removable slash',
      signalBase: 'https://signals.encypher.com#/',
    },
    {
      name: 'a fragment delimiter followed only by a removable slash on an allowed subdomain',
      signalBase: 'https://partner.signals.encypher.com#/',
    },
    {
      name: 'a fragment component',
      signalBase: 'https://signals.encypher.com#publisher',
    },
    {
      name: 'an arbitrary host',
      signalBase: 'https://attacker.example',
    },
    {
      name: 'a hostname-prefix lookalike',
      signalBase: 'https://signals.encypher.com.attacker.example',
    },
    {
      name: 'the uncontrolled parent domain',
      signalBase: 'https://encypher.com',
    },
    {
      name: 'a hostname-suffix lookalike',
      signalBase: 'https://evil-signals.encypher.com',
    },
    {
      name: 'an explicit custom port',
      signalBase: 'https://signals.encypher.com:8443',
    },
    {
      name: 'a legacy arbitrary fixture host',
      signalBase: 'https://signal.test',
    },
  ].forEach(({ name, signalBase }) => {
    it('fails open once without network activity for signalBase with ' + name, () => {
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
      }, { params: { signalBase, telemetry: true } });

      assert.strictEqual(callbackCount, 1, 'invalid signalBase must fail open synchronously exactly once');
      assert.deepStrictEqual(auction, original);
      assertNoInjection(auction);
      assert.strictEqual(server.requests.length, 0, 'invalid configuration must not request signals or JWKS');
      assert.strictEqual(sendBeaconStub.callCount, 0, 'invalid signalBase must not emit telemetry');
    });
  });

  it('fails open once when request construction throws synchronously', () => {
    const signalBase = 'https://request-failure.signals.encypher.com';
    const clock = sandbox.useFakeTimers();
    sandbox.stub(window, 'Request').throws(new TypeError('request construction failed'));
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    const original = structuredClone(auction);
    let callbackCount = 0;

    encypherSubmodule.getBidRequestData(auction, () => {
      callbackCount += 1;
    }, { params: { signalBase, telemetry: false, timeout: 100 } });

    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction, original);
    assertNoInjection(auction);
    assert.strictEqual(server.requests.length, 0);
    assert.strictEqual(sendBeaconStub.callCount, 0);
    clock.tick(100);
    assert.strictEqual(callbackCount, 1, 'cleared request and deadline timers must not call back again');
  });

  it('rejects lookup redirects and fails open exactly once without carrier or key request when fetch rejects', async () => {
    const signalBase = 'https://redirect-failure.signals.encypher.com';
    const clock = sandbox.useFakeTimers();
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    const original = structuredClone(auction);
    let callbackCount = 0;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false, timeout: 100 } });
    });

    const lookup = pendingLookup(signalBase);
    assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
    assert.strictEqual(
      lookup.fetch.request.redirect,
      'error',
      'the browser must reject redirects before publisher_domain and urlHash can reach another origin',
    );
    lookup.error(new TypeError('redirect rejected'));
    await completion;

    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction, original);
    assertNoInjection(auction);
    assert.strictEqual(pendingRequest(PINNED_JWKS_URL), undefined);
    assert.strictEqual(sendBeaconStub.callCount, 0);
    clock.tick(100);
    assert.strictEqual(callbackCount, 1, 'cleared request and deadline timers must not call back again');
  });

  it('rejects pinned JWKS redirects and fails open exactly once without a carrier when fetch rejects', async () => {
    const signalBase = 'https://jwks-redirect-failure.signals.encypher.com';
    const clock = sandbox.useFakeTimers();
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    const original = structuredClone(auction);
    let callbackCount = 0;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false, timeout: 100 } });
    });

    const lookup = pendingLookup(signalBase);
    assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
    lookup.respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 47)));

    const jwks = pendingRequest(PINNED_JWKS_URL);
    assert.ok(jwks, 'the pinned JWKS must be requested before verification');
    assert.strictEqual(jwks.fetch.request.credentials, 'omit');
    assert.strictEqual(
      jwks.fetch.request.redirect,
      'error',
      'the browser must reject redirects while fetching the pinned verification key set',
    );
    assert.deepStrictEqual(
      Array.from(jwks.fetch.request.headers.entries()),
      [['accept', 'application/json']],
      'the pinned JWKS Request must contain only the fixed CORS-safelisted Accept header',
    );
    jwks.error(new TypeError('redirect rejected'));
    await completion;

    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction, original);
    assertNoInjection(auction);
    assert.strictEqual(sendBeaconStub.callCount, 0);
    clock.tick(100);
    assert.strictEqual(callbackCount, 1, 'cleared request and deadline timers must not call back again');
  });

  it('fails open without requesting keys when the total deadline expires after the edge response', async () => {
    const signalBase = 'https://deadline.signals.encypher.com';
    const clock = sandbox.useFakeTimers({ now: 1704067200 * 1000 });
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    const original = structuredClone(auction);
    let callbackCount = 0;
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false, timeout: 100 } });
    });

    const lookup = pendingLookup(signalBase);
    assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
    clock.setSystemTime(1704067200 * 1000 + 100);
    lookup.respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 48)));
    await completion;

    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction, original);
    assertNoInjection(auction);
    assert.strictEqual(pendingRequest(PINNED_JWKS_URL), undefined);
    assert.strictEqual(sendBeaconStub.callCount, 0);
  });

  [
    {
      name: 'an unsafe signal origin',
      startOnly: true,
      signalBase: 'http://signals.encypher.com',
    },
    {
      name: 'an HTTP 204 miss',
      respond(request) { request.respond(204, HEADERS, null); },
    },
    {
      name: 'a network failure',
      respond(request) { request.error(new TypeError('edge unavailable')); },
    },
    {
      name: 'malformed JSON',
      respond(request) { request.respond(200, HEADERS, '{not-json'); },
    },
    {
      name: 'a stale tombstone',
      respond(request) {
        request.respond(200, HEADERS, JSON.stringify({
          v: 1,
          status: 'stale',
          dataset_version: 41,
          record: null,
        }));
      },
    },
    {
      name: 'a stale tombstone carrying an unsigned record',
      respond(request) {
        request.respond(200, HEADERS, JSON.stringify({
          v: 1,
          status: 'stale',
          dataset_version: 42,
          record: STORY_SIGNAL,
        }));
      },
    },
    {
      name: 'a revoked tombstone',
      respond(request) {
        request.respond(200, HEADERS, JSON.stringify({
          v: 1,
          status: 'revoked',
          dataset_version: 42,
          record: null,
        }));
      },
    },
  ].forEach((testCase, index) => {
    it('fails open and calls back exactly once on ' + testCase.name, (done) => {
      const signalBase = testCase.signalBase || 'https://fail-open-' + index + '.signals.encypher.com';
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error('auction callback invoked more than once'));
          return;
        }
        try {
          assert.deepStrictEqual(auction, original);
          assertNoInjection(auction);
          assert.strictEqual(sendBeaconStub.callCount, 0);
          done();
        } catch (error) {
          done(error);
        }
      }, { params: { signalBase, telemetry: false } });

      if (testCase.startOnly) {
        assert.strictEqual(callbackCount, 1);
        return;
      }
      assert.strictEqual(callbackCount, 0);
      const lookup = pendingLookup(signalBase);
      assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
      testCase.respond(lookup);
    });
  });

  [
    {
      name: 'a non-200 pinned JWKS response',
      respond(request) { request.respond(503, HEADERS, 'unavailable'); },
    },
    {
      name: 'malformed pinned JWKS JSON',
      respond(request) { request.respond(200, HEADERS, '{not-json'); },
    },
  ].forEach((testCase, index) => {
    it('fails open once when key discovery returns ' + testCase.name, (done) => {
      const signalBase = 'https://jwks-failure-' + index + '.signals.encypher.com';
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error('auction callback invoked more than once'));
          return;
        }
        try {
          assert.deepStrictEqual(auction, original);
          assertNoInjection(auction);
          assert.strictEqual(sendBeaconStub.callCount, 0);
          done();
        } catch (error) {
          done(error);
        }
      }, { params: { signalBase, telemetry: false } });

      const lookup = pendingLookup(signalBase);
      assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
      lookup.respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 49)));
      const jwks = pendingRequest(PINNED_JWKS_URL);
      assert.ok(jwks, 'the pinned JWKS must be requested before verification');
      testCase.respond(jwks);
    });
  });

  [
    {
      name: 'an extra signed claim',
      mutate(claims) { claims.operator_note = 'not-in-the-contract'; },
    },
    {
      name: 'a malformed digest claim',
      mutate(claims) { claims.content_hash = 'not-a-sha256-digest'; },
    },
  ].forEach((testCase, index) => {
    it('fails open once when the attestation contains ' + testCase.name, (done) => {
      const signalBase = 'https://invalid-claims-' + index + '.signals.encypher.com';
      const record = Object.assign({}, STORY_SIGNAL, {
        att: replaceClaims(STORY_ATT, testCase.mutate),
      });
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error('auction callback invoked more than once'));
          return;
        }
        try {
          assert.deepStrictEqual(auction, original);
          assertNoInjection(auction);
          assert.strictEqual(sendBeaconStub.callCount, 0);
          done();
        } catch (error) {
          done(error);
        }
      }, { params: { signalBase, telemetry: false } });

      respondReady(signalBase, STORY_HASH, STORY_URL, record, 51 + index);
    });
  });

  [
    {
      name: 'a malformed P-256 coordinate',
      jwks: { keys: [Object.assign({}, TRUSTED_JWK, { x: 'not-a-coordinate' })] },
    },
    {
      name: 'duplicate matching key IDs',
      jwks: { keys: [TRUSTED_JWK, Object.assign({}, TRUSTED_JWK)] },
    },
  ].forEach((testCase, index) => {
    it('fails open once when the pinned key set contains ' + testCase.name, (done) => {
      const signalBase = 'https://unusable-jwk-' + index + '.signals.encypher.com';
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error('auction callback invoked more than once'));
          return;
        }
        try {
          assert.deepStrictEqual(auction, original);
          assertNoInjection(auction);
          assert.strictEqual(sendBeaconStub.callCount, 0);
          done();
        } catch (error) {
          done(error);
        }
      }, { params: { signalBase, telemetry: false } });

      const lookup = pendingLookup(signalBase);
      assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
      lookup.respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 55 + index)));
      assert.strictEqual(respondJwksIfRequested(testCase.jwks), true);
    });
  });

  [
    {
      name: 'malformed protected-header encoding',
      mutate(segments) { segments[0] = '*'; },
    },
    {
      name: 'malformed payload encoding',
      mutate(segments) { segments[1] = '*'; },
    },
    {
      name: 'non-canonical signature encoding',
      mutate(segments) { segments[2] = segments[2].slice(0, -1) + 'h'; },
    },
  ].forEach((testCase, index) => {
    it('fails open once on ' + testCase.name, (done) => {
      const signalBase = 'https://malformed-jws-' + index + '.signals.encypher.com';
      const segments = STORY_ATT.split('.');
      testCase.mutate(segments);
      const malformedRecord = Object.assign({}, STORY_SIGNAL, { att: segments.join('.') });
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error('auction callback invoked more than once'));
          return;
        }
        try {
          assert.deepStrictEqual(auction, original);
          assertNoInjection(auction);
          assert.strictEqual(sendBeaconStub.callCount, 0);
          done();
        } catch (error) {
          done(error);
        }
      }, { params: { signalBase, telemetry: false } });

      respondReady(signalBase, STORY_HASH, STORY_URL, malformedRecord, 50 + index);
    });
  });

  [
    ['key import', 'importKey'],
    ['signature verification', 'verify'],
  ].forEach(([operation, method], index) => {
    it('fails open once when WebCrypto ' + operation + ' rejects', (done) => {
      const signalBase = 'https://webcrypto-failure-' + index + '.signals.encypher.com';
      sandbox.stub(window.crypto.subtle, method).rejects(new Error(operation + ' failed'));
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error('auction callback invoked more than once'));
          return;
        }
        try {
          assert.deepStrictEqual(auction, original);
          assertNoInjection(auction);
          assert.strictEqual(sendBeaconStub.callCount, 0);
          done();
        } catch (error) {
          done(error);
        }
      }, { params: { signalBase, telemetry: false } });

      respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 53 + index);
    });
  });

  it('fails open once on an invalid ES256 signature', (done) => {
    const signalBase = 'https://invalid-signature.signals.encypher.com';
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    const invalidSignature = Object.assign({}, STORY_SIGNAL, {
      att: STORY_ATT.slice(0, -1) + (STORY_ATT.endsWith('A') ? 'B' : 'A'),
    });
    let callbackCount = 0;

    encypherSubmodule.getBidRequestData(auction, () => {
      callbackCount += 1;
      if (callbackCount > 1) {
        done(new Error('auction callback invoked more than once'));
        return;
      }
      try {
        assertNoInjection(auction);
        done();
      } catch (error) {
        done(error);
      }
    }, { params: { signalBase, telemetry: false } });

    respondReady(signalBase, STORY_HASH, STORY_URL, invalidSignature, 50);
  });

  it('uses one total timeout across signal and JWKS reads, then ignores a late response', () => {
    const signalBase = 'https://timeout.signals.encypher.com';
    const clock = sandbox.useFakeTimers();
    server.autoTimeout = true;
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    let callbackCount = 0;

    encypherSubmodule.getBidRequestData(auction, () => {
      callbackCount += 1;
    }, { params: { signalBase, telemetry: false, timeout: 100 } });

    const lookup = pendingLookup(signalBase);
    assertCanonicalLookup(lookup, signalBase, STORY_HASH, STORY_URL);
    clock.tick(90);
    lookup.respond(200, HEADERS, JSON.stringify(ready(STORY_SIGNAL, 60)));
    const jwks = pendingRequest(PINNED_JWKS_URL);
    assert.ok(jwks);
    clock.tick(9);
    assert.strictEqual(callbackCount, 0);
    clock.tick(1);

    assert.strictEqual(jwks.fetch.request.signal.aborted, true);
    assert.strictEqual(callbackCount, 1);
    assertNoInjection(auction);
    jwks.respond(200, HEADERS, JSON.stringify(JWKS));
    assert.strictEqual(callbackCount, 1);
    assertNoInjection(auction);
  });

  it('refreshes pinned JWKS immediately on an unknown kid before failing open once', (done) => {
    const signalBase = 'https://unknown-kid.signals.encypher.com';
    const canonical = addCanonical(STORY_URL, cleanups);
    const firstAuction = makeAuction();
    let firstCallbackCount = 0;
    let secondCallbackCount = 0;
    let refreshResponded = false;

    encypherSubmodule.getBidRequestData(firstAuction, () => {
      firstCallbackCount += 1;
      if (firstCallbackCount > 1) {
        done(new Error('first callback invoked more than once'));
        return;
      }
      try {
        canonical.href = PAGE_URL;
        const encodedHeader = btoa(JSON.stringify({
          alg: 'ES256',
          kid: 'emergency-rotated-key',
          typ: 'epat+jws',
        })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const unknownKidRecord = Object.assign({}, PAGE_SIGNAL, {
          att: encodedHeader + '.' + PAGE_ATT.split('.').slice(1).join('.'),
        });
        const secondAuction = makeAuction();

        encypherSubmodule.getBidRequestData(secondAuction, () => {
          secondCallbackCount += 1;
          try {
            assert.strictEqual(refreshResponded, true);
            assert.strictEqual(secondCallbackCount, 1);
            assertNoInjection(secondAuction);
            done();
          } catch (error) {
            done(error);
          }
        }, { params: { signalBase, telemetry: false } });

        const lookup = pendingLookup(signalBase);
        assertCanonicalLookup(lookup, signalBase, PAGE_HASH, PAGE_URL);
        lookup.respond(200, HEADERS, JSON.stringify(ready(unknownKidRecord, 61)));
        Promise.resolve().then(() => {
          if (secondCallbackCount > 0) return;
          const jwksRequests = server.requests.filter(request => request.url === PINNED_JWKS_URL);
          assert.strictEqual(jwksRequests.length, 2);
          const refreshedJwks = pendingRequest(PINNED_JWKS_URL);
          assert.ok(refreshedJwks);
          refreshResponded = true;
          refreshedJwks.respond(200, HEADERS, JSON.stringify({ keys: [] }));
        }).catch(done);
      } catch (error) {
        done(error);
      }
    }, { params: { signalBase, telemetry: false } });

    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 60);
  });

  it('discards a cached record whose expiration claim can no longer be decoded', async () => {
    const signalBase = 'https://cached-expiration.signals.encypher.com';
    addCanonical(STORY_URL, cleanups);
    const firstAuction = makeAuction();
    let firstCallbackCount = 0;
    const firstCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(firstAuction, () => {
        firstCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 62);
    await firstCompletion;

    sandbox.stub(window, 'atob').throws(new TypeError('decoder unavailable'));
    const secondAuction = makeAuction();
    const original = structuredClone(secondAuction);
    let secondCallbackCount = 0;
    const secondCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(secondAuction, () => {
        secondCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });

    const refreshedLookup = pendingLookup(signalBase);
    assertCanonicalLookup(refreshedLookup, signalBase, STORY_HASH, STORY_URL);
    refreshedLookup.respond(204, HEADERS, null);
    await secondCompletion;

    assert.strictEqual(firstCallbackCount, 1);
    assert.strictEqual(secondCallbackCount, 1);
    assert.deepStrictEqual(secondAuction, original);
    assertNoInjection(secondAuction);
    assert.strictEqual(sendBeaconStub.callCount, 0);
  });

  it('refreshes after cached verification rejects and fails open if refreshed verification also rejects', async () => {
    const signalBase = 'https://verification-refresh.signals.encypher.com';
    const canonical = addCanonical(STORY_URL, cleanups);
    const firstAuction = makeAuction();
    let firstCallbackCount = 0;
    const firstCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(firstAuction, () => {
        firstCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 64);
    await firstCompletion;

    canonical.href = PAGE_URL;
    const secondAuction = makeAuction();
    const original = structuredClone(secondAuction);
    let secondCallbackCount = 0;
    const secondCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(secondAuction, () => {
        secondCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });

    const cachedVerificationClock = sandbox.stub(Date, 'now').callThrough();
    cachedVerificationClock.onCall(2).throws(new TypeError('cached verification clock unavailable'));
    const lookup = pendingLookup(signalBase);
    assertCanonicalLookup(lookup, signalBase, PAGE_HASH, PAGE_URL);
    lookup.respond(200, HEADERS, JSON.stringify(ready(PAGE_SIGNAL, 65)));
    await Promise.resolve();

    const refreshedJwks = pendingRequest(PINNED_JWKS_URL);
    assert.ok(refreshedJwks, 'cached verification rejection must force a pinned-key refresh');
    cachedVerificationClock.restore();
    sandbox.stub(Date, 'now').onFirstCall().throws(new TypeError('refreshed verification clock unavailable'));
    refreshedJwks.respond(200, HEADERS, JSON.stringify(JWKS));
    await secondCompletion;

    assert.strictEqual(firstCallbackCount, 1);
    assert.strictEqual(secondCallbackCount, 1);
    assert.deepStrictEqual(secondAuction, original);
    assertNoInjection(secondAuction);
    assert.strictEqual(server.requests.filter(request => request.url === PINNED_JWKS_URL).length, 2);
    assert.strictEqual(sendBeaconStub.callCount, 0);
  });

  it('emits only diagnostic telemetry after callback and swallows telemetry transport failure', async () => {
    const signalBase = 'https://telemetry.signals.encypher.com';
    addCanonical(STORY_URL, cleanups);
    const auction = makeAuction();
    let callbackCount = 0;
    let telemetryBody;

    sendBeaconStub.callsFake((url, serializedBody) => {
      assert.strictEqual(callbackCount, 1, 'callback must precede telemetry');
      assert.strictEqual(url, signalBase + '/v1/telemetry/rtd');
      telemetryBody = serializedBody;
      throw new Error('diagnostic transport failed');
    });
    const completion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: true } });
    });

    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 63);
    await completion;

    assert.strictEqual(callbackCount, 1);
    assert.deepStrictEqual(auction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.strictEqual(sendBeaconStub.callCount, 1);
    assertDiagnostic(telemetryBody, 'injected', 2, 63);
    assert.strictEqual(telemetryBody.includes(STORY_URL), false);
    assert.strictEqual(telemetryBody.includes(STORY_HASH), false);
    assert.strictEqual(telemetryBody.includes(STORY_SIGNAL.id), false);
    assert.strictEqual(telemetryBody.includes(STORY_SIGNAL.att), false);
  });
});
