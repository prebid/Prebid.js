import {ttlCollection} from '../../../../src/utils/ttlCollection.js';

describe('ttlCollection', () => {
  it('can add & retrieve items', () => {
    const coll = ttlCollection();
    expect(coll.toArray()).to.eql([]);
    coll.add(1);
    coll.add(2);
    expect(coll.toArray()).to.eql([1, 2]);
  });

  it('can clear', () => {
    const coll = ttlCollection();
    coll.add('item');
    coll.clear();
    expect(coll.toArray()).to.eql([]);
  });

  it('can be iterated over', () => {
    const coll = ttlCollection();
    coll.add('1');
    coll.add('2');
    expect(Array.from(coll)).to.eql(['1', '2']);
  })

  describe('autopurge', () => {
    let clock, pms, waitForPromises;
    const SLACK = 2000;
    beforeEach(() => {
      clock = sinon.useFakeTimers();
      pms = [];
      waitForPromises = () => Promise.all(pms);
    });
    afterEach(() => {
      clock.restore();
    });

    Object.entries({
      'defer': (value) => {
        const pm = Promise.resolve(value);
        pms.push(pm);
        return pm;
      },
      'do not defer': (value) => value,
    }).forEach(([t, resolve]) => {
      describe(`when ttl/startTime ${t}`, () => {
        let coll;
        beforeEach(() => {
          coll = ttlCollection({
            startTime: (item) => resolve(item.start == null ? new Date().getTime() : item.start),
            ttl: (item) => resolve(item.ttl),
            slack: SLACK
          })
        });

        it('should clear items after enough time has passed', () => {
          coll.add({no: 'ttl'});
          coll.add({ttl: 1000});
          coll.add({ttl: 4000});
          return waitForPromises().then(() => {
            clock.tick(500);
            expect(coll.toArray()).to.eql([{no: 'ttl'}, {ttl: 1000}, {ttl: 4000}]);
            clock.tick(SLACK + 500);
            expect(coll.toArray()).to.eql([{no: 'ttl'}, {ttl: 4000}]);
            clock.tick(3000);
            expect(coll.toArray()).to.eql([{no: 'ttl'}]);
          });
        });

        it('should run onExpiry when items are cleared', () => {
          const i1 = {ttl: 1000, some: 'data'};
          const i2 = {ttl: 2000, some: 'data'};
          coll.add(i1);
          coll.add(i2);
          const cb = sinon.stub();
          coll.onExpiry(cb);
          return waitForPromises().then(() => {
            clock.tick(500);
            sinon.assert.notCalled(cb);
            clock.tick(SLACK + 500);
            sinon.assert.calledWith(cb, i1);
            clock.tick(3000);
            sinon.assert.calledWith(cb, i2);
          })
        });

        it('should allow unregistration of onExpiry callbacks', () => {
          const cb = sinon.stub();
          coll.add({ttl: 500});
          coll.onExpiry(cb)();
          return waitForPromises().then(() => {
            clock.tick(500 + SLACK);
            sinon.assert.notCalled(cb);
          })
        })

        it('should not wait too long if a shorter ttl shows up', () => {
          coll.add({ttl: 4000});
          coll.add({ttl: 1000});
          return waitForPromises().then(() => {
            clock.tick(1000 + SLACK);
            expect(coll.toArray()).to.eql([
              {ttl: 4000}
            ]);
          });
        });

        it('should not wait more if later ttls are within slack', () => {
          coll.add({start: 0, ttl: 4000});
          return waitForPromises().then(() => {
            clock.tick(4000);
            coll.add({start: 0, ttl: 5000});
            return waitForPromises().then(() => {
              clock.tick(SLACK);
              expect(coll.toArray()).to.eql([]);
            });
          });
        });

        it('should clear items ASAP if they expire in the past', () => {
          clock.tick(10000);
          coll.add({start: 0, ttl: 1000});
          return waitForPromises().then(() => {
            clock.tick(SLACK);
            expect(coll.toArray()).to.eql([]);
          });
        });

        it('should clear items ASAP if they have ttl = 0', () => {
          coll.add({ttl: 0});
          return waitForPromises().then(() => {
            clock.tick(SLACK);
            expect(coll.toArray()).to.eql([]);
          });
        });

        describe('refresh', () => {
          it('should refresh missing TTLs', () => {
            const item = {};
            coll.add(item);
            return waitForPromises().then(() => {
              item.ttl = 1000;
              return waitForPromises().then(() => {
                clock.tick(1000 + SLACK);
                expect(coll.toArray()).to.eql([item]);
                coll.refresh();
                return waitForPromises().then(() => {
                  clock.tick(1);
                  expect(coll.toArray()).to.eql([]);
                });
              });
            });
          });

          it('should refresh existing TTLs', () => {
            const item = {
              ttl: 1000
            };
            coll.add(item);
            return waitForPromises().then(() => {
              clock.tick(1000);
              item.ttl = 4000;
              coll.refresh();
              return waitForPromises().then(() => {
                clock.tick(SLACK);
                expect(coll.toArray()).to.eql([item]);
                clock.tick(3000);
                expect(coll.toArray()).to.eql([]);
              });
            });
          });

          it('should discard initial TTL if it does not resolve before a refresh', () => {
            let resolveTTL;
            const item = {
              ttl: new Promise((resolve) => {
                resolveTTL = resolve;
              })
            };
            coll.add(item);
            item.ttl = null;
            coll.refresh();
            resolveTTL(1000);
            return waitForPromises().then(() => {
              clock.tick(1000 + SLACK + 1000);
              expect(coll.toArray()).to.eql([item]);
            });
          });

          it('should discard TTLs on clear', () => {
            const item = {
              ttl: 1000
            };
            coll.add(item);
            coll.clear();
            item.ttl = null;
            coll.add(item);
            return waitForPromises().then(() => {
              clock.tick(1000 + SLACK + 1000);
              expect(coll.toArray()).to.eql([item]);
            });
          });
        });
      });
    });
  });
});
