# Discord Bot Bug Fixes Log

## Bug #1: 2-Second Kill Timer
**Date**: 2025-10-03
**File**: `.github/scripts/enhanced-discord-bot.js`
**Lines**: 715-719

### Problem:
Bot was killed after 2 seconds via `setTimeout(() => process.exit(0), 2000)` before jobs could finish posting.

### Symptoms:
- Logs showed "Posting X jobs"
- No jobs appeared in Discord
- Process exited too early

### Fix:
```javascript
// OLD:
setTimeout(() => process.exit(0), 2000);

// NEW:
await new Promise(resolve => setTimeout(resolve, 2000)); // Grace period
client.destroy();
process.exit(0);
```

---

## Bug #2: Channel Cache Not Ready
**Date**: 2025-10-03
**File**: `.github/scripts/enhanced-discord-bot.js`
**Lines**: 626, 665

### Problem:
Using `client.channels.cache.get()` returned undefined because cache wasn't populated.

### Symptoms:
- "Channel not found" errors
- Jobs failed to post even with correct channel IDs

### Fix:
```javascript
// OLD:
const channel = client.channels.cache.get(channelId);

// NEW:
const channel = await client.channels.fetch(channelId);
```

---

## Bug #3: Job Fetcher Overwrites Test Jobs
**Date**: 2025-10-04
**File**: `.github/scripts/job-fetcher/job-processor.js`
**Lines**: 245-252

### Problem:
Job fetcher always overwrites `new_jobs.json` with "fresh" jobs. When no fresh jobs found, writes empty array.

### Symptoms:
- Test jobs added manually disappear
- `new_jobs.json` becomes `[]` after job fetcher runs
- Discord bot has nothing to post

### Workaround:
Created separate test workflow that skips job fetcher.

---

## Bug #4: Multi-Channel Mode False Positive
**Date**: 2025-10-04
**File**: `.github/scripts/enhanced-discord-bot.js`
**Line**: 39

### Problem:
Environment variables not set in GitHub come as empty strings `""`, not `undefined`. Check for `!== undefined` incorrectly detected multi-channel mode as enabled.

### Symptoms:
- Log showed "Multi-channel mode: DISABLED"
- But bot said "Multi-channel mode enabled"
- All jobs skipped with "No channel configured"

### Fix:
```javascript
// OLD:
const MULTI_CHANNEL_MODE = Object.values(CHANNEL_CONFIG).some(id => id !== undefined);

// NEW:
const MULTI_CHANNEL_MODE = Object.values(CHANNEL_CONFIG).some(id => id && id.trim() !== '');
```

Also added empty string check in channel routing (line 610):
```javascript
if (!channelId || channelId.trim() === '') {
  console.warn(`⚠️ No channel configured for job: ${job.job_title} - skipping`);
  continue;
}
```

---

## Bug #5: Posted Jobs Tracking Conflict
**Date**: 2025-10-03
**File**: `.github/scripts/enhanced-discord-bot.js`

### Problem:
`posted_jobs.json` was being populated by other processes, marking jobs as "posted" before Discord bot ran.

### Symptoms:
- All jobs marked as already posted
- Bot skips everything
- Nothing posts to Discord

### Investigation:
- `posted_jobs.json` had 3700+ IDs
- Jobs were marked posted without actually going to Discord
- Need separate tracking or cleared tracking

---

## Common Issues & Solutions

### Issue: Jobs not posting despite logs saying "posting X jobs"
**Check**:
1. 2-second timer killing bot
2. Channel fetch failing
3. Multi-channel false positive
4. Jobs already in posted_jobs.json

### Issue: Test jobs disappearing
**Cause**: Job fetcher overwrites new_jobs.json
**Solution**: Use test workflow that skips fetcher

### Issue: "No channel configured" when channel IS configured
**Cause**: Empty string vs undefined check
**Solution**: Check for actual values, not just defined

### Issue: Bot connects but nothing happens
**Check**:
1. Is new_jobs.json empty?
2. Are job IDs in posted_jobs.json?
3. Check the logs for channel errors

---

## Testing Checklist

Before deploying:
- [ ] Remove 2-second kill timer
- [ ] Use channel.fetch() not cache.get()
- [ ] Check for empty strings in env vars
- [ ] Verify new_jobs.json has jobs
- [ ] Check job IDs not in posted_jobs.json
- [ ] Test with dedicated test workflow

---

## Environment Variables Required

### Minimum (Single-Channel):
- `DISCORD_TOKEN` (required)
- `DISCORD_CHANNEL_ID` (required)

### Optional:
- `DISCORD_CLIENT_ID` (for slash commands)
- `DISCORD_GUILD_ID` (for slash commands)

### Multi-Channel (all must be set for multi-channel to activate):
- `DISCORD_TECH_CHANNEL_ID`
- `DISCORD_SALES_CHANNEL_ID`
- `DISCORD_MARKETING_CHANNEL_ID`
- `DISCORD_FINANCE_CHANNEL_ID`
- `DISCORD_HEALTHCARE_CHANNEL_ID`
- `DISCORD_PRODUCT_CHANNEL_ID`
- `DISCORD_SUPPLY_CHANNEL_ID`
- `DISCORD_PM_CHANNEL_ID`
- `DISCORD_HR_CHANNEL_ID`

---

## Debugging Commands

```bash
# Check if jobs exist
cat .github/data/new_jobs.json | jq length

# Check posted tracking
cat .github/data/posted_jobs.json | jq length

# Remove test IDs from posted
node -e "
const fs = require('fs');
const posted = JSON.parse(fs.readFileSync('.github/data/posted_jobs.json'));
const filtered = posted.filter(id => !id.startsWith('test-'));
fs.writeFileSync('.github/data/posted_jobs.json', JSON.stringify(filtered, null, 2));
"

# Run test locally
DISCORD_TOKEN=xxx DISCORD_CHANNEL_ID=xxx node .github/scripts/enhanced-discord-bot.js
```

---

## Workflow Files

### Main Workflow: `.github/workflows/update-jobs.yml`
- Runs job fetcher first (can overwrite test jobs)
- Then runs Discord bot
- Can have conflicts

### Test Workflow: `.github/workflows/test-discord-bot.yml`
- Skips job fetcher
- Creates test jobs with unique IDs
- Shows logs directly
- Better for debugging

---

## Lessons Learned

1. **Always check for empty strings** in environment variables, not just undefined
2. **Async operations need time** - don't exit process prematurely
3. **Cache isn't always ready** - use fetch() for Discord.js
4. **Separate concerns** - job fetching and Discord posting should not conflict
5. **Log everything** - saves debugging time
6. **Test in isolation** - separate test workflow helps identify issues