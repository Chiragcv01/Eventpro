// Generates the Android (Trusted Web Activity) project from twa-manifest.json, without prompts.
const path = require('path');
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');
(async () => {
  const manifest = await TwaManifest.fromFile(path.join(__dirname, 'twa-manifest.json'));
  await new TwaGenerator().createTwaProject(path.join(__dirname, 'project'), manifest, new ConsoleLog('generate'));
  console.log('Project generated');
})().catch(e => { console.error(e); process.exit(1); });
