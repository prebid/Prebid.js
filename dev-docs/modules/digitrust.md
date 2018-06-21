---
layout: page
title: Module - DigiTrust
description: Addition of DigiTrust to the Prebid package
top_nav_section: dev_docs
nav_section: modules
module_code : digitTrust
display_name : DigiTrust
enable_download : false
---

<div class="bs-docs-section" markdown="1">

# DigiTrust Module
{:.no_toc}

[DigiTrust](http://digitru.st) is a consortium of publishers, exchanges, and DSPs that provide a standard
user ID for display advertising similar in concept to ID-for-Ads in the mobile world. Subscribers to the ID service get an anonymous, persistent and secure identifier for publishers and trusted third parties on all browser platforms, including those which do not support third party cookies by default. See the [DigiTrust integration guide](https://github.com/digi-trust/dt-cdn/wiki/Integration-Guide) for more details.
 
At some point the DigiTrust module will be made available as part of the Prebid.js Download page. However, that integration may take several months, so in the meantime, this memo provides instructions for publishers and integrators to manually pull DigiTrust code into their Prebid builds.

## Instructions for adding DigiTrust code to a Prebid package

### Step 1:  Prepare the base Prebid file as usual

The standard options:

- Build from a locally-cloned git repo
- Receive the email package from the Prebid [Download](http://prebid.org/download.html) page
 
### Step 2: Download the DigiTrust code:

{% highlight url %}
curl -o digitrust.js http://cdn.digitru.st/prod/1/digitrust.min.js
{% endhighlight %}

Note that the DigiTrust URL may change from time to time, check with them for the latest.

### Step 3: Create a file with the initialization code

For example, store this code in a new file called `digitrustInit.js`:

{% highlight js %}
DigiTrust.initialize({
    member: "PUBLISHER_DIGITRUST_MEMBER_ID",
    site: "PUBLISHER_DIGITRUST_SITE_ID",
    redirects: true
    },
    function (digiTrustResult) {
      if (typeof digiTrustResult === 'object' && digiTrustResult.success) {
         pbjs.setConfig({digiTrustId: digiTrustResult});
      }
    }
);
{% endhighlight %}

**Notes**:

* you'll need replace the placeholders PUBLISHER_DIGITRUST_MEMBER_ID and PUBLISHER_DIGITRUST_SITE_ID.
* the 'redirects' option to DigiTrust.initialize() may be set to false in order to disable the link-rewriting behavior to acquire a first party cookie context.
 
### Step 4: Combine the DigiTrust code and Prebid

The DigiTrust code must be loaded first, so prepend the digitrust files to the top of the Prebid build file.

{% highlight js %}
cat digitrust.js digitrustInit.js build/dist/prebid.js > build/dist/prebid_digitrust.js
{% endhighlight %}

### Step 5: Publish

The combined Prebid/DigiTrust file is now ready to follow your normal acceptance process.


## Further Reading

+ [DigiTrust Home Page](http://digitru.st)

+ [DigiTrust integration guide](https://github.com/digi-trust/dt-cdn/wiki/Integration-Guide)

</div>
