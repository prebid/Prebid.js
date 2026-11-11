// the checksums of the .metadata.js chunks, which are only loaded for modules that need metadata (storageControl)
import metadata from 'manifest.metadata.json';
import { METADATA_MANIFEST, provideManifest } from '../load.mjs';

provideManifest(document.currentScript, METADATA_MANIFEST, metadata);
