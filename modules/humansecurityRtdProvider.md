# Overview

```
Module Name: HUMAN Security Rtd provider
Module Type: Rtd Provider
Maintainer: alexey@humansecurity.com
```

## What is it?

The HUMAN Security RTD submodule offers publishers a mechanism to integrate pre-bid signal collection
for the purpose of providing real-time protection against all sorts of invalid traffic,
such as bot-generated ad interactions or sophisticated ad fraud schemes.

## How does it work?

HUMAN Security RTD submodule generates a HUMAN Security token, which then can be consumed by adapters,
sent within bid requests, and used for bot detection on the backend.

## Key Facts about the HUMAN Security RTD Submodule

* Enriches bid requests with IVT signal, historically done post-bid
* No incremental signals collected beyond existing HUMAN post-bid solution
* Offsets negative impact from loss of granularity in IP and User Agent at bid time
* Does not expose collected IVT signal to any party who doesn’t otherwise already have access to the same signal collected post-bid
* Does not introduce meaningful latency, as demonstrated in the Latency section
* Comes at no additional cost to collect IVT signal and make it available at bid time
* Leveraged to differentiate the invalid bid requests at device level, and cannot be used to identify a user or a device, thus preserving privacy.

# Build

First, make sure to add the HUMAN Security submodule to your Prebid.js package with:

```bash
gulp build --modules="rtdModule,humansecurityRtdProvider,..."
```

> `rtdModule` is a required module to use HUMAN Security RTD module.

# Configuration

This module is configured as part of the `realTimeData.dataProviders` object.
Please refer to [Prebid Documentation](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#setConfig-realTimeData)
on RTD module configuration for details on required and optional parameters of `realTimeData`.

By default, using this submodule *does not require any prior communication with HUMAN, nor any special configuration*,
besides just indicating that it should be loaded:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'humansecurity'
        }]
    }
});
```

It can be optionally parameterized, for example, to include client ID obtained from HUMAN,
should any advanced reporting be needed, or to have verbose output for troubleshooting:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'humansecurity',
            params: {
                clientId: 'ABC123',
                verbose: true
            }
        }]
    }
});
```

## Supported parameters

| Name             |Type           | Description                                                         | Required |
| :--------------- | :------------ | :------------------------------------------------------------------ |:---------|
| `clientId`  | String | Should you need advanced reporting, contact [prebid@humansecurity.com](prebid@humansecurity.com) to receive client ID. | No |
| `verbose`   | Boolean | Only set to `true` if troubleshooting issues. | No |

## Logging, latency and troubleshooting

The optional `verbose` parameter can be especially helpful to troubleshoot any issues and/or monitor latency.

By default, the submodule may, in case of unexpected issues, invoke `logError`, emitting `auctionDebug` events
of type `ERROR`. With `verbose` parameter set to `true`, it may additionally:

