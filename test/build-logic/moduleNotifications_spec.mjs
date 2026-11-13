import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import notifications from '../../.github/workflows/scripts/module-notifications.js';

const { getModuleRules, groupMatches } = notifications;
const require = createRequire(import.meta.url);
const scriptsDir = path.resolve(import.meta.dirname, '../../.github/workflows/scripts');

describe('module maintainer notifications', () => {
  let modulesDir;

  beforeEach(() => {
    modulesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prebid-notifications-'));
  });

  afterEach(() => {
    fs.rmSync(modulesDir, { recursive: true, force: true });
  });

  function writeDoc(name, markdown) {
    fs.writeFileSync(path.join(modulesDir, `${name}.md`), markdown);
  }

  function recipients(files) {
    return groupMatches(files, getModuleRules(modulesDir));
  }

  it('connects source, types, docs, and tests to the maintainer by module filename', () => {
    writeDoc('exampleBidAdapter', 'Module Name: A different display name\nMaintainer: owner@example.com');
    const files = [
      'modules/exampleBidAdapter.js',
      'modules/exampleBidAdapter.ts',
      'modules/exampleBidAdapter.d.ts',
      'modules/exampleBidAdapter.md',
      'test/spec/modules/exampleBidAdapter_spec.js',
      'test/spec/modules/exampleBidAdapter_spec.ts'
    ];
    expect(recipients(files)).to.eql({ 'owner@example.com': files });
  });

  it('connects module directories and nested submodule tests', () => {
    writeDoc('example', 'Maintainer: owner@example.com');
    const files = [
      'modules/example/helpers.js',
      'test/spec/modules/example/helpers_spec.js',
      'test/spec/modules/videoModule/submodules/example_spec.js'
    ];
    expect(recipients(files)).to.eql({ 'owner@example.com': files });
  });

  it('does not match similar module names or paths outside module source and specs', () => {
    writeDoc('example', 'Maintainer: owner@example.com');
    expect(recipients([
      'modules/exampleOther.js',
      'test/spec/modules/exampleOther_spec.js',
      'test/spec/modules/example_extra_spec.js',
      'test/spec/modules/example_spec.js.bak',
      'test/spec/modules/exampleOther/helper_spec.js',
      'libraries/example/index.js',
      'other/modules/example.js',
      'src/example.js'
    ])).to.eql({});
  });

  it('escapes regular expression characters in module names', () => {
    writeDoc('example.v2', 'Maintainer: owner@example.com');
    const spec = 'test/spec/modules/example.v2_spec.js';
    expect(recipients([spec, 'test/spec/modules/exampleXv2_spec.js'])).to.eql({
      'owner@example.com': [spec]
    });
  });

  Object.entries({
    plain: 'Maintainer: owner@example.com',
    indented: '    Maintainer: owner@example.com',
    bold: '**Maintainer**: owner@example.com',
    'bold with colon': '**Maintainer:** owner@example.com',
    bulleted: '- **Maintainer**: owner@example.com',
    'extra spaces': 'Maintainer  :  owner@example.com',
    'named contact': 'Maintainer: Example Owner (owner@example.com)',
    'angle brackets': 'Maintainer: <owner@example.com>',
    'code span': 'Maintainer: `owner@example.com`',
    mailto: 'Maintainer: [owner@example.com](mailto:owner@example.com)',
    'case and CRLF': 'MAINTAINER: Owner@Example.COM\r\n'
  }).forEach(([format, markdown]) => {
    it(`reads ${format} maintainer metadata`, () => {
      writeDoc('example', markdown);
      expect(recipients(['modules/example.js'])).to.eql({
        'owner@example.com': ['modules/example.js']
      });
    });
  });

  it('notifies every listed maintainer without duplicate mailto contacts', () => {
    writeDoc('example', [
      'Maintainers: first@example.com, second@example.com | third@example.com',
      '- Maintainers:',
      '  - [First](mailto:first@example.com)',
      '  - [Fourth](mailto:fourth@example.com)',
      '- Contact: unrelated@example.com'
    ].join('\r\n'));
    expect(Object.keys(recipients(['modules/example.js']))).to.have.members([
      'first@example.com', 'second@example.com', 'third@example.com', 'fourth@example.com'
    ]);
  });

  it('skips missing, empty, and website-only maintainers and ignores unrelated emails', () => {
    writeDoc('missing', 'Contact: support@example.com\nExample: user@example.com');
    writeDoc('website', 'Maintainer: [example.com](https://example.com)');
    writeDoc('empty', 'Maintainer:\n\nContact: support@example.com');
    fs.writeFileSync(path.join(modulesDir, 'unrelated.js'), 'Maintainer: unrelated@example.com');
    fs.mkdirSync(path.join(modulesDir, 'directory.md'));
    expect(getModuleRules(modulesDir)).to.eql([]);
  });

  it('combines manual subscriptions with module maintainers and deduplicates files per email', () => {
    writeDoc('one', 'Maintainer: owner@example.com');
    writeDoc('two', 'Maintainer: owner@example.com');
    const files = ['modules/one.js', 'test/spec/modules/two_spec.js', 'libraries/shared.js'];
    const rules = [
      ...getModuleRules(modulesDir),
      { regex: /one|shared/, email: 'Owner@Example.COM' },
      { regex: /two/, email: 'additional@example.com' }
    ];
    expect(groupMatches([...files, files[0]], rules)).to.eql({
      'owner@example.com': files,
      'additional@example.com': [files[1]]
    });
  });

  it('sends grouped notifications through the workflow script, including paginated test changes', async () => {
    writeDoc('example', 'Maintainer: owner@example.com');
    const config = path.join(modulesDir, 'manual-rules');
    fs.writeFileSync(config, '# Existing subscriptions\n\nmodules/example\\.js : owner@example.com\n');
    const messages = [];
    const requested = [];
    const script = new vm.Script(fs.readFileSync(path.join(scriptsDir, 'send-notification-on-change.js'), 'utf8'));
    const nextPage = 'https://api.github.com/repos/prebid/Prebid.js/pulls/123/files?page=2';
    await script.runInNewContext({
      __dirname: scriptsDir,
      require(id) {
        if (id === 'nodemailer') {
          return {
            createTransport: () => ({ sendMail: async message => messages.push(message) })
          };
        }
        if (id === 'fs') {
          return {
            readFileSync: () => fs.readFileSync(config, 'utf8')
          };
        }
        if (id === './module-notifications') {
          return {
            getModuleRules: () => getModuleRules(modulesDir), groupMatches
          };
        }
        return require(id);
      },
      process: {
        env: {
          GITHUB_REPOSITORY: 'prebid/Prebid.js',
          GITHUB_PR_NUMBER: '123',
          GITHUB_TOKEN: 'test-token',
          NOTIFICATION_EMAIL: 'sender@example.com',
          NOTIFICATION_PASSWORD: 'test-password'
        },
        exit(code) { throw new Error(`Unexpected exit: ${code}`); }
      },
      console: { log() {}, error(message) { throw new Error(message); } },
      fetch: async url => {
        requested.push(url);
        const first = requested.length === 1;
        return {
          ok: true,
          json: async () => [{ filename: first ? 'modules/example.js' : 'test/spec/modules/example_spec.js' }],
          headers: { get: () => first ? `<${nextPage}>; rel="next"` : null }
        };
      }
    });
    expect(requested).to.have.length(2);
    expect(requested[1]).to.equal(nextPage);
    expect(messages).to.have.length(1);
    expect(messages[0].to).to.equal('owner@example.com');
    expect(messages[0].html).to.include('<li>test/spec/modules/example_spec.js</li>');
    expect(messages[0].html.match(/<li>modules\/example.js<\/li>/g)).to.have.length(1);
  });
});
