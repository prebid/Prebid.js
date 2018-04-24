---
layout: page
title: Module - DFP Video
description: Addition of DFP Video to the Prebid package
top_nav_section: dev_docs
nav_section: modules
module_code : dfpAdServerVideo
display_name : DFP Video
enable_download : true
---

<div class="bs-docs-section" markdown="1">

# DFP Video
{:.no_toc}

This module is required to use the Prebid Instream video examples with DFP Adserver. For instructions showing how to add this module to Prebid.js, see below.

### Step 1:  Prepare the base Prebid file as usual

The standard options:

- Build from a locally-cloned git repo 
- Receive the email package from the Prebid [Download]({{site.baseurl}}/download.html) page
 
### Step 2: Integrate into your prebid.js configuration

The method exposes the [`pbjs.adServers.dfp.buildVideoUrl`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.adServers.dfp.buildVideoUrl) method to use. For an example, see the DFP video guide linked below.

## Further Reading

+ [Show Video Ads with DFP]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html)

</div>