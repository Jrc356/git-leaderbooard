const GITHUB_API_BASE = 'https://api.github.com';

// Cache configuration
const CACHE_PREFIX = 'github_leaderboard_cache_';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Gets cached data if valid
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/missing
 */
function getFromCache(key) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Saves data to cache with quota management
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function saveToCache(key, data) {
  try {
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now()
    });
    
    // Check if this single item is too large (> 500KB)
    if (serialized.length > 500 * 1024) {
      console.warn(`Cache item too large for ${key}, skipping`);
      return;
    }
    
    // Try to save, if quota exceeded, clear old entries and retry
    try {
      localStorage.setItem(CACHE_PREFIX + key, serialized);
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        // Clear old cache and try again
        clearOldCache();
        try {
          localStorage.setItem(CACHE_PREFIX + key, serialized);
        } catch {
          // Still failing, clear all our cache
          clearCache();
          // Don't retry again to avoid infinite loop
          console.warn('Cache quota exceeded, cache cleared');
        }
      }
    }
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
}

/**
 * Clears old cache entries
 */
function clearOldCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(key));
        if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Clears all cached GitHub data
 */
export function clearCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

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
  // Check cache first
  const cacheKey = `repos_${org}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

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

  // Save repo data to cache (include fields we need for sorting/filtering)
  const reposWithMetadata = repos.map(repo => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    stargazers_count: repo.stargazers_count,
    fork: repo.fork,
    language: repo.language,
    default_branch: repo.default_branch,
    size: repo.size,
  }));
  saveToCache(cacheKey, reposWithMetadata);
  
  return reposWithMetadata;
}

/**
 * Fetches contributor statistics for a repository
 * Uses the stats/contributors endpoint first, falls back to commits API if needed
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization/owner name
 * @param {string} repoName - Repository name
 * @param {number} retries - Number of retries (default 3)
 * @returns {Promise<Array>} Array of contributor stats
 */
export async function fetchStats(token, org, repoName, retries = 3) {
  // Check cache first
  const cacheKey = `stats_v2_${org}_${repoName}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = getHeaders(token);

  // Try the stats/contributors endpoint first
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${org}/${repoName}/stats/contributors`,
    { headers }
  );

  if (response.status === 202) {
    // Stats are being computed, wait and retry
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return fetchStats(token, org, repoName, retries - 1);
    }
    // Fall back to commits API if stats not ready
    return fetchCommitsAsStats(token, org, repoName);
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
    // Fall back to commits API on error
    return fetchCommitsAsStats(token, org, repoName);
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    // No stats returned, try commits API
    return fetchCommitsAsStats(token, org, repoName);
  }
  
  // Store minimal stats data to avoid cache size issues
  const minimalStats = data.map(contributor => ({
    author: {
      login: contributor.author?.login,
      avatar_url: contributor.author?.avatar_url,
    },
    total: contributor.total,
    weeks: (contributor.weeks || []).slice(-52).map(w => ({
      w: w.w,
      a: w.a || 0,
      d: w.d || 0,
      c: w.c || 0,
    })).filter(w => w.a > 0 || w.d > 0 || w.c > 0),
  })).filter(c => c.author?.login);
  
  saveToCache(cacheKey, minimalStats);
  return minimalStats;
}

/**
 * Fetches commits and converts them to a stats-like format
 * This is a fallback when /stats/contributors doesn't work
 * Also fetches individual commit stats for line counts
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization/owner name
 * @param {string} repoName - Repository name
 * @returns {Promise<Array>} Array of contributor stats
 */
async function fetchCommitsAsStats(token, org, repoName) {
  const cacheKey = `commits_stats_v2_${org}_${repoName}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = getHeaders(token);
  const commits = [];
  let page = 1;
  const maxPages = 3; // Limit to 300 most recent commits

  // Get commits from the last year
  const sinceDate = new Date();
  sinceDate.setFullYear(sinceDate.getFullYear() - 1);
  const since = sinceDate.toISOString();

  while (page <= maxPages) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${org}/${repoName}/commits?per_page=100&page=${page}&since=${since}`,
        { headers }
      );

      if (!response.ok) break;

      const data = await response.json();
      if (data.length === 0) break;

      commits.push(...data);
      if (data.length < 100) break;
      page++;
    } catch {
      break;
    }
  }

  // Fetch individual commit stats for line counts (limit to first 50 to avoid rate limits)
  const commitsToFetch = commits.slice(0, 50);
  const commitStats = {};
  
  for (const commit of commitsToFetch) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${org}/${repoName}/commits/${commit.sha}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.stats) {
          commitStats[commit.sha] = {
            additions: data.stats.additions || 0,
            deletions: data.stats.deletions || 0,
          };
        }
      }
    } catch {
      // Skip on error
    }
  }

  // Aggregate commits by author and week
  const authorMap = {};
  
  commits.forEach(commit => {
    const author = commit.author;
    if (!author?.login) return;
    
    const login = author.login;
    const avatarUrl = author.avatar_url;
    const commitDate = new Date(commit.commit?.author?.date || commit.commit?.committer?.date);
    
    // Round to start of week (Sunday)
    const weekStart = new Date(commitDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekTs = Math.floor(weekStart.getTime() / 1000);
    
    if (!authorMap[login]) {
      authorMap[login] = {
        author: { login, avatar_url: avatarUrl },
        total: 0,
        weeks: {},
      };
    }
    
    if (!authorMap[login].weeks[weekTs]) {
      authorMap[login].weeks[weekTs] = { c: 0, a: 0, d: 0 };
    }
    
    authorMap[login].total += 1;
    authorMap[login].weeks[weekTs].c += 1;
    
    // Add stats if we have them
    const stats = commitStats[commit.sha];
    if (stats) {
      authorMap[login].weeks[weekTs].a += stats.additions;
      authorMap[login].weeks[weekTs].d += stats.deletions;
    }
  });

  // Convert to stats format
  const stats = Object.values(authorMap).map(data => ({
    author: data.author,
    total: data.total,
    weeks: Object.entries(data.weeks)
      .map(([w, weekData]) => ({
        w: parseInt(w),
        a: weekData.a,
        d: weekData.d,
        c: weekData.c,
      }))
      .filter(w => w.a > 0 || w.d > 0 || w.c > 0)
      .sort((a, b) => a.w - b.w),
  }));

  saveToCache(cacheKey, stats);
  return stats;
}

/**
 * Fetches commits from the default branch of a repository
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization name
 * @param {string} repoName - Repository name
 * @param {string} defaultBranch - Default branch name (e.g., 'main', 'master')
 * @param {string|null} sinceDate - ISO date string to filter commits
 * @returns {Promise<Array>} Array of commit objects with URLs
 */
export async function fetchCommits(token, org, repoName, defaultBranch, sinceDate = null) {
  const cacheKey = sinceDate
    ? `commits_v4_${org}_${repoName}_${defaultBranch}_since_${sinceDate.slice(0, 10)}`
    : `commits_v4_${org}_${repoName}_${defaultBranch}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = getHeaders(token);
  const commits = [];
  let page = 1;
  // For "All Time" (no sinceDate), fetch all pages; otherwise limit to 10 pages
  const maxPages = sinceDate ? 10 : Infinity;

  while (page <= maxPages) {
    let url = `${GITHUB_API_BASE}/repos/${org}/${repoName}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=100&page=${page}`;
    if (sinceDate) {
      url += `&since=${sinceDate}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn(`Failed to fetch commits for ${repoName}: ${response.status}`);
      break;
    }

    const data = await response.json();
    if (data.length === 0) break;

    data.forEach(commit => {
      if (commit.author?.login) {
        commits.push({
          sha: commit.sha,
          user: commit.author.login,
          avatar_url: commit.author.avatar_url,
          message: commit.commit?.message?.split('\n')[0] || 'No message',
          date: commit.commit?.author?.date || commit.commit?.committer?.date,
          url: commit.html_url,
        });
      }
    });

    if (data.length < 100) break;
    page++;
  }

  saveToCache(cacheKey, commits);
  return commits;
}

/**
 * Fetches pull requests for a repository with pagination
 * Includes additions/deletions/commits data from individual PR details
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization name
 * @param {string} repoName - Repository name
 * @param {string|null} sinceDate - ISO date string to filter PRs (only fetch PRs updated after this date)
 * @returns {Promise<Array>} Array of PR objects with stats
 */
export async function fetchPullRequests(token, org, repoName, sinceDate = null) {
  // Include sinceDate in cache key so different time ranges are cached separately
  const cacheKey = sinceDate 
    ? `prs_v3_${org}_${repoName}_since_${sinceDate.slice(0, 10)}`
    : `prs_v3_${org}_${repoName}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = getHeaders(token);
  const prs = [];
  let page = 1;
  // For "All Time" (no sinceDate), fetch all pages; otherwise limit to 10 pages
  const maxPages = sinceDate ? 10 : Infinity;

  while (page <= maxPages) {
    let url = `${GITHUB_API_BASE}/repos/${org}/${repoName}/pulls?state=all&per_page=100&page=${page}&sort=updated&direction=desc`;
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn(`Failed to fetch PRs for ${repoName}: ${response.status}`);
      break;
    }

    const data = await response.json();
    
    // Filter by date
    let filteredPRs = data;
    if (sinceDate) {
      const sinceTimestamp = new Date(sinceDate).getTime();
      filteredPRs = data.filter(pr => {
        const prDate = new Date(pr.merged_at || pr.closed_at || pr.updated_at).getTime();
        return prDate >= sinceTimestamp;
      });
      
      if (data.length > 0 && filteredPRs.length === 0) {
        break;
      }
    }
    
    // Store basic info for now
    filteredPRs.forEach(pr => {
      prs.push({
        number: pr.number,
        user: pr.user?.login,
        avatar_url: pr.user?.avatar_url,
        created_at: pr.created_at,
        merged_at: pr.merged_at,
        state: pr.state,
        title: pr.title,
        url: pr.html_url,
      });
    });

    if (data.length < 100) break;
    page++;
  }

  // Now fetch details for merged PRs to get additions/deletions/commits
  // Limit to 30 PRs to avoid rate limits
  const mergedPRs = prs.filter(pr => pr.merged_at).slice(0, 30);
  
  for (const pr of mergedPRs) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${org}/${repoName}/pulls/${pr.number}`,
        { headers }
      );
      
      if (response.ok) {
        const details = await response.json();
        pr.additions = details.additions || 0;
        pr.deletions = details.deletions || 0;
        pr.commits = details.commits || 0;
        pr.changed_files = details.changed_files || 0;
      }
    } catch {
      // Skip on error
    }
  }

  saveToCache(cacheKey, prs);
  return prs;
}

/**
 * Fetches reviews for pull requests in a repository
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization name
 * @param {string} repoName - Repository name
 * @param {Array} pullRequests - Array of PR objects (already filtered by date)
 * @param {string|null} sinceDate - ISO date string (used for cache key)
 * @returns {Promise<Object>} Map of user -> { count, submitted_at[] }
 */
export async function fetchReviews(token, org, repoName, pullRequests, sinceDate = null) {
  const cacheKey = sinceDate
    ? `reviews_${org}_${repoName}_since_${sinceDate.slice(0, 10)}`
    : `reviews_${org}_${repoName}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = getHeaders(token);
  const reviewData = {};

  // Only check PRs that are already filtered by date (max 50 to limit API calls)
  const prsToCheck = pullRequests.slice(0, 50);

  for (const pr of prsToCheck) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${org}/${repoName}/pulls/${pr.number}/reviews`,
        { headers }
      );

      if (!response.ok) continue;

      const reviews = await response.json();
      reviews.forEach(review => {
        if (review.user?.login) {
          const user = review.user.login;
          if (!reviewData[user]) {
            reviewData[user] = { count: 0, submitted_at: [], prs: [] };
          }
          reviewData[user].count += 1;
          if (review.submitted_at) {
            reviewData[user].submitted_at.push(review.submitted_at);
          }
          // Store PR info for linking
          const prInfo = { number: pr.number, title: pr.title || `PR #${pr.number}`, url: pr.url };
          if (!reviewData[user].prs.find(p => p.number === pr.number)) {
            reviewData[user].prs.push(prInfo);
          }
        }
      });
    } catch (e) {
      console.warn(`Error fetching reviews for PR #${pr.number}:`, e);
    }
  }

  saveToCache(cacheKey, reviewData);
  return reviewData;
}

