---
layout: page
title: Download Prebid.js
description: Documentation on how to download Prebid.js for header bidding.

pid: 0

is_top_nav: yeah

top_nav_section: download
nav_section: download


---

<div class="bs-docs-section" markdown="1">

# Customize and Download Prebid.js

{: .lead :}
To improve the speed and load time of your site, build Prebid.js for only the header bidding partners you choose. 

### Select header bidding partners


<form>

<div class="row">
  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> AOL
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> AppNexus
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> OpenX
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> Pubmatic
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> Rubicon
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> Sovrn
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> Yieldbot
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> PulsePoint
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> Adform
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> bRealTime
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> SpringServe
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> NginAd
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox"> TripleLift
      </label>
    </div>
  </div>

</div>

<br>
<p>
(Version: 0.7.0)
</p>

<div class="form-group">
    
  <button type="button" class="btn btn-lg btn-primary" data-toggle="modal" data-target="#myModal">Customize Prebid.js</button>
    
</div>

</form>

</div>



<!-- Modal -->
<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
      
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      
        <h4 class="modal-title" id="myModalLabel">Download Custom Built Prebid.js</h4>
      </div>

      <div class="modal-body">

        <div class="lead">
            You will receive an email with the download link shortly after you complete the below form.
        </div>
        

        <div class="form-group col-md-6">
            <label for="InputEmail">Email address</label>
            <input type="email" class="form-control" id="InputEmail" placeholder="Email">
        </div>
        <div class="form-group col-md-6">
            <label for="InputPassword">Company Name</label>
            <input type="text" class="form-control" id="InputPassword" placeholder="Your Company">
        </div>

        <div class="form-group">
            <button type="button" class="btn btn-lg btn-primary">Send Prebid.js</button>
        </div>

      </div>
      

    </div>
  </div>
</div>



<div class="bs-docs-section" markdown="1">

### Build from Github (More Advanced)

{: .lead :}
Alternatively, you can build the desired Prebid.js from the source code. For releases above version 0.7.0, developers can go to the [Github Releases](https://github.com/prebid/Prebid.js/releases) page to download the source code of a desired release. 

Unzip the source code folder and you will find the file `package.json`. Inside `package.json` you can specify which adapters to be included in the build to optimize file size of `prebid.js`

Pacakge.json:
{% highlight js %}

  "adapters": [
    "adform",
    "aol",
    "appnexus",
    "indexExchange",
    "openx",
    "pubmatic",
    "pulsepoint",
    "rubicon",
    "rubiconLegacy",
    "sovrn",
    "springserve",
    "yieldbot",
    "nginad",
    "triplelift"
  ]

{% endhighlight %}

1. Update pacakge.json with the desired adapters
2. Run `gulp build` or `gulp serve` to generate a new build
3. Get the build from `build/dist/prebid.js`

**Note**: You need to have at least `node.js 4.x` or greater installed to be able to run the `gulp` commands.

