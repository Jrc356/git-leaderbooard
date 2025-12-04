import { useState, useEffect, useCallback, useRef } from "react";
import TokenInput from "./components/TokenInput";
import OrgInput from "./components/OrgInput";
import RepoSelector from "./components/RepoSelector";
import Leaderboard from "./components/Leaderboard";
import ProgressBar from "./components/ProgressBar";
import { fetchRepos, fetchAllStats, clearCache } from "./utils/github";

const TOKEN_STORAGE_KEY = "github_leaderboard_token";
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

const TIME_RANGES = [
  { value: "all", label: "All Time", days: null },
  { value: "1d", label: "Last 24 Hours", days: 1 },
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "180d", label: "Last 6 Months", days: 180 },
  { value: "365d", label: "Last Year", days: 365 },
];

function App() {
  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  });

  // Persist token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  const handleClearToken = () => {
    setToken("");
    clearCache();
  };

  const handleClearCache = () => {
    clearCache();
    setRepos([]);
    setSelectedRepos([]);
    setLeaderboard([]);
    setProgressLogs([]);
  };

  const [org, setOrg] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLogs, setProgressLogs] = useState([]);
  const [error, setError] = useState("");

  const handleFetchRepos = async () => {
    if (!token.trim()) {
      setError("Please enter a GitHub Personal Access Token");
      return;
    }
    if (!org.trim()) {
      setError("Please enter an organization name");
      return;
    }

    setLoading(true);
    setError("");
    setRepos([]);
    setSelectedRepos([]);
    setLeaderboard([]);

    try {
      const fetchedRepos = await fetchRepos(token, org);
      setRepos(fetchedRepos);
      // Auto-select non-fork repos by default
      const nonForks = fetchedRepos.filter((r) => !r.fork);
      setSelectedRepos(nonForks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLeaderboard = useCallback(
    async (isAutoRefresh = false) => {
      if (selectedRepos.length === 0) {
        if (!isAutoRefresh) {
          setError("Please select at least one repository");
        }
        return;
      }

      setLoadingStats(true);
      setError("");
      setProgress(0);
      setProgressLogs([]); // Always clear logs on refresh to start fresh
      // Don't clear the leaderboard - let it update progressively

      try {
        const selectedTimeRange = TIME_RANGES.find(
          (t) => t.value === timeRange
        );

        // Progressive update callback - updates leaderboard as each repo is processed
        const handleDataUpdate = (aggregatedData) => {
          setLeaderboard(aggregatedData);
        };

        // Log callback for progress tracking
        const handleLog = (logEntry) => {
          setProgressLogs((prev) => {
            // If this is a 'complete' or 'error' log, replace the 'start' log for same repo
            if (logEntry.type === "complete" || logEntry.type === "error") {
              const newLogs = prev.filter(
                (log) => !(log.repo === logEntry.repo && log.type === "start")
              );
              return [...newLogs, logEntry];
            }
            return [...prev, logEntry];
          });
        };

        await fetchAllStats(
          token,
          org,
          selectedRepos,
          setProgress,
          selectedTimeRange?.days,
          handleDataUpdate,
          handleLog
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingStats(false);
      }
    },
    [selectedRepos, token, org, timeRange]
  );

  // Auto-refresh every 10 minutes when leaderboard is shown
  const autoRefreshRef = useRef(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  useEffect(() => {
    // Only auto-refresh if we have data and auto-refresh is enabled
    if (leaderboard.length > 0 && autoRefreshEnabled && !loadingStats) {
      autoRefreshRef.current = setInterval(() => {
        // Clear cache before auto-refresh to get fresh data
        clearCache();
        handleGenerateLeaderboard(true);
        setLastRefresh(new Date());
      }, AUTO_REFRESH_INTERVAL);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [
    leaderboard.length,
    autoRefreshEnabled,
    loadingStats,
    handleGenerateLeaderboard,
  ]);

  // Track when manual refresh happens
  const handleManualRefresh = () => {
    clearCache();
    setLastRefresh(new Date());
    handleGenerateLeaderboard(false);
  };

  // Wrapper for generate that also tracks refresh time
  const handleGenerateClick = () => {
    setLastRefresh(new Date());
    handleGenerateLeaderboard(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Git Leaderboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track contributions across your GitHub organization
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Configuration section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>

          <TokenInput
            value={token}
            onChange={setToken}
            onClear={handleClearToken}
          />

          <OrgInput
            value={org}
            onChange={setOrg}
            onSubmit={handleFetchRepos}
            loading={loading}
          />

          {/* Time Range and Cache Controls */}
          <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-gray-200">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="timeRange"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Time Range
              </label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                {TIME_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Filter contributions by time period
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear Cache
            </button>
          </div>
        </section>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Repository selector */}
        {repos.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <RepoSelector
              repos={repos}
              selected={selectedRepos}
              onChange={setSelectedRepos}
              onSubmit={handleGenerateClick}
              loading={loadingStats}
            />
          </section>
        )}

        {/* Progress bar - keep visible after loading completes */}
        {(loadingStats || progressLogs.length > 0) && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <ProgressBar
              progress={progress}
              message={
                loadingStats
                  ? `Fetching stats from ${selectedRepos.length} repositories...`
                  : `Completed loading ${
                      progressLogs.filter((l) => l.type === "complete").length
                    } repositories`
              }
              logs={progressLogs}
              isComplete={!loadingStats}
            />
          </section>
        )}

        {/* Stats warning - show if many repos missing commit stats */}
        {!loadingStats &&
          progressLogs.length > 0 &&
          (() => {
            const completedLogs = progressLogs.filter(
              (l) => l.type === "complete"
            );
            const withStats = completedLogs.filter((l) => l.hasStats).length;
            const reposWithoutStats = completedLogs
              .filter((l) => !l.hasStats)
              .map((l) => l.repo);

            if (
              reposWithoutStats.length > 0 &&
              reposWithoutStats.length >= withStats
            ) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="font-medium text-yellow-800">
                      Limited Commit Statistics
                    </h3>
                    <p className="text-yellow-700 text-sm">
                      {reposWithoutStats.length} of {completedLogs.length} repos
                      returned no commit stats. GitHub computes stats on-demand
                      - try again in a few minutes for more complete data. PRs
                      and reviews are still shown.
                    </p>
                    <p className="text-yellow-600 text-xs mt-2">
                      <span className="font-medium">Affected repos: </span>
                      {reposWithoutStats.slice(0, 10).join(", ")}
                      {reposWithoutStats.length > 10 &&
                        ` and ${reposWithoutStats.length - 10} more`}
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

        {/* Leaderboard - show even while loading for progressive updates */}
        {leaderboard.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Refresh controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={loadingStats}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg
                    className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {loadingStats ? "Refreshing..." : "Refresh"}
                </button>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Auto-refresh every 10 minutes
                </label>
              </div>
              {lastRefresh && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
            {loadingStats && (
              <div className="mb-4 text-sm text-blue-600 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Updating leaderboard as data arrives...
              </div>
            )}
            <Leaderboard data={leaderboard} timeRange={timeRange} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>
            GitHub API rate limit: 5,000 requests/hour with authentication.
            <br />
            Your token is only used locally and never sent to any server other
            than GitHub.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
