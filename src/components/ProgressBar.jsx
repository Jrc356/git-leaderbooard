import { useState } from "react";

export default function ProgressBar({
  progress,
  message,
  logs = [],
  isComplete = false,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span className="flex items-center gap-2">
          {isComplete && (
            <svg
              className="w-4 h-4 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {message || "Loading..."}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isComplete ? "bg-green-500" : "bg-blue-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Collapsible logs section */}
      {logs.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {expanded ? "Hide" : "Show"} logs ({logs.length} repos processed)
          </button>

          {expanded && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
              <ul className="divide-y divide-gray-200 text-xs font-mono">
                {logs.map((log, i) => (
                  <li
                    key={i}
                    className={`px-3 py-2 flex items-center gap-2 ${
                      log.type === "error"
                        ? "bg-red-50 text-red-700"
                        : log.type === "complete"
                        ? "text-gray-600"
                        : "text-blue-600"
                    }`}
                  >
                    {log.type === "start" && (
                      <>
                        <svg
                          className="animate-spin h-3 w-3"
                          viewBox="0 0 24 24"
                        >
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span>
                          [{log.index}/{log.total}] Fetching {log.repo}...
                        </span>
                      </>
                    )}
                    {log.type === "complete" && (
                      <>
                        <svg
                          className={`h-3 w-3 ${
                            log.hasStats ? "text-green-500" : "text-yellow-500"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="flex-1">
                          [{log.index}/{log.total}] {log.repo}
                        </span>
                        <span className="flex gap-3">
                          {log.hasPRs && (
                            <span className="text-blue-500">
                              {log.prCount} PRs
                            </span>
                          )}
                          {log.mergedPRCount > 0 ? (
                            <span className="text-green-600">
                              {log.mergedPRCount} merged: {log.totalCommits}{" "}
                              commits, +{log.totalAdditions}/-
                              {log.totalDeletions}
                            </span>
                          ) : (
                            <span className="text-yellow-600">
                              no merged PRs
                            </span>
                          )}
                        </span>
                      </>
                    )}
                    {log.type === "error" && (
                      <>
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          [{log.index}/{log.total}] {log.repo}: {log.error}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
