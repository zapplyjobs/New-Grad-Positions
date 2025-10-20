const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = 'zapplyjobs';
const repo = 'New-Grad-Jobs';

async function testWorkflowStats() {
  try {
    // Get workflow runs from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log('Fetching workflow runs since:', oneDayAgo);

    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 50,
      created: `>=${oneDayAgo}`
    });

    console.log('\n=== WORKFLOW RUNS (Last 24 Hours) ===');
    console.log(`Total runs: ${runs.total_count}`);
    console.log(`\nRuns returned: ${runs.workflow_runs.length}\n`);

    // Group by workflow name
    const byWorkflow = {};

    for (const run of runs.workflow_runs) {
      const name = run.name;

      if (!byWorkflow[name]) {
        byWorkflow[name] = {
          runs: 0,
          failures: 0,
          successes: 0,
          cancelled: 0,
          totalDuration: 0
        };
      }

      byWorkflow[name].runs++;

      if (run.conclusion === 'success') byWorkflow[name].successes++;
      if (run.conclusion === 'failure') byWorkflow[name].failures++;
      if (run.conclusion === 'cancelled') byWorkflow[name].cancelled++;

      // Calculate duration in seconds
      const start = new Date(run.created_at);
      const end = new Date(run.updated_at);
      const duration = (end - start) / 1000;
      byWorkflow[name].totalDuration += duration;

      console.log(`${run.name.padEnd(35)} | Status: ${run.status.padEnd(12)} | Conclusion: ${(run.conclusion || 'N/A').padEnd(10)} | Duration: ${Math.round(duration)}s`);
    }

    console.log('\n=== SUMMARY BY WORKFLOW ===\n');

    for (const [name, stats] of Object.entries(byWorkflow)) {
      const avgDuration = Math.round(stats.totalDuration / stats.runs);
      const failureRate = stats.runs > 0 ? ((stats.failures / stats.runs) * 100).toFixed(1) : 0;

      console.log(`${name}:`);
      console.log(`  Runs: ${stats.runs} | Successes: ${stats.successes} | Failures: ${stats.failures} | Cancelled: ${stats.cancelled}`);
      console.log(`  Avg Duration: ${avgDuration}s | Failure Rate: ${failureRate}%\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWorkflowStats();
