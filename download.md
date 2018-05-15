---
layout: page
title: Download Prebid.js
description: Documentation on how to download Prebid.js for header bidding.

pid: 0

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

  $( ".selectpicker" ).change(function() {
    if(this.value.match(/1\.\d+\.\d+/i)) {
      $('.adapters .col-md-4').hide();
      $('.prebid_1_0').show();
    }
    else{
       $('.adapters .col-md-4').show();
    }
  });

  //default to 1.x adapters:
  $('.adapters .col-md-4').hide();
  $('.prebid_1_0').show();
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
}

function get_form_data() {
    var bidders = [];
    var analytics = [];
    var version = $('.selectpicker').val();

    var bidder_check_boxes = $('.bidder-check-box');
    for (var i = 0; i < bidder_check_boxes.length; i++) {
        var box = bidder_check_boxes[i];
        if (box.checked) {
            bidders.push(box.getAttribute('moduleCode'));
        }
    }

    var analytics_check_boxes = $('.analytics-check-box');
    for (var i = 0; i < analytics_check_boxes.length; i++) {
        var box = analytics_check_boxes[i];
        if (box.checked) {
            analytics.push(box.getAttribute('analyticscode'));
        }
    }

    var form_data = {};
    form_data['email'] = $('#input-email').val();
    form_data['company'] = $('#input-company').val();
    form_data['bidders'] = bidders;
    form_data['analytics'] = analytics;
    form_data['version'] = version;

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

### Option 1: Customize your download here

{% assign bidder_pages = site.pages | where: "layout", "bidder" %}
{% assign module_pages = site.pages | where: "nav_section", "modules" %}

{: .alert.alert-success :}
Note if you receive an email with a broken link you most likely selected a configuration that is not supported. Verify that each bidder / module is supported in the selected version. 

<form>
<div class="row">
<h4>Select Prebid Version</h4>
<select class="selectpicker">
  <!-- empty value indicates legacy --> 
  <option value="1.10.0">1.10.0 - latest</option>
  <option value="">0.34.9 - legacy not recommended</option>
</select>


<h4>Select Bidder Adapters</h4>
<div class="adapters">
{% for page in bidder_pages %}
  {% if page.s2s_only == true %}  
    {% continue %}
  {% endif %}
<div class="col-md-4{% if page.prebid_1_0_supported %} prebid_1_0{% endif %}">
 <div class="checkbox">
  <label>
  {% if page.aliasCode %} 
    <input type="checkbox" moduleCode="{{ page.aliasCode }}BidAdapter" class="bidder-check-box"> {{ page.title }}
  {% else %}
    <input type="checkbox" moduleCode="{{ page.biddercode }}BidAdapter" class="bidder-check-box"> {{ page.title }}
  {% endif %}
      
    </label>
</div>
</div>
{% endfor %}
</div>
</div>

<br>
<div class="row">
  <h4>Analytics Adapters</h4>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="google" class="analytics-check-box"> Google Analytics
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="pubwise" class="analytics-check-box"> PubWise.io Analytics
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="pulsepoint" class="analytics-check-box"> PulsePoint
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="sharethrough" class="analytics-check-box"> Sharethrough
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="roxot" class="analytics-check-box"> Prebid Analytics by Roxot
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="marsmedia" class="analytics-check-box"> Marsmedia Analytics
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="adomik" class="analytics-check-box"> Adomik Analytics
    </label>
  </div>
</div>

<div class="col-md-4">
  <div class="checkbox">
    <label>
      <input type="checkbox" analyticscode="adxcg" class="analytics-check-box"> Adxcg Analytics
    </label>
  </div>
</div>

</div>
<br/>
<div class="row">
 <h4>Modules</h4>
 {% for page in module_pages %}
  {% if page.enable_download == false %}  
    {% continue %}
  {% endif %}
 <div class="col-md-4">
 <div class="checkbox">
  <label> <input type="checkbox" moduleCode="{{ page.module_code }}" class="bidder-check-box"> {{ page.display_name }}</label>
</div>
</div>
 {% endfor %}
</div>

<br>

<div class="form-group">

  <button type="button" class="btn btn-lg btn-primary" data-toggle="modal" data-target="#myModal">Get Custom Prebid.js</button>

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
        Ran into problems? Email <code>support@prebid.org</code>
        </p>

      </div>


    </div>
  </div>
</div>


<div class="bs-docs-section" markdown="1">

### Option 2: Build from Source Code (More Advanced)

{: .lead :}
Alternatively, you can build Prebid.js from the source code.  For instructions, see the [Prebid.js README on GitHub](https://github.com/prebid/Prebid.js/blob/master/README.md).
