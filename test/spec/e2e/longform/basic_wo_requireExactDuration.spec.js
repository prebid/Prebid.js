import {includes} from 'src/polyfill.js';
const expect = require('chai').expect;
const { host, protocol, waitForElement } = require('../../../helpers/testing-utils');

const validDurations = ['15s', '30s'];
const validCats = ['Food', 'Retail Stores/Chains', 'Pet Food/Supplies', 'Travel/Hotels/Airlines', 'Automotive', 'Health Care Services'];
const validCpms = ['15.00', '14.00', '13.00', '10.00'];
const customKeyRegex = /\d{2}\.\d{2}_\d{1,3}_\d{2}s/;
const uuidRegex = /(\d|\w){8}-((\d|\w){4}-){3}(\d|\w){12}/;

describe('longform ads not using requireExactDuration field', function() {
  this.retries(3);
  it('process the bids successfully', function() {
    browser.url(protocol + '://' + host + ':9999/integrationExamples/longform/basic_wo_requireExactDuration.html?pbjs_debug=true');
    browser.pause(7000);

    const loadPrebidBtnXpath = '//*[@id="loadPrebidRequestBtn"]';
    waitForElement(loadPrebidBtnXpath);
    const prebidBtn = $(loadPrebidBtnXpath);
    prebidBtn.click();
    browser.pause(5000);

    const listOfCpmsXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[2]';
    const listOfCategoriesXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[3]';
    const listOfDurationsXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[4]';

    waitForElement(listOfCpmsXpath);

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
    waitForElement(listOfKeyElementsXpath);
    waitForElement(listOfKeyValuesXpath);

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
