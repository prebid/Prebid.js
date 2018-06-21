---
layout: page
title: Prebid.org Header Bidding Wrapper Code of Conduct
description: Full text of the Prebid.org Header Bidding Wrapper Code of Conduct
top_nav_section: overview
nav_section: intro
pid: 20
---

<div class="bs-docs-section" markdown="1">

# Prebid.org Header Bidding Wrapper Code of Conduct
{:.no_toc}

*This is a living document. Last revision: September 5th, 2017.*

This Wrapper Code of Conduct establishes the principles by which we believe header bidding wrappers should operate.

* TOC
{:toc}

## Definitions

* _Wrapper_: any technology layer that facilitates bids from demand partners being passed into the decisioning layer..
* _Demand partner_: any party that is willing to provide a price to be paid to the publisher for a given impression, and is integrated into the wrapper.
* _Publisher_: the party who is integrating the wrapper into their page
* _Decisioning layer_: the technology that decides the final winning bid.

## Auction Logic

* The wrapper must not modify bids from demand partners, except to:
    * Apply a modification that changes the bid from gross to net or;
    * Apply a modification that changes the bid from one currency to another.
* The wrapper must provide equal opportunity for all demand partners to bid, either by requesting bids simultaneously or by randomizing the order in which they are called.
* The wrapper must send all demand returned within the Publisher-configured timeout to the decisioning layer.
* The decisioning layer must make the final choice of what bid wins.
* The wrapper must provide a mechanism to validate that submitted bid responses were sent to the decisioning layer.
* The wrapper must provide a mechanism or process for publishers and demand partners to validate fairness of the wrapper.
* The wrapper must not favor any demand partner in any way, including any demand that is provided by a bidder that is also hosting the wrapper.

## Data and Transparency

* The wrapper must segregate demand data so there is no opportunity for demand partners to have access to other bids.
* The wrapper must pass all available bid request information to each demand partner.
* The wrapper must not collect and store publisher or demand partner information except in the process of passing information to demand partners, validating wrapper mechanics, providing aggregated reporting to publishers, or troubleshooting and diagnosing implementations
    * This includes bid stream information, user information, and publisher first party data.
    * For any bidder-level data aggregated for any of the approved purposes, the wrapper must disclose to the bidder in question the use cases.
* The wrapper must not record, use, or sell publisher or demand partner data without permission from the publisher and the demand partner.
* The wrapper must be able to provide mechanical data relating to each auction: who was called, who responded on time, and who responded late.
* If the wrapper charges fees, the fee structure should be disclosed to all parties involved in the setup.

## User Experience

* The wrapper must make a best effort to minimize the impact on the user's web browsing experience.
* The wrapper must not allow any demand partners to have any blocking or synchronous steps in the process of eliciting a bid.
* Publishers must set timeout periods, and the timeouts should be consistent across all demand partners within a given auction.
* The wrapper must reject any bid responses received after the conclusion of the timeout period.
* The wrapper must send bids to the decisioning layer as soon as all demand partners have responded or the timeout has been reached.

## Further Reading

+ [Project Principles]({{site.baseurl}}/principles.html)
+ [Getting Started]({{site.baseurl}}/overview/getting-started.html)

</div>
