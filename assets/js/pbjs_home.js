

function submitEmail() {
  var email = $('#email-field').val();
  var site = $('#site-field').val();
  newVisitor(email, site);
}

// ===== Parse ====/
Parse.initialize("6ZZDyvR3T7JcfxPqRqdkvW6q89IKoSjRJxpDc8gw", "bvzQPaz6EILUCspXr38z2kZDpRXqwhSy9AtBrLrP");

var Visitor = Parse.Object.extend("Visitor");

function newVisitor(email, site) {
  var visitor = new Visitor();
  visitor.set("email", email);
    
  // other fields can be set just like with Parse.Object
  visitor.set("site", site);
    
  $('#submit-email').text("Adding...");
  visitor.save(null, {
    success: function(visitor) {
      $('#submit-email').text("You're Added!");
      alert('success!');
    },
    error: function(visitor, error) {
      // Show the error message somewhere and let the user try again.
      alert("Submit failed :( Please send an email to info@prebidjs.com. Thank you!");
    }
  });

}

