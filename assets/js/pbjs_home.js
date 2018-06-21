
function submitEmail() {
  var email = $('#email-field').val();
  var site = $('#site-field').val();
  var iab_vote = $('#iab-vote').prop('checked');
  newVisitor(email, site, iab_vote);
}

function newVisitor(email, site, iab_vote) {
  var Visitor = Parse.Object.extend("Visitor");

  var visitor = new Visitor();
  visitor.set("email", email);
    
  // other fields can be set just like with Parse.Object
  visitor.set("site", site);
  visitor.set("iab", iab_vote);
    
  $('#submit-email').text("Adding...");
  visitor.save(null, {
    success: function(visitor) {
      $('#submit-email').text("You're Added!");
    },
    error: function(visitor, error) {
      // Show the error message somewhere and let the user try again.
      console.log("Submit failed :( Please send an email to support@prebid.org. Thank you!" + error);
      console.log(error);
    }
  });

}


function submitComment() {
  var comment = $('#comment-field').val();
  var email = $('#email-field').val();
  var site = $('#site-field').val();
  newComment(comment, email, site);
}

function newComment(comment, email, site) {
  var Comment = Parse.Object.extend("Comment");

  var commentObj = new Comment();
  commentObj.set("email", email);
    
  // other fields can be set just like with Parse.Object
  commentObj.set("site", site);
  commentObj.set("comment", comment)
    
  $('#submit-comment').text("Sending...");
  commentObj.save(null, {
    success: function(commentObj) {
      $('#submit-comment').text("Sent!");
    },
    error: function(commentObj, error) {
      // Show the error message somewhere and let the user try again.
      alert("Submit failed :( Please send an email to support@prebid.org. Thank you!");
    }
  });

}

$( document ).ready(function() {
  $('#form-company').submit(function(event) {
    event.preventDefault();
    
    submitCompany();
  })


});


function submitCompany() {

  var company_type = 'unknown';
  if ($('#company-publisher').prop('checked')) {
    company_type = 'publisher';
  } else if ($('#company-bidder').prop('checked')) {
    company_type = 'bidder';
  }

  var name = $('#company-name').val();;
  var logo = $('#company-logo').val();;
  var email = $('#company-email').val();;
  var intro = $('#company-intro').val();;

  newCompany(company_type, name, logo, email, intro);
}

function newCompany(company_type, name, logo, email, intro) {
  var Company = Parse.Object.extend("Company");

  var companyObj = new Company();

  companyObj.set("company_type", company_type);
  companyObj.set("name", name);
  companyObj.set("logo", logo);
  companyObj.set("email", email);
  companyObj.set("intro", intro);
    
  $('#submit-company').text("Adding...");
  companyObj.save(null, {
    success: function(companyObj) {
      $('#submit-company').text("Added Company!");
    },
    error: function(companyObj, error) {
      // Show the error message somewhere and let the user try again.
      console.log(error);
      alert("Submit failed :( Please send an email to support@prebid.org. Thank you!");
    }
  });
}



