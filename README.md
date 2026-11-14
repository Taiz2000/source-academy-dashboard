# Source Academy Grading Dashboard

A Chrome extension for [Source Academy](https://sourceacademy.nus.edu.sg) staff. It adds a
**Dashboard** tab to the grading page: one table with every student down the side and every
assessment across the top, so you can see at a glance who has submitted, what still needs grading,
and what has been published, and act on it without paging through the submissions list.

<!-- TODO: screenshot of the Dashboard -->

# How to use

## What it does

- **Dashboard tab** on the grading page, next to Source Academy's own **Submissions** tab.
  - Each cell is one submission, coloured by its status, with the XP awarded. Graded, published,
    and autograded cells get darker the higher the score.
  - Click a cell to open the submission; right-click it to reautograde, unsubmit, publish,
    or unpublish it.
  - **Publish all graded submissions** publishes every graded submission on screen at once.
- **Fast:** everything is fetched in one request and filtered in your browser, and the last data is
  saved, so the Dashboard shows up instantly next time while fresh data loads in the background.
- **Tidy:** hide your own or other tutors' test submissions, and groups such as students who
  never showed up.

## Install

You need Google Chrome (or another Chromium browser) and [Node.js](https://nodejs.org) 18 or newer.

```sh
git clone https://github.com/Taiz2000/source-academy-dashboard.git
cd source-academy-dashboard
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions` and switch on **Developer mode** (top right).
2. Click **Load unpacked** and choose the `dist` folder inside the project.
3. Open (or refresh) Source Academy.

**To update:** `git pull`, `npm run build`, press the extension's reload button on
`chrome://extensions`, and refresh any open Source Academy tabs.

## Using the Dashboard

Go to **Grading** in Source Academy and click the **Dashboard** tab. The extension remembers which
tab, group, and filters you last used, even in new browser tabs.

- **Viewing submissions from …** picks whose submissions to show: **my groups** (the groups you
  lead), **all groups** (the whole course; this takes up to ~30 seconds), or any single group.
  The line below says how many submissions are shown and how old the data is. Press the refresh
  icon to fetch the latest.
- **Assessment types** (Missions, Quests, Paths, …): click to show or hide a type. Ctrl/Cmd-click
  shows only that type.
- **Colours** follow Source Academy's status badges; the legend above the table shows them. For Autograded,
  Graded, and Published, a lighter shade means a lower score.
- **Sorting and filtering:** click an assessment's header to sort students by their score on it;
  use the filter icon on the **Student** header to filter by name.
- **Opening a submission:** click its cell. It opens in a new browser tab (see Options).
- **Right-click a cell** for the same actions as Source Academy's grading page, with the same confirmations:
  **Reautograde**, **Unsubmit**, **Publish**, or **Unpublish**, whichever apply. The cell updates as
  soon as the action succeeds.
- **Publish all graded submissions** (top right of the table): highlights every graded submission
  on screen and asks you to confirm before publishing them. It only works on your own groups
  unless you change that in the options; publishing stops early if something keeps failing.

## Options

Click the extension's icon in Chrome's toolbar. Most options do what they say; a few need a word
of explanation:

- **Open submissions in a new tab** (on by default): turn off to open them in the same tab, like Source Academy.
  Right-clicking a cell then offers **Open in new tab** instead.
- **Use alternative Submissions menu (work in progress)**: replaces Source Academy's Submissions tab with this
  extension's own table, which shows every submission at once with quick status filters. Unfinished;
  off by default.
- **Allow publish all anywhere (may result in errors)**: also enables **Publish all** on other
  groups and on "all groups". Source Academy only lets tutors publish their own students' submissions, so the
  rest will fail (nothing is changed for those); admins can publish anything.
- **Hide all tutors' submissions (including yours)**: tutors are recognised as the leaders of the
  groups in the data shown, plus you. Staff who lead no group aren't recognised.
- **Hide groups**: hides students in the listed groups (the defaults, AWOL and NOTINCS1101S, are
  where CS1101S puts students who never showed up). Edit the list for your course.
- **Clear cached data**: the extension saves the submissions it fetched, including students' names
  and grades, in your browser (see [Stored data](#stored-data)). Clear it on shared computers.

## Privacy

The extension talks only to Source Academy's own server, using your existing login. Everything it
stores stays in your browser.

# How to develop

## Build

```sh
npm install
npm run build      # one-off build into dist/
npm run watch      # rebuild on every change (unminified)
npm run typecheck  # tsc --noEmit
```

After a rebuild, press the extension's reload button on `chrome://extensions` and refresh the
Source Academy tab. The `key` in `src/manifest.json` pins the extension ID
(`cnlmdbboohjeooifelmcjddjjmhgakdf`), so loading `dist/` again replaces the existing entry instead
of adding a new one; it's a public key, the matching private key isn't needed to build.

`build.mjs` (esbuild) produces three bundles:

| File | Source | Loaded |
|---|---|---|
| `content.js` | `src/content/index.tsx` | Content script on every Source Academy page; kept small (~20KB). |
| `panel.js` | `src/content/panel.tsx` | ES module with the UI (Preact + AG Grid, ~1MB), `import()`ed the first time a view opens. Listed in `web_accessible_resources` so it can be. |
| `popup.js` | `src/popup/popup.tsx` | The toolbar popup (options). |

It empties `dist/` rather than deleting it, because Flatpak Chrome loses its handle on a recreated
folder.

## Project layout

| Path | What's there |
|---|---|
| `src/manifest.json` | Extension manifest (MV3). |
| `src/settings.ts`, `src/useSettings.ts` | Options, in `chrome.storage.sync`. |
| `src/cache.ts` | Storage keys for cached data, and **Clear cached data**. |
| `src/popup/` | The options popup. |
| `src/content/index.tsx` | Content script entry: installs the grading-page tabs. |
| `src/content/grading.ts` | Adds Submissions \| Dashboard tabs to Source Academy's grading page and swaps the views. |
| `src/content/panel.tsx` | `panel.js` entry: `mountDashboard`, `mountSubmissions`, `unmountPanel`. |
| `src/content/session.ts` | Source Academy login reuse, token refresh, `authedGet` / `authedPost`. |
| `src/content/api.ts` | Grading fetches (per scope) and the grading summary. |
| `src/content/data.ts` | Shared submission store, fetching, and caching. |
| `src/content/model.ts`, `types.ts` | API types, normalised `Submission`, status rules. |
| `src/content/filters.ts` | The hide options (own, tutors, groups). |
| `src/content/viewState.ts` | Remembered tabs, scopes, and filters. |
| `src/content/groups.ts` | Group list (with tutors) for the group menu. |
| `src/content/panels/` | The two views: `HeatmapPanel.tsx` (the Dashboard) and `SubmissionsPanel.tsx`, plus shared controls in `common.tsx`. |
| `src/content/heatmap/` | The Dashboard's table, colours, legend, type filter, right-click menu, and Publish all. |
| `src/content/actions.tsx`, `publish.ts` | Per-submission actions and Publish all. |
| `src/content/navigation.ts` | Opening submissions in a new tab or the same tab. |
| `src/content/ui/` | Source Academy-style confirmation dialog and notices. |
| `src/content/grid/`, `SubmissionsGrid.tsx` | AG Grid wrapper and the alternative Submissions table. |
| `src/content/badges.tsx`, `blueprint.ts`, `icons.tsx`, `panel.css` | Styling borrowed from Source Academy. |

(Some Dashboard code still uses its old name, "heatmap", in file and component names.)

## How it works

### Hooking into the grading page

`grading.ts` watches the page with a `MutationObserver` (React rebuilds this DOM often, e.g. after
returning from grading a submission). On `/courses/:id/grading` it finds Source Academy's
`.grading-table-wrapper`, replaces the **Submissions** title with Blueprint tabs, and when the
Dashboard (or the alternative Submissions menu) is selected, hides Source Academy's table by setting an
attribute rather than removing nodes, so React keeps reconciling them. Our view is mounted into a
`div` appended to the same wrapper. Each content-script instance tags what it adds with its own
id, so an orphaned copy left over from reloading the extension cleans up after itself.

The tabs only appear once Source Academy has finished loading its own submissions list, since that's what
renders the title we attach to.

### Login and API

Source Academy keeps its session in `localStorage.storedState` (lz-string compressed), which content scripts
on the same origin can read: tokens, course, role, and course registration id. On a 401 the
extension refreshes the access token itself (`POST /v2/auth/refresh`); this doesn't revoke Source Academy's
own tokens, and the new tokens are kept in memory only.

Endpoints used (all under `https://api.sourceacademy.nus.edu.sg/v2/courses/{courseId}/admin/`,
staff-accessible):

| Request | Used for |
|---|---|
| `GET grading?offset=0&pageSize=100000&group=true` | My groups. |
| `GET grading?…&group=false` | All groups (slow: ~25s for ~50k rows). |
| `GET grading?…&group=false&groupName=…` | One group (exact, case-sensitive match). |
| `GET grading/summary` | Group names and tutors for the group menu. |
| `POST grading/{id}/publish_grades` / `unpublish_grades` | Publish / Unpublish. |
| `POST grading/{id}/autograde` / `unsubmit` | Reautograde / Unsubmit. |

`grading/all_submissions` and `grading/{assessmentId}/publish_all_grades` are admin-only, which is
why the extension fetches one huge page and publishes one submission at a time. The single-group and "my
groups" queries leave out team submissions (they have no single student); only "all groups"
includes them. The backend accepts publishing an already-published submission and re-notifies the
student, so actions are disabled while the view shows stale saved data.

### Data and caching (`data.ts`)

Submissions are kept per course in **pieces**: one per group, plus one for students without a
group and one for team submissions, each with the time it was fetched. A fetch replaces the pieces
it fully covers (all groups: every piece; one group: that piece; my groups: the groups you lead,
with your own submissions elsewhere kept alongside). Views read the pieces they need, so one group
that came in with an all-groups fetch shows without another request, and a view's age is that of
its oldest piece.

When a view opens it shows saved data at once, then:

- **my groups / all groups** always refetch in the background (you may have just graded something,
  possibly in another browser tab);
- **one group** refetches only if its data is over an hour old.

Actions and Publish all update the affected submissions in place and save them, without refetching.

### Rendering

The UI is Preact, rendered into Source Academy's own card so Source Academy's stylesheets apply: Blueprint classes (the
prefix, e.g. `bp6-`, is read from the page), Source Academy's Tailwind badge classes copied from its source
(`badges.tsx`), and AG Grid Community at the same major version and theme parameters as Source Academy's
table. Our own CSS (`panel.css`) is scoped with `sad-` and added as an adopted stylesheet.

Statuses follow the frontend's `backendParamsToProgressStatus` (`model.ts`). Cell colours are in
`heatmap/colors.ts`: Autograded, Graded, and Published mix the status colour with white from 15% to
90% by score (bonus XP excluded).

## Stored data

Nothing leaves the browser except requests to Source Academy's API.

| What | Where | Notes |
|---|---|---|
| Options | `chrome.storage.sync` | Follows your Chrome profile. |
| Remembered views | `chrome.storage.local`, `view:<courseId>` | Last tab, scope, and filters; read when a view opens, never synced live between tabs. |
| Submissions | `chrome.storage.local`, `submissions:index` + `submissions:piece:<group>` | One course at a time, tagged with the Source Academy user id and only shown to that user. Includes students' names, usernames, groups, progress, and XP (~25MB for a 50k-row course). Pieces older than a week are deleted when a page next opens. |
| Group and type lists | `chrome.storage.local`, `groups:<courseId>`, `assessmentTypes:<courseId>`, `seenGroups` | For the menus and the popup's group suggestions. |

**Clear cached data** removes the submissions and lists, keeping options and remembered views. To
inspect storage, open the popup, right-click → **Inspect**, and run
`chrome.storage.local.get(null)` in its console.

## Debugging

- **Nothing appears on the grading page:** check the Source Academy tab's DevTools console. Errors from our
  code come from `content.js` / `panel.js`. Make sure the extension was reloaded and the tab
  refreshed after building.
- **Fetch errors** show under the group menu with the backend's message; the request and response
  are in the Network tab (`admin/grading…`).
- **Things most likely to break when Source Academy changes:** the `.grading-table-wrapper` class and the
  "Submissions" title text (`grading.ts`), the `storedState` format (`session.ts`), Blueprint class
  names, Tailwind classes we reuse that Source Academy stops using (`badges.tsx`; unused classes vanish from
  Source Academy's CSS), and React Router's history format (`navigation.ts`, same-tab opening).

## Licence

[Apache-2.0](LICENSE). Includes icon paths from [`@blueprintjs/icons`](https://github.com/palantir/blueprint)
and class names and text from the [Source Academy frontend](https://github.com/source-academy/frontend),
both Apache-2.0.
