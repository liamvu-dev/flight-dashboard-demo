# Project Agent Instructions

## Pull Requests & GitHub Issues
- When working on a GitHub issue, always link and auto-close it in the Pull Request description using `Closes #<issue-number>` (for example: `Closes #1`).
- Use clear commit messages and PR titles following Conventional Commits (e.g., `feat: ...`, `fix: ...`).

## Git Sync & Conflict Resolution
- Before pushing or creating/updating a Pull Request, always run `git fetch origin main` and `git merge origin/main` (or rebase onto `origin/main`) to catch conflicts early.
- If merge conflicts occur (or when asked to fix PR conflicts), resolve them carefully by **preserving both** the upstream `main` features/fixes and the current branch's changes—never blindly discard either side.
- After resolving any conflict, re-verify the code (`node --check js/main.js` and check `index.html`/`css/style.css` integrity) before committing and pushing.

## Development & Verification
- This is a static HTML/CSS/JS dashboard (`index.html`, `css/style.css`, `js/main.js`, `js/data.js`).
- Preserve the existing sci-fi/cyberpunk visual theme (`Orbitron`, `#1fd1f9`, dark glassmorphism panels).
- Run `node --check js/main.js` before committing to verify there are no JavaScript syntax errors.

## Visual Inspection / Screenshots
- When inspecting UI screenshots with `view_image`, view **at most 1 image per turn** and prefer compressed JPEG or smaller viewport captures instead of multiple full-resolution PNGs at once (to avoid exceeding the 1M token input limit).
