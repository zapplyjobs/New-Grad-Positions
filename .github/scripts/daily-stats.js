const { Octokit } = require('@octokit/rest');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const ORG_NAME = process.env.ORG_NAME || 'zapplyjobs';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DATA_FILE = path.join(__dirname, '../data/daily-stats.json');
const MAX_DISCORD_LENGTH = 1900; // Safety buffer below 2000 char limit

async function fetchOrgRepos() {
  const { data } = await octokit.repos.listForOrg({
    org: ORG_NAME,
    type: 'public',
    per_page: 100,
    sort: 'updated'
  });
  return data;
}

async function loadPreviousData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveDailyData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function checkNewActivity(repo, previousData) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch new issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: ORG_NAME,
      repo: repo.name,
      since: oneDayAgo,
      state: 'all',
      per_page: 10
    });

    const newIssues = issues.filter(i => !i.pull_request && new Date(i.created_at) > new Date(oneDayAgo));
    const newPRs = issues.filter(i => i.pull_request && new Date(i.created_at) > new Date(oneDayAgo));

    // Fetch recent releases
    let newReleases = [];
    try {
      const { data: releases } = await octokit.repos.listReleases({
        owner: ORG_NAME,
        repo: repo.name,
        per_page: 5
      });
      newReleases = releases.filter(r => new Date(r.published_at) > new Date(oneDayAgo));
    } catch (error) {
      // Releases endpoint can fail if repo has no releases
      console.log(`No releases for ${repo.name}`);
    }

    return { newIssues, newPRs, newReleases };
  } catch (error) {
    console.error(`Error fetching activity for ${repo.name}:`, error.message);
    return { newIssues: [], newPRs: [], newReleases: [] };
  }
}

function formatStarChange(current, previous, isFirstRun) {
  if (isFirstRun) {
    return `${current.toLocaleString()}`;
  }
  if (!previous) return `${current.toLocaleString()}`;
  const change = current - previous;
  if (change === 0) return `${current.toLocaleString()} (=)`;
  if (change > 0) return `${current.toLocaleString()} (+${change})`;
  return `${current.toLocaleString()} (${change})`;
}

function formatDuration(seconds) {
  if (seconds < 0) return 'N/A';
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  return `~${Math.round(seconds / 3600)}h`;
}

async function fetchWorkflowStats(owner, repo, hoursAgo = 24) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 100,
      created: `>=${since}`
    });

    const byWorkflow = {};
    const failedRuns = [];
    const slowRuns = []; // Track runs >1 hour

    for (const run of runs.workflow_runs) {
      const name = run.name;
      if (!byWorkflow[name]) {
        byWorkflow[name] = { runs: 0, failures: 0, successes: 0, cancelled: 0, durations: [] };
      }

      byWorkflow[name].runs++;
      if (run.conclusion === 'success') byWorkflow[name].successes++;
      if (run.conclusion === 'failure') {
        byWorkflow[name].failures++;
        failedRuns.push({ name: run.name, url: run.html_url, created: run.created_at });
      }
      if (run.conclusion === 'cancelled') byWorkflow[name].cancelled++;

      const duration = (new Date(run.updated_at) - new Date(run.created_at)) / 1000;

      // Track slow runs (>1 hour)
      if (duration > 3600) {
        slowRuns.push({
          name: run.name,
          duration,
          url: run.html_url,
          created: run.created_at,
          repo
        });
      }

      // Exclude extreme outliers (>2 hours) from median calculation
      if (duration < 7200) {
        byWorkflow[name].durations.push(duration);
      }
    }

    // Calculate median duration for each workflow
    for (const workflow of Object.values(byWorkflow)) {
      if (workflow.durations.length > 0) {
        workflow.durations.sort((a, b) => a - b);
        const mid = Math.floor(workflow.durations.length / 2);
        workflow.medianDuration = workflow.durations.length % 2 === 0
          ? (workflow.durations[mid - 1] + workflow.durations[mid]) / 2
          : workflow.durations[mid];
      } else {
        // Safety: if all runs excluded, use a placeholder
        workflow.medianDuration = -1; // Will display as "N/A"
      }
    }

    return { byWorkflow, failedRuns, slowRuns };
  } catch (error) {
    console.error(`Error fetching workflow stats for ${repo}:`, error.message);
    return { byWorkflow: {}, failedRuns: [], slowRuns: [] };
  }
}

