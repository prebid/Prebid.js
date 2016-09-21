import { expect } from 'chai';
import * as sizeMapping from 'src/sizeMapping';

var validAdUnit = {
  "sizes" : [300,250],
  "sizeMapping": [
    {
        "minWidth": 1024,
        "sizes" : [[300,250],[728,90]]
    },
    {
        "minWidth": 480,
        "sizes": [120,60]
    },
    {
        "minWidth": 0,
        "sizes": [20,20]
    }
  ]
};

var invalidAdUnit = {
  "sizes" : [300,250],
  "sizeMapping": {} // wrong type
};

let mockWindow = {};

function resetMockWindow() {
  mockWindow = {
    document : { getElementsByTagName : function(){ return [{}]; } },
    innerWidth : 1024,
  };
}

describe('sizeMapping', function () {

  beforeEach(resetMockWindow);

  it('mapSizes 1029 width', function () {
    let stub = sinon.stub(sizeMapping, 'getScreenWidth').returns(1029);
    let sizes = sizeMapping.mapSizes(validAdUnit);
    console.log(sizeMapping.getScreenWidth());
    expect(sizes).to.deep.equal([[300,250],[728,90]]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);

    stub.restore();

  });

  it('mapSizes 400 width', function () {
    let stub = sinon.stub(sizeMapping, 'getScreenWidth').returns(400);
    let sizes = sizeMapping.mapSizes(validAdUnit);
    expect(sizes).to.deep.equal([20,20]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);
    stub.restore();

  });

  it('mapSizes - invalid adUnit - should return sizes', function () {
    let stub = sinon.stub(sizeMapping, 'getScreenWidth').returns(1029);
    let sizes = sizeMapping.mapSizes(invalidAdUnit);
    expect(sizes).to.deep.equal([300,250]);
    expect(invalidAdUnit.sizes).to.deep.equal([300,250]);

    stub.returns(400);
    sizes = sizeMapping.mapSizes(invalidAdUnit);
    expect(sizes).to.deep.equal([300,250]);
    expect(invalidAdUnit.sizes).to.deep.equal([300,250]);

    stub.restore();

  });

  it('mapSizes - should return sizes if screen width not detected', function () {
    let stub = sinon.stub(sizeMapping, 'getScreenWidth').returns(0);
    let sizes = sizeMapping.mapSizes(validAdUnit);
    expect(sizes).to.deep.equal([300,250]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);
    stub.restore();

  });

  it('getScreenWidth', function () {
    mockWindow.innerWidth = 900;
    expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(900);
  });

  it('getScreenWidth - should sizes in older browsers', function () {
    mockWindow.innerWidth = null;
    mockWindow.document.documentElement = {clientWidth : 901};
    expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(901);

  });

  it('getScreenWidth - should sizes in really old browsers', function () {
    mockWindow.innerWidth = null;
    mockWindow.document.getElementsByTagName = function() { return [{clientWidth : 902}]; };
    expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(902);

  });

});
