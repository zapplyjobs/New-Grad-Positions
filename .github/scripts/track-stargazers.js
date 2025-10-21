const { Octokit } = require('@octokit/rest');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.REPO_OWNER || 'zapplyjobs';
const REPO = process.env.REPO_NAME || 'New-Grad-Jobs';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DATA_FILE = path.join(__dirname, '../data/stargazers.json');
const MAX_DISCORD_LENGTH = 1900;

/**
 * Fetch all stargazers with timestamps using pagination
 * Uses the special media type to get starred_at timestamp
 */
async function fetchAllStargazers() {
  const stargazers = [];
  let page = 1;
  const perPage = 100;

  console.log('📥 Fetching stargazers with timestamps...');

  while (true) {
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}/stargazers', {
        owner: OWNER,
        repo: REPO,
        per_page: perPage,
        page: page,
        headers: {
          'Accept': 'application/vnd.github.star+json', // Special media type for starred_at
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (response.data.length === 0) break;

      // Extract user info and starred_at timestamp
      for (const item of response.data) {
        stargazers.push({
          login: item.user.login,
          id: item.user.id,
          avatar_url: item.user.avatar_url,
          html_url: item.user.html_url,
          starred_at: item.starred_at
        });
      }

      console.log(`  Page ${page}: Fetched ${response.data.length} stargazers`);

      // Check if there are more pages
      if (response.data.length < perPage) break;
      page++;

      // Rate limit protection: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching stargazers page ${page}:`, error.message);
      break;
    }
  }

  console.log(`✅ Total stargazers fetched: ${stargazers.length}`);
  return stargazers;
}

/**
 * Load previous stargazer data from JSON file
 */
async function loadPreviousData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No previous stargazer data found, starting fresh');
    return { stargazers: [], last_updated: null };
  }
}

/**
 * Save current stargazer data to JSON file
 */
async function saveStargazerData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('💾 Stargazer data saved successfully');
}

/**
 * Compare current and previous stargazers to find new ones
 */
function findNewStargazers(current, previous) {
  const previousIds = new Set(previous.map(s => s.id));
  return current.filter(s => !previousIds.has(s.id));
}

/**
 * Compare current and previous stargazers to find removed stars (unstarred)
 */
function findRemovedStargazers(current, previous) {
  const currentIds = new Set(current.map(s => s.id));
  return previous.filter(s => !currentIds.has(s.id));
}

/**
 * Format Discord message for stargazer updates
 */
function formatDiscordMessage(newStars, removedStars, totalStars, previousTotal) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  let message = `⭐ **Stargazer Update - ${today}**\n\n`;

  // Total stars summary
  const change = totalStars - previousTotal;
  message += `**Total Stars:** ${totalStars.toLocaleString()}`;
  if (change > 0) {
    message += ` (+${change} net today)`;
  } else if (change < 0) {
    message += ` (${change} net today)`;
  } else {
    message += ` (no change)`;
  }
  message += '\n\n';

  // New stargazers
  if (newStars.length > 0) {
    message += `🌟 **${newStars.length} New Stargazer${newStars.length > 1 ? 's' : ''}**\n`;
    message += '```\n';

    const displayLimit = Math.min(newStars.length, 10);
    for (let i = 0; i < displayLimit; i++) {
      const star = newStars[i];
      const starredDate = new Date(star.starred_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      message += `${star.login.padEnd(30)} ${starredDate}\n`;
    }

    if (newStars.length > displayLimit) {
      message += `... and ${newStars.length - displayLimit} more\n`;
    }
    message += '```\n';

    // Add profile links for new stargazers (max 5)
    const linkLimit = Math.min(newStars.length, 5);
    for (let i = 0; i < linkLimit; i++) {
      message += `<${newStars[i].html_url}>\n`;
    }
    message += '\n';
  }

  // Removed stargazers
  if (removedStars.length > 0) {
    message += `💔 **${removedStars.length} Unstarred**\n`;
    message += '```\n';

    const displayLimit = Math.min(removedStars.length, 5);
    for (let i = 0; i < displayLimit; i++) {
      message += `${removedStars[i].login}\n`;
    }

    if (removedStars.length > displayLimit) {
      message += `... and ${removedStars.length - displayLimit} more\n`;
    }
    message += '```\n\n';
  }

  // No changes
  if (newStars.length === 0 && removedStars.length === 0) {
    message += `ℹ️ No stargazer changes detected today.\n\n`;
  }

  // Truncate if too long
  if (message.length > MAX_DISCORD_LENGTH) {
    console.warn(`Message too long (${message.length} chars), truncating...`);
    message = message.substring(0, MAX_DISCORD_LENGTH - 50) + '\n...\n*(Message truncated)*';
  }

  return message;
}

