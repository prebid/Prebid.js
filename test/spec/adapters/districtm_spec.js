/**
 * Created by stevealliance on 2016-11-15.
 */



import {expect}  from  "chai";
import {should} from "chai";
import Adaptor from '../../../src/adapters/districtmDMX';

import adLoader from '../../../src/adloader';



var _each = function(obj, fn){
    for(var o in obj){
        fn(o, obj[o]);
    }
}

let districtm;
const PREBID_RESPONSE = function(){
    return {
        result: {
            cpm: '3.45',
            callbackId: '1490bd6bdc59ce',
            width: 300,
            height: 250,
            banner: 'html'
        },
        callback_uid: '1490bd6bdc59ce'
    };
}
const PREBID_PARAMS = {
    bidderCode: 'districtmDMX',
    requestId: '5ccedbd5-86c1-436f-8649-964262461eac',
    bidderRequestId: '1490bd6bdc59ce',
    start: new Date().getTime(),
    bids: [{
        bidder: 'districtmDMX',
        bidId: '84ab500420319d',
        bidderRequestId: '1490bd6bdc59ce',
        requestId: '5ccedbd5-86c1-436f-8649-964262461eac',
        placementCode: 'golden',
        params: {
            placement: 109801,
            floor: '1.00'
        },
        sizes: [[300, 250], [300, 600]]
    }]
};

function resetDm() {
    window.hb_dmx_res = undefined;
}

function activated() {
    window.hb_dmx_res = {
        ssp: {},
        bh(){

        },
        auction: {
            fixSize(s){
                let size;
                if (!Array.isArray(s[0])) {
                    size = [s[0] + 'x' + s[1]];
                } else {
                    size = s.map(ss => {
                        return ss[0] + 'x' + ss[1];
                    })
                }

                return size;

            },

            run(a, b, c){

            }
        }
    }
}


function definitions(){
    districtm.callBids({
        bidderCode: 'districtmDMX',
        bids: [
            {
                bidder: 'districtmDMX',
                adUnitCode: 'golden',
                sizes: [[728, 90]],
                params: {
                    siteId: '101000'
                }
            },
            {
                bidder: 'districtmDMX',
                adUnitCode: 'stevealliance',
                sizes: [[300, 250]],
                params: {
                    siteId: '101000'
                }
            }
        ]
    });
}
describe('DistrictM adapter test', () => {


    describe('File loading', ()=>{
        let districtm;
        afterEach(()=>{

            districtm = new Adaptor();
            adLoader.loadScript(districtm.districtUrl, function(){});

        })

        it('For loading file ', ()=>{
            expect(!window.hb_dmx_res).to.equal(true);
        })


    })


    describe('check for library do exists', ()=>{
        it('library was not loaded', ()=>{

            expect(!window.hb_dmx_res).to.equal(true);
        })

        it('library is now available', ()=>{
            activated();

            expect(!!window.hb_dmx_res).to.equal(true);

        })
    })


    describe('Check if size get clean', ()=>{
        beforeEach(()=>{
            activated();
        })
        it('size clean up using fixe size', ()=>{
            activated();

            expect(window.hb_dmx_res.auction.fixSize([728, 90])[0]).to.equal(['728x90'][0]);
            expect(window.hb_dmx_res.auction.fixSize([[300, 250], [300,600]]).toString()).to.equal(['300x250', '300x600'].toString());

        })
    })

    describe('Check call bids return no errors', ()=>{
        let districtm;
        beforeEach(()=>{
            districtm = new Adaptor();
        });
        it('check value push using cal bids', ()=>{
            let obj = districtm.callBids(PREBID_PARAMS);
            obj.should.have.property('bidderCode');
            obj.should.have.property('requestId');
            obj.should.have.property('bidderRequestId');
            obj.should.have.property('start');
            obj.should.have.property('bids');

        })
        it('check if value got pass correctly for DM params', ()=>{
            let dm = districtm.callBids(PREBID_PARAMS).bids.map( bid => bid);
            dm.forEach( a =>{
                a.should.have.property('bidder');
                a.should.have.property('requestId');
                a.should.have.property('bidderRequestId');
                a.should.have.property('placementCode');
                a.should.have.property('params');
                a.should.have.property('sizes');
                expect(a.bidder).to.equal('districtmDMX');
                expect(a.placementCode).to.equal('golden');
                expect(a.params.placement).to.equal(109801);
            })


        })
    })

    describe('Run prebid definitions !', ()=>{
         let districtm;
        beforeEach(()=>{
            districtm = new Adaptor();
        })

        it('Run and return send bids', ()=>{
            let sendBids  =  districtm.sendBids(PREBID_PARAMS);
            sendBids.forEach(sb =>{

                expect(sb.sizes.toString()).to.equal([[300, 250], [300, 600]].toString());
            })

        })


    })

    describe('HandlerRes function test', ()=>{
       let districtm;

        beforeEach(()=>{
            districtm = new Adaptor();
        })

        it('it\'s now time to play with the response ...', ()=>{
            let result = districtm.handlerRes(PREBID_RESPONSE(), PREBID_PARAMS);
            _each(result, function(k, v){

            })
            

            expect(result.cpm).to.equal('3.45');
            expect(result.width).to.equal(300);
            expect(result.height).to.equal(250);
            expect(result.ad).to.equal('html');
            


        } )
        it('it\'s now time to play with the response failure...', ()=>{
            let result = districtm.handlerRes({result:{cpm:0}}, PREBID_PARAMS);

            result.should.have.property('bidderCode');


        } )

    })

    describe('look at the adloader', ()=>{
        let districtm;
        beforeEach(()=>{
            districtm = new Adaptor();
            sinon.stub(adLoader, "loadScript");
        })

        it('Verify districtm library is downloaded if nessesary', () => {
            resetDm();
            districtm.callBids(PREBID_PARAMS);
            let libraryLoadCall = adLoader.loadScript.firstCall.args[0];
            let callback = adLoader.loadScript.firstCall.args[1];
            expect(libraryLoadCall).to.equal('http://prebid.districtm.ca/lib.js');
            expect(callback).to.be.a('function');


        });

        afterEach(()=>{
            adLoader.loadScript.restore();
        })




    });
    describe('run send bid from within !!!', ()=> {
        beforeEach(()=> {
            districtm = new Adaptor();
            sinon.stub(districtm, 'sendBids');
        })

        it('last test on send bids', ()=>{
            resetDm();
            districtm.sendBids(PREBID_PARAMS);
            expect(districtm.sendBids.calledOnce).to.be.true;
            expect(districtm.sendBids.firstCall.args[0]).to.be.a('object');


        });

        afterEach(()=> {
            districtm.sendBids.restore();
        })

    });







});

