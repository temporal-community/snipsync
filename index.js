#!/usr/bin/env node
const logger = require('js-logger');
const { readConfig } = require('./src/config');
const { Sync } = require('./src/Sync');

logger.useDefaults();
const args = process.argv.slice(2);
const cfg = readConfig(logger);

const opts = {};
const targetIdx = args.indexOf('--target');
if (targetIdx !== -1 && args[targetIdx + 1]) {
  opts.targetFilter = args[targetIdx + 1];
}

const synctron = new Sync(cfg, logger, opts);

if (args.includes('--clear')) {
  synctron.clear();
} else {
  synctron.run();
}
