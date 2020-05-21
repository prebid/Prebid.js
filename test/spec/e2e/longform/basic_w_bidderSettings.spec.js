const includes = require('core-js-pure/features/array/includes.js');
const expect = require('chai').expect;
const testServer = require('../../../helpers/testing-utils');

const host = testServer.host;
const protocol = testServer.protocol;

const validDurations = ['15s', '30s'];
const validCats = ['Food', 'Retail Stores/Chains', 'Pet Food/Supplies', 'Travel/Hotels/Airlines', 'Automotive', 'Health Care Services'];
const validCpms = ['14.00', '13.00', '12.00', '9.00'];
const customKeyRegex = /\d{2}\.\d{2}_\d{1,3}_\d{2}s/;
const uuidRegex = /(\d|\w){8}-((\d|\w){4}-){3}(\d|\w){12}/;

describe('longform ads not using requireExactDuration field', function() {
  this.retries(3);
  it('process the bids successfully', function() {
    browser
      .url(protocol + '://' + host + ':9999/integrationExamples/longform/basic_w_bidderSettings.html?pbjs_debug=true')
      .pause(10000);

    const loadPrebidBtnXpath = '//*[@id="loadPrebidRequestBtn"]';
    browser.waitForExist(loadPrebidBtnXpath);
    $(loadPrebidBtnXpath).click();
    browser.pause(3000);

    const listOfCpmsXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[2]';
    const listOfCategoriesXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[3]';
    const listOfDurationsXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[4]';

    browser.waitForExist(listOfCpmsXpath);

    let listOfCpms = $$(listOfCpmsXpath);
    let listOfCats = $$(listOfCategoriesXpath);
    let listOfDuras = $$(listOfDurationsXpath);

    expect(listOfCpms.length).to.equal(listOfCats.length).and.to.equal(listOfDuras.length);
    for (let i = 0; i < listOfCpms.length; i++) {
      let cpm = listOfCpms[i].getText();
      let cat = listOfCats[i].getText();
      let dura = listOfDuras[i].getText();
      expect(includes(validCpms, cpm), `Could not find CPM ${cpm} in accepted list`).to.equal(true);
      expect(includes(validCats, cat), `Could not find Category ${cat} in accepted list`).to.equal(true);
      expect(includes(validDurations, dura), `Could not find Duration ${dura} in accepted list`).to.equal(true);
    }
  });

  it('formats the targeting keys properly', function () {
    const listOfKeyElementsXpath = '/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr/td[1]';
    const listOfKeyValuesXpath = '/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr/td[2]';
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
