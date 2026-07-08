import path from 'path';
import assert from 'node:assert';
import fs from 'fs/promises';
import { CORE_MOD, METADATA_SUFFIX, requiresMetadata } from './dependencies.mjs';
import crypto from 'crypto';

const ALGO = 'sha256';

export function getChecksum(file) {
  return fs.readFile(file).then(contents => `${ALGO}-${crypto.createHash(ALGO).update(contents).digest('base64')}`);
}

const isMetadataFile = (file) => file.endsWith(METADATA_SUFFIX);
const CORE_FILE = `${CORE_MOD}.js`;

/**
 * Strip down dependencies.json to omit entries that are not necessary for the web-based bundler to function.
 */
export function cleanDependencies(dependencies, requiresMeta = requiresMetadata) {
  const coreDeps = new Set([CORE_FILE].concat(dependencies[CORE_FILE]));
  let metadataDep = null;
  let requireMetadata = {};
  const slim = Object.fromEntries(
    Object.entries(dependencies)
      .map(([file, deps]) => {
        // omit modules that are not intended for production
        if (file.startsWith('_')) return null;
        if (isMetadataFile(file)) {
          // sanity check: metadata files should all have the same single dependency...
          assert.equal(deps.length, 1);
          if (metadataDep == null) {
            metadataDep = deps[0];
          } else {
            assert.equal(deps[0], metadataDep, 'Unexpected dependency for metadata module');
          }
          return null;
        }
        if (requiresMeta(file.replace(/.js$/, ''))) {
          // ... which should be brought in when metadata is needed, which is why
          // we can omit metadata file dependencies
          requireMetadata[file] = deps;
        }
        if (file !== CORE_FILE) {
          // exclude dependencies of core as they're always included
          deps = deps.filter(dep => !coreDeps.has(dep));
        }
        return [file, deps];
      })
      .filter(entry => entry != null)
  );
  Object.entries(requireMetadata).forEach(([file, deps]) => {
    assert.ok(deps.includes(metadataDep), `${file} requires metadata, but does not depend on metadata`);
  });
  return slim;
}


export function getManifest(dependencies, chunkFiles) {
  return Promise.all(
    chunkFiles
      .map(file => getChecksum(file).then(digest => [path.basename(file), digest]))
  ).then(entries => ({
    checksums: Object.fromEntries(entries), dependencies: cleanDependencies(dependencies)
  }));
}
