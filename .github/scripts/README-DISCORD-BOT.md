# Enhanced Discord Bot Features

## Overview

The enhanced Discord bot now includes multi-channel forum posting, auto-generated tags, subscription alerts, and slash commands for job filtering.

## Latest Updates (December 2024)

### Critical Fixes
- ✅ **Fixed Date Handling**: Shows "Today", "Yesterday", "X days ago" instead of "Invalid Date"
- ✅ **Fixed Emoji Consistency**: Removed random job emojis, only shows company emoji when found
- ✅ **Clean Descriptions**: Removes debug metadata (Category:, Level:, etc.) from job descriptions
- ✅ **Better Error Handling**: Graceful fallbacks for all missing data fields

### New Multi-Channel Forum Support
Jobs now automatically route to 9 dedicated forum channels based on job type:
- 💻 `tech-jobs` - Software, engineering, data science, DevOps roles
- 💸 `sales-jobs` - Sales, business development, account management
- 🎯 `marketing-jobs` - Marketing, growth, SEO, brand management
- 💰 `finance-jobs` - Finance, accounting, financial analysis
- 🩺 `healthcare-jobs` - Healthcare, medical, clinical roles
- 📦 `product-jobs` - Product management, product strategy
- 🏭 `supply-chain-jobs` - Supply chain, logistics, operations
- 📊 `project-management-jobs` - Project/program management, Scrum Masters
- 👥 `human-resources-jobs` - HR, recruiting, talent acquisition

**Forum Post Format**: Each job creates a forum post with title: `Job Title | Company Name`

## Core Features

### 1. Auto-Generated Tags

Each job post now includes automatically generated tags based on:

- **Experience Level**: Senior, MidLevel, EntryLevel
- **Location**: Remote, SF, NYC, Seattle, Austin, etc.
- **Company Tier**: FAANG, Unicorn, Fintech, Gaming
- **Technologies**: React, Python, AWS, ML, AI, etc.
- **Role Type**: Frontend, Backend, FullStack, DevOps, etc.

### 2. Subscription System

Users can subscribe to job alerts for specific tags:

#### Slash Commands:
- `/subscribe tags:Senior,Remote,React` - Subscribe to multiple tags
- `/unsubscribe tags:Remote` - Unsubscribe from specific tags  
- `/unsubscribe tags:all` - Unsubscribe from all alerts
- `/subscriptions` - View current subscriptions

#### Button Interactions:
- Click "🔔 Get Similar Jobs" on any job post to subscribe to that job's primary tag

### 3. Job Search & Filtering

Advanced job search with filtering capabilities:

#### Slash Command:
- `/jobs tags:Senior,Remote` - Filter by tags
- `/jobs company:Google` - Filter by company
- `/jobs location:SF` - Filter by location
- `/jobs tags:React company:Stripe` - Combine multiple filters

## Required Environment Variables

### Multi-Channel Mode (Recommended)
Add these to your GitHub secrets for forum channel routing:

```bash
DISCORD_TOKEN=your_bot_token

# Forum Channel IDs (all required for multi-channel mode)
DISCORD_TECH_CHANNEL_ID=xxx
DISCORD_SALES_CHANNEL_ID=xxx
DISCORD_MARKETING_CHANNEL_ID=xxx
DISCORD_FINANCE_CHANNEL_ID=xxx
DISCORD_HEALTHCARE_CHANNEL_ID=xxx
DISCORD_PRODUCT_CHANNEL_ID=xxx
DISCORD_SUPPLY_CHANNEL_ID=xxx
DISCORD_PM_CHANNEL_ID=xxx        # Project Management
DISCORD_HR_CHANNEL_ID=xxx        # Human Resources

# Optional: For slash commands
DISCORD_CLIENT_ID=xxx
DISCORD_GUILD_ID=xxx
```

### Legacy Single-Channel Mode
For backwards compatibility:

```bash
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=xxx           # Single channel for all jobs
DISCORD_CLIENT_ID=xxx            # Optional
DISCORD_GUILD_ID=xxx             # Optional
```

## Bot Permissions Required

The bot needs these Discord permissions:
- Send Messages
- **Create Public Threads** (Required for forum channels)
- Manage Threads
- Embed Links
- View Channels
- Use Slash Commands (optional)
- Mention Everyone (optional, for subscription alerts)

## File Structure

```
.github/
├── scripts/
│   ├── enhanced-discord-bot.js     # Main bot with all features
│   ├── advanced-job-fetcher.js     # Job fetching (updated)
│   └── test-bot-features.js        # Testing script
└── data/
    ├── new_jobs.json              # Fresh jobs for Discord posting
    ├── seen_jobs.json             # Deduplication store
    └── subscriptions.json         # User subscription data
```

## How It Works

1. **Job Fetching**: `advanced-job-fetcher.js` fetches jobs and writes `new_jobs.json`
2. **Bot Processing**: `enhanced-discord-bot.js` reads new jobs, generates tags, posts with alerts
3. **User Interaction**: Users can subscribe, search, and filter jobs via slash commands
4. **Notifications**: Subscribed users get mentioned when matching jobs are posted

## Example Forum Post

**Forum Channel**: #tech-jobs
**Post Title**: `Senior Software Engineer - iOS | Apple`

**Post Content**:
```
🍎 Senior Software Engineer - iOS

🏢 Company: Apple
📍 Location: Cupertino, CA
⏰ Posted: 2 days ago

🏷️ Tags: #Senior #iOS #Mobile #FAANG

📋 Description: Join Apple's iOS team to build the next generation of mobile
experiences. Work with cutting-edge technologies and collaborate with world-class
engineers to deliver products used by millions...

[🚀 Apply Now]
```

## Testing

Run the test script to validate functionality:

```bash
node .github/scripts/test-bot-features.js
```

## Troubleshooting

1. **Bot not posting**: Check DISCORD_TOKEN and channel IDs are correct
2. **"Channel not found"**: Verify channel IDs and bot has access to channels
3. **"Cannot create thread"**: Ensure channels are forum channels and bot has thread permissions
4. **Jobs in wrong channel**: Review job title/description and adjust categorization keywords
5. **"Invalid Date"**: Should be fixed, but check job_posted_at_datetime_utc format
6. **Slash commands not working**: Verify CLIENT_ID and GUILD_ID
7. **Rate limiting**: Adjust delays between posts if getting 429 errors

## Future Enhancements

- Add more granular filtering options
- Implement salary range filtering  
- Add company-specific subscription channels
- Create job application tracking
- Add analytics dashboard