const path = require('path');
const fs = require('fs').promises;

(async () => {
  const filePath = path.join(__dirname, 'prebid.js');
  let pb = await fs.readFile(filePath, 'utf8');
  const regex = /url:\(void 0!==t\?t:"https:\/\/prg\.smartadserver\.com"\)\+"\/prebid\/v1"/
  if(regex.test(pb)) {
    console.log('replacing smartadserver domain to hardcoded');
    pb = pb.replace(regex, 'url:"https://prg.smartadserver.com/prebid/v1"');
  } else {
    await fs.unlink(filePath);
    throw new Error('smartadserver domain not replaced')
  }
  await fs.writeFile(filePath, pb, 'utf8');
  console.log('done');
})();
