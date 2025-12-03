# Git Leaderboard

A frontend-only React application that displays a sortable leaderboard of contributor statistics across GitHub organization repositories.

![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)

## Features

- **Organization Repository Listing** - Fetch all repositories from any GitHub organization
- **Repository Selection** - Search, filter, and select specific repos to analyze
- **Contributor Leaderboard** - View aggregated stats across selected repositories
- **Sortable Columns** - Sort by:
  - Net Lines (additions - deletions)
  - Lines Added
  - Lines Deleted  
  - Total Commits
- **Summary Statistics** - Total additions, deletions, net lines, and commits
- **Mobile Responsive** - Works on desktop and mobile devices
- **No Backend Required** - Runs entirely in the browser using GitHub's CORS-enabled API

## Getting Started

### Prerequisites

- Node.js 18+
- A GitHub Personal Access Token (PAT) with `read:org` and `repo` scopes

### Creating a GitHub Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `read:org` - Read organization data
   - `repo` - Full repository access (needed for private repos)
4. Copy the generated token

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/git-leaderboard.git
cd git-leaderboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open <http://localhost:5173> in your browser.

### Usage

1. Enter your GitHub Personal Access Token
2. Enter the organization name (e.g., `facebook`, `microsoft`, `google`)
3. Click "Fetch Repos" to load all repositories
4. Select/deselect repositories as needed
5. Click "Generate Leaderboard" to fetch and aggregate contributor stats

## Project Structure

```text
src/
├── components/
│   ├── TokenInput.jsx      # Secure PAT input with show/hide
│   ├── OrgInput.jsx        # Organization name input
│   ├── RepoSelector.jsx    # Multi-select repository list
│   ├── Leaderboard.jsx     # Sortable contributor table
│   └── ProgressBar.jsx     # Loading progress indicator
├── utils/
│   └── github.js           # GitHub API utilities
├── App.jsx                 # Main application component
├── main.jsx                # Entry point
└── index.css               # Tailwind CSS imports
```

## API Rate Limits

GitHub API has rate limits:

- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

The app displays rate limit errors and reset times when limits are exceeded.

## Security

- Your GitHub token is **never** sent to any server other than `api.github.com`
- Tokens are stored only in React state (cleared on page refresh)
- All API calls are made directly from your browser

## Tech Stack

- **React 19** - UI framework
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 4** - Utility-first styling
- **GitHub REST API** - Data source

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```
