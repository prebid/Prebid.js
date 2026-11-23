# Threat Model

Prebid.js is a browser library that runs header bidding on publisher pages. Publishers
choose the modules, configure auctions and privacy controls, and integrate with ad
servers, consent management platforms (CMPs), and third-party services.

## Scope

This model covers the code and delivery paths in this repository:

- `src/`: public APIs, auction orchestration, bidder interfaces, network helpers,
  creative messaging, rendering, storage, and activity controls.
- `modules/` and `libraries/`: bidder, analytics, user ID, real-time data, consent,
  and server-side bidding integrations, and their shared helpers.
- `creative/`: code compiled for execution inside creative frames.
- Build tooling, `plugins/`, `customize/`, `web-bundler/`, dependencies, and
  `.github/`: production bundle integrity and contributor, CI, and release security.

Tests and `integrationExamples/` describe intended behavior and integration
assumptions; they are not production security guarantees.

Prebid Server, ad servers, CMPs, and bidder backends are separate systems with their
own security boundaries. How this repository handles their responses, and how it
integrates with them, is in scope.

## Assets

- Publisher-page execution and DOM integrity.
- Auction and targeting integrity.
- User identifiers, consent signals, first-party data, and browser storage.
- Credentials and artifacts used to build and publish releases.

## Trust Boundaries

**Publisher configuration is trusted.** Publishers control their configuration and
the scripts they load on the page.

