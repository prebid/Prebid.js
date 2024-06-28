import {
    deepAccess,
    isArray,
  } from '../../src/utils.js';
  
  // Function to get banner details
  export const getBanner = (bid) => {
    if (deepAccess(bid, 'mediaTypes.banner')) {
      // Fetch width and height from MediaTypes object, if not provided in bid params
      if (deepAccess(bid, 'mediaTypes.banner.sizes') && !bid.params.height && !bid.params.width) {
        let sizes = deepAccess(bid, 'mediaTypes.banner.sizes');
        if (isArray(sizes) && sizes.length > 0) {
          return {
            h: sizes[0][1],
            w: sizes[0][0]
          };
        }
      } else {
        return {
          h: bid.params.height,
          w: bid.params.width
        };
      }
    }  
  }
  // Function to get bid_floor
  export const getFloor = (bid) => {
    if (bid.params && bid.params.bid_floor) {
      return bid.params.bid_floor;
    } else {
      return 0;
    }  
  }
  // Function to get site details
  export const getSite = (bidderRequest) => {
    let site = {};
    if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
      site.name = bidderRequest.refererInfo.domain;
    } else {
      site.name = '';
    }
    return site;
  }
  // Function to format response
  export const formatResponse = (bid) => {
    return {
      requestId: bid && bid.impid ? bid.impid : undefined,
      cpm: bid && bid.price ? bid.price : 0.0,
      width: bid && bid.w ? bid.w : 0,
      height: bid && bid.h ? bid.h : 0,
      ad: bid && bid.adm ? bid.adm : '',
      meta: {
        advertiserDomains: bid && bid.adomain ? bid.adomain : []
      },
      creativeId: bid && bid.crid ? bid.crid : undefined,
      netRevenue: false,
      currency: bid && bid.cur ? bid.cur : 'USD',
      ttl: 300,
      dealId: bid && bid.dealId ? bid.dealId : undefined
    };
  }
  // Function to build the user object
  export const buildUser = (bid) => {
    if (bid && bid.params) {
      return {
        id: bid.params.user_id && typeof bid.params.user_id == 'string' ? bid.params.user_id : '',
        buyeruid: localStorage.getItem('adx_profile_guid') ? localStorage.getItem('adx_profile_guid') : '',
        keywords: bid.params.keywords && typeof bid.params.keywords == 'string' ? bid.params.keywords : '',
        customdata: bid.params.customdata && typeof bid.params.customdata == 'string' ? bid.params.customdata : ''
      };
    }
  }