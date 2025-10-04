#!/usr/bin/env node

/**
 * Enhanced Discord Bot with Local Logging
 * This wrapper saves all console output to a local file for debugging
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create logs directory
const logsDir = path.join(process.cwd(), '.github', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `discord-bot-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log function that writes to both console and file
function log(message) {
  const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(message);
  logStream.write(timestampedMessage + '\n');
}

// Start logging
log('========================================');
log('Discord Bot Execution Log');
log(`Environment: ${process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'}`);
log(`Node Version: ${process.version}`);
log('========================================\n');

// Check environment variables
log('Environment Variables Check:');
log(`DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? '✅ Set' : '❌ Not set'}`);
log(`DISCORD_CHANNEL_ID: ${process.env.DISCORD_CHANNEL_ID ? '✅ Set' : '❌ Not set'}`);
log(`DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
log(`DISCORD_GUILD_ID: ${process.env.DISCORD_GUILD_ID ? '✅ Set' : '❌ Not set'}`);

// Check multi-channel configuration
const multiChannelVars = [
  'DISCORD_TECH_CHANNEL_ID',
  'DISCORD_SALES_CHANNEL_ID',
  'DISCORD_MARKETING_CHANNEL_ID',
  'DISCORD_FINANCE_CHANNEL_ID',
  'DISCORD_HEALTHCARE_CHANNEL_ID',
  'DISCORD_PRODUCT_CHANNEL_ID',
  'DISCORD_SUPPLY_CHANNEL_ID',
  'DISCORD_PM_CHANNEL_ID',
  'DISCORD_HR_CHANNEL_ID'
];

log('\nMulti-Channel Configuration:');
let multiChannelConfigured = false;
multiChannelVars.forEach(varName => {
  const isSet = !!process.env[varName];
  if (isSet) multiChannelConfigured = true;
  log(`${varName}: ${isSet ? '✅ Set' : '⭕ Not set'}`);
});

log(`\nMulti-Channel Mode: ${multiChannelConfigured ? '✅ ENABLED' : '⭕ DISABLED (using single-channel)'}`);

// Check data files
log('\nData Files Check:');
const dataFiles = [
  '.github/data/new_jobs.json',
  '.github/data/posted_jobs.json'
];

dataFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const count = Array.isArray(content) ? content.length : Object.keys(content).length;
    log(`${file}: ✅ Exists (${count} items, ${stats.size} bytes)`);
  } else {
    log(`${file}: ❌ Not found`);
  }
});

// Run the actual bot
log('\n========================================');
log('Starting Enhanced Discord Bot...');
log('========================================\n');

const botPath = path.join(process.cwd(), '.github', 'scripts', 'enhanced-discord-bot.js');
const bot = spawn('node', [botPath], {
  env: process.env,
  stdio: 'pipe'
});

// Capture bot output
bot.stdout.on('data', (data) => {
  const message = data.toString().trim();
  if (message) log(`[BOT] ${message}`);
});

bot.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message) log(`[BOT ERROR] ${message}`);
});

bot.on('exit', (code) => {
  log('\n========================================');
  log(`Bot exited with code: ${code}`);
  log('========================================');

  // Summary
  log('\nExecution Summary:');
  log(`Log saved to: ${logFile}`);
  log(`Exit code: ${code === 0 ? '✅ Success' : '❌ Failed'}`);

  // Save a summary file for easy access
  const summaryFile = path.join(logsDir, 'latest.log');
  fs.copyFileSync(logFile, summaryFile);
  log(`Latest log also saved as: ${summaryFile}`);

  logStream.end();
  process.exit(code);
});

// Handle errors
bot.on('error', (error) => {
  log(`Failed to start bot: ${error.message}`);
  logStream.end();
  process.exit(1);
});