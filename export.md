---
layout: page
title: Export Prebid Tags
head_title: Export Prebid Tags
description: Export Prebid Tags
pid: 30
show_disqus: false
hide: true

isNavParent: true
---

<script>

var bidders = {
	'aol': {
		'name': 'AOL',
		'params': [
			{
				'key': 'placement'
			},
			{
				'key': 'sizeId'
			},
			{
				'key': 'alias'
			}
		]
	},
	'appnexus': {
		'name': 'AppNexus',
		'params': [
			{
				'key': 'placementId'
			}
		]
	},
	'criteo': {
		'name': 'Criteo',
		'params': [
			{
				'key': 'nid'
			},
			{
				'key': 'cookiename'
			},
			{
				'key': 'varname'
			}
		]
	},
	'openx': {
		'name': 'OpenX',
		'params': [
			{
				'key': 'jstag_url'
			},
			{
				'key': 'pgid'
			},
			{
				'key': 'unit'
			}
		]
	},
	'pubmatic': {
		'name': 'Pubmatic',
		'params': [
			{
				'key': 'publisherId'
			},
			{
				'key': 'adSlot'
			}
		]
	},
	'appnexus': {
		'name': 'Rubicon',
		'params': [
			{
				'key': 'rp_account'
			},
			{
				'key': 'rp_site'
			},
			{
				'key': 'rp_zonesize'
			}
		]
	},
	'appnexus': {
		'name': 'Yieldbot',
		'params': [
			{
				'key': 'psn'
			},
			{
				'key': 'slot'
			}
		]
	}

}

var tag_settings = {
	adserver: 'DFP',
	async: 1,
	adUnits: [

	]
}

$(document).ready(function() {
	$('#adserver-button-dfp').click(function() {
		tag_settings.adserver = 'DFP';
	});
	$('adserver-button-others').click(function() {
		tag_settings.adserver = 'Others';
	});

	$('#load-button-async').click(function() {
		tag_settings.async = true;
	});
	$('#load-button-sync').click(function() {
		tag_settings.async = false;
	});

	 $(".add-bid").click(function() {
	 	var prev = $(this).parent().parent().prev();
	 	var prev_next = prev.clone();
	 	prev.show();
	 	prev.after(prev_next);
	 	console.log($(prev).html());
	 });
})


</script>


<div class="row">
	<div class="col-sm-12">
		
	</div>
	
	<div class="col-sm-6">
  		<h3>Step 1</h3>
	  	<h4>Choose your ad server</h4>

	  	<div class="row">
	  		<div class="col-sm-6">
	  			<button class="btn btn-default" id="adserver-button-dfp">DFP</button>
	  		</div>
	  		<div class="col-sm-6">
	  			<button class="btn btn-default" id="adserver-button-others">Others</button>
	  		</div>
	  	</div>

  </div>

  <div class="col-sm-6" markdown="1">

<p>The below code wraps your normal load GPT code with a timer...</p>

{% highlight js %}

function initAdserver() {
  if (pbjs.initAdserverSet) return;
  //load GPT library here
  (function() {
    var gads = document.createElement('script');
    gads.async = true;
    gads.type = 'text/javascript';
    var useSSL = 'https:' == document.location.protocol;
    gads.src = (useSSL ? 'https:' : 'http:') +
    '//www.googletagservices.com/tag/js/gpt.js';
    var node = document.getElementsByTagName('script')[0];
    node.parentNode.insertBefore(gads, node);
  })();
  pbjs.initAdserverSet = true;
};

{% endhighlight %}

  </div>

</div>

<hr class="full-rule thin">


<div class="row">
	<div class="col-sm-12">
		
	</div>
	
	<div class="col-sm-6">
  		<h3>Step 2</h3>
	  	<h4>Choose how to load Prebid.js</h4>

	  	<div class="row">
	  		<div class="col-sm-6">
	  			<button class="btn btn-default" id="load-button-async">Asynchronously</button>
	  		</div>
	  		<div class="col-sm-6">
	  			<button class="btn btn-default" id="load-button-sync">Synchronously</button>
	  		</div>
	  	</div>

  </div>

  <div class="col-sm-6" markdown="1">