async function generateDailyMessage(repos, previousData) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const isFirstRun = Object.keys(previousData).length === 0;

  // Format: New-Grad-Jobs - Oct 20, 2025 - Daily
  const repoName = 'New-Grad-Jobs';
  let message = `📊 **${repoName} - ${today} - Daily**\n\n`;

  message += `⭐ **STARS**\n`;
  message += '```\n';

  let totalStars = 0;
  let totalChange = 0;
  const activities = [];

  // Sort repos by stars descending
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  // Process each repo with error handling
  for (const repo of repos) {
    try {
      const repoKey = repo.full_name;
      const prevStars = previousData[repoKey]?.stars;
      const change = prevStars ? (repo.stargazers_count - prevStars) : 0;

      totalStars += repo.stargazers_count;
      totalChange += change;

      // Ensure minimum 2 spaces between name and number
      const formattedName = repo.name.padEnd(41);
      const starInfo = formatStarChange(repo.stargazers_count, prevStars, isFirstRun);
      message += `${formattedName}${starInfo}\n`;

      // Check for new activity (skip on first run)
      if (!isFirstRun) {
        const activity = await checkNewActivity(repo, previousData);
        if (activity.newIssues.length || activity.newPRs.length || activity.newReleases.length) {
          activities.push({ repo: repo.name, ...activity });
        }
      }
    } catch (error) {
      console.error(`Failed to process ${repo.name}:`, error.message);
      // Continue with next repo instead of crashing
      continue;
    }
  }

  message += `\nTotal: ${totalStars.toLocaleString()} stars`;
  if (!isFirstRun) {
    if (totalChange > 0) {
      message += ` (+${totalChange} today)`;
    } else if (totalChange < 0) {
      message += ` (${totalChange} today)`;
    } else {
      message += ` (no change)`;
    }
  }
  message += '\n```\n';

  // Add workflow health section
  const { byWorkflow: workflows, failedRuns, slowRuns } = await fetchWorkflowStats(ORG_NAME, 'New-Grad-Jobs', 24);
  if (Object.keys(workflows).length > 0) {
    message += `\n🤖 **WORKFLOW HEALTH**\n\`\`\`\n`;

    for (const [name, stats] of Object.entries(workflows)) {
      const failRate = ((stats.failures / stats.runs) * 100).toFixed(1);
      const warn = parseFloat(failRate) > 25 ? ' ⚠️' : '';

      const nameCol = name.padEnd(35);
      const runsCol = `${stats.runs} runs`.padEnd(10);

      // Build status column - fixed format to handle emoji width
      const successPart = `${stats.successes}✅`.padEnd(6);
      const failPart = `${stats.failures}❌`.padEnd(6);
      const cancelPart = stats.cancelled > 0 ? `${stats.cancelled}⛔`.padEnd(5) : '';
      const statusCol = `${successPart} ${failPart} ${cancelPart}`;

      const durCol = formatDuration(stats.medianDuration).padEnd(7);
      const failCol = `${failRate}% fail${warn}`;

      message += `${nameCol}| ${runsCol}| ${statusCol}| ${durCol}| ${failCol}\n`;
    }

    message += '```\n';

    // Add slow run alerts (>1 hour)
    if (slowRuns.length > 0) {
      message += `\n🐢 **Slow Runs Alert** (>1 hour):\n`;
      slowRuns.slice(0, 3).forEach(run => {
        const date = new Date(run.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const durStr = formatDuration(run.duration);
        message += `• ${run.name} took ${durStr} (${date}): <${run.url}>\n`;
      });
    }

    // Add failed run links if any failures
    if (failedRuns.length > 0) {
      message += `\n⚠️ **Recent Failures** (last 3):\n`;
      failedRuns.slice(0, 3).forEach(run => {
        const date = new Date(run.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        message += `• ${run.name} (${date}): <${run.url}>\n`;
      });
    }
  }

  // Add new activity section if any
  if (activities.length > 0) {
    message += `\n🆕 **NEW ACTIVITY**\n`;

    const totalNewIssues = activities.reduce((sum, a) => sum + a.newIssues.length, 0);
    const totalNewPRs = activities.reduce((sum, a) => sum + a.newPRs.length, 0);
    const totalNewReleases = activities.reduce((sum, a) => sum + a.newReleases.length, 0);

    if (totalNewIssues > 0) message += `• ${totalNewIssues} new issue${totalNewIssues > 1 ? 's' : ''}\n`;
    if (totalNewPRs > 0) message += `• ${totalNewPRs} new PR${totalNewPRs > 1 ? 's' : ''}\n`;
    if (totalNewReleases > 0) {
      for (const act of activities) {
        for (const release of act.newReleases) {
          message += `• Release: ${act.repo} ${release.tag_name}\n`;
        }
      }
    }
  }

  // Check message length and truncate if needed
  if (message.length > MAX_DISCORD_LENGTH) {
    console.warn(`Message too long (${message.length} chars), truncating...`);
    message = message.substring(0, MAX_DISCORD_LENGTH - 50) + '\n...\n*(Message truncated)*';
  }

  return message;
}

async function postToDiscord(message) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'GitHub Stats Bot'
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to post to Discord:', error.message);
    throw error;
  }
}

async function main() {
  console.log('Fetching org repos...');
  const repos = await fetchOrgRepos();

  console.log('Loading previous data...');
  const previousData = await loadPreviousData();

  console.log('Generating daily message...');
  const message = await generateDailyMessage(repos, previousData);

  console.log('Posting to Discord...');
  await postToDiscord(message);

  // Save current data for tomorrow's comparison
  const currentData = {};
  for (const repo of repos) {
    currentData[repo.full_name] = {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      issues: repo.open_issues_count,
      updated: new Date().toISOString()
    };
  }

  console.log('Saving current data...');
  await saveDailyData(currentData);

  console.log('✅ Daily stats posted successfully!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
