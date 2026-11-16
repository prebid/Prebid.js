import manifest from 'manifest.json';
import { MANIFEST, provideManifest } from '../load.mjs';

provideManifest(document.currentScript, MANIFEST, manifest);
