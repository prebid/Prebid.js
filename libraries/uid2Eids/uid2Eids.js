export const UID2_EIDS = {
  'uid2': {
    source: 'uidapi.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  }
}
