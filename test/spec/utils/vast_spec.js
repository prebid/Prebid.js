import { getBidVastTrackers, insertVastTrackers, mergeVastTrackers } from '../../../src/utils/vast.js';

function parse(vastXml) {
  return new DOMParser().parseFromString(vastXml, 'text/xml');
}

function textsOf(doc, selector) {
  return Array.from(doc.querySelectorAll(selector), node => node.textContent);
}

describe('vast utils', () => {
  describe('mergeVastTrackers', () => {
    it('should concatenate tracker sets in order', () => {
      expect(mergeVastTrackers(
        { impression: ['https://a.com/i'], trackingEvents: [{ event: 'start', url: 'https://a.com/s' }] },
        { impression: ['https://b.com/i'], error: ['https://b.com/e'] }
      )).to.eql({
        impression: ['https://a.com/i', 'https://b.com/i'],
        error: ['https://b.com/e'],
        trackingEvents: [{ event: 'start', url: 'https://a.com/s' }]
      });
    });

    it('should ignore sources that are not objects', () => {
      expect(mergeVastTrackers(undefined, null, 'https://a.com/i', ['https://a.com/i'])).to.eql({ impression: [], error: [], trackingEvents: [] });
    });

    it('should ignore tracker lists that are not arrays', () => {
      expect(mergeVastTrackers({ impression: 'https://a.com/i', error: {}, trackingEvents: 'start' }))
        .to.eql({ impression: [], error: [], trackingEvents: [] });
    });

    it('should drop urls that are not safe http(s) urls', () => {
      const urls = [null, undefined, 1, '', 'a.com/i', 'javascript:alert(1)', 'https://a.com/]]>', 'HTTP://a.com/ok', 'https://a.com/ok'];
      const merged = mergeVastTrackers({ impression: urls, error: urls });
      expect(merged.impression).to.eql(['HTTP://a.com/ok', 'https://a.com/ok']);
      expect(merged.error).to.eql(['HTTP://a.com/ok', 'https://a.com/ok']);
    });

    it('should drop tracking events without an event or a safe url', () => {
      const merged = mergeVastTrackers({
        trackingEvents: [
          null,
          'https://a.com/s',
          { event: 'midpoint' },
          { url: 'https://a.com/missing' },
          { event: '', url: 'https://a.com/empty' },
          { event: 1, url: 'https://a.com/number' },
          { event: 'complete', url: 'javascript:alert(1)' },
          { event: 'start', url: 'https://a.com/start' }
        ]
      });
      expect(merged.trackingEvents).to.eql([{ event: 'start', url: 'https://a.com/start' }]);
    });
  });

  describe('getBidVastTrackers', () => {
    it('should return the bid vastTrackers', () => {
      const vastTrackers = {
        impression: ['https://a.com/i'],
        error: ['https://a.com/e'],
        trackingEvents: [{ event: 'start', url: 'https://a.com/s' }]
      };
      expect(getBidVastTrackers({ vastTrackers })).to.eql(vastTrackers);
    });

    it('should return empty lists when the bid has no trackers', () => {
      expect(getBidVastTrackers({})).to.eql({ impression: [], error: [], trackingEvents: [] });
    });

    it('should fill in missing lists', () => {
      expect(getBidVastTrackers({ vastTrackers: { impression: ['https://a.com/i'] } }))
        .to.eql({ impression: ['https://a.com/i'], error: [], trackingEvents: [] });
    });

    it('should add a string vastImpUrl', () => {
      expect(getBidVastTrackers({ vastImpUrl: 'https://a.com/legacy' }).impression).to.eql(['https://a.com/legacy']);
    });

    it('should add an array vastImpUrl after vastTrackers', () => {
      expect(getBidVastTrackers({
        vastTrackers: { impression: ['https://a.com/i'] },
        vastImpUrl: ['https://a.com/legacy1', 'https://a.com/legacy2']
      }).impression).to.eql(['https://a.com/i', 'https://a.com/legacy1', 'https://a.com/legacy2']);
    });

    it('should ignore an empty vastImpUrl', () => {
      expect(getBidVastTrackers({ vastImpUrl: '' }).impression).to.eql([]);
    });
  });

  describe('insertVastTrackers', () => {
    const existingUrl = 'https://bidder.com/existing';
    const newUrl = 'https://bidder.com/new';

    it('should add trackers to a Wrapper', () => {
      const result = insertVastTrackers({ impression: [newUrl], error: [newUrl] }, '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>');
      expect(result).to.equal(`<VAST><Ad><Wrapper><Impression><![CDATA[${newUrl}]]></Impression><Error><![CDATA[${newUrl}]]></Error></Wrapper></Ad></VAST>`);
    });

    it('should add trackers to every Wrapper and InLine', () => {
      const doc = parse(insertVastTrackers({ impression: [newUrl] },
        '<VAST><Ad><Wrapper></Wrapper></Ad><Ad><InLine></InLine></Ad></VAST>'));
      expect(textsOf(doc, 'Wrapper > Impression')).to.eql([newUrl]);
      expect(textsOf(doc, 'InLine > Impression')).to.eql([newUrl]);
    });

    it('should place Impression and Error after existing ones and before Creatives and Extensions', () => {
      const vastXml = '<VAST><Ad><InLine><AdSystem>x</AdSystem><Impression><![CDATA[https://a.com/i]]></Impression>' +
        '<Description>d</Description><Creatives></Creatives><Extensions></Extensions></InLine></Ad></VAST>';
      const doc = parse(insertVastTrackers({ impression: [newUrl], error: [newUrl] }, vastXml));
      expect(Array.from(doc.querySelector('InLine').children, node => node.tagName))
        .to.eql(['AdSystem', 'Impression', 'Impression', 'Description', 'Error', 'Creatives', 'Extensions']);
    });

    it('should append Impression when there is no Creatives or Extensions', () => {
      const doc = parse(insertVastTrackers({ impression: [newUrl] }, '<VAST><Ad><Wrapper><AdSystem>x</AdSystem></Wrapper></Ad></VAST>'));
      expect(Array.from(doc.querySelector('Wrapper').children, node => node.tagName)).to.eql(['AdSystem', 'Impression']);
    });

    it('should add tracking events to existing Linear elements', () => {
      const vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration></Linear></Creative>' +
        '<Creative><Linear><TrackingEvents><Tracking event="complete"><![CDATA[https://a.com/c]]></Tracking></TrackingEvents></Linear></Creative>' +
        '</Creatives></InLine></Ad></VAST>';
      const doc = parse(insertVastTrackers({ trackingEvents: [{ event: 'start', url: newUrl }] }, vastXml));
      const linears = doc.querySelectorAll('Linear');
      expect(textsOf(linears[0], 'TrackingEvents > Tracking[event="start"]')).to.eql([newUrl]);
      expect(textsOf(linears[1], 'TrackingEvents > Tracking')).to.eql(['https://a.com/c', newUrl]);
    });

    it('should add a Linear creative to existing Creatives when there is no Linear', () => {
      const doc = parse(insertVastTrackers({ trackingEvents: [{ event: 'start', url: newUrl }] },
        '<VAST><Ad><Wrapper><Creatives></Creatives></Wrapper></Ad></VAST>'));
      expect(doc.querySelectorAll('Creatives')).to.have.lengthOf(1);
      expect(textsOf(doc, 'Creatives > Creative > Linear > TrackingEvents > Tracking[event="start"]')).to.eql([newUrl]);
    });

    it('should create Creatives when there is none', () => {
      const doc = parse(insertVastTrackers({ trackingEvents: [{ event: 'start', url: newUrl }] },
        '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>'));
      expect(textsOf(doc, 'Wrapper > Creatives > Creative > Linear > TrackingEvents > Tracking[event="start"]')).to.eql([newUrl]);
    });

    it('should not add invalid trackers', () => {
      const vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
      expect(insertVastTrackers({ impression: ['javascript:alert(1)'], trackingEvents: [{ event: '', url: newUrl }] }, vastXml))
        .to.equal(vastXml);
    });

    it('should not add an impression url the wrapper already has', function () {
      const vastXml = `<VAST><Ad><Wrapper><Impression><![CDATA[${existingUrl}]]></Impression></Wrapper></Ad></VAST>`;
      const result = insertVastTrackers({ impression: [existingUrl, newUrl] }, vastXml);
      expect(textsOf(parse(result), 'Wrapper > Impression')).to.eql([existingUrl, newUrl]);
    });

    it('should not add an error url the wrapper already has', function () {
      const vastXml = `<VAST><Ad><Wrapper><Error><![CDATA[${existingUrl}]]></Error></Wrapper></Ad></VAST>`;
      const result = insertVastTrackers({ error: [existingUrl, newUrl] }, vastXml);
      expect(textsOf(parse(result), 'Wrapper > Error')).to.eql([existingUrl, newUrl]);
    });

    it('should add a repeated url only once', function () {
      const result = insertVastTrackers({
        impression: [newUrl, newUrl],
        trackingEvents: [{ event: 'start', url: newUrl }, { event: 'start', url: newUrl }]
      }, '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>');
      expect(textsOf(parse(result), 'Wrapper > Impression')).to.eql([newUrl]);
      expect(textsOf(parse(result), 'Tracking')).to.eql([newUrl]);
    });

    it('should not add a tracking event the linear element already has', function () {
      const vastXml = `<VAST><Ad><Wrapper><Creatives><Creative><Linear><TrackingEvents><Tracking event="start"><![CDATA[${existingUrl}]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>`;
      const result = insertVastTrackers({ trackingEvents: [{ event: 'start', url: existingUrl }] }, vastXml);
      expect(textsOf(parse(result), 'Tracking[event="start"]')).to.eql([existingUrl]);
    });

    it('should add a tracking event whose url exists under a different event', function () {
      const vastXml = `<VAST><Ad><Wrapper><Creatives><Creative><Linear><TrackingEvents><Tracking event="start"><![CDATA[${existingUrl}]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>`;
      const result = insertVastTrackers({ trackingEvents: [{ event: 'complete', url: existingUrl }] }, vastXml);
      expect(textsOf(parse(result), 'Tracking[event="complete"]')).to.eql([existingUrl]);
    });

    it('should treat urls that differ only by surrounding whitespace as the same', function () {
      const vastXml = `<VAST><Ad><Wrapper><Impression><![CDATA[ ${existingUrl}]]></Impression><Error><![CDATA[${existingUrl}]]></Error>` +
        `<Creatives><Creative><Linear><TrackingEvents><Tracking event="start"><![CDATA[${existingUrl} ]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>`;
      const doc = parse(insertVastTrackers({
        impression: [`${existingUrl} `],
        error: [`${existingUrl} `],
        trackingEvents: [{ event: 'start', url: `${existingUrl} ` }]
      }, vastXml));
      expect(doc.querySelectorAll('Impression')).to.have.lengthOf(1);
      expect(doc.querySelectorAll('Error')).to.have.lengthOf(1);
      expect(doc.querySelectorAll('Tracking')).to.have.lengthOf(1);
    });

    it('should return the vastXml unchanged when there are no trackers', () => {
      const vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
      expect(insertVastTrackers({}, vastXml)).to.equal(vastXml);
    });

    it('should return the vastXml unchanged when it has no Wrapper or InLine element', () => {
      const noWrapper = '<VAST><Ad></Ad></VAST>';
      expect(insertVastTrackers({ impression: [newUrl] }, noWrapper)).to.equal(noWrapper);
    });

    it('should return the vastXml unchanged when it cannot be parsed', () => {
      const malformed = 'not xml at all <<<';
      expect(insertVastTrackers({ impression: [newUrl] }, malformed)).to.equal(malformed);
    });

    describe('tracker values containing XML syntax', () => {
      // ']]>' ends a CDATA section; the text after it would otherwise be parsed as markup.
      const BREAKOUT = 'https://tracking.mydomain.com/a]]></Impression><Impression><![CDATA[https://evil.example/pwn';

      function insert(trackers) {
        const doc = parse(insertVastTrackers(trackers, '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>'));
        expect(doc.getElementsByTagName('parsererror')).to.have.lengthOf(0);
        return doc;
      }

      it('does not let a url add an element', () => {
        const doc = insert({ impression: [BREAKOUT], error: [BREAKOUT], trackingEvents: [{ event: 'start', url: BREAKOUT }] });
        ['Impression', 'Error', 'Tracking'].forEach(tagName => {
          expect(doc.getElementsByTagName(tagName)).to.have.lengthOf(0);
        });
      });

      it('does not let a tracking event name add attributes to Tracking', () => {
        const event = 'complete" onload="x';
        const tracking = insert({ trackingEvents: [{ event, url: 'https://tracking.mydomain.com/c' }] }).getElementsByTagName('Tracking');
        expect(tracking).to.have.lengthOf(1);
        expect(tracking[0].getAttributeNames()).to.eql(['event']);
        expect(tracking[0].getAttribute('event')).to.equal(event);
      });
    });
  });
});
