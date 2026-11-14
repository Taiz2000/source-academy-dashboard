# source-academy-dashboard
Dashboard extension for Source Academy

Adds a **Dashboard** tab to the grading page of https://sourceacademy.nus.edu.sg, and a
**Grading Dashboard** button next to **Grading** in the staff navbar. Both fetch every submission
you can grade in a single request, so filtering happens client-side instead of re-querying the
backend on every change, and show a heatmap of students × assessments.

## Options

Click the extension's toolbar icon:

- **Replace Game Simulator button**: put the Grading Dashboard button in place of Game Simulator.
- **Open submissions in a new tab** (on by default): off opens them in the same tab, like SA.
- **Hide your own submissions** / **Hide all tutors' submissions** / **Hide groups**: filter
  rows out of every view. Tutors are recognised as group leaders in the fetched data, plus you.
- **Clear cached data**: see below.

## Stored data

Everything stays in your browser; nothing is sent anywhere except Source Academy's own API.

- **Settings** (`chrome.storage.sync`): the options above.
- **Views** (`chrome.storage.local`, per course): the last tab, scope and filters used, so a new
  browser tab (e.g. after grading a submission opened in one) opens where you left off. Read when
  a view opens, never synced live between open tabs.
- **Cached submissions** (`chrome.storage.local`): the last grading fetch for "my groups" and for
  "all groups", one copy each (any course), tagged with the course and SA user id and shown only
  to that user on that course. A page shows the saved copy at once and fetches fresh data in the
  background. This includes students' names, usernames, groups, progress and XP (~25MB for a
  50k-row course), kept until replaced or cleared, so use **Clear cached data** on shared
  computers. Also cached: group names and assessment types seen, for the filter menus.

## Build & load

```sh
npm install
npm run build        # or: npm run watch
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick `dist/`.
After rebuilding, press the extension's reload button and refresh the Source Academy tab.
The `key` in `src/manifest.json` pins the extension ID (`cnlmdbboohjeooifelmcjddjjmhgakdf`), so
loading `dist/` again replaces the existing entry instead of adding a new one.

## How it works

- `src/content/session.ts` reuses the SA login: the app persists its session (tokens, course id)
  to `localStorage.storedState`, lz-string compressed. On a 401 the extension refreshes the token
  itself via `POST /v2/auth/refresh` (this does not revoke the app's own tokens).
- `src/content/api.ts` calls
  `GET https://api.sourceacademy.nus.edu.sg/v2/courses/{id}/admin/grading?offset=0&pageSize=100000&group=…`.
  (`/admin/grading/all_submissions` is admin-only, so it returns 403 for staff.)
- `src/content/navbar.ts` clones the Grading navbar button and keeps it inserted with a
  `MutationObserver`, since React re-renders the navbar on navigation.
- `src/content/grading.ts` turns the "Submissions" title on SA's grading page into
  Submissions | Dashboard tabs; Dashboard hides SA's table (via an attribute, so React keeps
  reconciling it) and mounts the heatmap in its place. Also kept in place with a `MutationObserver`.
- `src/content/panel.tsx` is a separate bundle (`dist/panel.js`, Preact UI + AG Grid, ~1MB) that
  the content script `import()`s the first time the dashboard opens, so other SA pages stay light.
- `src/content/Overlay.tsx` renders into the page's DOM using SA's own markup and classes
  (ContentDisplay card, Blueprint, Tailwind badge classes, AG Grid with SA's theme parameters), so
  it looks like the grading page; our own CSS (`panel.css`) is scoped with `sad-`. Progress
  statuses follow the frontend's `backendParamsToProgressStatus`.

- `src/content/data.ts` shares one fetch per scope between every view on the page and saves it to
  the cache (`src/cache.ts`); `src/content/viewState.ts` saves the views.
- `src/content/navigation.ts` opens submissions in a new tab, or in the same tab through SA's
  React Router (push a history entry and dispatch `popstate`) so the page doesn't reload.

The backend URL lives in `src/content/config.ts`; the allowed origin in `src/manifest.json`.