* Call `logWarning`, resulting in `auctionDebug` events of type `WARNING`,
* Call `logInfo` with latency information.
  * To observe these messages in console, Prebid.js must be run in
    [debug mode](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#debugging) -
    either by adding `?pbjs_debug=true` to your page's URL, or by configuring with `pbjs.setConfig({ debug: true });`

Example output of the latency information:

```
INFO: [humansecurity]: impl JS time to init (ms): 6.
INFO: [humansecurity]: impl JS time to collect (ms): 13.
```

Here, the two reported metrics are how much time the signal collection script spent blocking on initialization,
and the total time required to obtain the signals, respectively. Note that "time to collect" metric accounts
for all the time spent since the script has started initializing until the signals were made available to the bidders,
therefore it includes "time to init", and typically some non-blocking time spent waiting for signals. Only “time to init” is blocking.

# How can I contribute?

Prebid has launched a Measurement Taskforce to address signal deprecation and measurement in the current environment,
which has become a publisher-level issue. Without a solution, granularity of measurement disappears.
If you would like to participate to help identify and develop solutions to these problems such as the one tackled
by this submodule, please consider joining the [Measurement Taskforce](https://prebid.org/project-management-committees/).

# Notes

## Operation model

Following is the expected data flow:

* Prebid.js gets initialized, including the HUMAN RTD submodule.
* The submodule loads the signal collection implementation script from a high-performance, low latency endpoint.
* This script starts collecting the signals, and makes them available to the RTD submodule as soon as possible.
* The RTD submodule places the collected signals into the ORTB structure for bid adapters to pick up.
* Bid adapters are expected to retrieve the `ortb2.device.ext.hmns` object and incorporate it into their bid requests.
* Bid requests having the `ortb2.device.ext.hmns` data allow their backend to make more informative requests to HUMAN Ad Fraud Defense.
  * Should bid requests be passed to other platforms during the bidding process, adapter developers are
    encouraged to keep `ortb2.device.ext.hmns` so that, for example, a downstream DSP can also have this data passed to HUMAN.

## Remarks on the collected signals

There are a few points that are worth being mentioned separately, to avoid confusion and unnecessary suspicion:

* The nature of the collected signals is exactly the same as those already collected in analytics scripts
  that arrive in the ads via existing post-bid processes.
* The signals themselves are even less verbose than those HUMAN normally collects post-bid, because of timing / performance requirements.
* No signals attempt to identify users. Their only purpose is to classify traffic into valid / invalid.
* The signal collection script is external to Prebid.js. This ensures that it can be constantly kept up to date with
  the ever-evolving nature of the threat landscape without the publishers having to rebuild their Prebid.js frequently.
  * The signal collection script is also obfuscated, as a defense-in-depth measure in order to complicate tampering by
    bad actors, as are all similar scripts in the industry, which is something that cannot be accommodated by Prebid.js itself.

## Why is this approach an innovation?

Historically, IVT protection is achieved via dropping analytics scripts and/or pixels in the ads, which enriches impression data with collected signals.
Those signals, when analyzed by IVT protection vendors, allow distinguishing valid from invalid traffic, but only retroactively -
after the impression was served, and all the participant infrastructures have already participated in serving the request.

This not only leads to unnecessary infrastructure costs, but to uncomfortable and often difficult processes of reconciliation
and reimbursement, or claw-back. When handled only at the post-bid stage, the true bad actors have already achieved their objectives,
and legitimate advertisers, platforms, and publishers are left holding the bag.

HUMAN’s Ad Fraud Defense solves this problem by making predictions at the pre-bid stage about whether the traffic is fraudulent,
allowing the platforms to knowingly not participate in the IVT-generated auctions.

However, the challenge in making those predictions is that even these prebid predictions rely primarily on historical data,
which not only introduces lag, but typically might be less accurate than direct decision making (were it possible) using
the high-quality signals obtained from the pixels and/or JS analytics scripts delivered in the ads.

The HUMAN Security RTD submodule bridges the gap by introducing a new innovation: it **facilitates the very same signal
collection that is typically performed post-bid, but at the pre-bid stage, and makes the signals available during bidding.**
This not only permits for accurate invalid traffic detection at the earliest stages of the auction process, but diminishes
the impacts of signal deprecation such as the loss of IP and User Agent on effective fraud mitigation.

## Why is this good for publishers?

In the process of Invalid Traffic reconciliation, publishers are often the last to know, as they are informed by their downstream
partners that the inventory they had provided in good faith has been detected as invalid traffic. This is most painful when it
happens via post-bid detection when publishers are often the last party in the chain from whom the others can collect clawbacks,
and the publishers themselves are left with little recourse. And when invalid traffic is blocked by platforms prebid, it is after
the fact of publishers having sent out bid requests, thus harming fill rates, revenue opportunities, and overall auction and bidding
efficiencies. And of course, invalid traffic whether detected post-bid or pre-bid is damaging to the publisher’s reputation
with its demand partners.

The HUMAN Security RTD submodule creates a more efficient integration for the process of invalid traffic mitigation.
Invalid traffic detection and filtration is being done already with or without the participation of publishers, and measurement
will be done on the ad inventory because advertisers need it to manage their own ad spend. The HUMAN Security RTD submodule gives
publishers a direct seat, and in fact the first seat, in the invalid traffic detection process, allowing it to be done effectively,
directly, and in a way that provides the publisher with more direct insight.

Existing models of signal deprecation suggest that IP protection is going to be 100 times or more less granular.
This would normally be expected to significantly reduce the ability to do prebid publisher-side predictions. This in turn would prevent
the ability to see if specific impressions are bad and instead potentially result in the whole publisher being identified as being
invalid traffic by a buyer. It is important to note that the purpose of data collection by the HUMAN Security RTD submodule is
specifically for invalid traffic detection and filtration. It will not be used for unrelated and unauthorized purposes
like targeting audiences, etc.

The HUMAN Security RTD submodule makes sure to have the best integration possible to avoid revenue loss.
It will help publishers avoid painful clawbacks. Currently, clawbacks are based on opaque measurement processes downstream from
publishers where the information is controlled and withheld. The HUMAN Security RTD submodule will make publishers a more direct
party to the measurement and verification process and help make sure the origin and the recipient match.

Importantly, the effective use of the HUMAN Security RTD submodule signifies to SSPs and buyers that the publisher
is a joint partner in ensuring quality ad delivery, and demonstrates that the publisher is a premium supply source.

Finally, the HUMAN Security RTD submodule sets the ecosystem up for a future where publisher level reporting is facilitated.
This will allow for increased transparency about what is happening with publisher inventory, further enhancing and
ensuring the value of the inventory.

## FAQ

### Is latency an issue?

The HUMAN Security RTD submodule is designed to minimize any latency in the auction within normal SLAs.

### Do publishers get any insight into how the measurement is judged?

Having the The HUMAN Security RTD submodule be part of the prebid process will allow the publisher to have insight
into the invalid traffic metrics as they are determined and provide confidence that they are delivering quality
inventory to the buyer.

### How are privacy concerns addressed?

The HUMAN Security RTD submodule seeks to reduce the impacts from signal deprecation that are inevitable without
compromising privacy by avoiding re-identification. Each bid request is enriched with just enough signal
to identify if the traffic is invalid or not.

By having the The HUMAN Security RTD submodule operate at the Prebid level, data can be controlled
and not as freely passed through the bidstream where it may be accessible to various unknown parties.

Note: anti-fraud use cases typically have carve outs in laws and regulations to permit data collection
essential for effective fraud mitigation, but this does not constitute legal advice and you should
consult your attorney when making data access decisions.
