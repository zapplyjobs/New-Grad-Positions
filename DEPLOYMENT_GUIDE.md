# Location-Based Job Posting - Deployment Guide

**Date:** October 21, 2025
**Repository:** https://github.com/zapplyjobs/New-Grad-Jobs
**Status:** ✅ Code Complete - Ready for Deployment

---

## ⚠️ Security Note

**NEVER commit sensitive information to the repository!**
- Discord channel IDs should ONLY be in GitHub Secrets
- Never include actual IDs, tokens, or keys in code or documentation
- This guide uses placeholders - replace with actual values when configuring

---

## What Was Implemented

### ✅ Discord Bot Updates

**File: `.github/scripts/enhanced-discord-bot.js`**

1. Added location channel configuration using environment variables
2. Implemented `getJobLocationChannel()` function for location detection
3. Modified posting loop to post to BOTH industry AND location channels
4. Added rate limiting (1.5s between posts)

### ✅ Workflow Updates

**File: `.github/workflows/test-discord-bot.yml`**
- Added location channel environment variables

**File: `.github/workflows/update-jobs.yml`**
- Added location channel environment variables

### ✅ README Updates

**File: `README.md`**
- Added Locations badge showing 10 covered locations

---

## Deployment Steps

### Step 1: Add Discord Channel IDs to GitHub Secrets

**IMPORTANT:** Get the actual channel IDs from your Discord server first.

**How to get Discord Channel IDs:**
1. Enable Developer Mode in Discord: User Settings → Advanced → Developer Mode
2. Right-click each channel → Copy Channel ID
3. Save these IDs securely (don't commit them anywhere!)

**Add to GitHub Secrets:**
1. Go to: https://github.com/zapplyjobs/New-Grad-Jobs/settings/secrets/actions
2. Click "New repository secret"
3. Add each of these secrets with your actual channel IDs:

| Secret Name | Description |
|-------------|-------------|
| `DISCORD_REMOTE_USA_CHANNEL_ID` | Remote USA jobs channel ID |
| `DISCORD_NY_CHANNEL_ID` | New York channel ID |
| `DISCORD_AUSTIN_CHANNEL_ID` | Austin channel ID |
| `DISCORD_CHICAGO_CHANNEL_ID` | Chicago channel ID |
| `DISCORD_SEATTLE_CHANNEL_ID` | Seattle channel ID |
| `DISCORD_REDMOND_CHANNEL_ID` | Redmond channel ID |
| `DISCORD_MV_CHANNEL_ID` | Mountain View channel ID |
| `DISCORD_SF_CHANNEL_ID` | San Francisco channel ID |
| `DISCORD_SUNNYVALE_CHANNEL_ID` | Sunnyvale channel ID |
| `DISCORD_SAN_BRUNO_CHANNEL_ID` | San Bruno channel ID |

---

### Step 2: Commit and Push Changes

```bash
cd /c/Users/jarra/Videos/Work/Business/New-Grad-Positions

# Verify ONLY code changes (no sensitive data)
git diff

# Stage the changes
git add .github/scripts/enhanced-discord-bot.js
git add .github/workflows/test-discord-bot.yml
git add .github/workflows/update-jobs.yml
git add README.md

# Commit with descriptive message
git commit -m "feat: Add location-based job posting

- Jobs now post to BOTH industry AND location channels
- Added 10 location-specific channels
- Modified bot to detect job locations
- Added Locations badge to README

Max 2 posts per job (1 industry + 1 location)
Duplicate prevention unchanged"

# Push to GitHub
git push origin main
```

---

### Step 3: Test with GitHub Actions

1. **Go to:** https://github.com/zapplyjobs/New-Grad-Jobs/actions/workflows/test-discord-bot.yml
2. **Click:** "Run workflow"
3. **Configure:**
   - Number of test jobs: `3`
   - Skip posted check: ✅ Enable
4. **Click:** "Run workflow" (green button)
5. **Monitor:** Watch logs for dual posting messages

---

### Step 4: Verify in Discord

Check that test jobs appear in:

**Industry Channels:**
- `#tech-jobs`
- `#sales-jobs`

**Location Channels:**
- `#san-francisco`
- `#mountain-view`
- `#new-york`

**Expected:** Each test job appears in exactly 2 channels (1 industry + 1 location)

---

## How It Works

### Dual Posting Flow

```
New Job
  ↓
Check if already posted
  ↓
Not Posted → Continue
  ↓
Determine Industry Channel (tech, sales, etc.)
  ↓
Determine Location Channel (SF, NYC, etc.)
  ↓
Post to Industry Channel ✅
  ↓
[1.5s delay]
  ↓
Post to Location Channel ✅ (if location matches)
  ↓
Mark as Posted
```

### Duplicate Prevention

- Job ID generated from company + title + location
- Checked BEFORE posting
- Marked as posted AFTER successful post
- Next run: Job ID exists → skips BOTH channels
- **Maximum 2 posts per job total**

---

## Location Detection

The bot detects locations using this priority order:

1. **Remote USA jobs:** Must mention both "remote" AND "USA"
2. **Exact city match:** In `job_city` field
3. **City in title/description:** Searches for city keywords

**Covered locations:**
- Remote USA
- New York, San Francisco, Austin, Chicago
- Seattle, Redmond, Mountain View, Sunnyvale, San Bruno

**Jobs without matching locations:** Posted to industry channel only (1 post)

---

## Rollback Plan

If issues occur:

### Quick Disable (No Code Changes)

1. Delete location channel IDs from GitHub Secrets
2. Bot automatically detects no location channels
3. Returns to industry-only posting

### Code Revert

```bash
git log --oneline | head -5  # Find commit hash
git revert <commit-hash>
git push
```

---

## Troubleshooting

### No location posts appearing

**Check:**
- Are channel IDs added to GitHub Secrets?
- Do workflow logs show location posting attempts?
- Does bot have permissions in location channels?

### Duplicate posts (more than 2)

**Check:**
- Verify `posted_jobs.json` contains job IDs
- Check for duplicate detection errors in logs

### Only industry OR location (not both)

**Check:**
- Workflow logs for error messages
- Look for channel fetch failures
- Verify channel permissions

---

## Security Best Practices

### ✅ DO:
- Keep channel IDs in GitHub Secrets
- Use environment variables for all sensitive data
- Review code before committing
- Use placeholders in documentation

### ❌ DON'T:
- Commit channel IDs to repository
- Include tokens/keys in code
- Push sensitive data to public repos
- Share secrets in chat/email

---

## Files Modified

| File | Changes |
|------|---------|
| `.github/scripts/enhanced-discord-bot.js` | Location detection & dual posting |
| `.github/workflows/test-discord-bot.yml` | Location channel env vars |
| `.github/workflows/update-jobs.yml` | Location channel env vars |
| `README.md` | Locations badge |

**All files contain ONLY environment variable references - no sensitive data.**

---

## Next Steps

1. ✅ Add channel IDs to GitHub Secrets (Step 1)
2. ✅ Commit and push code (Step 2)
3. ✅ Test with GitHub Actions (Step 3)
4. ✅ Verify in Discord (Step 4)
5. 📊 Monitor production

---

**Status:** ✅ Safe to commit and deploy
**Security:** ✅ No sensitive data in code
**Testing:** Via GitHub Actions workflow

---

**Created:** October 21, 2025
**Last Updated:** October 21, 2025
