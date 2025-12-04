import React, { useState, useMemo } from "react";
import ContributionGraph from "./ContributionGraph";

const SORT_KEYS = [
  { key: "net", label: "Net Lines", description: "Lines added minus deleted" },
  { key: "additions", label: "Additions", description: "Total lines added" },
  { key: "deletions", label: "Deletions", description: "Total lines deleted" },
  { key: "commits", label: "Commits", description: "Total commits" },
  { key: "pullRequests", label: "PRs", description: "Pull requests created" },
  { key: "reviews", label: "Reviews", description: "PR reviews submitted" },
];

const TIME_RANGE_LABELS = {
  all: "All Time",
  "1d": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "180d": "Last 6 Months",
  "365d": "Last Year",
};

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export default function Leaderboard({ data, timeRange = "all" }) {
  const [sortKey, setSortKey] = useState("net");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState(null);

  const sortedData = useMemo(() => {
    let filtered = data;
    if (searchTerm) {
      filtered = data.filter((row) =>
        row.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortOrder === "asc") return aVal - bVal;
      return bVal - aVal;
    });
  }, [data, sortKey, sortOrder, searchTerm]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (key) => {
    if (sortKey !== key) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No contributor data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Leaderboard ({sortedData.length} contributors)
        </h3>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Sort buttons for mobile */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {SORT_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortKey === key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label} {sortKey === key && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700">Total Additions</p>
          <p className="text-2xl font-bold text-green-600">
            +{formatNumber(data.reduce((sum, r) => sum + r.additions, 0))}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-700">Total Deletions</p>
          <p className="text-2xl font-bold text-red-600">
            -{formatNumber(data.reduce((sum, r) => sum + r.deletions, 0))}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">Net Lines</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatNumber(data.reduce((sum, r) => sum + r.net, 0))}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">Total Commits</p>
          <p className="text-2xl font-bold text-gray-600">
            {formatNumber(data.reduce((sum, r) => sum + r.commits, 0))}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-700">Pull Requests</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatNumber(
              data.reduce((sum, r) => sum + (r.pullRequests || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-indigo-700">Reviews</p>
          <p className="text-2xl font-bold text-indigo-600">
            {formatNumber(data.reduce((sum, r) => sum + (r.reviews || 0), 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                User
              </th>
              {SORT_KEYS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                >
                  <span className="flex items-center justify-end gap-1">
                    {label}
                    <span className="text-gray-400">{getSortIcon(key)}</span>
                  </span>
                </th>
              ))}
              {/* Mobile stat column */}
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 md:hidden">
                {SORT_KEYS.find((s) => s.key === sortKey)?.label}
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 hidden lg:table-cell">
                Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((row, index) => (
              <React.Fragment key={row.user}>
                <tr
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedUser(expandedUser === row.user ? null : row.user)
                  }
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-gray-200 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.avatarUrl && (
                        <img
                          src={row.avatarUrl}
                          alt={row.user}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <a
                          href={`https://github.com/${row.user}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.user}
                        </a>
                        <div className="text-xs text-gray-500 md:hidden">
                          {expandedUser === row.user ? "▲ Hide" : "▼ Show"}{" "}
                          activity
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Desktop columns */}
                  <td className="px-4 py-3 text-right text-sm hidden md:table-cell">
                    <span
                      className={
                        row.net >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {row.net >= 0 ? "+" : ""}
                      {formatNumber(row.net)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-green-600 hidden md:table-cell">
                    +{formatNumber(row.additions)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600 hidden md:table-cell">
                    -{formatNumber(row.deletions)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700 hidden md:table-cell">
                    {formatNumber(row.commits)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-purple-600 hidden md:table-cell">
                    {formatNumber(row.pullRequests || 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-indigo-600 hidden md:table-cell">
                    {formatNumber(row.reviews || 0)}
                  </td>
                  {/* Mobile stat column */}
                  <td className="px-4 py-3 text-right text-sm md:hidden">
                    <span
                      className={
                        sortKey === "additions"
                          ? "text-green-600"
                          : sortKey === "deletions"
                          ? "text-red-600"
                          : sortKey === "net"
                          ? row.net >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : sortKey === "pullRequests"
                          ? "text-purple-600"
                          : sortKey === "reviews"
                          ? "text-indigo-600"
                          : "text-gray-700"
                      }
                    >
                      {sortKey === "additions" && "+"}
                      {sortKey === "deletions" && "-"}
                      {sortKey === "net" && row.net >= 0 && "+"}
                      {formatNumber(row[sortKey] || 0)}
                    </span>
                  </td>
                  {/* Mini graph column - desktop */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="w-32">
                      <ContributionGraph
                        weeklyData={row.weeklyData}
                        height={32}
                      />
                    </div>
                  </td>
                </tr>
                {/* Expanded row with full contribution graph */}
                {expandedUser === row.user && (
                  <tr className="bg-gray-50">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Net Lines:</span>
                            <span
                              className={
                                row.net >= 0
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {row.net >= 0 ? "+" : ""}
                              {formatNumber(row.net)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Commits:</span>
                            <span className="text-gray-700 font-medium">
                              {formatNumber(row.commits)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">PRs:</span>
                            <span className="text-purple-600 font-medium">
                              {formatNumber(row.pullRequests || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Reviews:</span>
                            <span className="text-indigo-600 font-medium">
                              {formatNumber(row.reviews || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Activity Graph */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Contribution Activity (
                            {TIME_RANGE_LABELS[timeRange] || "All Time"})
                          </h4>
                          <ContributionGraph
                            weeklyData={row.weeklyData}
                            height={80}
                          />
                        </div>

                        {/* PR, Review, and Commit Links */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* PRs Opened */}
                          {row.prsList && row.prsList.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <h5 className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                                </svg>
                                PRs Opened ({row.prsList.length})
                              </h5>
                              <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                {row.prsList.slice(0, 10).map((pr, i) => (
                                  <li key={i} className="truncate">
                                    <a
                                      href={pr.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span
                                        className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                          pr.merged
                                            ? "bg-purple-500"
                                            : pr.state === "open"
                                            ? "bg-green-500"
                                            : "bg-red-500"
                                        }`}
                                      ></span>
                                      {pr.repo}#{pr.number}: {pr.title}
                                    </a>
                                  </li>
                                ))}
                                {row.prsList.length > 10 && (
                                  <li className="text-gray-500">
                                    ...and {row.prsList.length - 10} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* PRs Reviewed */}
                          {row.reviewsList && row.reviewsList.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <h5 className="text-sm font-medium text-indigo-700 mb-2 flex items-center gap-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M1.679 7.932c.412-.621 1.242-1.75 2.366-2.717C5.175 4.242 6.527 3.5 8 3.5c1.473 0 2.824.742 3.955 1.715 1.124.967 1.954 2.096 2.366 2.717a.119.119 0 010 .136c-.412.621-1.242 1.75-2.366 2.717C10.825 11.758 9.473 12.5 8 12.5c-1.473 0-2.824-.742-3.955-1.715C2.92 9.818 2.09 8.69 1.679 8.068a.119.119 0 010-.136zM8 2c-1.981 0-3.67.992-4.933 2.078C1.797 5.169.88 6.423.43 7.1a1.619 1.619 0 000 1.798c.45.678 1.367 1.932 2.637 3.024C4.329 13.008 6.019 14 8 14c1.981 0 3.67-.992 4.933-2.078 1.27-1.091 2.187-2.346 2.637-3.023a1.619 1.619 0 000-1.798c-.45-.678-1.367-1.932-2.637-3.023C11.671 2.992 9.981 2 8 2zm0 8a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                                PRs Reviewed ({row.reviewsList.length})
                              </h5>
                              <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                {row.reviewsList.slice(0, 10).map((pr, i) => (
                                  <li key={i} className="truncate">
                                    <a
                                      href={pr.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {pr.repo}#{pr.number}: {pr.title}
                                    </a>
                                  </li>
                                ))}
                                {row.reviewsList.length > 10 && (
                                  <li className="text-gray-500">
                                    ...and {row.reviewsList.length - 10} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Commits */}
                          {row.commitsList && row.commitsList.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z" />
                                </svg>
                                Commits ({row.commitsList.length}
                                {row.commits > row.commitsList.length
                                  ? "+"
                                  : ""}
                                )
                              </h5>
                              <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                {row.commitsList
                                  .slice(0, 10)
                                  .map((commit, i) => (
                                    <li key={i} className="truncate">
                                      <a
                                        href={commit.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <code className="text-gray-500 mr-1">
                                          {commit.sha}
                                        </code>
                                        {commit.repo}: {commit.message}
                                      </a>
                                    </li>
                                  ))}
                                {row.commitsList.length > 10 && (
                                  <li className="text-gray-500">
                                    ...and {row.commitsList.length - 10} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