/**
 * Aggregates contributor statistics across multiple repositories
 * @param {Array<Object>} repoDataArray - Array of { stats, prs, reviews } for each repo
 * @param {number|null} daysFilter - Number of days to filter by (null for all time)
 * @returns {Array} Aggregated stats sorted by net lines
 */
export function aggregateStats(repoDataArray, daysFilter = null) {
  const userMap = {};
  
  // Calculate cutoff timestamp if filtering by days
  const cutoffTimestamp = daysFilter
    ? Math.floor((Date.now() - daysFilter * 24 * 60 * 60 * 1000) / 1000)
    : 0;

  repoDataArray.forEach(({ prs, reviews, commits, repoName }) => {
    // Process commits from default branch
    if (Array.isArray(commits)) {
      commits.forEach((commit) => {
        if (!commit.user) return;
        
        // Filter by time range
        if (daysFilter && commit.date) {
          const commitTimestamp = Math.floor(new Date(commit.date).getTime() / 1000);
          if (commitTimestamp < cutoffTimestamp) return;
        }
        
        const user = commit.user;
        
        if (!userMap[user]) {
          userMap[user] = {
            user,
            avatarUrl: commit.avatar_url,
            additions: 0,
            deletions: 0,
            commits: 0,
            pullRequests: 0,
            reviews: 0,
            reposContributed: new Set(),
            weeklyData: {},
            prsList: [], // PRs created by user
            reviewsList: [], // PRs reviewed by user
            commitsList: [], // Commits by user
          };
        }
        
        userMap[user].commits += 1;
        userMap[user].reposContributed.add(repoName);
        
        // Add commit to list (limit to 20 most recent)
        if (userMap[user].commitsList.length < 20) {
          userMap[user].commitsList.push({
            sha: commit.sha.slice(0, 7),
            message: commit.message,
            url: commit.url,
            date: commit.date,
            repo: repoName,
          });
        }
        
        // Track commit in weekly data
        const commitDate = new Date(commit.date);
        const weekStart = new Date(commitDate);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekTs = Math.floor(weekStart.getTime() / 1000);
        
        if (!userMap[user].weeklyData[weekTs]) {
          userMap[user].weeklyData[weekTs] = { additions: 0, deletions: 0, commits: 0, pullRequests: 0, reviews: 0 };
        }
        userMap[user].weeklyData[weekTs].commits += 1;
      });
    }

    // Process pull requests - now includes additions/deletions from merged PRs
    if (Array.isArray(prs)) {
      prs.forEach((pr) => {
        if (!pr.user) return;
        
        // Filter PRs by time range using merged_at for merged PRs, created_at otherwise
        const prDate = pr.merged_at || pr.created_at;
        if (daysFilter && prDate) {
          const prTimestamp = Math.floor(new Date(prDate).getTime() / 1000);
          if (prTimestamp < cutoffTimestamp) return;
        }
        
        const user = pr.user;
        
        if (!userMap[user]) {
          userMap[user] = {
            user,
            avatarUrl: pr.avatar_url,
            additions: 0,
            deletions: 0,
            commits: 0,
            pullRequests: 0,
            reviews: 0,
            reposContributed: new Set(),
            weeklyData: {},
            prsList: [],
            reviewsList: [],
            commitsList: [],
          };
        }
        
        userMap[user].pullRequests += 1;
        userMap[user].reposContributed.add(repoName);
        
        // Add PR to list (limit to 20 most recent)
        if (userMap[user].prsList.length < 20) {
          userMap[user].prsList.push({
            number: pr.number,
            title: pr.title || `PR #${pr.number}`,
            url: pr.url,
            state: pr.state,
            merged: !!pr.merged_at,
            date: pr.merged_at || pr.created_at,
            repo: repoName,
          });
        }
        
        // Add line stats from merged PRs
        if (pr.merged_at && pr.additions !== undefined) {
          userMap[user].additions += pr.additions || 0;
          userMap[user].deletions += pr.deletions || 0;
        }

        // Track PR in weekly data
        const weekDate = new Date(pr.merged_at || pr.created_at);
        const weekStart = new Date(weekDate);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekTs = Math.floor(weekStart.getTime() / 1000);
        
        if (!userMap[user].weeklyData[weekTs]) {
          userMap[user].weeklyData[weekTs] = { additions: 0, deletions: 0, commits: 0, pullRequests: 0, reviews: 0 };
        }
        userMap[user].weeklyData[weekTs].pullRequests += 1;
        
        // Add line stats to weekly data for merged PRs
        if (pr.merged_at && pr.additions !== undefined) {
          userMap[user].weeklyData[weekTs].additions += pr.additions || 0;
          userMap[user].weeklyData[weekTs].deletions += pr.deletions || 0;
        }
      });
    }

    // Process reviews (now with timestamps for filtering)
    if (reviews && typeof reviews === 'object') {
      Object.entries(reviews).forEach(([user, reviewInfo]) => {
        // Handle both old format (just count) and new format (count + submitted_at[] + prs[])
        const count = typeof reviewInfo === 'number' ? reviewInfo : reviewInfo.count;
        const submittedDates = typeof reviewInfo === 'object' ? reviewInfo.submitted_at : [];
        const reviewedPRs = typeof reviewInfo === 'object' ? reviewInfo.prs : [];
        
        if (!userMap[user]) {
          userMap[user] = {
            user,
            avatarUrl: null,
            additions: 0,
            deletions: 0,
            commits: 0,
            pullRequests: 0,
            reviews: 0,
            reposContributed: new Set(),
            weeklyData: {},
            prsList: [],
            reviewsList: [],
            commitsList: [],
          };
        }
        
        // Add reviewed PRs to list
        if (Array.isArray(reviewedPRs)) {
          reviewedPRs.forEach(prInfo => {
            if (userMap[user].reviewsList.length < 20 && 
                !userMap[user].reviewsList.find(p => p.number === prInfo.number && p.repo === repoName)) {
              userMap[user].reviewsList.push({
                ...prInfo,
                repo: repoName,
              });
            }
          });
        }
        
        // If we have timestamps, filter and count; otherwise use the count directly
        if (submittedDates && submittedDates.length > 0) {
          const cutoffMs = daysFilter ? Date.now() - daysFilter * 24 * 60 * 60 * 1000 : 0;
          
          submittedDates.forEach(date => {
            const dateMs = new Date(date).getTime();
            // Skip if before cutoff (when filtering)
            if (daysFilter && dateMs < cutoffMs) return;
            
            userMap[user].reviews += 1;
            
            // Track reviews in weekly data
            const reviewDate = new Date(date);
            const weekStart = new Date(reviewDate);
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekTs = Math.floor(weekStart.getTime() / 1000);
            
            if (!userMap[user].weeklyData[weekTs]) {
              userMap[user].weeklyData[weekTs] = { additions: 0, deletions: 0, commits: 0, pullRequests: 0, reviews: 0 };
            }
            userMap[user].weeklyData[weekTs].reviews += 1;
          });
        } else {
          // No timestamps available, just add the count (won't show in graph)
          userMap[user].reviews += count;
        }
        
        if (userMap[user].reviews > 0) {
          userMap[user].reposContributed.add(repoName);
        }
      });
    }
  });

  // Convert to array and calculate derived fields
  // Filter out users with no activity in the time range
  return Object.values(userMap)
    .filter((stats) => {
      // Keep users who have any activity
      return stats.additions > 0 || stats.deletions > 0 || stats.commits > 0 || 
             stats.pullRequests > 0 || stats.reviews > 0;
    })
    .map((stats) => {
      // Convert weeklyData to sorted array
      let weeklyArray = Object.entries(stats.weeklyData)
        .map(([timestamp, data]) => ({
          week: parseInt(timestamp),
          ...data,
        }))
        .sort((a, b) => a.week - b.week);
      
      // Determine the time range for the graph
      const maxWeeks = daysFilter ? Math.ceil(daysFilter / 7) : 52;
      
      // Get the current week's Sunday at midnight (consistent with how we store weeks)
      const now = new Date();
      const endWeekStart = new Date(now);
      endWeekStart.setHours(0, 0, 0, 0);
      endWeekStart.setDate(endWeekStart.getDate() - endWeekStart.getDay());
      const endTs = Math.floor(endWeekStart.getTime() / 1000);
      
      // Calculate start timestamp
      const startTs = endTs - ((maxWeeks - 1) * 7 * 24 * 60 * 60);
      
      // Create a map of existing weeks, normalized to the nearest week boundary
      const weekMap = {};
      weeklyArray.forEach(w => {
        // Normalize timestamp to week boundary for matching
        const weekDate = new Date(w.week * 1000);
        weekDate.setHours(0, 0, 0, 0);
        weekDate.setDate(weekDate.getDate() - weekDate.getDay());
        const normalizedTs = Math.floor(weekDate.getTime() / 1000);
        
        if (!weekMap[normalizedTs]) {
          weekMap[normalizedTs] = { ...w, week: normalizedTs };
        } else {
          // Merge if there's already data for this week
          weekMap[normalizedTs].commits += w.commits;
          weekMap[normalizedTs].pullRequests += w.pullRequests;
          weekMap[normalizedTs].reviews += w.reviews;
          weekMap[normalizedTs].additions += w.additions;
          weekMap[normalizedTs].deletions += w.deletions;
        }
      });
      
      // Fill in all weeks in the range using the same week boundary calculation
      const filledArray = [];
      for (let i = 0; i < maxWeeks; i++) {
        const ts = startTs + (i * 7 * 24 * 60 * 60);
        if (weekMap[ts]) {
          filledArray.push(weekMap[ts]);
        } else {
          filledArray.push({
            week: ts,
            additions: 0,
            deletions: 0,
            commits: 0,
            pullRequests: 0,
            reviews: 0,
          });
        }
      }
      weeklyArray = filledArray;

      return {
        user: stats.user,
        avatarUrl: stats.avatarUrl,
        additions: stats.additions,
        deletions: stats.deletions,
        net: stats.additions - stats.deletions,
        commits: stats.commits,
        pullRequests: stats.pullRequests,
        reviews: stats.reviews,
        reposCount: stats.reposContributed.size,
        weeklyData: weeklyArray,
        prsList: stats.prsList.sort((a, b) => new Date(b.date) - new Date(a.date)),
        reviewsList: stats.reviewsList,
        commitsList: stats.commitsList.sort((a, b) => new Date(b.date) - new Date(a.date)),
      };
    });
}

