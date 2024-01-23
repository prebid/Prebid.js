export const PUBCID_EIDS = {
  'pubcid': {
    source: 'pubcid.org',
    atype: 1,
    getValue: function(data) {
      if (data.id) {
        return data.id
      } else {
        return data
      }
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  }
}
