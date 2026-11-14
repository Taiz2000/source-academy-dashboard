# source-academy-dashboard
Dashboard extension for Source Academy

Adds a **Dashboard** tab to the grading page of https://sourceacademy.nus.edu.sg: a heatmap of
students × assessments. It fetches every submission you can grade in a single request, so
filtering happens client-side instead of re-querying the backend on every change. Right-click a
cell for SA's per-submission actions (Reautograde, Unsubmit, Publish, Unpublish, with SA's
confirmations), or use **Publish all graded submissions** for everything highlighted. An optional
alternative Submissions menu shows the same data as one table.

## Options

Click the extension's toolbar icon:

- **Open submissions in a new tab** (on by default): off opens them in the same tab, like SA.
- **Use alternative Submissions menu (work in progress)** (off by default): the grading page's
  Submissions tab shows this extension's table (every row at once, status chips, hide options)
  instead of SA's.
- **Allow publish all anywhere (may result in errors)** (off by default): the heatmap's **Publish
  all graded submissions** button is otherwise only enabled on your own groups. It publishes each
  highlighted Graded submission with the same request as SA's per-row Publish button (the backend
  only lets tutors publish their own students'), and stops after 5 errors.
- **Hide your own submissions** / **Hide all tutors' submissions** / **Hide groups**: filter
  rows out of every view. Tutors are recognised as group leaders in the fetched data, plus you.
- **Clear cached data**: see below.

## Stored data

Everything stays in your browser; nothing is sent anywhere except Source Academy's own API.

- **Settings** (`chrome.storage.sync`): the options above.
- **Views** (`chrome.storage.local`, per course): the last tab, scope and filters used, so a new
  browser tab (e.g. after grading a submission opened in one) opens where you left off. Read when
  a view opens, never synced live between open tabs.
- **Cached submissions** (`chrome.storage.local`): the submissions fetched for one course (the
  last one opened), tagged with the SA user id and shown only to that user, stored one group per
  entry with the time each was fetched. Fetching "all groups" fills every group; one group or "my
  groups" refreshes just those. A page shows the saved data at once; "my groups" and "all groups"
  always refetch in the background, a single group only if its data is over an hour old. This
  includes students' names, usernames, groups, progress and XP (~25MB for a 50k-row course), kept
  until replaced, cleared, or a week old (deleted when a page next opens), so use **Clear cached
  data** on shared computers. Also cached: group
  names (with tutors, from the grading summary) and assessment types, for the filter menus.

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
- `src/content/grading.ts` turns the "Submissions" title on SA's grading page into
  Submissions | Dashboard tabs. Dashboard (and Submissions, with the alternative menu enabled)
  hides SA's table via an attribute, so React keeps reconciling it, and mounts our view in its
  place. React rebuilds this DOM, so a `MutationObserver` keeps re-applying it.
- `src/content/panel.tsx` is a separate bundle (`dist/panel.js`, Preact UI + AG Grid, ~1MB) that
  the content script `import()`s the first time one of our views opens, so other SA pages stay
  light. The views render into SA's own card using its classes (Blueprint, Tailwind badge classes,
  AG Grid with SA's theme parameters), so they look like the grading page; our own CSS
  (`panel.css`) is scoped with `sad-`. Progress statuses follow the frontend's
  `backendParamsToProgressStatus`.
- `src/content/data.ts` keeps the course's submissions in per-group pieces shared by every view,
  fetched per scope (my groups, all groups, or one group via SA's exact-match `groupName` filter,
  which like "my groups" omits team submissions) and saved to the cache (`src/cache.ts`).
  `src/content/groups.ts` lists groups from `GET /admin/grading/summary`; `src/content/viewState.ts`
  saves the views.
- `src/content/navigation.ts` opens submissions in a new tab, or in the same tab through SA's
  React Router (push a history entry and dispatch `popstate`) so the page doesn't reload.

The backend URL lives in `src/content/config.ts`; the allowed origin in `src/manifest.json`.
