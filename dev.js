#!/usr/bin/env bun

// Development launcher - starts both backend and frontend servers
import { spawn } from 'child_process';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

function log(prefix, color, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

// Start backend server
const backend = spawn('bun', ['be/server.js'], {
  cwd: process.cwd(),
  stdio: 'pipe',
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => log('[BACKEND]', colors.cyan, line));
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => log('[BACKEND]', colors.red, line));
});

backend.on('close', (code) => {
  log('[BACKEND]', colors.red, `Process exited with code ${code}`);
  frontend.kill();
  process.exit(code);
});

// Start frontend server
const frontend = spawn('bun', ['serve.js'], {
  cwd: join(process.cwd(), 'fe'),
  stdio: 'pipe',
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => log('[FRONTEND]', colors.yellow, line));
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => log('[FRONTEND]', colors.red, line));
});

frontend.on('close', (code) => {
  log('[FRONTEND]', colors.red, `Process exited with code ${code}`);
  backend.kill();
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n');
  log('[DEV]', colors.green, 'Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

log('[DEV]', colors.green, 'Starting development servers...');
log('[DEV]', colors.bright, 'Press Ctrl+C to stop both servers');
