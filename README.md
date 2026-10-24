# source-academy-dashboard
Dashboard extension for Source Academy

Adds a **Grading Dashboard** button next to **Grading** in the staff navbar of
https://sourceacademy.nus.edu.sg. Clicking it fetches every submission you can grade in a single
request and shows it in an overlay, so filtering can happen client-side instead of re-querying
the backend on every change.

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
- `src/content/Overlay.tsx` is the panel, rendered with Preact into a Shadow DOM so styles don't
  clash with the app. Progress statuses follow the frontend's `backendParamsToProgressStatus`.

The backend URL lives in `src/content/config.ts`; the allowed origin in `src/manifest.json`.
