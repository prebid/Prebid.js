# Overview

Module Name: AdChoices Signal Module
Module Type: Consent Module
Maintainer: prebid@aboutads.info

# Description

This module reads the [DAA (Digital Advertising Alliance) AdChoices Signal](https://github.com/Digital-Advertising-Alliance/DAA-Choice-Tools/blob/main/AdChoices%20Signal/AdChoices%20Signal%20Specification.md)
and conveys it in the OpenRTB bid stream as the community extension
`regs.ext.adchoices`, as described in Appendix 5 of the specification.

The AdChoices Signal is a base64url-encoded string that expresses a user's
interest-based advertising preferences. In the browser it can be read from the
DAA's [Protect My Choices (PMC)](https://github.com/Digital-Advertising-Alliance/DAA-Choice-Tools/blob/main/Protect%20My%20Choices/PMC2%20Overview.md)
extension, which exposes the signal via a `window.postMessage` protocol. When a
user does not have the extension installed, no signal is read and nothing is
added to the bid stream.

Publishers who obtain the signal by other means (for example, reading the
`X-AdChoices` request header on their server) can supply it directly through the
module's `signal` configuration option.

# Integration

Build the module into your Prebid.js package:

```bash
gulp build --modules=adChoices
```

# Configuration

The module works with no configuration. To supply a static signal or to opt into
delaying auctions while the signal is read, use the `adChoices` config namespace:

```javascript
pbjs.setConfig({
  adChoices: {
    // Optional: a statically supplied AdChoices Signal. Takes precedence over a
    // value read from the browser extension.
    signal: 'AAEAA... (base64url signal)',

    // Optional: max milliseconds to delay the first auction while waiting for the
    // signal from the extension. Default 0 (non-blocking).
    timeout: 0
  }
});
```

| Param | Scope | Type | Description |
|---|---|---|---|
| `signal` | optional | string | A statically supplied AdChoices Signal. When set, it is used as-is and takes precedence over any value read from the Protect My Choices extension. |
| `timeout` | optional | integer | Max milliseconds to delay auctions while waiting for the signal from the extension. Defaults to `0` (non-blocking) so that users without the extension are not delayed. When set to a positive value, the first auction is delayed up to this many ms; the delay window starts when an auction begins waiting and applies once, so later auctions are not re-delayed. |

# What changes in the bid request

When a signal is available it is added to every outgoing bid request at
`regs.ext.adchoices`:

```json
{
  "regs": {
    "ext": {
      "adchoices": "<AdChoices Signal string>"
    }
  }
}
```

# How the signal is read

When included, the module automatically begins listening for the signal from the
Protect My Choices extension using the documented message protocol:

1. The extension posts an `ExtensionLoaded` message when it is ready.
2. The module requests the preferences by posting `{ type: "GetAdPreferences" }`.
3. The extension responds with an `AdPreferences` message whose `data` field
   contains the AdChoices Signal string.

The module also proactively sends a `GetAdPreferences` request on startup in case
the `ExtensionLoaded` message fired before the listener was attached.

Note: page JavaScript cannot read the `X-AdChoices` (Chrome) / `Cookie2` (Safari)
headers that the extension injects into outbound requests — those are intended for
server-side consumption. In the browser, the postMessage protocol (or the `signal`
config option) is the supported way to obtain the value.
