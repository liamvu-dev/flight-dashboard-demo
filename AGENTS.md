# Project Agent Instructions

## Pull Requests & GitHub Issues
- When working on a GitHub issue, always link and auto-close it in the Pull Request description using Closes #<issue-number> (for example: Closes #1).
- Use clear commit messages and PR titles following Conventional Commits (e.g., eat: ..., ix: ...).

## Development & Verification
- This is a static HTML/CSS/JS dashboard (index.html, css/style.css, js/main.js, js/data.js).
- Preserve the existing sci-fi/cyberpunk visual theme (Orbitron, #1fd1f9, dark glassmorphism panels).
- Run 
ode --check js/main.js before committing to verify there are no JavaScript syntax errors.

## Visual Inspection / Screenshots
- When inspecting UI screenshots with iew_image, view **at most 1 image per turn** and prefer compressed JPEG or smaller viewport captures instead of multiple full-resolution PNGs at once (to avoid exceeding the 1M token input limit).
