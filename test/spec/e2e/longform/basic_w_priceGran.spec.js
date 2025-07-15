const expect = require('chai').expect;
const { host, protocol, waitForElement } = require('../../../helpers/testing-utils.js');

const validDurations = ['15s', '30s'];
const validCats = ['Food', 'Retail Stores/Chains', 'Pet Food/Supplies', 'Travel/Hotels/Airlines', 'Automotive', 'Health Care Services'];
const validCpms = ['15.00', '14.00', '13.00', '10.00'];
const customKeyRegex = /\d{2}\.\d{2}_\d{1,3}_\d{2}s/;
const uuidRegex = /(\d|\w){8}-((\d|\w){4}-){3}(\d|\w){12}/;

describe('longform ads not using requireExactDuration field', function() {
  this.retries(3);
  it('process the bids successfully', async function() {
    await browser.url(protocol + '://' + host + ':9999/integrationExamples/longform/basic_w_priceGran.html?pbjs_debug=true');
    await browser.pause(7000);

    const loadPrebidBtnXpath = '//*[@id="loadPrebidRequestBtn"]';
    await waitForElement(loadPrebidBtnXpath);
    const prebidBtn = await $(loadPrebidBtnXpath);
    await prebidBtn.click();
    await browser.pause(5000);

    const listOfCpmsXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[2]';
    const listOfCategoriesXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[3]';
    const listOfDurationsXpath = '/html/body/div[1]/div/div/div/div[1]/div[2]/div/table/tbody/tr/td[4]';

    await waitForElement(listOfCpmsXpath);

    const listOfCpms = await $$(listOfCpmsXpath);
    const listOfCats = await $$(listOfCategoriesXpath);
    const listOfDuras = await $$(listOfDurationsXpath);

    expect(listOfCpms.length).to.equal(listOfCats.length).and.to.equal(listOfDuras.length);
    for (let i = 0; i < listOfCpms.length; i++) {
      const cpm = listOfCpms[i].getText();
      const cat = listOfCats[i].getText();
      const dura = listOfDuras[i].getText();
      expect(validCpms.includes(cpm), `Could not find CPM ${cpm} in accepted list`).to.equal(true);
      expect(validCats.includes(cat), `Could not find Category ${cat} in accepted list`).to.equal(true);
      expect(validDurations.includes(dura), `Could not find Duration ${dura} in accepted list`).to.equal(true);
    }
  });

  it('formats the targeting keys properly', async function () {
    const listOfKeyElementsXpath = '/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr/td[1]';
    const listOfKeyValuesXpath = '/html/body/div[1]/div/div/div/div[2]/div[2]/div/table/tbody/tr/td[2]';
    await waitForElement(listOfKeyElementsXpath);
    await waitForElement(listOfKeyValuesXpath);

    const listOfKeyElements = await $$(listOfKeyElementsXpath);
    const listOfKeyValues = await $$(listOfKeyValuesXpath);

    const firstKey = listOfKeyElements[0].getText();
    expect(firstKey).to.equal('hb_pb_cat_dur');

    const firstKeyValue = listOfKeyValues[0].getText();
    expect(firstKeyValue).match(customKeyRegex);

    const lastKey = listOfKeyElements[listOfKeyElements.length - 1].getText();
    expect(lastKey).to.equal('hb_cache_id');

    const lastKeyValue = listOfKeyValues[listOfKeyValues.length - 1].getText();
    expect(lastKeyValue).to.match(uuidRegex);
  });
})
