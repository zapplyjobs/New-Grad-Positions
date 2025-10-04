# Discord Bot Logging System

## What We've Implemented

### 1. Local Log Saving
- **Script**: `.github/scripts/save-discord-logs.js`
- **Purpose**: Wraps the Discord bot and saves all output to local files
- **Location**: Logs saved to `.github/logs/` directory

### 2. Automatic Log Collection
The workflow now:
1. Runs the bot through the logging wrapper
2. Saves all console output to timestamped log files
3. Creates `latest.log` for easy access
4. Commits logs back to the repository
5. You can pull and read them locally!

### 3. Log Contents
Each log file contains:
- Timestamp for every line
- Environment variable status
- Multi-channel configuration check
- Data file verification
- Complete bot execution output
- Error messages if any
- Exit codes and summary

## How to Use

### After a Workflow Run:
```bash
# Pull the latest changes (includes logs)
git pull

# Read the latest Discord bot log
cat .github/logs/latest.log

# Or view all logs
ls -la .github/logs/
```

### What to Look For:

#### Successful Connection:
```
[BOT] ✅ Enhanced Discord bot logged in as YourBot#1234
```

#### Multi-Channel Detection:
```
Multi-Channel Mode: ✅ ENABLED
  OR
Multi-Channel Mode: ⭕ DISABLED (using single-channel)
```

#### Job Posting:
```
[BOT] 📬 Posting 1 new jobs (0 already posted)...
[BOT] 📝 Single-channel mode - posting to configured channel
[BOT] ✅ Posted: Test Software Engineer at TestCorp
```

#### Errors:
```
[BOT ERROR] ❌ Channel not found or accessible: 123456789
[BOT ERROR] Error: Missing permissions
```

## Critical Issues We Fixed

### 1. ❌ 2-Second Kill Timer (FIXED)
- Bot was being killed after 2 seconds
- Jobs never had time to post
- Now waits for completion

### 2. ❌ Channel Cache Issue (FIXED)
- Used unreliable `.cache.get()`
- Now uses `.fetch()` for guaranteed access

### 3. ✅ Logging System (NEW)
- All output saved locally
- Can debug after workflow runs
- No more blind troubleshooting

## Testing Locally

### Quick Test:
```bash
# Set up test data
node test-bot-with-logs.js

# Run bot with logging (need Discord token)
DISCORD_TOKEN=xxx \
DISCORD_CHANNEL_ID=xxx \
node .github/scripts/save-discord-logs.js

# Check the log
cat .github/logs/latest.log
```

## Log File Format

### Filename Pattern:
```
discord-bot-2025-10-03T12-30-45-123Z.log  # Timestamped
latest.log                                 # Copy of most recent
```

### Content Structure:
```
[2025-10-03T12:30:45.123Z] ========================================
[2025-10-03T12:30:45.124Z] Discord Bot Execution Log
[2025-10-03T12:30:45.125Z] Environment: GitHub Actions
[2025-10-03T12:30:45.126Z] ========================================

[2025-10-03T12:30:45.127Z] Environment Variables Check:
[2025-10-03T12:30:45.128Z] DISCORD_TOKEN: ✅ Set
[2025-10-03T12:30:45.129Z] DISCORD_CHANNEL_ID: ✅ Set

[2025-10-03T12:30:45.130Z] Multi-Channel Configuration:
[2025-10-03T12:30:45.131Z] DISCORD_TECH_CHANNEL_ID: ⭕ Not set

[2025-10-03T12:30:45.200Z] [BOT] Starting bot...
[2025-10-03T12:30:46.500Z] [BOT] ✅ Connected to Discord
```

## Benefits

1. **Persistent Logs**: Survives after workflow completes
2. **Local Access**: Can read without GitHub web interface
3. **Complete Output**: Everything the bot prints
4. **Error Tracking**: Captures all errors with timestamps
5. **Configuration Verification**: Shows which env vars are set

## Next Steps

1. Push these changes
2. Let workflow run
3. Pull the repo to get logs
4. Read `.github/logs/latest.log`
5. Share any errors found!

This gives us full visibility into what's happening in GitHub Actions! 🎯