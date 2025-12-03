import { useState } from "react";
import TokenInput from "./components/TokenInput";
import OrgInput from "./components/OrgInput";
import RepoSelector from "./components/RepoSelector";
import Leaderboard from "./components/Leaderboard";
import ProgressBar from "./components/ProgressBar";
import { fetchRepos, fetchAllStats } from "./utils/github";

function App() {
  const [token, setToken] = useState("");
  const [org, setOrg] = useState("");
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [progress, setProgress] = useState(0);
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
      // Auto-select all repos by default
      setSelectedRepos(fetchedRepos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLeaderboard = async () => {
    if (selectedRepos.length === 0) {
      setError("Please select at least one repository");
      return;
    }

    setLoadingStats(true);
    setError("");
    setProgress(0);

    try {
      const aggregatedStats = await fetchAllStats(
        token,
        org,
        selectedRepos,
        setProgress
      );
      setLeaderboard(aggregatedStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
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

          <TokenInput value={token} onChange={setToken} />

          <OrgInput
            value={org}
            onChange={setOrg}
            onSubmit={handleFetchRepos}
            loading={loading}
          />
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
              onSubmit={handleGenerateLeaderboard}
              loading={loadingStats}
            />
          </section>
        )}

        {/* Progress bar */}
        {loadingStats && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <ProgressBar
              progress={progress}
              message={`Fetching stats from ${selectedRepos.length} repositories...`}
            />
          </section>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Leaderboard data={leaderboard} />
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
