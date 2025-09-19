module.exports = {
  rootDir: process.cwd(),
  cfgFile: 'snipsync.config.yaml',
  extractionDir: 'sync_repos',
  markdownCodeTicks: '```',
  fmtStartCodeBlock: (ext) => '```' + ext,
  readStart: '@@@SNIPSTART',
  readEnd: '@@@SNIPEND',
  writeMarkerStyles: [
    { openStart: '<!--SNIPSTART', openClose: '-->', end: '<!--SNIPEND' },     // HTML comment
    { openStart: '{/* SNIPSTART', openClose: '*/}', end: '{/* SNIPEND' },     // MDX/JSX comment
  ],
};
