# Improved Discord Bot Setup & Configuration

## Overview
The improved Discord bot fixes critical issues and adds multi-channel forum posting support for categorized job postings.

## Key Improvements

### 1. Fixed Issues
- ✅ **Date Handling**: Shows "Recently", "Today", "Yesterday", or relative dates instead of "Invalid Date"
- ✅ **Job Role Emojis**: Consistent emojis based on job category (💻 for tech, 💰 for sales, etc.)
- ✅ **Clean Descriptions**: Removes debug metadata and formats descriptions properly
- ✅ **Error Handling**: Graceful fallbacks for missing data
- ✅ **Forum Post Support**: Creates proper forum posts instead of regular messages

### 2. New Features
- **Multi-Channel Routing**: Jobs automatically route to appropriate category channels
- **Forum Posts**: Creates discussion threads for each job
- **Better Categorization**: Enhanced job classification for non-tech roles
- **Improved UI**: Cleaner embeds with better formatting

## Channel Configuration

### Option 1: Individual Environment Variables
Set these in GitHub Secrets:
```bash
DISCORD_TOKEN=your_bot_token
DISCORD_TECH_CHANNEL_ID=1234567890
DISCORD_SALES_CHANNEL_ID=1234567891
DISCORD_MARKETING_CHANNEL_ID=1234567892
DISCORD_FINANCE_CHANNEL_ID=1234567893
DISCORD_HEALTHCARE_CHANNEL_ID=1234567894
DISCORD_PRODUCT_CHANNEL_ID=1234567895
DISCORD_SUPPLY_CHANNEL_ID=1234567896
DISCORD_PM_CHANNEL_ID=1234567897
DISCORD_HR_CHANNEL_ID=1234567898
DISCORD_GENERAL_CHANNEL_ID=1234567899  # Fallback channel
```

### Option 2: JSON Configuration
Set a single environment variable with JSON:
```bash
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNELS_JSON='{
  "tech-jobs": "1234567890",
  "sales-jobs": "1234567891",
  "marketing-jobs": "1234567892",
  "finance-jobs": "1234567893",
  "healthcare-jobs": "1234567894",
  "product-jobs": "1234567895",
  "supply-chain-jobs": "1234567896",
  "project-management-jobs": "1234567897",
  "human-resources-jobs": "1234567898",
  "general-jobs": "1234567899"
}'
```

## Job Categorization Logic

### Tech Jobs → `#tech-jobs`
- Software Engineering
- Frontend/Backend/Full Stack
- Mobile Development
- Data Science & ML/AI
- DevOps & Infrastructure
- Security Engineering

### Business Jobs → Various Channels
- Sales roles → `#sales-jobs`
- Marketing roles → `#marketing-jobs`
- Finance roles → `#finance-jobs`
- Product Management → `#product-jobs`
- HR roles → `#human-resources-jobs`
- Project Management → `#project-management-jobs`

### Other Industries
- Healthcare → `#healthcare-jobs`
- Supply Chain → `#supply-chain-jobs`
- Uncategorized → `#general-jobs` (fallback)

## Example Output

### Before (Issues)
```
🏢 Software Engineer
⏰ Posted: Invalid Date
📋 Description
Category: Business. Level: corporate_fareGoogle. Posted: Recently...
```

### After (Fixed)
```
💻 Software Engineer
🏢 Company: Google
📍 Location: Mountain View, CA
⏰ Posted: 2 days ago
📋 Description
Join our team to build innovative solutions...
🏷️ Category & Tags
**Software Engineering** | `Senior` `Full-Time` `Onsite`
```

## Discord Bot Permissions

Required permissions for forum channels:
- Send Messages
- Create Public Threads
- Manage Threads
- Embed Links
- Read Message History
- View Channels

## Migration Guide

### From `enhanced-discord-bot.js`:
1. Update environment variables with channel IDs
2. Replace bot file reference in workflow
3. Ensure bot has forum channel permissions

### Testing
```bash
# Test with dry run (logs channel routing without posting)
DRY_RUN=true node .github/scripts/improved-discord-bot.js

# Test with single channel first
DISCORD_GENERAL_CHANNEL_ID=xxx node .github/scripts/improved-discord-bot.js

# Full deployment with all channels
node .github/scripts/improved-discord-bot.js
```

## Workflow Update

Update `.github/workflows/update-jobs.yml`:
```yaml
- name: Post to Discord
  env:
    DISCORD_TOKEN: ${{ secrets.DISCORD_TOKEN }}
    DISCORD_TECH_CHANNEL_ID: ${{ secrets.DISCORD_TECH_CHANNEL_ID }}
    DISCORD_SALES_CHANNEL_ID: ${{ secrets.DISCORD_SALES_CHANNEL_ID }}
    # ... other channel IDs
  run: |
    npm install discord.js
    node .github/scripts/improved-discord-bot.js
```

## Troubleshooting

### Common Issues:

1. **"Channel not found"**
   - Verify channel IDs are correct
   - Ensure bot has access to the channels
   - Check channel type (must be forum channels)

2. **"Cannot create thread"**
   - Bot needs "Create Public Threads" permission
   - Forum channel must be properly configured

3. **Jobs going to wrong channel**
   - Review job title/description
   - Check categorization logic
   - May need to adjust keyword matching

4. **Date showing "Recently" always**
   - Check `job_posted_at_datetime_utc` field format
   - Verify date parsing logic

## Future Enhancements

- [ ] Add salary range detection and display
- [ ] Implement cross-posting for multi-category jobs
- [ ] Add reaction-based filtering
- [ ] Create daily/weekly summary posts
- [ ] Add application tracking system