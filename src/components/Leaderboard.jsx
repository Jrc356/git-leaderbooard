import { useState, useMemo } from "react";

const SORT_KEYS = [
  { key: "net", label: "Net Lines", description: "Lines added minus deleted" },
  { key: "additions", label: "Additions", description: "Total lines added" },
  { key: "deletions", label: "Deletions", description: "Total lines deleted" },
  { key: "commits", label: "Commits", description: "Total commits" },
];

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export default function Leaderboard({ data }) {
  const [sortKey, setSortKey] = useState("net");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((row, index) => (
              <tr key={row.user} className="hover:bg-gray-50 transition-colors">
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
                    <a
                      href={`https://github.com/${row.user}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.user}
                    </a>
                  </div>
                </td>
                {/* Desktop columns */}
                <td className="px-4 py-3 text-right text-sm hidden md:table-cell">
                  <span
                    className={row.net >= 0 ? "text-green-600" : "text-red-600"}
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
                        : "text-gray-700"
                    }
                  >
                    {sortKey === "additions" && "+"}
                    {sortKey === "deletions" && "-"}
                    {sortKey === "net" && row.net >= 0 && "+"}
                    {formatNumber(row[sortKey])}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-700">Total Commits</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatNumber(data.reduce((sum, r) => sum + r.commits, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
