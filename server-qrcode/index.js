#!/usr/bin/env node

const address = require('address');
const qrcode = require('qrcode-terminal');

// 1. Get the local IPv4 address
const localIp = address.ip();
const port = process.argv[2] || '3000'; // Default to 3000 if not provided
const url = `http://${localIp}:${port}`;

console.log(`\nScan to access: ${url}\n`);

qrcode.generate(url, { small: true });
