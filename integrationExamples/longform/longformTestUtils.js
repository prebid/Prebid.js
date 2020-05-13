var prebidTestUtils = prebidTestUtils || {};

function getIndustry(id) {
  var mapping = window.localStorage.getItem('iabToFwMappingkey');
  if (mapping) {
    try {
      mapping = JSON.parse(mapping);
    } catch (error) {
      //
    }
    var industry;
    mapping = mapping['mapping'];
    for (var v in mapping) {
      if (mapping[v]['id'] == id) {
        industry = mapping[v]['name'];
        break;
      }
    }
    return industry;
  }
}

prebidTestUtils.loadKv = function (targetingArr) {
  var div = document.getElementById('collapseThree').children[0];
  var html = '<table class="table"><tbody>';
  Object.keys(targetingArr).forEach(function(adUnitCode) {
    targetingArr[adUnitCode].forEach(function (targeting) {
      Object.keys(targeting).forEach(function (key) {
        html += '<tr id=' + targeting[key] + '><td>' + key + '</td><td>' + targeting[key] + '</td></tr>'
      });
    });
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}

prebidTestUtils.loadBids = function (targetingArr, brandCatExclusion) {
  var div = document.getElementById('collapseTwo').children[0];
  var html = '<table class="table"><thead><tr><th>#</th><th>CPM</th><th>Industry</th><th>Duration</th><th>Status</th><th>Comm Break #</th></tr></thead><tbody>';
  var index = 1;
  Object.keys(targetingArr).forEach(function(adUnitCode) {
    targetingArr[adUnitCode].forEach(function (targeting) {
      Object.keys(targeting).forEach(function (key) {
        if (key !== 'hb_cache_id') {
          var result = targeting[key].split('_');
          html += '<tr id=' + targeting[key] + '>';
          html += '<td>' + index + '</td>';
          html += '<td>' + result[0] + '</td>';
          if (brandCatExclusion) {
            html += '<td>' + getIndustry(result[1]) + '</td>';
            html += '<td>' + result[2] + '</td>';
          } else {
            html += '<td></td>';
            html += '<td>' + result[1] + '</td>';
          }
          html += '<td></td>';
          html += '<td></td>';
          html += '</tr>';
          index++;
        }
      });
    });
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}
