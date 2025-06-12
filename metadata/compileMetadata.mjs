import path from 'path';
import fs from 'fs';
import helpers from '../gulpHelpers.js';
import moduleMeta from './modules.json' with {type: 'json'};
import overrides from './overrides.mjs';

function matches(moduleName, moduleSuffix) {
    moduleSuffix = moduleSuffix.toLowerCase();
    const shortName = moduleName.toLowerCase().replace(moduleSuffix, '');
    return function({componentName, aliasOf}) {
        const name  = (aliasOf ?? componentName).toLowerCase();
        return name === shortName || (name.startsWith(shortName) && moduleSuffix.startsWith(name.slice(shortName.length)))
    }
}

const modules = {
    BidAdapter: 'bidder',
    AnalyticsAdapter: 'analytics',
    IdSystem: 'userId',
    RtdProvider: 'rtd'
}

export default function compileMetadata() {
    const allMeta = moduleMeta.map(item => Object.assign({}, item));
    let err = false;
    helpers.getModuleNames().forEach(moduleName => {
        let predicate;
        for (const [suffix, moduleType] of Object.entries(modules)) {
            if (moduleName.endsWith(suffix)) {
                predicate = overrides.hasOwnProperty(moduleName)
                    ? ({componentName, aliasOf}) => componentName === overrides[moduleName] || aliasOf === overrides[moduleName]
                    : matches(moduleName, suffix)
                predicate = ((orig) => (entry) => entry.componentType === moduleType && orig(entry))(predicate);
            }
        }
        if (predicate) {
            const meta = allMeta.filter(predicate);
            meta.forEach(entry => entry.found = true);
            const names = new Set(meta.map(({componentName, aliasOf}) => aliasOf ?? componentName));
            if (names.size === 0) {
                console.error('Cannot determine module name for module file: ', moduleName);
                err = true;
            } else if (names.size > 1) {
                console.error('More than one module name matches module file:', moduleName, names);
                err = true;
            } else {
                fs.writeFileSync(path.resolve(`./metadata/modules/${moduleName}.json`), JSON.stringify(meta, null, 2));
            }
        }
    });

    const notFound = allMeta.filter(entry => !entry.found);
    if (notFound.length > 0) {
        console.error(`Could not find module name for metadata`, notFound);
        err = true;
    }

    if (err) {
        throw new Error('Could not compile module metadata');
    }
}
