import {getDNT} from '../../../libraries/dnt/index.js';

describe('dnt helper', () => {
  let win;
  beforeEach(() => {
    win = {};
  });

  [
    'top',
    'doNotTrack',
    'navigator',
    'navigator.doNotTrack',
    'top.doNotTrack',
    'top.navigator.doNotTrack'
  ].forEach(path => {
    it(`should not choke if ${path} throws`, () => {
      path = path.split('.');
      path.reduce((parent, name, i) => {
        if (i === path.length - 1) {
          Object.defineProperty(parent, name, {
            get() {
              throw new Error();
            }
          })
        } else {
          parent = parent[name] = {};
        }
        return parent;
      }, win);
      expect(getDNT(win)).to.be.false;
    })
  })
})
