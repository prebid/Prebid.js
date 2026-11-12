import { expect } from 'chai';
import { cookieName, cookieValues, cookieSettler } from '../vitest/cookies.mjs';

describe('Vitest cookie settling (test/vitest/cookies.mjs)', function () {
  it('cookieName', function () {
    expect(cookieName('a=1; path=/')).to.equal('a');
    expect(cookieName(' a =; expires=Thu, 01 Jan 1970 00:00:01 GMT')).to.equal('a');
    expect(cookieName('b=x=y')).to.equal('b');
    expect(cookieName('value')).to.equal('');
  });

  it('cookieValues', function () {
    const cookies = 'a=1; b=x=y; a=2; value; ab=3';
    expect(cookieValues(cookies, 'a')).to.eql(['1', '2']);
    expect(cookieValues(cookies, 'b')).to.eql(['x=y']);
    expect(cookieValues(cookies, '')).to.eql(['value']);
    expect(cookieValues(cookies, 'c')).to.eql([]);
    expect(cookieValues('', 'a')).to.eql([]);
  });

  describe('cookieSettler', function () {
    let clock, jar, reads;
    function settler({ timeoutMs = 100, ...options } = {}) {
      return cookieSettler({
        read: () => (reads.length ? reads.shift() : jar),
        now: () => clock,
        wait: async () => { clock += 1; },
        quietMs: 5,
        timeoutMs,
        ...options,
      });
    }
    beforeEach(function () {
      clock = 0;
      jar = '';
      reads = [];
    });

    it('does not wait when nothing was written', function () {
      expect(settler().settle()).to.equal(null);
    });

    it('waits until the cookies read as they did after the last write, for quietMs', async function () {
      const s = settler();
      jar = 'a=1';
      s.written('a=1');
      jar = '';
      s.written('a=; max-age=0');
      reads = ['', 'a=1', 'a=1'];
      expect(await s.settle()).to.eql({ ms: 8, timedOut: false });
      expect(s.settle()).to.equal(null);
    });

    it('counts the time since the last write towards quietMs', async function () {
      const s = settler();
      jar = 'a=1';
      s.written('a=1');
      clock = 50;
      expect(await s.settle()).to.eql({ ms: 1, timedOut: false });
    });

    it('takes an empty value for no cookie', async function () {
      const s = settler();
      jar = 'a=';
      s.written('a=; expires=Thu, 01 Jan 1970 00:00:01 GMT');
      jar = '';
      clock = 50;
      expect(await s.settle()).to.eql({ ms: 1, timedOut: false });
    });

    it('awaits the barrier in place of the first wait', async function () {
      const s = settler({ barrier: async () => { clock += 3; }, quietMs: 0 });
      jar = 'a=1';
      s.written('a=1');
      expect(await s.settle()).to.eql({ ms: 3, timedOut: false });
    });

    it('polls on after the barrier while a stale value shows', async function () {
      const s = settler({ barrier: async () => {}, quietMs: 0 });
      jar = 'a=1';
      s.written('a=1');
      reads = ['a=0', 'a=0'];
      expect(await s.settle()).to.eql({ ms: 2, timedOut: false });
    });

    it('gives up after timeoutMs', async function () {
      const s = settler({ timeoutMs: 20 });
      s.written('a=1');
      jar = 'a=2';
      expect(await s.settle()).to.eql({ ms: 20, timedOut: true });
      expect(s.settle()).to.equal(null);
    });
  });
});
