#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const scriptPath = path.join(__dirname, 'crawl-OVERNIGHT-v2.js');

const result = spawnSync(process.execPath, [scriptPath, '--continue', ...args], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
