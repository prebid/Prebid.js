const puppeteer = require('puppeteer');
const path = require('path');
const { json } = require('body-parser');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', async request => {

    //when header bidding requests go out, capture emx request to server
    if(request.url().toString().includes('hb.emxdgt.com')){

        //inspect url
        console.log('EMX Header Bidding Request: ' + request.url());

        //inspect json body
        const hbRequest = JSON.stringify(request.postData());
        console.log(hbRequest);

        //do parsing and validation logic here....

    }else{
        request.continue();
    }
    
  });

  //load test adapter page
  await page.goto(`file:${path.join(__dirname, './../pages/pbjs.html')}`);
  await browser.close();
 
})();