/**
 * Post message to Discord webhook
 */
async function postToDiscord(message) {
  if (!WEBHOOK_URL) {
    console.log('⚠️  No Discord webhook URL configured, skipping Discord notification');
    console.log('Message preview:\n', message);
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'GitHub Stargazer Bot'
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to post to Discord:', error.message);
    throw error;
  }
}

/**
 * Generate summary report for console/logs
 */
function generateSummaryReport(newStars, removedStars, totalStars, previousTotal) {
  console.log('\n' + '='.repeat(60));
  console.log('STARGAZER TRACKING SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Stars: ${totalStars} (Previous: ${previousTotal})`);
  console.log(`Net Change: ${totalStars - previousTotal >= 0 ? '+' : ''}${totalStars - previousTotal}`);
  console.log(`New Stars: ${newStars.length}`);
  console.log(`Removed Stars: ${removedStars.length}`);
  console.log('='.repeat(60));

  if (newStars.length > 0) {
    console.log('\n🌟 New Stargazers:');
    newStars.slice(0, 10).forEach(s => {
      console.log(`  - ${s.login} (${new Date(s.starred_at).toLocaleString()})`);
    });
    if (newStars.length > 10) {
      console.log(`  ... and ${newStars.length - 10} more`);
    }
  }

  if (removedStars.length > 0) {
    console.log('\n💔 Removed Stars:');
    removedStars.slice(0, 5).forEach(s => {
      console.log(`  - ${s.login}`);
    });
    if (removedStars.length > 5) {
      console.log(`  ... and ${removedStars.length - 5} more`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n🚀 Starting stargazer tracking for ${OWNER}/${REPO}\n`);

  // Fetch current stargazers
  const currentStargazers = await fetchAllStargazers();

  // Load previous data
  const previousData = await loadPreviousData();
  const previousStargazers = previousData.stargazers || [];
  const previousTotal = previousStargazers.length;

  // Find changes
  const newStars = findNewStargazers(currentStargazers, previousStargazers);
  const removedStars = findRemovedStargazers(currentStargazers, previousStargazers);

  // Generate summary
  generateSummaryReport(newStars, removedStars, currentStargazers.length, previousTotal);

  // Only post to Discord if there are changes
  if (newStars.length > 0 || removedStars.length > 0) {
    const message = formatDiscordMessage(
      newStars,
      removedStars,
      currentStargazers.length,
      previousTotal
    );
    await postToDiscord(message);
  } else {
    console.log('ℹ️  No stargazer changes detected, skipping Discord notification');
  }

  // Save current data for next run
  const dataToSave = {
    stargazers: currentStargazers,
    total_count: currentStargazers.length,
    last_updated: new Date().toISOString(),
    stats: {
      new_since_last_run: newStars.length,
      removed_since_last_run: removedStars.length,
      net_change: currentStargazers.length - previousTotal
    }
  };

  await saveStargazerData(dataToSave);

  console.log('✅ Stargazer tracking completed successfully!\n');
}

// Run main with error handling
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
