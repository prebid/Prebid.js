import {config} from '../src/config.js';
import {metadata} from '../libraries/metadata/metadata.js';

config.getConfig('storageControl', (cfg) => {
  console.log(metadata.getMetadata('bidder', 'rubicon'));
})
