import { useState, useMemo } from "react";

export default function RepoSelector({
  repos,
  selected,
  onChange,
  onSubmit,
  loading,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRepos = useMemo(() => {
    if (!searchTerm) return repos;
    return repos.filter((repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [repos, searchTerm]);

  const handleToggle = (repo) => {
    const isSelected = selected.some((r) => r.id === repo.id);
    if (isSelected) {
      onChange(selected.filter((r) => r.id !== repo.id));
    } else {
      onChange([...selected, repo]);
    }
  };

  const handleSelectAll = () => {
    onChange([...repos]);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const handleSelectFiltered = () => {
    const newSelected = [...selected];
    filteredRepos.forEach((repo) => {
      if (!selected.some((r) => r.id === repo.id)) {
        newSelected.push(repo);
      }
    });
    onChange(newSelected);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Select Repositories ({selected.length} / {repos.length} selected)
        </h3>
      </div>

      {/* Search and bulk actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <button
          type="button"
          onClick={handleSelectAll}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={handleDeselectAll}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Deselect All
        </button>
        {searchTerm && (
          <button
            type="button"
            onClick={handleSelectFiltered}
            className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            Select Filtered ({filteredRepos.length})
          </button>
        )}
      </div>

      {/* Repo list */}
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
        {filteredRepos.length === 0 ? (
          <p className="p-4 text-gray-500 text-center">No repositories found</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredRepos.map((repo) => {
              const isSelected = selected.some((r) => r.id === repo.id);
              return (
                <li
                  key={repo.id}
                  onClick={() => handleToggle(repo)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {repo.name}
                    </p>
                    {repo.description && (
                      <p className="text-sm text-gray-500 truncate">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {repo.language && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {repo.language}
                      </span>
                    )}
                    <span>⭐ {repo.stargazers_count}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || selected.length === 0}
        className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
            Generating Leaderboard...
          </span>
        ) : (
          `Generate Leaderboard (${selected.length} repos)`
        )}
      </button>
    </div>
  );
}
