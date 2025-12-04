import { useState } from "react";

export default function TokenInput({ value, onChange, onClear }) {
  const [showToken, setShowToken] = useState(false);
  const isSaved = value && value.length > 0;

  return (
    <div className="space-y-2">
      <label
        htmlFor="token"
        className="block text-sm font-medium text-gray-700"
      >
        GitHub Personal Access Token
        {isSaved && (
          <span className="ml-2 text-green-600 text-xs font-normal">
            ✓ Saved locally
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type={showToken ? "text" : "password"}
          id="token"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          className="w-full px-4 py-2 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {showToken ? "Hide" : "Show"}
          </button>
          {isSaved && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Create a token at{" "}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          github.com/settings/tokens
        </a>
        . Requires <code className="bg-gray-100 px-1 rounded">read:org</code>{" "}
        and <code className="bg-gray-100 px-1 rounded">repo</code> scopes.
      </p>
    </div>
  );
}