<p>The below code loads prebid.js asynchronously</p>

{% highlight js %}

(function() {
  var pbjsEl = document.createElement("script"); pbjsEl.type = "text/javascript";
  pbjsEl.async = true; 
  pbjsEl.src = "prebid.js";
  var pbjsTargetEl = document.getElementsByTagName("head")[0];
  pbjsTargetEl.insertBefore(pbjsEl, pbjsTargetEl.firstChild);
})();

{% endhighlight %}

  </div>

</div>



<hr class="full-rule thin">


<div class="row">
	<div class="col-sm-12">
		
	</div>
	
	<div class="col-sm-6">
  		<h3>Step 3</h3>
	  	<h4>Add ad units and bidders</h4>

	  	<br>

	  	<h4>Ad Units</h4>
	  	<div class="form-horizontal">
	  	  <div class="form-group">
	  	    <label class="col-sm-2 control-label">Code</label>
	  	    <div class="col-sm-10">
	  	      <input class="form-control" placeholder="GPT Ad Unit Path">
	  	    </div>
	  	  </div>

	  	  <div class="form-group">
	  	    <label class="col-sm-2 control-label">Sizes</label>
	  	    <div class="col-sm-10">
	  	      <input class="form-control" placeholder="300x250,300x600">
	  	    </div>
	  	  </div>

	  	  <label class="col-sm-2">Bids</label>

	  	  <div class="well col-sm-10">

		  	  <div>
			  	  <div class="form-group">
			  	    <label for="inputPassword3" class="col-sm-2 control-label">Bidder</label>
			  	    <div class="col-sm-10">
			  	      <select class="bidder-select">
			  	      
			  	      </select>
			  	    </div>
			  	  </div>
		  	  <hr class="full-rule thin">
		  	  </div>

		  	  <div style="display:none">
			  	  <div class="form-group">
			  	    <label for="inputPassword3" class="col-sm-2 control-label">Bidder</label>
			  	    <div class="col-sm-10">
			  	      <select class="bidder-select">
			  	      
			  	      </select>

			  	    </div>
			  	  </div>
		  	  <hr class="full-rule thin">
		  	  </div>

		  	  <div class="form-group">
		  	    <div class="col-sm-12">
		  	      <a class="btn btn-default add-bid">+ Bid</a>
		  	    </div>
		  	  </div>
		  </div>

		  <script>
		  for (var bidderCode in bidders) {
		  	var name = bidders[bidderCode]['name'];
		  	var htmlStr = '<option value="' + bidderCode + '">' + name + '</option>';
		  	$('.bidder-select').append(htmlStr);
		  }
		  </script>


	  	</div>

	  	<hr class="full-rule">

	  	<div class="row">

		  	<div class="form-group">
		  	  <div class="col-sm-12">
		  	    <button class="btn btn-default" id="add-ad-unit">+ Ad Unit</button>
		  	  </div>
		  	</div>
		 </div>
	</div>


  <div class="col-sm-6" markdown="1">

<p>The below code loads prebid.js asynchronously</p>

{% highlight js %}

var adUnits = [{
    code: '/19968336/header-bid-tag-0',
    sizes: [[300, 250], [300, 600]],
    bids: [
        // 1 ad unit can be targeted by multiple bids.
        {
            bidder: 'appnexus',
            params: {
               placementId: '4799418'
            }
        },
        {
            bidder: 'pubmatic',
            params: {
                publisherId: '123',
                adSlot: 'TO ADD'
            }
        }
    ]
}];

pbjs.addAdUnits(adUnits);





{% endhighlight %}

</div>

</div>



<hr class="full-rule thin">

<h3>Last Step:</h3>

<button class="btn btn-primary">Download</button> the generated example file and share it with your best dev friend!
