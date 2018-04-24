---
layout: page
title: Module - Currency
description: Converts bids to the ad server currency
top_nav_section: dev_docs
nav_section: modules
module_code : currency
display_name : Currency
enable_download : true
---

<div class="bs-docs-section" markdown="1">

# Currency Module
{:.no_toc}

This module supports the conversion of multiple bidder currencies into a single currency
used by the publisher's ad server. In previous versions of Prebid, this was accomplished
by using [BidderSettings.bidCpmAdjustment](http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings), but that's a static value not changed except when
the web development team makes a manual update.

Publishers may continue to use the bidCpmAdjustment approach, or may begin using this optional module, gaining automatic updates as currency exchange rates fluctuate. Here's how it works at a high level:
 
1. A Prebid.js package is built that contains the extra currency module code
1. Config in the page defines the currency used by the Publisher's ad server and other configuration parameters.
1. The existence of this configuration causes the Prebid platform to load a
currency conversion file while the bids are taking place. Alternately, the conversion rates can
be provided in the page.
1. At runtime, bids are converted to the ad server currency as needed.

## Currency Architecture

The numbered circles in this diagram are explained below.

![Currency Architecture]({{site.baseurl}}/assets/images/dev-docs/currency_architecture.png)


### 1. Line Item Creation

Ad server line items must be created so that the price bucket boundaries match
what will be provided at runtime. Before this feature, many publishers using
non-USD currencies didn't benefit from Prebid's
default granularities -- they had to set up custom price buckets. Now the 5 default
granularities can be scaled to other currencies with a `granularityMultiplier`.

For example, the default Prebid "low granularity" bucket is:

{: .table .table-bordered .table-striped }
| USD$0.50 increments, capped at USD$5 |

The following config translates the "low granularity" bucket with a conversion rate of
108 yen to 1 US dollar. It also defines the current conversion rate as being 110 yen to the dollar,

{% highlight js %}
pbjs.setConfig({
    "priceGranularity": "low",
    "currency": {
       "adServerCurrency": "JPY",
       "granularityMultiplier": 108
    }
});
{% endhighlight %}

This results in a granularity rule that's scaled up to make sense in Yen:

{: .table .table-bordered .table-striped }
| &yen;54 increments, capped at &yen;540 |

Notes:

* The multiplier may not make sense for markets where the currency value is close
to USD, e.g. GBP and EUR. In those scenarios, just leave the granularityMultiplier at 1.
* There's not yet an open source tool that creates line items in this way.
* The multiplier chosen (108 in this example) is a snapshot in time. The line item boundaries are static -- the number of bids in each bucket may shift as currency exchange rates fluctuate. This is normal -- changes to buckets can be done by updating the line items, though this shouldn't happen often.

{: .alert.alert-success :}
The multiplier doesn't have to be an exact exchange rate. Rather, it can be designed to
make sense for the publisher. e.g. maybe a multiplier of 100 gives nice rounded buckets with
good enough bucket distribution. If the ad server currency is close in value to USD, you may consider
leaving the granularityMultiplier at 1. Basically, the goal of the granularityMultiplier is to scale up the default Prebid
buckets where they would otherwise cap out too low for some currencies. e.g. Capping out at 5 yen makes the "low" granularity bucket pretty useless.

### 2. Prebid Configuration

The Prebid config in the page needs to match the assumptions made when defining the
ad server line items. The `setConfig` example above does two important things:

1. adServerCurrency - defining this turns on the currency feature:
    1. loads the currency conversion file
    1. converts bids as needed
    1. scales the price granularity buckets
1. granularityMultiplier - this scales Prebid's default granularity buckets by the same
factor used to create the ad server line items. It defaults to 1.

There are other options explained below, but these are the key ones needed
to understand how the currency feature works.

### 3. Bid Conversion

When the bids come back, the bidder adapter identifies which currency the bid is in. If an adapter doesn't define the bid currency, it's assumed to be USD.

