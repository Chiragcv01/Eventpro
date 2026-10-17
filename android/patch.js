// After generate.js: add the SabManage alert tune and the notification service that rings on silent.
const fs = require('fs'), path = require('path');
const main = path.join(__dirname, 'project/app/src/main');
fs.mkdirSync(path.join(main, 'res/raw'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'sabmanage_alert.ogg'), path.join(main, 'res/raw/sabmanage_alert.ogg'));
function find(dir, name) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { const r = find(p, name); if (r) return r; } else if (f.name === name) return p; } return null; }
const svc = find(path.join(main, 'java'), 'DelegationService.java');
if (!svc) throw new Error('DelegationService.java not found');
fs.writeFileSync(svc, fs.readFileSync(path.join(__dirname, 'DelegationService.java')));
const mf = fs.readFileSync(path.join(main, 'AndroidManifest.xml'), 'utf8');
console.log('patched', svc, '| POST_NOTIFICATIONS:', mf.includes('POST_NOTIFICATIONS'), '| delegation:', mf.includes('DelegationService'));
