const fs = require('fs');
const path = require('path');

const pkgs = JSON.parse(process.env.PUBLISHED_PACKAGES);

const sections = pkgs.map((p) => {
  const shortName = p.name.replace('@react-native-ads/', '');
  const changelogPath = path.join('packages', shortName, 'CHANGELOG.md');
  let body = '';

  if (fs.existsSync(changelogPath)) {
    const lines = fs.readFileSync(changelogPath, 'utf8').split('\n');
    const startIdx = lines.findIndex((l) => l.trim() === `## ${p.version}`);
    if (startIdx !== -1) {
      const rest = lines.slice(startIdx + 1);
      const endIdx = rest.findIndex((l) => l.startsWith('## '));
      const section = endIdx === -1 ? rest : rest.slice(0, endIdx);
      body = section.join('\n').trim();
    }
  }

  const header = `### ${p.name}@${p.version}`;
  return body ? `${header}\n\n${body}` : header;
});

console.log(sections.join('\n\n'));