<div class="alert alert-danger" role="alert">
  <p>
Note that before Prebid 1.0, adapters may not properly register the currency of their
bids. See the `bidderCurrencyDefault` config setting below for an interim solution.
  </p>
</div>

The platform will detect whether a conversion is needed from the bid currency to the ad server currency and is pretty smart about using the conversion file to do so: if a direct conversion isn't available, it will try to find a one-hop conversion. e.g. if the bid is in AUD and needs to be converted to BRL, it could convert to AUD-USD first, then USD-BRL.

### 4. Mapping Bids to Price Bucket

All price granularities, including custom granularities, are scaled by the value of
the granularityMultiplier, which defaults to 1.

As noted above, this is done to make Prebid's granularity buckets useful
to all currencies.

For instance, if the current conversion rate is &yen;110 to the dollar, then a bid of USD$1.55 would be converted to &yen;170.50, which gets put into the
low granularity bucket hb_pb=162.


### 5. Ad Request and Decision

Finally, the scaled and quantized bids are sent to the ad server, where they will match
the line items set up initially. 

{: .alert.alert-success :}
No other part of the Prebid process has changed due to currency support: creation of AdUnits, creative display, analytics, etc.


### Full Example

Running through a full set of numbers may help understand how components
of this feature come together.

Say the line items are set up to align with the Prebid low price granularity option with
a granularityMultiplier of 108: &yen;54 increments up to &yen;540. This is the table of
all values in the low granularity setting:

{: .table .table-bordered .table-striped }
| USD | JPY | Line Item Target |
| --- | --- | --- |
| 0.00 | 0 | hb_pb=0 |
| 0.50 | 54 | hb_pb=54 |
| 1.00 | 108 | hb_pb=108 |
| 1.50 | 162 | hb_pb=162 |
| 2.00 | 216 | hb_pb=216 |
| 2.50 | 270 | hb_pb=270 |
| 3.00 | 324 | hb_pb=324 |
| 3.50 | 378 | hb_pb=378 |
| 4.00 | 432 | hb_pb=432 |
| 4.50 | 486 | hb_pb=486 |
| 5.00 | 540 | hb_pb=540 |

The bids take place and a bunch of responses come back. Some of the bids require
conversion, and they're all run through the low price granularity. The current conversion rate
from USD to JPY is 110.

{: .table .table-bordered .table-striped }
| Bidder | Bid | Bid Currency | Bid Converted to JPY | Result of price granularity |
| --- | --- | --- | --- | --- |
| A | 1.55 | USD | 170.50 | hb_pb_a=162 |
| B | 151 | JPY | 151 | hb_pb_b=108 |
| C | 0.90 | ? (USD assumed) | 99.9 | hb_pb_b=54 |


## Page integration

Adding the currency module to a page is done with a call to the setConfig API with one or
more parameters. The simplest implementation would be:
{% highlight js %}
pbjs.setConfig({
    "currency": {
       "adServerCurrency": "JPY",
       "granularityMultiplier": 108
    }
});
{% endhighlight %}
This assumes that all bidders are properly reporting their bid currency
and that the Prebid default rate conversion file
is in use. A more complicated scenario:
{% highlight js %}
pbjs.setConfig({
"currency": {
      // enables currency feature
      "adServerCurrency": "GBP",
      "granularityMultiplier": 1, // 0.50 increment up to 5 is fine for GBP
      // optionally override the default rate file
      "conversionRateFile": "URL_TO_RATE_FILE",
      // until bidder adapters are updated to define the bid currency
      // the system assumes bids are in USD. This can be overridden, for instance:
      "bidderCurrencyDefault": { "bidderXYZ": "GBP" }
   }
});
{% endhighlight %}
And finally, here's an example where the conversion rate is specified right in the config, so
the external file won't be loaded:
{% highlight js %}
pbjs.setConfig({
    "currency": {
       "adServerCurrency": "JPY",
       "granularityMultiplier": 108,
       "rates": { "USD": { "JPY": 110.21 }}
    }
});
{% endhighlight %}


