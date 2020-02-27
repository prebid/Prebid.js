import * as utils from '../../src/utils.js';

// Each user-id sub-module is expected to mention respective config here
const USER_IDS_CONFIG = {

	// key-name : {config}

	// pubCommonId
	'pubcid': {
		source: 'pubcid.org',
		atype: 1		
	},

	// unifiedId
	'tdid': {
		source: 'adserver.org',
		atype: 1,
		ext: function(){
			return {
              rtiPartner: 'TDID'
            };
		}
	},

	// id5Id
	'id5id': {
		source: 'id5-sync.com',
		atype: 1
	},

	// parrableId
	'parrableid': {
		source: 'parrable.com',
		atype: 1
	},

	// identityLink
	'idl_env': {
		source: 'liveramp.com',
		atype: 1
	},

	// liveIntentId
	'lipb': {
		getValue: function(data){
			return data.lipbid;
		},
		source: 'liveintent.com',
		atype: 1,
		ext: function(data){
			if (Array.isArray(data.segments) && data.segments.length) {
          		return {
            		segments: data.segments
          		};
        	}
		}
	},

	// britepoolId
	'britepoolid': {
		source: 'britepool.com',
		atype: 1
	},

	// DigiTrust
	'digitrustid': {
		getValue: function(data){
			return data.data.id;
		},
		source: 'digitru.st',
		atype: 1
	},

	// criteo
	'criteoId': {
		source: 'criteo.com',
		atype: 1
	}
};

function createEidObject(bidRequestUserId, subModuleName){
	if(USER_IDS_CONFIG.hasOwnProperty(subModuleName) && bidRequestUserId) {
		const userIdData = bidRequestUserId[subModuleName];		
		const value = USER_IDS_CONFIG[subModuleName]['getValue'] ? USER_IDS_CONFIG[subModuleName]['getValue'](userIdData) : userIdData;
		if(value) {
			let uid = {id: value, atype: USER_IDS_CONFIG[subModuleName]['atype']};
			if(USER_IDS_CONFIG[subModuleName]['ext']){
				uid.ext = USER_IDS_CONFIG[subModuleName]['ext'](userIdData);
			}
			return {
	      		source: USER_IDS_CONFIG[subModuleName]['source'],
	      		uids: [uid]
	    	};
		}
	}
}

// this function will generate eids array for all available IDs in bidRequest.userIds
// this function will be called by userId module
// if any adapter does not want any particular userId to be passed then adapter can use Array.filter(e => e.source != 'unwanted')
export function createEidsArray(bidRequestUserId){
	let eids = [];
	for (const subModuleKey in bidRequestUserId) {
		if(bidRequestUserId.hasOwnProperty(subModuleKey)){
			let eid = createEidObject(bidRequestUserId, subModuleKey);
			if(eid){
				eids.push(eid);
			}
		}		
	}
	console.log('eids:', eids);
	return eids;
}