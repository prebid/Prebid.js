import puppeteer  from 'puppeteer';

export default async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:9999/metadata/extractMetadata.html');
  const metadata = await page.evaluate(() => {
    return pbjs._getModuleMetadata();
  })
  await browser.close();
  return metadata;
};
