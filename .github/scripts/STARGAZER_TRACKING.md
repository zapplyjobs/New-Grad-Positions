# Stargazer Tracking System

## Overview

This automated system tracks who stars the `New-Grad-Jobs` repository, monitors changes over time, and posts updates to Discord.

## Features

- **Daily Tracking**: Runs automatically every day at 7:00 AM London time
- **Historical Data**: Stores complete stargazer history with timestamps
- **Change Detection**: Identifies new stars and removed stars (unstarred)
- **Discord Notifications**: Posts updates when stargazer changes are detected
- **Data Persistence**: Maintains a JSON database of all stargazers

## Architecture

### Components

1. **GitHub Action Workflow** (`.github/workflows/track-stargazers.yml`)
   - Scheduled to run daily at 7:00 AM London time
   - Can be manually triggered for testing
   - Commits updated data back to the repository

2. **Tracking Script** (`.github/scripts/track-stargazers.js`)
   - Fetches all stargazers using GitHub API with timestamps
   - Compares with previous data to detect changes
   - Generates Discord notifications
   - Saves updated data to JSON file

3. **Data Storage** (`.github/data/stargazers.json`)
   - Stores complete list of stargazers with metadata
   - Includes timestamps for when each user starred
   - Tracks statistics about changes

## How It Works

### 1. Fetch Stargazers

The script uses the GitHub Stargazers API with a special media type header to fetch timestamps:

```javascript
'Accept': 'application/vnd.github.star+json'
```

This returns:
- Username and profile URL
- User ID (for tracking)
- Avatar URL
- **Timestamp of when they starred** (starred_at)

### 2. Compare with Previous Data

- Loads previous stargazer data from `.github/data/stargazers.json`
- Compares current stargazers with previous using user IDs
- Identifies:
  - **New stars**: Users who weren't in the previous list
  - **Removed stars**: Users who were in the previous list but not current

### 3. Generate Discord Notification

When changes are detected, the script posts a Discord message with:
- Total star count and net change
- List of new stargazers (up to 10, with profile links for top 5)
- List of removed stars (up to 5)
- Timestamps for when stars occurred

### 4. Save Updated Data

The script saves a comprehensive JSON file containing:
```json
{
  "stargazers": [
    {
      "login": "username",
      "id": 12345,
      "avatar_url": "https://...",
      "html_url": "https://github.com/username",
      "starred_at": "2025-10-21T12:34:56Z"
    }
  ],
  "total_count": 150,
  "last_updated": "2025-10-21T07:00:00Z",
  "stats": {
    "new_since_last_run": 5,
    "removed_since_last_run": 1,
    "net_change": 4
  }
}
```

## Manual Testing

### Test the Script Locally

1. **Set environment variables:**
   ```bash
   export GITHUB_TOKEN="your_github_token"
   export DISCORD_WEBHOOK_URL="your_discord_webhook_url"  # Optional
   export REPO_OWNER="zapplyjobs"
   export REPO_NAME="New-Grad-Jobs"
   ```

2. **Install dependencies:**
   ```bash
   cd .github/scripts
   npm install @octokit/rest node-fetch
   ```

3. **Run the script:**
   ```bash
   node track-stargazers.js
   ```

### Test the GitHub Action

1. **Trigger manually:**
   - Go to: `Actions` → `Track GitHub Stargazers` → `Run workflow`
   - Click "Run workflow" button

2. **Check the results:**
   - View workflow run logs
   - Check the workflow summary for statistics
   - Verify `.github/data/stargazers.json` was updated
   - Check Discord channel for notification (if changes detected)

## Data Format

### Stargazer Object
```javascript
{
  "login": "octocat",              // GitHub username
  "id": 583231,                    // User ID (used for tracking)
  "avatar_url": "https://...",     // Profile picture URL
  "html_url": "https://...",       // GitHub profile URL
  "starred_at": "2025-10-21T..."   // Timestamp when starred
}
```

### Stats Object
```javascript
{
  "new_since_last_run": 5,         // New stars since last check
  "removed_since_last_run": 1,     // Removed stars since last check
  "net_change": 4                  // Net change (+/-)
}
```

## Discord Notification Format

### Example Message

```
⭐ Stargazer Update - Oct 21, 2025

Total Stars: 150 (+4 net today)

🌟 5 New Stargazers
```
username1                      Oct 21, 02:34 PM
username2                      Oct 21, 03:15 PM
username3                      Oct 21, 04:22 PM
username4                      Oct 21, 05:01 PM
username5                      Oct 21, 06:45 PM
```

<https://github.com/username1>
<https://github.com/username2>
<https://github.com/username3>
<https://github.com/username4>
<https://github.com/username5>

💔 1 Unstarred
```
old_username
```
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub API token (provided by Actions) |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook for notifications |
| `REPO_OWNER` | No | Repository owner (default: 'zapplyjobs') |
| `REPO_NAME` | No | Repository name (default: 'New-Grad-Jobs') |

### Workflow Schedule

The workflow runs daily at 7:00 AM London time:
```yaml
schedule:
  - cron: '0 7 * * *'
```

To change the schedule, modify the cron expression in `.github/workflows/track-stargazers.yml`.

## Rate Limits

- **GitHub API Rate Limit**: 5,000 requests/hour (authenticated)
- **Script Protection**: 100ms delay between pagination requests
- **Typical Usage**: ~10-20 requests per run (depends on stargazer count)

For a repository with 1,000 stars:
- Fetches 10 pages (100 per page)
- Takes ~1-2 seconds total

## Troubleshooting

### No Discord Notification

- Check if `DISCORD_WEBHOOK_URL` is configured in repository secrets
- Verify there were actual stargazer changes
- Script skips Discord post if no changes detected

### Data File Not Updated

- Check workflow logs for errors
- Verify git auto-commit action succeeded
- Ensure `.github/data/` directory exists

### API Rate Limit Exceeded

- Wait for rate limit to reset (check headers)
- Reduce workflow frequency if needed
- Script includes built-in rate limit protection

### Missing Timestamps

- Verify using `application/vnd.github.star+json` header
- Check GitHub API version compatibility
- Review API response in logs

## Integration with Other Workflows

This workflow is designed to complement existing workflows:

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `update-jobs.yml` | Every 10 min | Update job listings |
| `daily-stats.yml` | 6:00 AM London | Post daily GitHub stats |
| **`track-stargazers.yml`** | **7:00 AM London** | **Track stargazer changes** |
| `weekly-stats.yml` | Sunday 9:00 AM | Post weekly summary |

The 7:00 AM schedule ensures this runs after `daily-stats.yml` to avoid conflicts.

## Future Enhancements

Potential improvements:
- [ ] Track stargazer demographics (location, company, bio keywords)
- [ ] Analyze star velocity (stars per day/week)
- [ ] Detect influential stargazers (high follower count)
- [ ] Generate charts/graphs of star growth
- [ ] Integration with other analytics platforms
- [ ] Email notifications for milestone stars (100th, 500th, 1000th)

## Privacy & Ethics

- Only public GitHub profile data is collected
- No private information is accessed
- All data is available through GitHub's public API
- Users can unstar at any time
- Complies with GitHub's Terms of Service

## Support

For issues or questions:
1. Check workflow logs in Actions tab
2. Review script console output
3. Verify environment variables are set
4. Test manually with `workflow_dispatch`

---

**Last Updated:** October 21, 2025
**Author:** Zapply Team
**Status:** Production Ready
