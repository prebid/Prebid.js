---
layout: home
title: Prebid.js - Header Bidding Made Easy
head_title: Prebid.js - Header Bidding Made Easy

isHome: true

description: A free and open source library for publishers to quickly implement header bidding

---




<a name="pb-home-live-demo"></a>

<div class="row">
    <div class="col-sm-10 col-sm-offset-1 text-center">

      {% include live_demo.html %}

    </div>
</div>

<div class="bs-docs-featurette pb-home pb-docs">

    <p class="lead">The above header bidding ad is auctioned with Prebid.js. <a href="/overview/intro.html" target="_blank">Learn more about this auction here.</a></p>

<div class="form-inline">
  <div class="form-group form-group-lg">
    <input type="text" class="form-control" id="email-field" placeholder="Email" required>
  </div>
  <div class="form-group">
    <button class="btn btn-outline btn-lg" id="submit-email" onclick="submitEmail()">Join Best Practices Group</button>
  </div>        
</div>


<!--     <h2 class="bs-docs-featurette-title">Integrate header bidding partners in minutes, not weeks.</h2>
    <p class="lead">Week-long header bidding implemenations are no picnic. We developed Prebid.js with a group of publishers to relieve that frustration.</p> 
-->

    <hr class="full-rule">

    <div class="row benefits">
      <div class="col-sm-4">
        <img src="assets/images/icons/icon-ninja.png" alt="Header bidding no dev" class="img-responsive">
        <h3>No development required</h3>
        <p>Prebid.js includes adaptors for AppNexus, Pubmatic, Rubicon Project, and more.</p>
        <a href="/dev-docs/bidders.html" class="btn btn-outline">See the Full Bidder List</a>
      </div>

      <div class="col-sm-4">
        <img src="assets/images/icons/icon-money.png" alt="Header bidding min line item" class="img-responsive">
        <h3>Easy line item setup</h3>
        <p>Ad ops can control the bidders, ad sizes, and price buckets with a single group of line items.</p>
        <a href="adops.html" class="btn btn-outline">Read the Ad Ops Guide</a>
      </div>

      <div class="col-sm-4">
        <img src="assets/images/icons/icon-latency.png" alt="Header bidding latency" class="img-responsive">
        <h3>Reduce latency</h3>
        <p>Improve user experience with asynchronous ad calls that load together with the page content.</p>
        <a href="/overview/how-to-reduce-latency-of-header-bidding.html" class="btn btn-outline">Show Me How</a>
      </div>

    </div>



    <hr class="full-rule">


    <h2 class="bs-docs-featurette-title">Tags That Work in Prebid.js</h2>
    <!-- <p class="lead">Prebid.js includes adaptors to the major SSPs, ad networks, and exchanges.</p> -->


    <div class="row bs-docs-featured-sites bidder-logos text-center">
    
    <!-- START BIDDERS -->
    <!-- (Note: Bidders are sorted alphabetically.) -->

    <div class="col-xs-6 col-sm-4"><h3>Aardvark by RTK</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Adform</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>AdMedia</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>AOL</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>AppNexus</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>bRealTime</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Index</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>NginAd</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>OpenX</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Pubmatic</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>PulsePoint</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Rubicon</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Sekindo</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Sonobi</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Sovrn</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>SpringServe</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>TripleLift</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>WideOrbit</h3></div>
    <div class="col-xs-6 col-sm-4"><h3>Yieldbot</h3></div>

    <!-- END BIDDERS -->
    
    </div>
<!-- 
    <hr class="full-rule">

    <h2 class="bs-docs-featurette-title">Partners Center</h2>
    <p class="lead">A free an open marketplace for publishers and bidders supporting Prebid.org to connect.</p>

    <div class="row bs-docs-featured-sites partner-logos">
    
      <div class="col-xs-6 col-sm-2">
        <div class="logo-block">
          <img src="assets/images/logos/monetizemore-logo.jpg" alt="MonetizeMore Header Bidding" class="img-responsive">
        </div>
        <a href="mailto:kean@monetizemore.com" class="btn btn-outline">Contact Publisher</a>
      </div>

      <div class="col-xs-6 col-sm-2">
        <div class="logo-block">
          <img src="assets/images/logos/sonobi-logo.png" alt="Sonobi Header Bidding" class="img-responsive">
        </div>
        <a href="mailto:rnovak@sonobi.com" class="btn btn-outline">Contact Bidder</a>
      </div>
    
      <div class="col-xs-6 col-sm-2">
        <div class="logo-block">
          <img src="assets/images/logos/studybreakmedia-logo.png" alt="StudyBreakMedia Header Bidding" class="img-responsive">
        </div>
        <a href="mailto:emry@studybreakmedia.com" class="btn btn-outline">Contact Publisher</a>
      </div>


      <div class="col-xs-6 col-sm-2">
        <div class="logo-block">
          <img src="assets/images/logos/appnexus-logo.png" alt="AppNexus Header Bidding" class="img-responsive">
        </div>
        <a href="mailto:mmcneeley@appnexus.com" class="btn btn-outline">Contact Bidder</a>
      </div>
    

      <div class="col-xs-6 col-sm-2">
        <div class="logo-block">
          <img src="assets/images/logos/brealtime-logo.png" alt="bRealTime Header Bidding" class="img-responsive">
        </div>
        <a href="mailto:rnovak@sonobi.com" class="btn btn-outline">Contact Bidder</a>
      </div>
    
      <div class="col-xs-6 col-sm-2">
        <div class="logo-block">
          <div>Add Your Company!</div>
        </div>
        <a href="/addme.html#contact-companies" class="btn btn-outline">Enter Here</a>
      </div>

    
    </div>
 -->
 
    <hr class="full-rule">



    <h2 class="bs-docs-featurette-title">Open Source Project</h2>
    
    <p class="lead">Prebid.js is open source and community driven. The project is hosted, developed, and maintained on GitHub.</p>

    <a href="/overview/intro.html" class="btn btn-outline btn-lg">Next: Overview of Prebid.js</a>

</div>
