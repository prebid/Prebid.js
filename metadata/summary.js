const {getMetadataEntry} = require('../gulpHelpers.js');
const fs = require('fs');

module.exports = {
  disclosureSummary(moduleNames) {
    const disclosures = [];
    moduleNames
      .filter(getMetadataEntry)
      .forEach(module => {
        const metadata = JSON.parse(fs.readFileSync(`./metadata/modules/${module}.json`).toString());
        Object.entries(metadata.disclosures).forEach(([url, declarations]) => {
          declarations?.forEach(decl => {
            disclosures.push({
              disclosedIn: url,
              disclosedBy: module,
              ...decl,
            })
          })
        })
      })
    return disclosures;
  }
}
