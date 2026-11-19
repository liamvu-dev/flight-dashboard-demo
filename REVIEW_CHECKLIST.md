# Cross-Agent PR Review Checklist

Use this checklist when assigning a second agent (e.g., Claude Code or a fresh Codex review thread) to review a PR before merging:

1. **Issue Linking**
   - [ ] PR description includes `Closes #<issue-number>` so the issue and Project Board auto-update on merge.
2. **Git & Conflict Safety**
   - [ ] Branch is synced with `origin/main` (`mergeable` is clean, no accidental deletions of existing features).
3. **Code & Runtime Quality**
   - [ ] `node --check js/*.js` passes with zero syntax errors.
   - [ ] No runtime console errors, broken selectors, or missing DOM IDs.
   - [ ] Event listeners and `ResizeObserver` / `localStorage` logic handle missing/null elements safely.
4. **UI / UX & Theme Consistency**
   - [ ] Matches the sci-fi/cyberpunk palette (`#1fd1f9`, `--panel`, `Orbitron` / `Rajdhani`).
   - [ ] Responsive and no overlapping/clipped panels.
