# Discord Bot Testing Guide

## Test Workflow Overview

We have a dedicated test workflow that bypasses the job fetcher to avoid conflicts.

### Running the Test Workflow

1. **Via GitHub Actions UI**:
   ```
   Actions → Test Discord Bot Posting → Run workflow
   ```

2. **Via GitHub CLI**:
   ```bash
   gh workflow run test-discord-bot.yml
   ```

3. **Options**:
   - `Skip posted jobs check`: Ignore tracking file (useful for re-testing)
   - `Number of test jobs`: How many test jobs to create (default: 3)

## Test Job Structure

Test jobs use a specific ID format to avoid conflicts:
```
test-{company}-{role}-{location}-{run_number}
```

Example test jobs:
- `test-meta-swe-sf-1` (Software Engineer at Meta)
- `test-google-pm-mv-1` (Product Manager at Google)
- `test-salesforce-sales-ny-1` (Sales Rep at Salesforce)

## Checking Test Results

### 1. GitHub Actions Logs
```bash
# View in browser
# Go to Actions tab → Select workflow run → View logs

# Or via CLI
gh run list --workflow=test-discord-bot.yml
gh run view [run-id]
```

### 2. Local Log Files
```bash
# Pull latest logs
git pull

# View latest log
cat .github/logs/latest.log

# View specific timestamp
ls -la .github/logs/
cat .github/logs/discord-bot-20250104-120000.log

# Search for key events
grep "logged in as" .github/logs/latest.log
grep "posting" .github/logs/latest.log
grep "ERROR" .github/logs/latest.log
```

### 3. Discord Verification
- Check the target channel for new posts
- For forums: Look for new threads
- For text channels: Look for new messages

## Test Scenarios

### Scenario 1: Basic Connection Test
```bash
# Run with minimal jobs
gh workflow run test-discord-bot.yml -f num_jobs=1

# Expected result:
✅ Bot connects
✅ 1 job posts to fallback channel
```

### Scenario 2: Multi-Job Test
```bash
# Run with multiple jobs
gh workflow run test-discord-bot.yml -f num_jobs=5

# Expected result:
✅ All 5 jobs post
✅ No duplicates
✅ Jobs tracked in posted_jobs.json
```

### Scenario 3: Skip Tracking Test
```bash
# Force repost of same jobs
gh workflow run test-discord-bot.yml -f skip_posted=true

# Expected result:
✅ Jobs post even if in tracking file
✅ Useful for testing formatting changes
```

### Scenario 4: Multi-Channel Test (After Setup)
```bash
# Ensure all channel IDs in secrets
# Run normal test
gh workflow run test-discord-bot.yml

# Expected result:
✅ Tech jobs → tech-jobs forum
✅ Sales jobs → sales-jobs forum
✅ PM jobs → pm-jobs forum
```

## Local Testing

### Quick Local Test
```bash
# Set minimal environment
export DISCORD_TOKEN="your_token_here"
export DISCORD_CHANNEL_ID="your_channel_id"

# Run bot
node .github/scripts/enhanced-discord-bot.js
```

### Full Local Test with Test Data
```bash
# Create test jobs
cat > .github/data/new_jobs.json << 'EOF'
[
  {
    "job_title": "Local Test Engineer",
    "employer_name": "TestCorp",
    "job_city": "Test City",
    "job_state": "TS",
    "job_description": "Testing locally",
    "job_apply_link": "https://example.com/test",
    "job_posted_at": "Recently",
    "job_posted_at_datetime_utc": "2025-01-15T10:00:00Z",
    "id": "local-test-1"
  }
]
EOF

# Run bot
node .github/scripts/enhanced-discord-bot.js

# Clean up
git checkout .github/data/new_jobs.json
```

## Debugging Commands

### Check Job Files
```bash
# Count jobs to post
cat .github/data/new_jobs.json | jq length

# View job details
cat .github/data/new_jobs.json | jq '.[0]'

# Check if job already posted
grep "job-id-here" .github/data/posted_jobs.json
```

### Clean Test Data
```bash
# Remove test job IDs from tracking
node -e "
const fs = require('fs');
const posted = JSON.parse(fs.readFileSync('.github/data/posted_jobs.json'));
const filtered = posted.filter(id => !id.startsWith('test-'));
fs.writeFileSync('.github/data/posted_jobs.json', JSON.stringify(filtered, null, 2));
console.log('Removed', posted.length - filtered.length, 'test IDs');
"

# Clear all tracking (use cautiously)
echo "[]" > .github/data/posted_jobs.json
```

