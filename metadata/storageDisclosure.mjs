const GVL_URL = 'https://vendor-list.consensu.org/v3/vendor-list.json';

export const getGvl = (() => {
    let gvl;
    return function () {
        if (gvl == null) {
            gvl = fetch(GVL_URL)
                .then(resp => resp.json())
                .catch((err) => {
                    gvl = null;
                    return Promise.reject(err)
                })
        }
        return gvl;
    }
})();

export function getDisclosureUrl(gvlId) {
    return getGvl().then(gvl => {
        return gvl.vendors[gvlId]?.deviceStorageDisclosureUrl
    })
}


function parseDisclosure(payload) {
    // filter out all disclosures except those pertaining the 1st party (domain: '*')
    return payload.disclosures.filter((disclosure) => {
        const {domain, domains} = disclosure;
        if (domain === '*' || domains?.includes('*')) {
            delete disclosure.domain;
            delete disclosure.domains;
            return true;
        };
    })
}

export const fetchDisclosure = (() => {
    const disclosures = {};
    return function (metadata) {
        const url = metadata.disclosureURL;
        if (url != null && !disclosures.hasOwnProperty(url)) {
            console.info(`Fetching disclosure for "${metadata.componentName}" (gvl ID: ${metadata.gvlid}) from "${url}"...`)
            disclosures[url] = fetch(url).then(resp => resp.json().then(parseDisclosure))
                .catch((err) => {
                    console.error(`Could not fetch disclosure for "${metadata.componentName}"`, err);
                    return null;
                })
        }
        return disclosures[url];
    }
})();