## Building the Prebid package with Currency Support

### Step 1: Bundle the module code

Follow the basic build instructions on the Gihub repo's main README. To include the module, an additional option must be added to the the gulp build command:
 
{% highlight js %}
gulp build --modules=currency,bidderAdapter1,bidderAdapter2
{% endhighlight %}
 
This command will build the following files:
 
- build/dist/prebid-core.js - the base Prebid code
- build/dist/currency.js - additional code for the currency feature
- build/dist/prebid.js - a combined file with the base Prebid code and the DFP express code
 
### Step 2: Publish the package(s) to the CDN

After testing, get your javascript file(s) out to your Content Delivery Network (CDN) as normal.

Note that there are more dynamic ways of combining these components for publishers or integrators ready to build a more advanced infrastructure.

## Functions

No additional functions are provided with this module. Rather, the setConfig() call takes
a currency object that may contain several parameters:

{: .table .table-bordered .table-striped }
| Param | Type | Description | Example |
| --- | --- | --- | --- |
| adServerCurrency | `string` | ISO 4217 3-letter currency code. If this value is present, the currency conversion feature is activated. | "EUR" |
| granularityMultiplier | `decimal` | How much to scale the price granularity calculations. Defaults to 1. | 108 |
| conversionRateFile | `URL` | Optional path to a file containing currency conversion data. See below for the format. Prebid.org hosts a file as described in the next section. | `http://example.com/rates.json` |
| rates | object | This optional argument allows you to specify the rates with a JSON object, subverting the need for the conversionRateFile parameter.  If this argument is specified, the conversion rate file will not be loaded. | { 'USD': { 'CNY': 6.8842, 'GBP': 0.7798, 'JPY': 110.49 } } |
| bidderCurrencyDefault | `object` | This is an optional argument to provide publishers a way to define bid currency. This option is provided as a transition until such a time that most bidder adapters define currency on bid response. | { "bidderXYZ": "GBP" } |

## Currency Rate Conversion File

### Prebid.org's currency file

Prebid.org hosts a conversion file at [http://currency.prebid.org/latest.json](http://currency.prebid.org/latest.json). This file is created daily from the public data at [fixer.io](http://api.fixer.io/latest) and cached on a CDN. Notes:

* The file is also available at [https://currency.prebid.org/latest.json](https://currency.prebid.org/latest.json)
* The conversions available in Prebid.org's file are all of those available at fixer.io.
* To make sure this file doesn't become stale, Prebid.org members are alerted if this file becomes older than 2 days.

### Format

Publishers may host their own currency conversion file, whether because the community file doesn't support a particular currency, because more precision is needed, or because they want control over the freshness of the conversion data.

The file format expected by the Prebid platform is illustrated by the example below.

``` text
{
   "dataAsOf":"2018-03-13",
   "conversions":{
      "USD":{        // from USD to other currencies
         "AUD":1.321,
         "BRL":3.1253,
         "CAD":1.3431,
         "CHF":0.99613,
         "CNY":6.8852,
         ...
      },
      "GPB": {       // can optionally supply direct conversions
         ...       // from multiple currencies
      }
  }
}
```

## FAQ

**Does loading the currency conversion file slow down the auction?**

No, the auction is not delayed by the loading of the currency file. Since it's
a simple flat file on a global CDN and cachable for 24 hours, we expect that
the file will be loaded well before bids return.

**What happens if the file doesn't load on time or not at all or doesn't contain a necessary conversion?**

If the currency feature is turned on and the file's not back by the time the system
needs to convert a bid, that bid is queued until the currency file has loaded.

The bid is also skipped if the file doesn't contain a conversion from the bid currency
to the ad server currency.

If the timeout occurs while bids are still on the queue, they will be skipped rather than passed to the ad server.

**Can I use the DFP Secondary Currency Feature instead?**

Of course, use of Prebid currency feature is optional.

</div>
