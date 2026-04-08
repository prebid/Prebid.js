const GVL_URL = 'https://vendor-list.consensu.org/v3/vendor-list.json';

export const getGvl = (() => {
  let gvl;
  return function () {
    if (gvl == null) {
      gvl = fetch(GVL_URL)
        .then(resp => resp.json())
        .catch((err) => {
          gvl = null;
          return Promise.reject(err);
        });
    }
    return gvl;
  };
})();

export function isValidGvlId(gvlId, gvl = getGvl) {
  return gvl().then(gvl => {
    return !!(gvl.vendors[gvlId] && !gvl.vendors[gvlId].deletedDate);
  })
}
