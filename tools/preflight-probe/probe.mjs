// Replays the requests captured by vitest.config.mjs against the real endpoints, with and without what makes a
// browser send a CORS preflight, and classifies each module. See README.md.
// Usage: node tools/preflight-probe/probe.mjs [--dry-run] [--only name1,name2] [--from saved-results.json]
/* eslint-disable jsdoc/require-jsdoc -- a maintainer script, not shipped code */
import fs from 'node:fs'
import path from 'node:path'

const DIR = import.meta.dirname
const CAPTURE_DIR = path.join(DIR, 'out', 'capture')
const ORIGIN = 'https://example.com'
const REFERER = 'https://example.com/preflight-probe.html'
const USER_AGENT = 'Prebid.js preflight probe (+https://github.com/prebid/Prebid.js)'
const TIMEOUT = 10000
const CONCURRENCY = 8

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null

const SAFE_CONTENT_TYPES = ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']
const SAFE_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type', 'range']
// hosts spec fixtures use as stand-ins; probing them would test nothing
const FIXTURE_HOST = /(^|\.)(example\.(com|org|net)|test\.com|localhost|test|invalid|local)$|^[\d.]+$|^\[/
const AUTH_HEADER = /key|token|auth|secret|signature|client-?id/i
// what the capture can't tell: where a trigger comes from, or a host that is publisher configuration
const APN_TEST = { note: 'X-Is-Test is sent only with the apn_test debug flag' }
const CONTEXT = {
  appnexusBidAdapter: APN_TEST,
  mediafuseBidAdapter: APN_TEST,
  winrBidAdapter: APN_TEST,
  prebidServerBidAdapter: { cls: 'out of scope', note: "headers come from the publisher's s2sConfig.customHeaders" },
  liveIntentIdSystem: { note: 'X-LI-Provided-User-Agent is sent only when providedUserAgent is configured' },
  revcontentBidAdapter: { cls: 'inconclusive', note: 'the spec fixture overrides the endpoint param; the default host is trends.revcontent.com' },
  semantiqRtdProvider: { note: 'application/json is on the clickstream event collector, not the keywords request' },
  symitriDapRtdProvider: { cls: 'inconclusive', note: "the host is publisher configuration (api_hostname); this one is the spec fixture's" },
}

const kindOf = (name) => /BidAdapter$/.test(name) ? 'bidder' : /Id[sS]ystem$/.test(name) ? 'userId' : /RtdProvider$/.test(name) ? 'rtd' : null
const mime = (ct) => (ct ?? '').split(';')[0].trim().toLowerCase()

// The headers of a request that make a browser preflight it.
function triggers (headers, hasBody) {
  return Object.entries(headers).flatMap(([name, value]) => {
    name = name.toLowerCase()
    if (name === 'content-type') {
      if (SAFE_CONTENT_TYPES.includes(mime(value))) return []
      return [hasBody ? `contentType ${mime(value)}` : `contentType ${mime(value)} (no body)`]
    }
    return SAFE_HEADERS.includes(name) ? [] : [`header ${name}`]
  })
}

// Requests from spec.buildRequests, with the headers bidderFactory would send for them.
function fromBuilds (builds) {
  return builds.map(b => {
    const method = (b.method || 'POST').toUpperCase()
    // protocol-relative endpoints resolve against an https page; some fixtures pass a full URL where the adapter
    // prepends the scheme itself
    let url = b.url.replace(/^\/\//, 'https://').replace(/^https?:\/\/(?=https?:\/\/)/, '')
    let body = b.data ?? null
    if (method === 'GET' && body) {
      if (body.startsWith('{')) {
        const params = new URLSearchParams(JSON.parse(body))
        url += (url.includes('?') ? '&' : '?') + params
      } else {
        url += (url.includes('?') ? '&' : '?') + body
      }
      body = null
    }
    const headers = { ...(b.options.customHeaders ?? {}), 'content-type': b.options.contentType || 'text/plain' }
    return { url, method, headers, body, credentials: b.options.withCredentials !== false, compressed: !!b.options.endpointCompression }
  })
}

function fromRequests (requests) {
  return requests.map(r => ({
    url: r.url,
    method: r.method,
    headers: Object.fromEntries(r.headers),
    body: r.body,
    credentials: r.credentials === 'include',
  }))
}

function host (url) {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

// One target per module: the first captured request that would be preflighted, on a real (non-fixture) host.
function targets () {
  return fs.readdirSync(CAPTURE_DIR).filter(f => f.endsWith('.json')).flatMap(f => {
    const name = f.replace(/\.json$/, '')
    const kind = kindOf(name)
    if (!kind || (only && !only.has(name))) return []
    const { requests, builds } = JSON.parse(fs.readFileSync(path.join(CAPTURE_DIR, f), 'utf8'))
    // a bidder's bid requests are what spec.buildRequests returns; anything else it sends (win/timeout pixels,
    // syncs) is off the auction's critical path
    const candidates = (kind === 'bidder' ? fromBuilds(builds) : fromRequests(requests))
      .map(r => ({ ...r, triggers: triggers(r.headers, r.body != null) }))
      .filter(r => /^https?:/.test(r.url))
    const flagged = candidates.filter(r => r.triggers.length)
    if (!flagged.length) {
      const others = kind === 'bidder' ? fromRequests(requests).filter(r => triggers(r.headers, r.body != null).length) : []
      return others.length ? [{ name, kind, offPath: true, request: others[0], triggers: triggers(others[0].headers, others[0].body != null), share: '' }] : []
    }
    const realHosts = flagged.filter(r => !FIXTURE_HOST.test(host(r.url) ?? ''))
    const real = realHosts.find(r => r.url.startsWith('https:')) ?? realHosts[0]
    const share = `${flagged.length}/${candidates.length}`
    return [{ name, kind, share, request: real ?? flagged[0], triggers: (real ?? flagged[0]).triggers, fixtureOnly: !real }]
  })
}

function summarize (body, contentType, kind) {
  if (!body.trim()) return 'empty'
  try {
    const json = JSON.parse(body)
    if (kind !== 'bidder') return 'json'
    const priced = JSON.stringify(json).match(/"(cpm|price)"\s*:\s*"?[1-9.]/)
    return priced ? 'bid' : 'no-bid'
  } catch {
    const text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    return /json|javascript/.test(contentType) ? `unparseable json: ${text}` : `text: ${text}`
  }
}

async function send (url, init, kind) {
  try {
    const res = await fetch(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) })
    const body = await res.text()
    const contentType = res.headers.get('content-type') ?? ''
    const cors = Object.fromEntries([...res.headers].filter(([n]) => n.startsWith('access-control-')))
    return { status: res.status, contentType: mime(contentType), summary: summarize(body, contentType, kind), cors }
  } catch (e) {
    return { status: 0, error: e.name === 'TimeoutError' ? 'timeout' : (e.cause?.code ?? e.message) }
  }
}

const baseHeaders = { 'user-agent': USER_AGENT, origin: ORIGIN, referer: REFERER }

function corsAllows (cors, credentials) {
  const acao = cors['access-control-allow-origin']
  if (acao !== ORIGIN && !(acao === '*' && !credentials)) return `allow-origin ${acao ?? 'missing'}`
  if (credentials && cors['access-control-allow-credentials'] !== 'true') return 'allow-credentials missing'
  return null
}

const ok = (r) => r.status >= 200 && r.status < 300
const NETWORK_FAILURE = /^(timeout|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|CERT_|ERR_TLS|UNABLE_TO|DEPTH_ZERO|SELF_SIGNED)/
const textError = (r) => /^(text|unparseable json):/.test(r.summary ?? '')

function preflightHeaders (t) {
  return [...new Set(t.triggers.map(x => x.startsWith('header ') ? x.slice(7) : 'content-type'))].sort()
}

function preflightHeaderProblem (c, t) {
  const allowed = (c.cors['access-control-allow-headers'] ?? '').toLowerCase().split(',').map(h => h.trim())
  const missing = preflightHeaders(t).filter(h => !allowed.includes(h) && !(allowed.includes('*') && !t.request.credentials))
  return missing.length ? `allow-headers lacks ${missing.join(', ')}` : null
}

function classify (t, a, b, c) {
  const notes = [CONTEXT[t.name]?.note].filter(Boolean)
  if (CONTEXT[t.name]?.cls) return { cls: CONTEXT[t.name].cls, notes }
  if (t.offPath) notes.push('only outside the bid request (e.g. win/timeout notification)')
  if (t.triggers.some(x => AUTH_HEADER.test(x))) notes.push('auth header')
  if (t.request.compressed) notes.push('gzip-capable (sent uncompressed here)')
  if (t.triggers.every(x => x.endsWith('(no body)'))) notes.push('only a Content-Type on a request without a body: core stops sending it in #16291')
  if (t.fixtureOnly) return { cls: 'not probed', notes: [...notes, 'spec fixtures use a placeholder host only'] }
  if (a.status === 0) {
    // one failed request is not proof of a dead endpoint when the next one got through
    if (ok(b)) return { cls: 'inconclusive', notes: [...notes, `(a) ${a.error}, (b) ${b.status}`] }
    return { cls: NETWORK_FAILURE.test(a.error) ? 'broken today' : 'inconclusive', notes: [...notes, `(a) ${a.error}`] }
  }
  if ([429, 503].includes(a.status)) return { cls: 'inconclusive', notes: [...notes, `rate-limited or overloaded (${a.status}), not retried`] }
  if (a.status === 415) return { cls: 'broken today', notes: [...notes, 'the endpoint rejects the content type the module sends'] }
  if (c.status === 0) return { cls: NETWORK_FAILURE.test(c.error) ? 'broken today' : 'inconclusive', notes: [...notes, `preflight ${c.error}`] }
  if (!ok(c)) {
    if (/origin/i.test(a.summary ?? '')) return { cls: 'inconclusive', notes: [...notes, `preflight ${c.status}`, 'origin allowlist?'] }
    if (ok(b)) notes.push('(b) is accepted: dropping the trigger would fix it')
    return { cls: 'broken today', notes: [...notes, `preflight ${c.status}`] }
  }
  const corsProblem = corsAllows(c.cors, t.request.credentials) ?? preflightHeaderProblem(c, t)
  if (corsProblem) return { cls: 'inconclusive', notes: [...notes, `preflight ${corsProblem} for ${ORIGIN} (no CORS, or an origin allowlist)`] }
  const aCors = ok(a) && a.cors && corsAllows(a.cors, t.request.credentials)
  if (aCors) return { cls: 'inconclusive', notes: [...notes, `(a) response ${aCors} for ${ORIGIN}`] }
  if (ok(a)) {
    if (b.status === 0) return { cls: 'inconclusive', notes: [...notes, `(b) ${b.error}`] }
    if (!ok(b) || textError(b)) return { cls: 'needs it', notes }
    if (a.summary === b.summary || (a.summary !== 'bid' && b.summary !== 'bid' && a.contentType === b.contentType)) return { cls: 'works without', notes }
    return { cls: 'inconclusive', notes: [...notes, 'both 2xx, different response'] }
  }
  if (b.status === 415 && a.status !== 415) return { cls: 'needs it', notes: [...notes, `(a) ${a.status} with test params, (b) 415`] }
  if (ok(b)) return { cls: 'inconclusive', notes: [...notes, `(a) ${a.status} but (b) ${b.status}: accepts text/plain`] }
  return { cls: 'inconclusive', notes: [...notes, a.status === b.status ? 'both rejected the same way (test params?)' : `(a) ${a.status}, (b) ${b.status}`] }
}

async function probe (t) {
  const req = t.request
  const custom = Object.fromEntries(Object.entries(req.headers).filter(([n]) => n.toLowerCase() !== 'content-type'))
  const plain = Object.fromEntries(Object.entries(custom).filter(([n, v]) => !triggers({ [n]: v }, true).length))
  const ctype = req.headers['content-type']
  const out = { name: t.name, kind: t.kind, host: host(req.url), method: req.method, triggers: t.triggers, share: t.share }
  if (t.fixtureOnly || dryRun) return { ...out, cls: t.fixtureOnly ? 'not probed' : 'dry run', notes: [] }
  const body = req.method === 'GET' ? undefined : req.body ?? undefined
  const a = await send(req.url, { method: req.method, headers: { ...custom, ...(ctype ? { 'content-type': ctype } : {}), ...baseHeaders }, body }, t.kind)
  const b = await send(req.url, {
    method: req.method,
    headers: { ...plain, ...(body != null ? { 'content-type': 'text/plain;charset=UTF-8' } : {}), ...baseHeaders },
    body
  }, t.kind)
  const c = await send(req.url, {
    method: 'OPTIONS',
    headers: { ...baseHeaders, 'access-control-request-method': req.method, 'access-control-request-headers': preflightHeaders(t).join(',') },
  }, t.kind)
  return { ...out, a, b, c, ...classify(t, a, b, c) }
}

const list = targets()
let results = []
if (from) {
  // reclassifies a saved run without sending anything
  const saved = Object.fromEntries(JSON.parse(fs.readFileSync(from, 'utf8')).map(r => [r.name, r]))
  results = list.filter(t => saved[t.name]?.a || t.fixtureOnly).map(t => {
    const { a, b, c } = saved[t.name] ?? {}
    return { name: t.name, kind: t.kind, host: host(t.request.url), method: t.request.method, triggers: t.triggers, share: t.share, a, b, c, ...classify(t, a, b, c) }
  })
} else {
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    results.push(...await Promise.all(list.slice(i, i + CONCURRENCY).map(probe)))
  }
  if (!dryRun) fs.writeFileSync(path.join(DIR, 'out', 'results.json'), JSON.stringify(results, null, 2))
}

const outcome = (r) => r ? `${r.status || r.error}${r.summary ? ' ' + r.summary.slice(0, 40) : ''}` : ''
const cell = (s) => String(s).replace(/\|/g, '\\|')
const ORDER = ['broken today', 'needs it', 'inconclusive', 'works without', 'not probed', 'out of scope', 'dry run']
results.sort((x, y) => ORDER.indexOf(x.cls) - ORDER.indexOf(y.cls) || x.kind.localeCompare(y.kind) || x.name.localeCompare(y.name))
console.log('| class | type | module | host | method | trigger | (a) as sent | (b) text/plain | (c) preflight | notes |')
console.log('|---|---|---|---|---|---|---|---|---|---|')
for (const r of results) {
  console.log('| ' + [r.cls, r.kind, r.name, r.host, r.method, r.triggers.join('; '), outcome(r.a), outcome(r.b), outcome(r.c), r.notes.join('; ')].map(cell).join(' | ') + ' |')
}
