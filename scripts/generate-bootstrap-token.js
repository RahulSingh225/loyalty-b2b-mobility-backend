#!/usr/bin/env node
const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');

const token = randomBytes(24).toString('hex');
const p = path.join(process.cwd(), '.bootstrap_token');
fs.writeFileSync(p, token, { encoding: 'utf8', flag: 'w' });
console.log('Bootstrap token created at', p);
console.log('Token:', token);
