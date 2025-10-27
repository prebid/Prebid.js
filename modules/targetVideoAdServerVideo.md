# Overview

```
Module Name:  Target Video Ad Server Video
Module Type:  Ad Server Video
Maintainer:   danijel.ristic@target-video.com
```

# Description

Ad Server Video for target-video.com. Contact danijel.ristic@target-video.com for information.

# Integration

The helper function takes the form:

    pbjs.adServers.targetVideo.buildVideoUrl(options)

Where:

* **`options`:** configuration object:
    * **`params`:**
        * **`iu`:** required property used to construct valid VAST tag URL
    * **`adUnit`:** ad unit that is being filled
    * **`bid` [optional]:** if you override the hardcoded `pbjs.adServers.dfp.buildVideoUrl(...)` logic that picks the first bid you *must* pass in the `bid` object you select
    * **`url`:** VAST tag URL, similar to the value returned by `pbjs.adServers.dfp.buildVideoUrl(...)`
