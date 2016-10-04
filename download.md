---
layout: page
title: Download Prebid.js
description: Documentation on how to download Prebid.js for header bidding.

pid: 0
show_disqus: true

is_top_nav: yeah

top_nav_section: download
nav_section: download


---

<script src="https://cdn.firebase.com/js/client/2.4.2/firebase.js"></script>

<script>

$(function(){
  $('#myModal').on('show.bs.modal', function (e) {
    var form_data = get_form_data();
    if(form_data.bidders.length < 1){
      alert('Please select at least 1 bidder');
      return e.preventDefault() // stops modal from being shown
    }
    return;
  });
});

function submit_download() {
    var form_data = get_form_data();

    var alertStatus = $('#download-status');

    if (!(form_data['email'] && form_data['company'])) {
      alertStatus.html('Email and Company fields are required.');
      alertStatus.removeClass('hide');
      return;
    }
    alertStatus.addClass('hide');

    $('#download-button').html('<i class="glyphicon glyphicon-send"></i> Sending Request...').addClass('disabled');
    alertStatus.html('Request sent! Please hang tight, this might take a few minutes.');
    alertStatus.removeClass('hide');
    $.ajax({
        type: "POST",
        url: "http://client-test.devnxs.net/prebid",
        //dataType: 'json',
        data: form_data
    })
    .done(function() {
      var buttn = $('#download-button');
      //buttn.addClass('btn-success');
      buttn.html('<i class="glyphicon glyphicon-ok"></i> Email Sent!');
      console.log('Succeeded!');
      alertStatus.addClass('hide');
    })
    .fail(function(e) {
      errorO = e;
      console.log(e);
      var buttn = $('#download-button');
      buttn.html('<i class="glyphicon glyphicon-envelope"></i> Receive Prebid.js');
      buttn.removeClass('disabled');
      alert('Ran into an issue.'); // + e.responseText
    });

    newDownload(form_data['email'], form_data['company'], form_data['bidders']);
}

function get_form_data() {
    var bidders = [];

    var bidder_check_boxes = $('.bidder-check-box');
    for (var i = 0; i < bidder_check_boxes.length; i++) {
        var box = bidder_check_boxes[i];
        if (box.checked) {
            bidders.push(box.getAttribute('bidderCode'));
        }
    }

    var form_data = {};
    form_data['email'] = $('#input-email').val();
    form_data['company'] = $('#input-company').val();
    form_data['bidders'] = bidders;

    return form_data;
}


</script>

<style>
.disabled {
  color: #aaa;
}
</style>

<div class="bs-docs-section" markdown="1">

# Customize and Download Prebid.js <span class="label label-warning" style="font-size:14px">Beta</span>

{: .lead :}
To improve the speed and load time of your site, build Prebid.js for only the header bidding partners you choose.

### Option 1: Select header bidding partners


<form>
<div class="row">
<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="appnexus" class="bidder-check-box"> AppNexus
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="appnexusAst" class="bidder-check-box"> AppNexusAST (Beta)
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="openx" class="bidder-check-box"> OpenX
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="pubmatic" class="bidder-check-box"> Pubmatic
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="rubicon" class="bidder-check-box"> Rubicon
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="yieldbot" class="bidder-check-box"> Yieldbot
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="aol" class="bidder-check-box"> AOL
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="indexExchange" class="bidder-check-box"> Index Exchange
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="sovrn" class="bidder-check-box"> Sovrn
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="pulsepoint" class="bidder-check-box"> PulsePoint
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="triplelift" class="bidder-check-box"> TripleLift
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="springserve" class="bidder-check-box"> SpringServe
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="adform" class="bidder-check-box"> Adform
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="nginad" class="bidder-check-box"> NginAd
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="brightcom" class="bidder-check-box"> Brightcom
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="adequant" class="bidder-check-box"> Adequant
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" bidderCode="sonobi" class="bidder-check-box"> Sonobi
    </label>
  </div>
</div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="aardvark" class="bidder-check-box"> Aardvark
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="wideorbit" class="bidder-check-box"> WideOrbit
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="kruxlink" class="bidder-check-box"> Krux Link
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="sekindo" class="bidder-check-box"> Sekindo
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="admedia" class="bidder-check-box"> AdMedia
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="jcm" class="bidder-check-box"> J Carter Marketing
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="memeglobal" class="bidder-check-box"> Meme Global
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="underdogmedia" class="bidder-check-box"> Underdog Media
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="brealtime" class="bidder-check-box"> bRealTime
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="pagescience" class="bidder-check-box"> Pagescience
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="centro" class="bidder-check-box"> Centro
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="adblade" class="bidder-check-box"> Adblade
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="piximedia" class="bidder-check-box"> Piximedia
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" bidderCode="getintent" class="bidder-check-box"> GetIntent
      </label>
    </div>
  </div>

  <div class="col-md-4">
    <div class="checkbox">
      <label>
        <input type="checkbox" disabled bidderCode="defymedia" class="bidder-check-box disabled"> DefyMedia - Coming Soon!
      </label>
    </div>
  </div>






</div>

<br>
<p>
(Upgrading version - please check back in a bit!)
</p>

<div class="form-group">

  <button type="button" class="btn btn-lg btn-primary disabled" data-toggle="modal" data-target="#myModal">Get Custom Prebid.js</button>

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
          The download link will be in your inbox in a few minutes. Check the spam folder too!
        </div>


        <div class="form-group col-md-6">
            <label for="input-email">Email address</label>
            <input type="email" class="form-control" id="input-email" placeholder="Email" name="email">
        </div>
        <div class="form-group col-md-6">
            <label for="input-company">Company Name</label>
            <input type="text" class="form-control" id="input-company" placeholder="Your Company" name="company_email">
        </div>

        <div class="form-group">
            <button type="button" id="download-button" class="btn btn-lg btn-primary" onclick="submit_download()"><i class="glyphicon glyphicon-envelope"></i> Receive Prebid.js</button>
        </div>

        <div class="alert alert-warning hide" role="alert" id="download-status"></div>

        <p>
        Ran into problems? Email <code>info@prebid.org</code>
        </p>

      </div>


    </div>
  </div>
</div>


<div class="bs-docs-section" markdown="1">

### Option 2: Build from Source Code (More Advanced)

{: .lead :}
Alternatively, you can build Prebid.js from the source code.  For instructions, see the [Prebid.js README on GitHub](https://github.com/prebid/Prebid.js/blob/master/README.md).
