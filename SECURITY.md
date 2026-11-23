# Security Policy

Prebid.js is a browser library that runs header bidding on publisher pages. Its
scope, trust boundaries, and intended security properties are described in
[THREAT_MODEL.md](THREAT_MODEL.md).

## Reportable Findings and Severity Context

Report a concrete violation of a security boundary or intended control. Describe
the affected version or commit, module selection and configuration, attacker
capability, input entry point, reachable code path, and resulting impact. A minimal
reproduction or a clear source-to-impact explanation helps establish reachability.

Examples include unintended publisher-origin script execution, cross-frame data
disclosure or unauthorized actions, prototype pollution with meaningful impact,
bypasses of effective privacy controls, and compromise of build or release integrity.
Assess availability issues by their effect on the page or other auctions, attacker
effort, and repeatability, rather than treating every rejected bid as a security bug.

Severity depends on required privileges and interaction, deployment exposure,
affected users, data sensitivity, and the scope of integrity or availability loss.
State when an issue requires an optional module or a particular configuration;
neither condition alone makes it unreportable. For dependency advisories, explain
whether the vulnerable behavior is reachable in a shipped bundle or a build/CI path.

Defeats of publisher-selected creative isolation (SafeFrames or safe rendering) are
a priority. For these, show the publisher configuration and intended protection, the
fields or responses the attacker controls, and the path to unintended execution or
privileged access. A compromised remote host is a valid precondition.

## Reporting a Vulnerability

Keep suspected vulnerabilities, exploit details, credentials, and user data out of
public issues and pull requests. Report privately through GitHub's
[Report a vulnerability](https://github.com/prebid/Prebid.js/security/advisories/new)
form (the repository's Security tab). Include the affected version, required
configuration, reproduction steps, and expected security impact, using synthetic or
redacted data.

A module that does not use the privacy controls as described in
[THREAT_MODEL.md](THREAT_MODEL.md#modules), with no external input involved, can be
reported in a public issue: the code is already public, so there is nothing to
disclose privately. If you are unsure whether external input is involved, report
privately.
