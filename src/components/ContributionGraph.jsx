import { useMemo } from "react";

/**
 * A mini contribution graph showing activity over time
 * Similar to GitHub's contribution graph
 */
export default function ContributionGraph({ weeklyData, height = 60 }) {
  const graphData = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return { bars: [], maxValue: 0, labels: [] };
    }

    // Calculate total contributions per week
    const totals = weeklyData.map((week) => ({
      week: week.week,
      total: week.commits + week.pullRequests + week.reviews,
      commits: week.commits,
      pullRequests: week.pullRequests,
      reviews: week.reviews,
      additions: week.additions,
      deletions: week.deletions,
    }));

    const maxValue = Math.max(...totals.map((t) => t.total), 1);

    // Generate month labels (limit to avoid overcrowding)
    const labels = [];
    let lastMonth = -1;
    const labelInterval = Math.max(1, Math.floor(totals.length / 12)); // Max ~12 labels
    totals.forEach((data, index) => {
      const date = new Date(data.week * 1000);
      const month = date.getMonth();
      if (month !== lastMonth && index > 0 && index % labelInterval === 0) {
        labels.push({
          index,
          label: date.toLocaleDateString("en-US", { month: "short" }),
        });
        lastMonth = month;
      } else if (index === 0) {
        lastMonth = month;
      }
    });

    return { bars: totals, maxValue, labels };
  }, [weeklyData]);

  if (!weeklyData || weeklyData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-xs"
        style={{ height }}
      >
        No activity data
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      {/* Month labels */}
      <div className="relative h-4 text-xs text-gray-400">
        {graphData.labels.map(({ index, label }) => (
          <span
            key={index}
            className="absolute"
            style={{ left: `${(index / graphData.bars.length) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Bar chart */}
      <div className="relative flex items-end h-[calc(100%-16px)] gap-px bg-gray-50 rounded">
        {graphData.bars.map((data) => {
          const barHeight = (data.total / graphData.maxValue) * 100;
          const date = new Date(data.week * 1000);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={data.week}
              className="flex-1 group relative"
              style={{ minWidth: "2px" }}
            >
              <div
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                style={{
                  height: `${Math.max(barHeight, data.total > 0 ? 4 : 0)}%`,
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  <div className="font-medium">{dateStr}</div>
                  <div className="text-gray-300">
                    {data.commits > 0 && <span>{data.commits} commits</span>}
                    {data.pullRequests > 0 && (
                      <span className="ml-1">{data.pullRequests} PRs</span>
                    )}
                    {data.reviews > 0 && (
                      <span className="ml-1">{data.reviews} reviews</span>
                    )}
                    {data.total === 0 && <span>No activity</span>}
                  </div>
                  {(data.additions > 0 || data.deletions > 0) && (
                    <div className="text-gray-300">
                      <span className="text-green-400">+{data.additions}</span>
                      <span className="text-red-400 ml-1">
                        -{data.deletions}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
