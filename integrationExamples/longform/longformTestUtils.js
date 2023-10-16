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

prebidTestUtils.setMockCategories = function () {
  const key = 'iabToFwMappingkey';
  const keyPub = 'iabToFwMappingkeyPub';
  const keyBidder = 'appnexus';
  const currTime = new Date().getTime();
  const fwData = {
    "mapping": {
      "IAB1-1": {
        "id": 404,
        "name": "Publishing"
      },
      "IAB1-2": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB1-5": {
        "id": 419,
        "name": "Filmed Entertainment"
      },
      "IAB1-6": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB1-7": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB2-1": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-2": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-3": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-4": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-5": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-6": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-7": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-8": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-9": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-10": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-11": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-12": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-13": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-14": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-15": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-16": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-17": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-18": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-19": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-20": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-21": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-22": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB2-23": {
        "id": 399,
        "name": "Automotive"
      },
      "IAB3-1": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-2": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-3": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-4": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB3-5": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-6": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-7": {
        "id": 398,
        "name": "Government/Municipal"
      },
      "IAB3-8": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-9": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-10": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-11": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB3-12": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB4-1": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB4-2": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB4-3": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB4-4": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB4-5": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB4-6": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB4-7": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB4-8": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB4-9": {
        "id": 417,
        "name": "Telecommunications"
      },
      "IAB4-10": {
        "id": 429,
        "name": "Military"
      },
      "IAB4-11": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB5-1": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-2": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-3": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-4": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-5": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-6": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-7": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-8": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-9": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-10": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-11": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-12": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-13": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-14": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB5-15": {
        "id": 405,
        "name": "Educational Services"
      },
      "IAB7-1": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-2": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-3": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-4": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-5": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-6": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-7": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-8": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-9": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-10": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-11": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-12": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-13": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-14": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-15": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-16": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-17": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-18": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-19": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-20": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-21": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-22": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-23": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-24": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-25": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-26": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-27": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-28": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-29": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-30": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-31": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-32": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-33": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-34": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-35": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-36": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-37": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-38": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-39": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-40": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-41": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-42": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-43": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-44": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB7-45": {
        "id": 406,
        "name": "Health Care Services"
      },
      "IAB8-1": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-2": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-3": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-4": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-5": {
        "id": 400,
        "name": "Beer/Wine/Liquor"
      },
      "IAB8-6": {
        "id": 401,
        "name": "Beverages"
      },
      "IAB8-7": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-8": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-9": {
        "id": 407,
        "name": "Restaurant/Fast Food"
      },
      "IAB8-10": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-11": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-12": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-13": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-14": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-15": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-16": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-17": {
        "id": 394,
        "name": "Food"
      },
      "IAB8-18": {
        "id": 400,
        "name": "Beer/Wine/Liquor"
      },
      "IAB9-1": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB9-3": {
        "id": 418,
        "name": "Jewelry"
      },
      "IAB9-5": {
        "id": 413,
        "name": "Gaming"
      },
      "IAB9-6": {
        "id": 412,
        "name": "Household Products"
      },
      "IAB9-9": {
        "id": 426,
        "name": "Tobacco"
      },
      "IAB9-11": {
        "id": 404,
        "name": "Publishing"
      },
      "IAB9-15": {
        "id": 404,
        "name": "Publishing"
      },
      "IAB9-16": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB9-18": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB9-19": {
        "id": 418,
        "name": "Jewelry"
      },
      "IAB9-23": {
        "id": 424,
        "name": "Photographic Equipment"
      },
      "IAB9-24": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB9-25": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB9-30": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB10-1": {
        "id": 415,
        "name": "Appliances"
      },
      "IAB10-5": {
        "id": 434,
        "name": "Home Furnishings"
      },
      "IAB10-6": {
        "id": 434,
        "name": "Home Furnishings"
      },
      "IAB10-7": {
        "id": 434,
        "name": "Home Furnishings"
      },
      "IAB10-8": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB10-9": {
        "id": 434,
        "name": "Home Furnishings"
      },
      "IAB11-1": {
        "id": 398,
        "name": "Government/Municipal"
      },
      "IAB11-2": {
        "id": 398,
        "name": "Government/Municipal"
      },
      "IAB11-3": {
        "id": 398,
        "name": "Government/Municipal"
      },
      "IAB11-4": {
        "id": 398,
        "name": "Government/Municipal"
      },
      "IAB11-5": {
        "id": 398,
        "name": "Government/Municipal"
      },
      "IAB12-1": {
        "id": 438,
        "name": "News"
      },
      "IAB12-2": {
        "id": 438,
        "name": "News"
      },
      "IAB12-3": {
        "id": 438,
        "name": "News"
      },
      "IAB13-1": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-2": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-3": {
        "id": 438,
        "name": "News"
      },
      "IAB13-4": {
        "id": 391,
        "name": "Financial Services"
      },
      "IAB13-5": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-6": {
        "id": 436,
        "name": "Insurance"
      },
      "IAB13-7": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-8": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-9": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-10": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-11": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB13-12": {
        "id": 393,
        "name": "Business Services"
      },
      "IAB16-1": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB16-2": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB16-3": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB16-4": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB16-5": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB16-6": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB16-7": {
        "id": 423,
        "name": "Pet Food/Supplies"
      },
      "IAB17-1": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-2": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-3": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-4": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-5": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-6": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-7": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-8": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-9": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-10": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-11": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-12": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-13": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-14": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-15": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-16": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-17": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-18": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-19": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-20": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-21": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-22": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-23": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-24": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-25": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-26": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-27": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-28": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-29": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-30": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-31": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-32": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-33": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-34": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-35": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-36": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-37": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-38": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-39": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-40": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-41": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-42": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-43": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB17-44": {
        "id": 425,
        "name": "Professional Sports"
      },
      "IAB18-1": {
        "id": 411,
        "name": "Cosmetics/Toiletries"
      },
      "IAB18-2": {
        "id": 397,
        "name": "Apparel"
      },
      "IAB18-3": {
        "id": 397,
        "name": "Apparel"
      },
      "IAB18-4": {
        "id": 418,
        "name": "Jewelry"
      },
      "IAB18-5": {
        "id": 397,
        "name": "Apparel"
      },
      "IAB18-6": {
        "id": 397,
        "name": "Apparel"
      },
      "IAB19-2": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-3": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-4": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-5": {
        "id": 424,
        "name": "Photographic Equipment"
      },
      "IAB19-6": {
        "id": 417,
        "name": "Telecommunications"
      },
      "IAB19-7": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-8": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-9": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-10": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-11": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-12": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-13": {
        "id": 404,
        "name": "Publishing"
      },
      "IAB19-14": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-15": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-16": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-17": {
        "id": 419,
        "name": "Filmed Entertainment"
      },
      "IAB19-18": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-19": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-20": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-21": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-22": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-23": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-24": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-25": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-26": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-27": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-28": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-29": {
        "id": 392,
        "name": "Entertainment"
      },
      "IAB19-30": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-31": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-32": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-33": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-34": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-35": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB19-36": {
        "id": 409,
        "name": "Computing Product"
      },
      "IAB20-1": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-2": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-3": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-4": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-5": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-6": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-7": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-8": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-9": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-10": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-11": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-12": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-13": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-14": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-15": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-16": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-17": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-18": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-19": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-20": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-21": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-22": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-23": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-24": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-25": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-26": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB20-27": {
        "id": 395,
        "name": "Travel/Hotels/Airlines"
      },
      "IAB21-1": {
        "id": 416,
        "name": "Real Estate"
      },
      "IAB21-2": {
        "id": 416,
        "name": "Real Estate"
      },
      "IAB21-3": {
        "id": 416,
        "name": "Real Estate"
      },
      "IAB22-1": {
        "id": 403,
        "name": "Retail Stores/Chains"
      },
      "IAB22-2": {
        "id": 403,
        "name": "Retail Stores/Chains"
      },
      "IAB22-3": {
        "id": 403,
        "name": "Retail Stores/Chains"
      }
    },
    "lastUpdated": currTime
  };

  const appData = {
    "lastUpdated": 1588950237532,
    "mapping": {
      "1": "IAB20-3",
      "2": "IAB18-5",
      "3": "IAB10-1",
      "4": "IAB2-3",
      "5": "IAB19-8",
      "7": "IAB18-1",
      "8": "IAB14-1",
      "9": "IAB5-1",
      "10": "IAB4-5",
      "11": "IAB13-4",
      "12": "IAB8-7",
      "13": "IAB19-2",
      "14": "IAB7-1",
      "15": "IAB20-18",
      "16": "IAB10-7",
      "17": "IAB19-18",
      "18": "IAB13-6",
      "19": "IAB18-4",
      "20": "IAB1-5",
      "21": "IAB1-6",
      "22": "IAB19-28",
      "23": "IAB19-13",
      "24": "IAB22-2",
      "25": "IAB3-9",
      "26": "IAB17-26",
      "27": "IAB19-6",
      "28": "IAB1-7",
      "29": "IAB9-5",
      "30": "IAB20-7",
      "31": "IAB20-17",
      "32": "IAB7-32",
      "33": "IAB16-5",
      "34": "IAB19-34",
      "37": "IAB11-4",
      "39": "IAB9-30",
      "41": "IAB7-44",
      "51": "IAB17-12",
      "53": "IAB3-1",
      "55": "IAB13-2",
      "61": "IAB21-3",
      "62": "IAB6-4",
      "63": "IAB15-10",
      "65": "IAB11-2",
      "67": "IAB9-9",
      "69": "IAB7-1",
      "71": "IAB22-2",
      "74": "IAB8-5"
    }
  };

  if (!window.localStorage.getItem(key)) {
    console.log(key, 'categories not found in localstorage...setting them now...');
    window.localStorage.setItem(key, JSON.stringify(fwData));
  }

  if (!window.localStorage.getItem(keyPub)) {
    console.log(keyPub, 'categories not found in localstorage...setting them now...');
    window.localStorage.setItem(keyPub, JSON.stringify(fwData));
  }

  if (!window.localStorage.getItem(keyBidder)) {
    console.log(keyBidder, 'categories not found in localstorage...setting them now...');
    window.localStorage.setItem(keyBidder, JSON.stringify(appData));
  }
}