// Added by Codex, an AI bot, on behalf of @patmmccann.
const fs = require('fs');
const path = require('path');

function getModuleRules(modulesDir) {
  const rules = [];
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const markdown = fs.readFileSync(path.join(modulesDir, entry.name), 'utf8');
    // Only use explicit Maintainer(s) fields, including indented lists. Other
    // addresses in examples, privacy policies, or support text are not owners.
    const fields = markdown.match(/^[ \t]*(?:[-*+]\s+)?\*{0,2}Maintainers?\*{0,2}[ \t]*:[^\r\n]*(?:\r?\n[ \t]+[-*+][^\r\n]*)*/gim) || [];
    const emails = new Set(fields.flatMap(field =>
      (field.match(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi) || [])
        .map(email => email.toLowerCase())
    ));
    const name = path.basename(entry.name, '.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^(?:modules/${name}(?:\\.[^/]+|/.*)|test/spec/modules/(?:${name}/.*|(?:[^/]+/)*${name}_spec\\.[cm]?[jt]sx?))$`);
    emails.forEach(email => rules.push({ regex, email }));
  }
  return rules;
}

function groupMatches(changedFiles, rules) {
  const matches = new Map();
  changedFiles.forEach(file => {
    rules.forEach(({ regex, email }) => {
      if (regex.test(file)) {
        const recipient = email.trim().toLowerCase();
        if (!matches.has(recipient)) matches.set(recipient, new Set());
        matches.get(recipient).add(file);
      }
    });
  });
  return Object.fromEntries([...matches].map(([email, files]) => [email, [...files]]));
}

module.exports = { getModuleRules, groupMatches };
