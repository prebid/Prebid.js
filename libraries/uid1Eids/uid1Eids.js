export const UID1_EIDS = {
  'tdid': {
    source: 'adserver.org',
    atype: 1,
    getValue: function(data) {
      if (data.id) {
        return data.id;
      } else {
        return data;
      }
    },
    getUidExt: function(data) {
      return {...{rtiPartner: 'TDID'}, ...data.ext}
    }
  }
}