### Monitor Background Process
```bash
# If bot seems stuck
ps aux | grep node
kill -9 [process_id]

# Check Discord rate limits in logs
grep "rate" .github/logs/latest.log
```

## Expected Log Output

### Successful Single-Channel Post
```
🚀 Starting Enhanced Discord Bot...
✅ Enhanced Discord bot logged in as Zapply Jobs Bot#9522
📊 Single-channel mode - using fallback channel
📥 Found 3 jobs to potentially post
🔍 Checking posted status for 3 jobs...
📝 3 new jobs to post (0 already posted)
📤 Posting 3 jobs to Discord...
[JOB 1/3] Posting: Software Engineer at Meta
✅ Posted job: Software Engineer
[JOB 2/3] Posting: Product Manager at Google
✅ Posted job: Product Manager
[JOB 3/3] Posting: Sales Representative at Salesforce
✅ Posted job: Sales Representative
✅ Successfully posted 3 jobs
💾 Saved 3 newly posted job IDs
✅ All posting operations complete
```

### Successful Multi-Channel Post
```
🚀 Starting Enhanced Discord Bot...
✅ Enhanced Discord bot logged in as Zapply Jobs Bot#9522
🔄 Multi-channel mode enabled
📥 Found 3 jobs to potentially post
🔍 Checking posted status for 3 jobs...
📝 3 new jobs to post (0 already posted)
📤 Posting 3 jobs to Discord...
[JOB 1/3] Posting to tech-jobs: Software Engineer at Meta
✅ Posted as thread: Software Engineer
[JOB 2/3] Posting to product-jobs: Product Manager at Google
✅ Posted as thread: Product Manager
[JOB 3/3] Posting to sales-jobs: Sales Representative at Salesforce
✅ Posted as thread: Sales Representative
✅ Successfully posted 3 jobs
💾 Saved 3 newly posted job IDs
✅ All posting operations complete
```

## Common Test Issues

### Issue: "No new jobs to post"
**Cause**: Jobs already in posted_jobs.json
**Fix**: Use `skip_posted=true` or clean tracking file

### Issue: "Channel not found"
**Cause**: Invalid channel ID or no permissions
**Fix**: Verify channel ID and bot permissions

### Issue: "Multi-channel mode: DISABLED"
**Cause**: Not all channel IDs set in secrets
**Fix**: Add all required channel IDs to GitHub Secrets

### Issue: Test jobs disappear
**Cause**: Main workflow job fetcher overwrites them
**Fix**: Use test workflow, not main workflow

### Issue: Rate limited
**Cause**: Too many API calls too quickly
**Fix**: Wait 10 minutes, reduce batch size

## Performance Testing

### Load Test (100+ Jobs)
```bash
# Generate many test jobs
node -e "
const jobs = [];
for (let i = 1; i <= 100; i++) {
  jobs.push({
    job_title: \`Test Engineer #\${i}\`,
    employer_name: 'TestCorp',
    job_city: 'Test City',
    job_state: 'TS',
    job_description: 'Load testing',
    job_apply_link: \`https://example.com/test\${i}\`,
    job_posted_at: 'Recently',
    job_posted_at_datetime_utc': '2025-01-15T10:00:00Z',
    id: \`load-test-\${i}\`
  });
}
require('fs').writeFileSync('.github/data/new_jobs.json', JSON.stringify(jobs, null, 2));
"

# Run with batching
node .github/scripts/enhanced-discord-bot.js
```

## Test Checklist

Before marking feature as working:

- [ ] Bot connects successfully
- [ ] Single job posts correctly
- [ ] Multiple jobs post without issues
- [ ] Tracking file updates properly
- [ ] Skip posted check works
- [ ] Logs are comprehensive
- [ ] No duplicate posts
- [ ] Error handling works
- [ ] Multi-channel routing works (if configured)
- [ ] Forum threads created properly
- [ ] Emojis render correctly
- [ ] Links are clickable
- [ ] No rate limit issues
- [ ] Graceful shutdown
- [ ] Git operations don't conflict