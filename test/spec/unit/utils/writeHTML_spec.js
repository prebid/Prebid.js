import {replaceHTML, appendHTML} from '../../../../src/utils/writeHTML.js';

describe('HTML write utils', () => {
  let iframe, elem, doc;
  beforeEach(() => {
    iframe = document.createElement('iframe');
    document.documentElement.appendChild(iframe);
    doc = iframe.contentDocument;
    elem = doc.body;
  });

  afterEach(() => {
    iframe.remove();
  });

  Object.entries({
    'replaceHTML': replaceHTML,
    'appendHTML': appendHTML
  }).forEach(([t, manipulator]) => {
    describe(t, () => {
      Object.entries({
        'script content': '<script>window.__scriptRan = true</script>',
        'script source': '<script src="data:application/javascript;charset=utf-8;base64,d2luZG93Ll9fc2NyaXB0UmFuID0gdHJ1ZTs="></script>' // same script as above, encoded in a data uri
      }).forEach(([typ, script]) => {
        Object.entries({
          'at top-level': script,
          'when nested': `<div><p>${script}</p></div>`,
          'in head': `<html><head>${script}</head></html>`,
        }).forEach(([t, html]) => {
          it(`should run ${typ} ${t}`, (done) => {
            manipulator(elem, html);
            setTimeout(() => {
              expect(iframe.contentWindow.__scriptRan).to.be.true;
              done();
            });
          });
        });
      })

      it('should not fail on malformed html', () => {
        manipulator(elem, '<div id="t">test</p>');
        expect(doc.querySelector('#t').childNodes[0].textContent).to.eql('test');
      });

      it('should accept a complete html page', () => {
        manipulator(elem, `<!DOCTYPE html>
        <html>
            <head>
                <meta name="keywords" data-value="test" />
            </head>
            <body>
                <p id="content">content</p>
            </body>
        </html>`);
        expect(doc.querySelector('meta').dataset.value).to.equal('test');
        expect(doc.querySelector('#content').innerHTML).to.equal('content');
      });
    })
  });

  [
    {
      t: 'appendHTML should not touch',
      manipulator: appendHTML,
      expected: ['preexisting', 'added']
    },
    {
      t: 'replaceHTML should replace',
      manipulator: replaceHTML,
      expected: ['added']
    }
  ].forEach(({t, manipulator, expected}) => {
    it(`${t} existing contents`, () => {
      elem.innerHTML = '<p id="preexisting"></p>';
      manipulator(elem, '<p id="added"></p>');
      expect(Array.from(doc.querySelectorAll('p')).map((n) => n.id)).to.eql(expected);
    });
  });
});
