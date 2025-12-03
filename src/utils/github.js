const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Creates headers for GitHub API requests
 * @param {string} token - GitHub Personal Access Token
 * @returns {Object} Headers object
 */
function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Fetches all repositories for an organization with pagination
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization name
 * @returns {Promise<Array>} Array of repository objects
 */
export async function fetchRepos(token, org) {
  const headers = getHeaders(token);
  const repos = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${GITHUB_API_BASE}/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid token. Please check your Personal Access Token.');
      }
      if (response.status === 404) {
        throw new Error(`Organization "${org}" not found.`);
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const resetDate = new Date(resetTime * 1000);
          throw new Error(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
        }
        throw new Error('Access forbidden. Check your token permissions.');
      }
      throw new Error(`Failed to fetch repos: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    repos.push(...data);

    // Check if there are more pages
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

/**
 * Fetches contributor statistics for a repository
 * Stats endpoint can return 202 if data is being computed, so we retry
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization/owner name
 * @param {string} repoName - Repository name
 * @param {number} retries - Number of retries (default 3)
 * @returns {Promise<Array>} Array of contributor stats
 */
export async function fetchStats(token, org, repoName, retries = 3) {
  const headers = getHeaders(token);

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${org}/${repoName}/stats/contributors`,
    { headers }
  );

  if (response.status === 202) {
    // Stats are being computed, wait and retry
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchStats(token, org, repoName, retries - 1);
    }
    // Return empty if still not ready after retries
    console.warn(`Stats not ready for ${repoName} after retries`);
    return [];
  }

  if (response.status === 204) {
    // No content - empty repo
    return [];
  }

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      if (rateLimitRemaining === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const resetDate = new Date(resetTime * 1000);
        throw new Error(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
      }
    }
    console.warn(`Failed to fetch stats for ${repoName}: ${response.status}`);
    return [];
  }

  return await response.json();
}

/**
 * Aggregates contributor statistics across multiple repositories
 * @param {Array<Array>} statsArray - Array of contributor stats arrays from multiple repos
 * @returns {Array} Aggregated stats sorted by net lines
 */
export function aggregateStats(statsArray) {
  const userMap = {};

  statsArray.forEach((repoStats) => {
    if (!Array.isArray(repoStats)) return;

    repoStats.forEach((contributor) => {
      if (!contributor?.author?.login) return;

      const user = contributor.author.login;
      const avatarUrl = contributor.author.avatar_url;

      if (!userMap[user]) {
        userMap[user] = {
          user,
          avatarUrl,
          additions: 0,
          deletions: 0,
          commits: 0,
          reposContributed: new Set(),
        };
      }

      contributor.weeks.forEach((week) => {
        userMap[user].additions += week.a || 0;
        userMap[user].deletions += week.d || 0;
        userMap[user].commits += week.c || 0;
      });

      // Track which repos this user contributed to
      userMap[user].reposContributed.add(contributor.author.login);
    });
  });

  // Convert to array and calculate net lines
  return Object.values(userMap).map((stats) => ({
    user: stats.user,
    avatarUrl: stats.avatarUrl,
    additions: stats.additions,
    deletions: stats.deletions,
    net: stats.additions - stats.deletions,
    commits: stats.commits,
    reposCount: stats.reposContributed.size,
  }));
}

/**
 * Fetches stats for multiple repos with progress callback
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization name
 * @param {Array} repos - Array of repo objects
 * @param {Function} onProgress - Callback with progress (0-100)
 * @returns {Promise<Array>} Aggregated leaderboard data
 */
export async function fetchAllStats(token, org, repos, onProgress) {
  const stats = [];
  const total = repos.length;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    try {
      const repoStats = await fetchStats(token, org, repo.name);
      stats.push(repoStats);
    } catch (error) {
      console.warn(`Error fetching stats for ${repo.name}:`, error.message);
      stats.push([]);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  return aggregateStats(stats);
}
