
// ===== Parse ====/
Parse.initialize("6ZZDyvR3T7JcfxPqRqdkvW6q89IKoSjRJxpDc8gw", "bvzQPaz6EILUCspXr38z2kZDpRXqwhSy9AtBrLrP");


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
      console.log("Submit failed :( Please send an email to info@prebid.org. Thank you!" + error);
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
      alert("Submit failed :( Please send an email to info@prebid.org. Thank you!");
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
      alert("Submit failed :( Please send an email to info@prebid.org. Thank you!");
    }
  });
}





// logs = {"Load Prebid.js":{"static":true,"start":0,"end":4},"Adserver Timer":{"static":true,"start":0,"end":619},"amazon":{"start":134,"end":618,"cpm":0},"appnexus":{"start":132,"end":519,"cpm":0.5},"criteo":{"start":152,"end":519,"cpm":0},"openx":{"start":153,"end":1349},"pubmatic":{"start":135,"end":1059},"rubicon":{"start":154,"end":734,"cpm":3.813333},"Load GPT":{"static":true,"start":619,"end":813},"Set Targeting":{"static":true,"start":816,"end":842}};
//finalEndTime = 1500;
window.logTime = function(logs, finalEndTime) {
  var rows = [];
  for (eventName in logs) {
    var bidderData = logs[eventName];

    if (!('start' in bidderData)) continue;

    var startTime = bidderData.start;
    var endTime = bidderData.end;
    if (!('end' in bidderData)) endTime = finalEndTime;

    if (bidderData.start > bidderData.end) {
      console.log('startTime ' + bidderData.start + ' > endTime ' + bidderData.end + ' for: ' + eventName);
      continue;
    }

    var cpm = 0;
    if ('cpm' in bidderData) cpm = bidderData.cpm;
    cpm = Math.round(cpm * 100) / 100;

    //var cpmStr = '';
    //if (!bidderData.static) cpmStr = 'cpm:' + cpm;
    // rows.push([eventName, cpmStr, startTime, endTime]);

    var name = eventName;
    if ('displayName' in bidderData) name = bidderData.displayName;

    var duration = endTime-startTime;
    var tooltip = eventName + '\nDuration: ' + duration + 'ms\nStart: ' + startTime + 'ms, End: ' + endTime + 'ms';
    var color = '#3b88c3';
    var annotation = '$' + cpm.toString();
    if (bidderData.static) {
      color = '#ec971f';
      annotation = '';
    }
    var style = 'color:' + color + ';opacity:0.6';
    rows.push([name, startTime, duration, tooltip, style, annotation]);
  }
  console.log(JSON.stringify(rows));

      var dataTable = new google.visualization.DataTable();
      dataTable.addColumn('string', 'Event');
      dataTable.addColumn('number', 'Start');
      dataTable.addColumn('number', 'End');
      dataTable.addColumn({type: 'string', role: 'tooltip'});
      dataTable.addColumn({type: 'string', role: 'style'});
      dataTable.addColumn({type: 'string', role: 'annotation'});
      dataTable.addRows(rows)


    //var data = google.visualization.arrayToDataTable(rows);

    var options = {
      title: 'Timeline of this Header Bidding Auction',
      width: 600,
      height: 400,
      legend: { position: 'none' },
      //chartArea: {width: '50%'},
      colors: ['transparent', '#3b88c3'],
      hAxis: {
        minValue: 0,
        //maxValue: finalEndTime,
        viewWindow: {
          max: finalEndTime + 50
        }
      },
      vAxis: {
      },
      isStacked: true,
      annotations: {
          textStyle: {
            fontSize: 10,
            //color: '#871b47',
            //opacity: 0.8
          }
        },
      animation: {
        startup: true,
        duration: 300,
        easing: 'linear'
      }

        
    };
    var chart = new google.visualization.BarChart(document.getElementById('chart_div'));
    chart.draw(dataTable, options);
  
  }

