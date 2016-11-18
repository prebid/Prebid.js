import { expect } from 'chai';
import * as sizeMapping from 'src/sizeMapping';

var validAdUnit = {
  'sizes': [300,250],
  'sizeMapping': [
    {
      'minWidth': 1024,
      'sizes': [[300,250],[728,90]]
    },
    {
      'minWidth': 480,
      'sizes': [120,60]
    },
    {
      'minWidth': 0,
      'sizes': [20,20]
    }
  ]
};

var invalidAdUnit = {
  'sizes': [300,250],
  'sizeMapping': {} // wrong type
};

var invalidAdUnit2 = {
  'sizes': [300,250],
  'sizeMapping': [{
    foo : 'bar'  //bad
  }]
};

let mockWindow = {};

function resetMockWindow() {
  mockWindow = {
    screen : {
      width : 1024
    }
  };
}

describe('sizeMapping', function() {

  beforeEach(resetMockWindow);

  it('mapSizes 1029 width', function() {
    mockWindow.screen.width = 1029;
    sizeMapping.setWindow(mockWindow);
    let sizes = sizeMapping.mapSizes(validAdUnit);
    expect(sizes).to.deep.equal([[300,250],[728,90]]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);
  });

  it('mapSizes 400 width', function() {
    mockWindow.screen.width = 400;
    sizeMapping.setWindow(mockWindow);
    let sizes = sizeMapping.mapSizes(validAdUnit);
    expect(sizes).to.deep.equal([20,20]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);
  });

  it('mapSizes - invalid adUnit - should return sizes', function() {
    mockWindow.screen.width = 1029;
    sizeMapping.setWindow(mockWindow);
    let sizes = sizeMapping.mapSizes(invalidAdUnit);
    expect(sizes).to.deep.equal([300,250]);
    expect(invalidAdUnit.sizes).to.deep.equal([300,250]);

    mockWindow.screen.width = 400;
    sizeMapping.setWindow(mockWindow);
    sizes = sizeMapping.mapSizes(invalidAdUnit);
    expect(sizes).to.deep.equal([300,250]);
    expect(invalidAdUnit.sizes).to.deep.equal([300,250]);
  });

  it('mapSizes - should return desktop (largest) sizes if screen width not detected', function() {
    mockWindow.screen.width = 0;
    sizeMapping.setWindow(mockWindow);
    let sizes = sizeMapping.mapSizes(validAdUnit);
    expect(sizes).to.deep.equal([[300, 250], [728, 90]]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);
  });


  it('mapSizes - should return sizes if sizemapping improperly defined ', function() {
    mockWindow.screen.width = 0;
    sizeMapping.setWindow(mockWindow);
    let sizes = sizeMapping.mapSizes(invalidAdUnit2);
    expect(sizes).to.deep.equal([300,250]);
    expect(validAdUnit.sizes).to.deep.equal([300,250]);
  });


  it('getScreenWidth', function() {
    mockWindow.screen.width = 900;
    expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(900);
  });

  it('getScreenWidth - should return 0 if it cannot deteremine size', function() {
    mockWindow.screen.width = null;
    expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(0);
  });

});
