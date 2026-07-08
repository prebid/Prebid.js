import { parseParams } from '../options.mjs';
import { load } from '../load.mjs';
import manifestChecksum from 'manifest.js.checksum';

const options = parseParams(new URL(document.currentScript.src).search);
load(manifestChecksum, options);

