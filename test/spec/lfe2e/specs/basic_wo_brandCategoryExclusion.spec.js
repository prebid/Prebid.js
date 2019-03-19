const includes = require('core-js/library/fn/array/includes');
const expect = require('chai').expect;

const durations = ['15s', '30s'];
const cpms = ['15.00', '14.00', '13.00', '10.00'];
const customKeyRegex = /\d{2}\.\d{2}_\d{2}s/;
const uuidRegex = /(\d|\w){8}-((\d|\w){4}-){3}(\d|\w){12}/;

describe('longform ads using requireExactDuration field', function() {
  it('process the bids successfully', function() {
    browser
      .url('http://test.localhost:9999/integrationExamples/longform/basic_wo_brandCategoryExclusion.html?pbjs_debug=true')
      .pause(10000);

    browser.waitForExist('//*[@id="loadPrebidRequestBtn"]');
    $('//*[@id="loadPrebidRequestBtn"]').click();

    browser.pause(3000);

    browser.waitForExist('/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr[1]/td[2]');
    let firstCPM = $('/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr[1]/td[2]').getText();
    let firstDuration = $('/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr[1]/td[4]').getText();

    expect(includes(durations, firstDuration)).to.equal(true);
    expect(includes(cpms, firstCPM)).to.equal(true);
  });

  it('formats the targeting keys properly', function () {
    const listOfKeyElementsXpath = '/html/body/div[1]/div/div/div/div[3]/div[2]/div/table/tbody/tr/td[1]';
    const listOfKeyValuesXpath = '/html/body/div[1]/div/div/div/div[3]/div[2]/div/table/tbody/tr/td[2]';
    browser.waitForExist(listOfKeyElementsXpath);
    browser.waitForExist(listOfKeyValuesXpath);

    let listOfKeyElements = $$(listOfKeyElementsXpath);
    let listOfKeyValues = $$(listOfKeyValuesXpath);

    let firstKey = listOfKeyElements[0].getText();
    expect(firstKey).to.equal('hb_pb_cat_dur');

    let firstKeyValue = listOfKeyValues[0].getText();
    expect(firstKeyValue).match(customKeyRegex);

    let lastKey = listOfKeyElements[listOfKeyElements.length - 1].getText();
    expect(lastKey).to.equal('hb_cache_id');

    let lastKeyValue = listOfKeyValues[listOfKeyValues.length - 1].getText();
    expect(lastKeyValue).to.match(uuidRegex);
  });
})
