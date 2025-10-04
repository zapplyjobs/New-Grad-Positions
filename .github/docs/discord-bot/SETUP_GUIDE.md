# Discord Bot Setup Guide

## Prerequisites

1. **Discord Server Access**
   - Admin permissions to add bot
   - Channel IDs for posting locations

2. **GitHub Repository**
   - Admin access to add secrets
   - Actions enabled

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it (e.g., "Zapply Jobs Bot")
4. Go to Bot section
5. Click "Add Bot"
6. Copy the Bot Token (save securely)

## Step 2: Add Bot to Server

1. In Discord Developer Portal, go to OAuth2 > URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select permissions:
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Manage Threads
   - Embed Links
   - Attach Files
   - Read Message History
4. Copy generated URL and open in browser
5. Select your server and authorize

## Step 3: Get Channel IDs

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Right-click on each channel/forum → Copy ID

### Channel ID Reference
```
# Fallback/Default Channel
new-jobs (text): Your main channel ID

# Forum Channels (for multi-channel mode)
tech-jobs: 1391083454665588819
sales-jobs: 1391466110137663632
marketing-jobs: 1391083610156564570
finance-jobs: 1391466200911052941
healthcare-jobs: 1391083735088234716
product-jobs: 1391466259534708889
supply-chain-jobs: 1391466325787939058
pm-jobs: 1391466474387931276
hr-jobs: 1391466508097687674
```

## Step 4: Configure GitHub Secrets

### Required Secrets (Single-Channel Mode)
```bash
DISCORD_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_main_channel_id
```

### Optional Secrets (Multi-Channel Mode)
```bash
# Bot credentials (optional)
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id

# Channel routing (all required for multi-channel)
DISCORD_TECH_CHANNEL_ID=1391083454665588819
DISCORD_SALES_CHANNEL_ID=1391466110137663632
DISCORD_MARKETING_CHANNEL_ID=1391083610156564570
DISCORD_FINANCE_CHANNEL_ID=1391466200911052941
DISCORD_HEALTHCARE_CHANNEL_ID=1391083735088234716
DISCORD_PRODUCT_CHANNEL_ID=1391466259534708889
DISCORD_SUPPLY_CHANNEL_ID=1391466325787939058
DISCORD_PM_CHANNEL_ID=1391466474387931276
DISCORD_HR_CHANNEL_ID=1391466508097687674
```

### How to Add Secrets
1. Go to repository Settings
2. Security → Secrets and variables → Actions
3. Click "New repository secret"
4. Add name and value
5. Save

## Step 5: Test the Setup

### Quick Test
1. Go to Actions tab
2. Find "Test Discord Bot Posting"
3. Click "Run workflow"
4. Select options:
   - Skip posted jobs check: Yes (for first test)
   - Number of test jobs: 3
5. Click "Run workflow"
6. Check Discord channel for posts

### Verify in Logs
```bash
# Pull latest logs
git pull
cat .github/logs/latest.log

# Check for successful connection
grep "logged in as" .github/logs/latest.log
```

## Step 6: Enable Multi-Channel Mode

1. Add ALL channel IDs to GitHub Secrets (see Step 4)
2. Bot will automatically detect and enable multi-channel mode
3. Jobs will route based on title keywords:
   - "Software Engineer" → tech-jobs
   - "Sales" → sales-jobs
   - "Marketing" → marketing-jobs
   - etc.

## Troubleshooting

### Bot Not Posting
1. Check secrets are set correctly
2. Verify bot has permissions in channel
3. Check logs for errors
4. Ensure new_jobs.json has jobs
5. Check if jobs already in posted_jobs.json

### Multi-Channel Not Working
1. All channel IDs must be set (not just some)
2. Check for empty strings in secrets
3. Verify channels are forum type (except fallback)
4. Check logs show "Multi-channel mode enabled"

### Permission Issues
1. Bot needs "Create Public Threads" for forums
2. Check bot role in server settings
3. Ensure channel permissions allow bot

## Environment Setup (Local Testing)

```bash
# Set environment variables
export DISCORD_TOKEN="your_token"
export DISCORD_CHANNEL_ID="your_channel"

# Test locally
node .github/scripts/enhanced-discord-bot.js

# With all channels
export DISCORD_TECH_CHANNEL_ID="1391083454665588819"
# ... export all other channels
node .github/scripts/enhanced-discord-bot.js
```

## Security Notes

- NEVER commit tokens to repository
- Use GitHub Secrets for all sensitive data
- Rotate tokens if exposed
- Limit bot permissions to minimum needed
- Monitor bot activity in audit logs

## Next Steps

1. Start with single-channel mode
2. Verify working with test workflow
3. Add multi-channel IDs when ready
4. Monitor logs for issues
5. Enable production workflow