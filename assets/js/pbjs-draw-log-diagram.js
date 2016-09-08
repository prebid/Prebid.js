
function createBar(eventData, isBid) {
  if (!('start' in eventData)) return false;


  var eventName = eventData.displayName;

  var startTime = eventData.start;
  var endTime = eventData.end;
  if (!('end' in eventData)) endTime = finalEndTime;

  if (startTime > endTime) {
    console.log('startTime ' + startTime + ' > endTime ' + endTime + ' for: ' + eventName);
    return false;
  } else if (startTime == endTime) {
    endTime += 1;
  }


  var cpm = 0;
  if ('cpm' in eventData) cpm = eventData.cpm;
  cpm = Math.round(cpm * 100) / 100;

  //var cpmStr = '';
  //if (!eventData.static) cpmStr = 'cpm:' + cpm;
  // rows.push([eventName, cpmStr, startTime, endTime]);

  //var name = eventName;
  if ('displayName' in eventData) eventName = eventData.displayName;

  var duration = endTime-startTime;
  var tooltip = eventName + '\nDuration: ' + duration + 'ms\nStart: ' + startTime + 'ms, End: ' + endTime + 'ms';
  var color = '#ec971f';
  var annotation = '';
  if (isBid) {
    color = '#3b88c3';
    annotation = '$' + cpm.toString();
  }
  var style = 'color:' + color + ';opacity:0.6';
  return [eventName, startTime, duration, tooltip, style, annotation];
}

function logToParse(logs) {
  for (eventCode in logs) {

    if (eventCode == 'bids') {
      var bidEvents = logs[eventCode];
      for (var i in bidEvents) {
        var bidEvent = bidEvents[i];

        var latency = bidEvent['end'] - bidEvent['start'];
        var cpm = bidEvent['cpm'];
        var bidderCode = bidEvent['bidderCode'];

        var CPMobj = Parse.Object.extend("demoCPM");
        var cpmObj = new CPMobj();
        cpmObj.set("bidderCode", bidderCode);
        cpmObj.set("cpm", cpm);
        cpmObj.set("loadTime", latency);
        
        cpmObj.save(null, {
          success: function(visitor) {
            console.log('added to parse')
          },
          error: function(visitor, error) {
            // Show the error message somewhere and let the user try again.
            console.log('failed at adding to parse');
          }
        });

      }
    }
  }
}

//finalEndTime = 1500;
window.drawLog = function(logs, finalEndTime) {
  console.log(JSON.stringify(logs));
  var rows = [];
  for (eventCode in logs) {

    if (eventCode == 'bids') {
      var bidEvents = logs[eventCode];
      for (var i in bidEvents) {
        var bidEvent = bidEvents[i];

        var barData = createBar(bidEvent, true);

        if (barData) rows.push(barData);
      }
    } else {
      var eventData = logs[eventCode];

      var barData = createBar(eventData);

      if (barData) rows.push(barData);

    }
    
  }
  console.log(JSON.stringify(rows));

  var dataTable = new google.visualization.DataTable();
  dataTable.addColumn('string', 'Event');
  dataTable.addColumn('number', 'Start');
  dataTable.addColumn('number', 'End');
  dataTable.addColumn({type: 'string', role: 'tooltip'});
  dataTable.addColumn({type: 'string', role: 'style'});
  dataTable.addColumn({type: 'string', role: 'annotation'});
  dataTable.addRows(rows);


  //var data = google.visualization.arrayToDataTable(rows);

  var options = {
    title: 'Live Demo of Header Bidding',
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
  
  logToParse(logs);
}