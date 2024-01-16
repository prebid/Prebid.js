export const PUBCID_EIDS = {
  'pubcid': {
    source: 'pubcid.org',
    atype: 1,
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  }
}