**Modules are semi-trusted** (see [Modules](#modules)).

**Remote data is not.** Selecting a module or endpoint does not make the data it
returns trustworthy. Potentially hostile inputs include:

- bidder and Prebid Server responses;
- nested creative and native-ad data;
- remote configuration;
- URLs;
- messages from other windows and frames.

Any configured bidder, creative, or other network host may be compromised and return
hostile responses; HTTPS protects the channel, not the content. Trusted core or
adapter code running in the top frame does not make the remote data it processes
trusted. A message type or ad identifier alone does not establish that its sender is
authorized.

The main boundaries are:

- the publisher page versus cross-origin creative frames;
- the browser versus remote services;
- untrusted contribution content versus privileged CI and release execution.

Browser origin isolation and integration-specific frame settings help enforce these
boundaries, but only where they actually apply to a given code path.

## Modules

Bid, analytics, user ID, and RTD modules are mostly written by third-party vendors
whose interests can differ from the publisher's. The publisher chooses which modules
to include, and maintainers review them before they are merged, but at runtime they
run with full page privileges: nothing in the browser stops a module from reading
cookies, globals, or configuration directly.

Privacy controls are therefore enforced by convention: core applies them on the paths
modules are expected to use, and code review checks that modules use those paths,
with lint as a first filter. A module that goes around them breaks the publisher's controls as surely as
an exploit would.

| Activity | Enforced by | Modules must |
|---|---|---|
| `accessDevice` | `storageManager` | access cookies and web storage only through a storage manager obtained for the module |
| `transmitUfpd`, `transmitEids`, `transmitPreciseGeo`, `transmitTid` | redaction of `ortb2` and bid requests before they reach the adapter | take user data, IDs, geolocation, and transaction IDs only from the request they are given, not from configuration, globals, or storage |
| `enrichUfpd`, `enrichEids` (RTD modules) | guarded `ortb2Fragments` passed to the module | add data to requests only through the fragments they are given |
| `enrichEids` (user ID modules) | `userId`, which drops the IDs of a denied module | provide IDs only as the return value of the submodule interface |
| `syncUser` | `userSync` | run user syncs only by registering them with `userSync` |
| `loadExternalScript` | `adloader`; lint limits which files may import it | load scripts only through `adloader`, and only from a file on the lint allowlist (`plugins/eslint/approvedLoadExternalScriptPaths.js`) |
| `accessRequestCredentials` | `ajax`, which downgrades credentialed requests | make network requests through `ajax`, not native `fetch` |
| `fetchBids`, `reportAnalytics`, `acceptBid` | core, before the module is invoked | — |

Review is what enforces this. Lint flags the literal forms of the most common
workarounds (direct `localStorage`, `sessionStorage`, `document.cookie`,
`XMLHttpRequest`, `fetch`, and `navigator.sendBeacon`), which catches accidents but
not intent: an alias, a computed property name, or a disable comment gets past it.
Passing lint is not evidence that a module stays within the controls. Reading user
IDs from configuration or another module's globals has no lint rule at all.

Modules also handle untrusted responses. Core strips prototype-pollution keys from
the response bodies it parses itself (see
[Known Limitations](#known-limitations)). JSON that a module parses itself must go
through `parseUntrustedJSON`, and response data must be merged into other objects
with `mergeDeep` rather than a hand-written recursive merge.

## Creative Isolation

Publishers can use SafeFrames or another safe-rendering integration to keep ad
JavaScript out of the top frame. This is the boundary of greatest concern: hostile
responses must not defeat it.

The boundary covers the whole path a response takes: receipt, parsing, adapter
interpretation, asset loading, callbacks, messaging, and rendering. Code that handles
a response before it reaches the creative frame is part of it, so top-frame execution
during response processing breaks isolation even if the final creative ends up in an
isolated frame. A rendering failure that falls back to top-frame execution breaks it
too. An iframe, or a renderer named "safe", provides isolation only if the integration
actually prevents top-frame execution.

Permission to contact a host does not grant its responses top-frame execution. A
compromised host is a realistic attacker; the compromise itself is outside Prebid.js,
but what its responses can then do on the page is not.

## Security Properties

These are the intended properties. Not every code path is guaranteed to enforce them
yet.

- **No code injection or prototype pollution.** External data does not modify shared
  JavaScript prototypes or become executable code in a more privileged context
  through parsing, merging, or interpolation, either in shared helpers or in
  adapter-specific handling.
- **Isolation is preserved.** When a publisher selects creative isolation, hostile
  bid responses, creative data, and responses from compromised hosts do not obtain
  top-frame execution, and rendering failures do not downgrade isolation.
- **Creative messaging respects the frame boundary.** Requests, replies, native
  actions, and render events are tied to the right bid and permitted action, and do
  not expose unrelated sensitive data or enable unintended publisher-page operations.
- **Privacy controls cannot be bypassed by external input.** Effective consent,
  activity, storage, and user-sync restrictions apply to the operations and data
  they govern, including through aliases and server-side paths. Hostile input
  cannot make a denied activity proceed through an alternate helper or callback.
- **Modules stay within the privacy controls.** Modules perform controlled
  activities only through the paths listed under [Modules](#modules).
- **Outbound data respects restrictions.** Bid requests, analytics, user syncs, and
  other outbound flows honor configured restrictions and redaction. Data available
  to one component is not thereby available to every recipient.
- **Adversarial input is contained.** Malformed input does not grant permissions,
  corrupt unrelated auctions, or cause disproportionate browser resource use.
- **The release pipeline is protected.** Untrusted pull-request content and build
  inputs do not obtain release secrets or privileged workflow execution, and cannot
  alter published artifacts outside the review and release process.

## Accepted Risk

Creative HTML, scripts, and external renderers run in the context they were rendered
into. A publisher who chooses to run ads in the top frame accepts the risk of that
execution, and the capabilities it directly grants are not Prebid.js
vulnerabilities. This does not extend to defeating a publisher's choice of isolation
(see [Creative Isolation](#creative-isolation)).

This is the only accepted risk; other exclusions require a maintainer decision.

## Known Limitations

- Privacy behavior depends on the selected modules, CMP integration, publisher
  configuration, rule priorities, and timing. Activity checks allow an operation
  unless an applicable rule denies it; there is no universal default-deny.
- Module compliance with the privacy controls rests on review at merge time. Nothing
  verifies it at runtime, and lint is only a first filter.
- The `transmit*` activities redact what bid adapters and Prebid Server receive.
  Analytics adapters are governed by `reportAnalytics` alone: one that is allowed to
  report sees auction data without that redaction.
- Core strips prototype-pollution keys from bidder and Prebid Server response bodies,
  and from native `adm` strings parsed by the ORTB converter. JSON that a module
  parses on its own, including `adm`, is not covered unless the module uses
  `parseUntrustedJSON`, and the parser does not protect a merge that walks inherited
  properties; `mergeDeep` does.
- Tests and helper names describe intent; they do not show that every caller is
  protected.
