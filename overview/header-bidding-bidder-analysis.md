---
layout: page
title: Bidder Price & Latency Analysis
description: An analysis of header bidding bidders' price granularity and latency.

pid: 80

top_nav_section: overview
nav_section: studies

permalink: /header-bidding-bidder-analysis.html

---
<div class="bs-docs-section" markdown="1">

# Bidder Price & Latency Analysis

While implementing Prebid.js' adaptors for different bidders, we've noticed not all bidders return exact price to the publisher's page. Different bidders also have vastly different response latency. We hope the analysis here can help you make smart decisions when implementing header bidding. 

<!--| Amazon | Estimated at $0.50 increment | 300ms | -->

{: .table .table-bordered .table-striped }
|	Bidder |	Price 	|	*Latency (rough estimate)   |
| :----  |:--------| :-------|
| AOL | Unknown | Unknown |
| AppNexus | Exact | 200ms, however async calls have to be made for multiple slots |
| Casale | Exact | Unknown | 
| Criteo | Estimated | 200ms |
| OpenX | Exact | 500ms |
| Pubmatic | Exact | 400ms |
| Rubicon | Exact | 400ms |
| Sonobi | Exact | Unknown |
| YieldBot | Exact | 300ms |

*Note that the above latency estimate was done in New York, US with fast Internet connection. To provide more accurate report, publishers can implement latency trackers through [Prebid.js Analytics](/overview/ga-analytics.html).

<script type="text/javascript" src="https://www.google.com/jsapi"></script>
<div id="chart_us"></div>
<div id="chart_uk"></div>
<div id="chart_de"></div>
<!-- <div id="chart_ca"></div> -->
      

<script>
var data = {"bg":{"amazon":{"num":17,"latency":187.146240234375},"criteo":{"num":17,"latency":466.950057983398},"appnexus":{"num":12,"latency":170.390828450521}},"ca":{"criteo":{"num":4,"latency":471.6279296875},"openx":{"num":2,"latency":787.467041015625},"DFP":{"num":29,"latency":374.82201171875},"amazon":{"num":2,"latency":340.38818359375}},"de":{"rubicon":{"num":4,"latency":479.220458984375},"appnexus":{"num":90,"latency":175.364076063368},"openx":{"num":46,"latency":757.2021484375},"criteo":{"num":30,"latency":138.448079427083},"amazon":{"num":8,"latency":94.7223815917969},"pubmatic":{"num":92,"latency":149.578621242357}},"sg":{"amazon":{"num":25,"latency":465.864034016927},"criteo":{"num":6,"latency":536.978678385417},"openx":{"num":1,"latency":null},"pubmatic":{"num":2,"latency":1678.56201171875}},"uk":{"criteo":{"num":4,"latency":236.033325195312},"openx":{"num":10,"latency":900.688452148437},"pubmatic":{"num":2,"latency":457.08984375},"appnexus":{"num":36,"latency":345.634141710069},"amazon":{"num":4,"latency":209.942443847656}},"us":{"criteo":{"num":198,"latency":64.1119732634391},"Sovrn":{"num":1,"latency":430.9541015625},"appnexus":{"num":296,"latency":126.881093089691},"Amazon":{"num":1,"latency":176.924072265625},"openx":{"num":326,"latency":760.167721567124},"amazon":{"num":216,"latency":128.580746299342},"rubicon":{"num":13,"latency":202.674096679687},"pubmatic":{"num":8,"latency":606.111419677734},"sonobi":{"num":32,"latency":357.45173592403},"AOL":{"num":2,"latency":222.5439453125},"DFP":{"num":7,"latency":175.106759207589},"Openx":{"num":2,"latency":841.119873046875},"aol":{"num":77,"latency":231.124654447115},"sovrn":{"num":13,"latency":244.542292668269},"AppNexus":{"num":2,"latency":101.75},"Pubmatic":{"num":1,"latency":228.56982421875},"Sonobi":{"num":1,"latency":231.3671875}}};

var countries = [{
	code: 'us',
	name: 'United States'
}, {
	code: 'uk',
	name: 'United Kindom'
}, {
	code: 'de',
	name: 'Germany'
}, 
// {
// 	code: 'ca',
// 	name: 'Canada'
// }
];



google.load('visualization', '1', {packages: ['corechart', 'bar']});
google.setOnLoadCallback(drawCountryCharts);

function drawChart(countryData, country, divId) {
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Bidder');
	data.addColumn('number', 'Avg Bid Load Time');

	var rows = [];
	for (var b in countryData) {
		var v = countryData[b];
		if ('num' in v && 'latency' in v) {
			var num = v['num'];
			var latency = v['latency'];
			if (num > 2 && latency != null) {
				rows.push([b, latency]);
			}
		}
	}
	data.addRows(rows);

	var options = {
	  title: 'Header Bidding Bidders Latency in ' + country,
	  hAxis: {
	  	title: 'Avg Bid Load Time (ms)'
	  },
	  vAxis: {
	    title: 'Bidders'
	  },
	  height: rows.length * 50,
	  legend: { position: "none" }
	  //width: 500
	};

	var chart = new google.visualization.BarChart(
	  document.getElementById(divId));

	chart.draw(data, options);
}

function drawCountryCharts() {
	for (var i = 0; i < countries.length; i++) {
		var c = countries[i];
		drawChart(data[c.code], c.name, 'chart_' + c.code);
	}
	//drawChart(data['us'], 'United States');
}

function drawMultSeries() {
      var data = new google.visualization.DataTable();
      data.addColumn('string', 'Time of Day');
      data.addColumn('number', 'Motivation Level');

      data.addRows([
        ['OpenX', 1],
        ['Pubmatic', 2],
        ['Rubicon', 3],
      ]);

      var options = {
        title: 'Motivation and Energy Level Throughout the Day',
        hAxis: {
          // title: 'Time of Day',
          // format: 'h:mm a',
          // viewWindow: {
          //   min: [7, 30, 0],
          //   max: [17, 30, 0]
          // }
        },
        vAxis: {
          title: 'Rating (scale of 1-10)'
        }
      };

      var chart = new google.visualization.ColumnChart(
        document.getElementById('chart_div'));

      chart.draw(data, options);
    }





</script>










</div>