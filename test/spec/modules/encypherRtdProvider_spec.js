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
  assert.deepStrictEqual({
    url: lookup.url,
    publisherDomain: lookup.fetch.request.headers.get('x-encypher-publisher-domain'),
  }, {
    url: signalBase + '/v1/attestations/' + hash,
    publisherDomain,
  });
  const parsed = new URL(lookup.url);
  assert.strictEqual(parsed.search, '', 'the raw URL must not be disclosed in a query');
  assert.strictEqual(parsed.hash, '');
  assert.strictEqual(lookup.url.includes(canonicalUrl), false, 'the raw canonical URL must not be disclosed');
  assert.strictEqual(lookup.method, 'GET');
  assert.strictEqual(lookup.requestBody, undefined);
  assert.strictEqual(lookup.withCredentials, false);
  assert.strictEqual(lookup.fetch.request.credentials, 'omit');
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
    assert.strictEqual(encypherSubmodule.init({ params: { signalBase: 'https://signal.test' } }), true);
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
    const signalBase = 'https://signal.injection.test';
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
    }, { params: { signalBase, telemetry: false } });

    assert.strictEqual(callbackCount, 0, 'verification must complete before callback');
    respondReady(signalBase, STORY_HASH, STORY_URL, STORY_SIGNAL, 17);
  });

  it('accepts exact signed claims from an authorized mirror while pinning issuer, JWKS, domain, URL hash, revision, and status', async () => {
    const signalBase = 'https://operator-mirror.example';
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

  it('rejects attacker-controlled transport trust even when the response carries an attacker signature', async () => {
    const signalBase = 'https://attacker.example';
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
    const signalBase = 'https://operator-mirror-ref.test';
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

  it('reuses page memory for the same canonical URL but performs a fresh lookup after canonical URL changes', async () => {
    const signalBase = 'https://signal.lifecycle.test';
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

    const refreshAuction = makeAuction();
    let refreshCallbackCount = 0;
    const refreshCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(refreshAuction, () => {
        refreshCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    await refreshCompletion;

    assert.strictEqual(firstCallbackCount, 1);
    assert.strictEqual(refreshCallbackCount, 1);
    assert.deepStrictEqual(refreshAuction.adUnits[0].ortb2Imp.ext.c2pa, STORY_SIGNAL);
    assert.strictEqual(server.requests.filter(request => request.url === signalBase + '/v1/attestations/' + STORY_HASH).length, 1);

    canonical.href = PAGE_URL;
    const nextAuction = makeAuction();
    let nextCallbackCount = 0;
    const nextCompletion = new Promise(resolve => {
      encypherSubmodule.getBidRequestData(nextAuction, () => {
        nextCallbackCount += 1;
        resolve();
      }, { params: { signalBase, telemetry: false } });
    });
    assert.strictEqual(nextCallbackCount, 0);
    assertNoInjection(nextAuction);
    respondReady(signalBase, PAGE_HASH, PAGE_URL, PAGE_SIGNAL, 32);
    await nextCompletion;

    assert.strictEqual(nextCallbackCount, 1);
    assert.deepStrictEqual(nextAuction.adUnits[0].ortb2Imp.ext.c2pa, PAGE_SIGNAL);
  });

  it('does not replay a page-memory record after its signed expiration and performs no second lookup', async () => {
    const signalBase = 'https://signal.expiration.test';
    addCanonical(PAGE_URL, cleanups);
    const now = sandbox.stub(Date, 'now').returns(2000000000 * 1000);
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
    const requestCount = server.requests.length;

    now.returns(2000000011 * 1000);
    const expiredAuction = makeAuction();
    let expiredCallbackCount = 0;
    encypherSubmodule.getBidRequestData(expiredAuction, () => {
      expiredCallbackCount += 1;
    }, { params: { signalBase, telemetry: false } });

    assert.strictEqual(expiredCallbackCount, 1);
    assertNoInjection(expiredAuction);
    assert.strictEqual(server.requests.length, requestCount);
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
      const signalBase = 'https://invalid-ready-' + index + '.test';
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
      name: 'URL credentials',
      signalBase: 'https://user:pass@signals.example',
    },
    {
      name: 'a query component',
      signalBase: 'https://signals.example?tenant=publisher',
    },
    {
      name: 'a fragment component',
      signalBase: 'https://signals.example#publisher',
    },
  ].forEach(({ name, signalBase }) => {
    it('fails open once without network activity for signalBase with ' + name, () => {
      addCanonical(STORY_URL, cleanups);
      const auction = makeAuction();
      const original = structuredClone(auction);
      let callbackCount = 0;

      encypherSubmodule.getBidRequestData(auction, () => {
        callbackCount += 1;
      }, { params: { signalBase, telemetry: false } });

      assert.strictEqual(callbackCount, 1);
      assert.deepStrictEqual(auction, original);
      assert.strictEqual(server.requests.length, 0, 'invalid configuration must not request signals or JWKS');
      assert.strictEqual(sendBeaconStub.callCount, 0);
    });
  });

  [
    {
      name: 'an unsafe signal origin',
      startOnly: true,
      signalBase: 'http://signal.test',
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
      const signalBase = testCase.signalBase || 'https://fail-open-' + index + '.test';
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

  it('fails open once on an invalid ES256 signature', (done) => {
    const signalBase = 'https://invalid-signature.test';
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
    const signalBase = 'https://signal.timeout.test';
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
    const signalBase = 'https://unknown-kid.test';
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

  it('emits only diagnostic telemetry after callback and swallows telemetry transport failure', async () => {
    const signalBase = 'https://signal.telemetry.test';
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
