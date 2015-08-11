---
layout: home
title: Prebid.js - Header Bidding Made Easy
head_title: Prebid.js - Header Bidding Made Easy

isHome: true

description: A free and open source library for publishers to quickly implement header bidding. 
---



<a name="pb-home-live-demo"></a>

<div class="row">
    <div class="col-sm-10 col-sm-offset-1 text-center">

      {% include live_demo.html %}

    </div>
</div>

<div class="bs-docs-featurette pb-home pb-docs">

    <p class="lead">The above header bidding ad is auctioned with Prebid.js. <a href="getting-started.html" target="_blank">Learn more about this auction here.</a></p>

<div class="form-inline">
  <div class="form-group form-group-lg">
    <input type="text" class="form-control" id="email-field" placeholder="Email" required>
  </div>
  <div class="form-group">
    <button class="btn btn-outline btn-lg" id="submit-email" onclick="submitEmail()">Join Header Bidding Best Practices Group</button>
  </div>        
</div>


<!--     <h2 class="bs-docs-featurette-title">Integrate header bidding partners in minutes, not weeks.</h2>
    <p class="lead">Week-long header bidding implemenations are no picnic. We developed Prebid.js with a group of publishers to relieve that frustration.</p> -->

    <hr class="full-rule">

    <div class="row">
      <div class="col-sm-4">
        <img src="assets/images/icons/icon-ninja.png" alt="Header bidding no dev" class="img-responsive">
        <h3>No development required.</h3>
        <p>Prebid.js has built-in integrations with all major header bidding bidders: Amazon, AppNexus, Criteo, Pubmatic, Rubicon, etc.</p>
        <a href="bidders.html" class="btn btn-outline">See full bidder list</a>
      </div>

      <div class="col-sm-4">
        <img src="assets/images/icons/icon-money.png" alt="Header bidding min line item" class="img-responsive">
        <h3>Minimum line item setup.</h3>
        <p>With only 1 set of line items, Prebid.js allows ad ops to manage all bidders and sizes at ease. Adding new bidders require no ad server change.</p>
        <a href="adops.html" class="btn btn-outline">Ad Ops Guide</a>
      </div>

      <div class="col-sm-4">
        <img src="assets/images/icons/icon-latency.png" alt="Header bidding latency" class="img-responsive">
        <h3>Reduce page load time.</h3>
        <p>All blocking ad calls are now made async. Header bidding requests now load together with your page's content.</p>
        <a href="blog/how-to-reduce-latency-of-header-bidding/" class="btn btn-outline">How is this done</a>
      </div>
<!--
      <div class="col-sm-4">
        <img src="assets/images/balance-orange.png" alt="Components" class="img-responsive">
        <h3>Maximize revenue.</h3>
        <p> Prebid.js helps you run a fair auction for all bidders. It rotates bidders and gives them the same amount of time.</p>
        <a href="" class="btn btn-outline btn-sm">Explore more</a>
      </div>
-->

    </div>



    <hr class="full-rule">


    <h2 class="bs-docs-featurette-title">All Major Bidders Supported.</h2>
    <p class="lead">Prebid.js has built-in, most up to date adapters for all of the major header bidding bidders.</p>


    <div class="row bs-docs-featured-sites bidder-logos">
    
      <div class="col-xs-6 col-sm-2">
        <h3>Amazon</h3>
      </div>
    
      <div class="col-xs-6 col-sm-2">
        <h3>AppNexus</h3>
      </div>
    
      <div class="col-xs-6 col-sm-2">
        <h3>Criteo</h3>
      </div>
    
      <div class="col-xs-6 col-sm-2">
        <h3>OpenX</h3>
      </div>

      <div class="col-xs-6 col-sm-2">
        <h3>Pubmatic</h3>
      </div>

      <div class="col-xs-6 col-sm-2">
        <h3>Rubicon</h3>
      </div>
    
    </div>

    <hr class="full-rule">


    <h2 class="bs-docs-featurette-title">Open Source and Community Owned.</h2>
    
    <p class="lead">Prebid.js is open source software. Anyone is free to modify the code and contribute adapters for new bidders. Prebid.js is hosted, developed, and maintained on GitHub.</p>
    <a href="getting-started.html" class="btn btn-outline btn-lg">Next: Overview of Prebid.js</a>

</div>