/**
 * Fetches stats for multiple repos with progress callback
 * @param {string} token - GitHub PAT
 * @param {string} org - Organization name
 * @param {Array} repos - Array of repo objects
 * @param {Function} onProgress - Callback with progress (0-100)
 * @param {number|null} daysFilter - Number of days to filter by (null for all time)
 * @param {Function} onDataUpdate - Callback with aggregated data after each repo (for progressive updates)
 * @param {Function} onLog - Callback for logging progress messages
 * @returns {Promise<Array>} Aggregated leaderboard data
 */
export async function fetchAllStats(token, org, repos, onProgress, daysFilter = null, onDataUpdate = null, onLog = null) {
  const repoDataArray = [];
  const total = repos.length;
  
  // Calculate since date for API calls
  const sinceDate = daysFilter
    ? new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000).toISOString()
    : null;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const repoName = repo.name;
    
    if (onLog) {
      onLog({ type: 'start', repo: repoName, index: i + 1, total });
    }
    
    try {
      // Fetch commits from default branch
      const defaultBranch = repo.default_branch || 'main';
      const commits = await fetchCommits(token, org, repoName, defaultBranch, sinceDate);
      
      // Fetch PRs with stats (additions/deletions for merged PRs)
      const prs = await fetchPullRequests(token, org, repoName, sinceDate);
      
      // Fetch reviews only for PRs within time range
      const reviews = await fetchReviews(token, org, repoName, prs, sinceDate);

      const hasPRs = Array.isArray(prs) && prs.length > 0;
      const mergedPRs = prs.filter(pr => pr.merged_at);
      
      // Calculate totals from merged PRs for logging
      let totalAdditions = 0;
      let totalDeletions = 0;
      mergedPRs.forEach(pr => {
        totalAdditions += pr.additions || 0;
        totalDeletions += pr.deletions || 0;
      });
      
      repoDataArray.push({
        repoName,
        commits,
        prs,
        reviews,
      });
      
      if (onLog) {
        onLog({ 
          type: 'complete', 
          repo: repoName, 
          index: i + 1, 
          total,
          hasStats: commits.length > 0 || mergedPRs.length > 0,
          hasPRs,
          prCount: prs.length,
          mergedPRCount: mergedPRs.length,
          totalCommits: commits.length,
          totalAdditions,
          totalDeletions,
        });
      }
    } catch (error) {
      if (onLog) {
        onLog({ type: 'error', repo: repoName, index: i + 1, total, error: error.message });
      }
      repoDataArray.push({
        repoName,
        commits: [],
        prs: [],
        reviews: {},
      });
    }

    const currentProgress = Math.round(((i + 1) / total) * 100);
    
    if (onProgress) {
      onProgress(currentProgress);
    }
    
    // Progressively update the leaderboard after each repo
    if (onDataUpdate) {
      const currentAggregated = aggregateStats(repoDataArray, daysFilter);
      onDataUpdate(currentAggregated, i + 1, total);
    }
  }

  return aggregateStats(repoDataArray, daysFilter);
}
