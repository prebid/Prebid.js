import {onlyOneClientSection} from '../../../libraries/ortbConverter/processors/default.js';

describe('onlyOneClientSection', () => {
  [
    [['app'], 'app'],
    [['site'], 'site'],
    [['dooh'], 'dooh'],
    [['app', 'site'], 'app'],
    [['dooh', 'app', 'site'], 'dooh'],
    [['dooh', 'site'], 'dooh']
  ].forEach(([sections, winner]) => {
    it(`should leave only ${winner} in request when it contains ${sections.join(', ')}`, () => {
      const req = Object.fromEntries(sections.map(s => [s, {foo: 'bar'}]));
      onlyOneClientSection(req);
      expect(Object.keys(req)).to.eql([winner]);
    })
  });
  it('should not choke if none of the sections are in the request', () => {
    const req = {};
    onlyOneClientSection(req);
    expect(req).to.eql({});
  });
});
