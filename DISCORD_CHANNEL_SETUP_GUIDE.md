# Discord Channel Setup Guide - GET THIS WORKING NOW

## Step 1: Get Your Discord Channel IDs (5 minutes)

### In Discord:
1. Go to User Settings → Advanced → Enable "Developer Mode"
2. Right-click each forum channel and select "Copy Channel ID"
3. Collect these IDs:

```
tech-jobs channel ID: _______________
sales-jobs channel ID: _______________
marketing-jobs channel ID: _______________
finance-jobs channel ID: _______________
healthcare-jobs channel ID: _______________
product-jobs channel ID: _______________
supply-chain-jobs channel ID: _______________
project-management-jobs channel ID: _______________
human-resources-jobs channel ID: _______________
```

## Step 2: Add to GitHub Secrets (5 minutes)

### Go to your GitHub repo:
1. Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each one:

| Secret Name | Value (Channel ID) |
|------------|-------------------|
| `DISCORD_TECH_CHANNEL_ID` | [paste tech channel ID] |
| `DISCORD_SALES_CHANNEL_ID` | [paste sales channel ID] |
| `DISCORD_MARKETING_CHANNEL_ID` | [paste marketing channel ID] |
| `DISCORD_FINANCE_CHANNEL_ID` | [paste finance channel ID] |
| `DISCORD_HEALTHCARE_CHANNEL_ID` | [paste healthcare channel ID] |
| `DISCORD_PRODUCT_CHANNEL_ID` | [paste product channel ID] |
| `DISCORD_SUPPLY_CHANNEL_ID` | [paste supply-chain channel ID] |
| `DISCORD_PM_CHANNEL_ID` | [paste PM channel ID] |
| `DISCORD_HR_CHANNEL_ID` | [paste HR channel ID] |

## Step 3: The Workflow File Needs These Environment Variables

The workflow needs to pass these secrets to the bot. I'll update this next.

## Step 4: Test Categories

### Example Job Mappings:
- "Software Engineer" → tech-jobs
- "Account Executive" → sales-jobs
- "Marketing Manager" → marketing-jobs
- "Financial Analyst" → finance-jobs
- "Product Manager" → product-jobs
- "Project Manager" → project-management-jobs
- "HR Business Partner" → human-resources-jobs
- "Supply Chain Analyst" → supply-chain-jobs
- "Clinical Research" → healthcare-jobs

## What Happens Next:

### With Channel IDs Configured:
1. Bot detects multi-channel mode is active
2. Each job gets categorized
3. Job posts to appropriate forum channel as thread
4. Thread title: "🏢 Software Engineer @ Google"

### Without Channel IDs (Current):
1. Bot detects no multi-channel config
2. Falls back to single channel mode
3. Posts everything to "new-jobs" text channel
4. Works but not organized

## Quick Setup Commands:

### After adding all secrets, test locally:
```bash
# Test categorization
node test-bot-categorization.js

# Test bot (dry run - needs all env vars)
DISCORD_TOKEN=xxx \
DISCORD_TECH_CHANNEL_ID=xxx \
DISCORD_SALES_CHANNEL_ID=xxx \
# ... etc
node .github/scripts/enhanced-discord-bot.js
```

## The Magic Line:

This line (39) in the bot automatically detects if you've configured multi-channel:
```javascript
const MULTI_CHANNEL_MODE = Object.values(CHANNEL_CONFIG).some(id => id !== undefined);
```

If ANY channel IDs are set, it switches to multi-channel mode!