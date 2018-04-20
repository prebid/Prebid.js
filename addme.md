---
redirect_to: "/index.html"
layout: page
title: Add me!
description: 
pid: 60
isNew: true
hide: false
isNavParent: true
---

<div class="bs-docs-section" markdown="1">

#Best Practices

#### Best Practices Listserv

Stay informed of publisher best practices for header bidding and the latest for prebid.js.

<div class="form-inline">
  <div class="form-group">
    <label>Email: </label>
    <input type="text" class="form-control" id="email-field" placeholder="Email" required>
  </div>
  <div class="form-group">
  	<button class="btn btn-primary" id="submit-email" onclick="submitEmail()">Join Best Practices Group</button>
  </div>        
</div>


</div>

<div class="bs-docs-section" markdown="1">

#Contact Companies


#### Share your company

If you are a publisher that'd like to be contacted by bidders, or if you're a bidder and want to share more about yourself, use the below form. Note that the information you entered here will be shared in this page after your approval. 

<form class="form row" id="form-company">

	<div class="form-group col-sm-12">
		<div class="radio">
			<label>
				<input type="radio" name="optionsRadios" id="company-publisher" value="company-publisher" checked>
				I'm a publisher
			</label>
		</div>
		<div class="radio">
			<label>
				<input type="radio" name="optionsRadios" id="company-bidder" value="company-bidder">
				I'm a bidder <!--(<a href="adaptor.html">Check here</a> to learn how to implement an adaptor) -->
			</label>
		</div>
	</div>

	<div class="col-sm-6">

	<div class="form-group">
		<label>Company Name</label>
		<input type="name" class="form-control" id="company-name" placeholder="Name">
	</div>

	<div class="form-group">
		<label>Company Logo</label>
		<input class="form-control" id="company-logo" placeholder="http://company.com/image.png">
	</div>

	<div class="form-group">
		<label>Contact Email</label>
		<input type="email" class="form-control" id="company-email" placeholder="Email">
	</div>

	</div>

	<div class="form-group  col-sm-12">
		<label>Brief intro to your company</label>
		<textarea class="form-control" id="company-intro" rows="2" maxlength="200"></textarea>

	</div>

	<div class="col-sm-2">
		<button class="btn btn-primary" id="submit-company">Add Company</button>
	</div>


</form>

<!--
### Publisher Companies

If you'd like to edit existing entries, email support@prebid.org. 


### "Bidder" Companies

If you'd like to edit existing entries, email support@prebid.org. 

-->

</div>
