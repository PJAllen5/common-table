# Common Table

A prototype shared client database for social welfare organizations.

Partner agencies (food banks, housing groups, clinics, legal aid and others) sign in with their organization's account to enter client records. With the client's consent, they share those records with partner organizations or outside contacts they choose. Anyone can use the public side, without signing in, to find food, housing, health, legal and other help.

**Live demo:** https://claude.ai/artifact/NE6tQ9XAfgQem8NTcPXuDe

> **Prototype only.** All people, organizations and phone numbers are made up, and sign-in is simulated. Don't enter real client information.

## Two ways it stores data

| Mode | When | Where data lives |
|---|---|---|
| **Live · shared** | The hosted demo link, opened by someone signed in to Claude | The page's shared database. Everyone using the link sees the same data, and changes appear for everyone within seconds. |
| **Demo · this browser only** | Opening `index.html` from your own computer, or a visitor who isn't signed in to Claude | That browser's `localStorage`, filled with made-up demo data. Nobody else sees changes. |

The badge next to the logo shows which mode you're in.

**Who can make changes in live mode:** while the demo is shared by public link, only the owner (and, on a Claude Team or Enterprise plan, members of the owner's organization) can change data. Other signed-in visitors can look but not edit ("Live · view only"). To let people from several organizations edit, turn off the public link in the page's Share menu and invite each person by email as an Editor.

## What it does

**Staff side (sign in as a partner organization)**
- **Clients:** your own clients plus records other partners shared with you. Search and filter them.
- **Client record:** profile, case notes from every partner (color-coded by organization), and sharing controls.
- **Consent-based sharing:** only the organization that owns a record can share it, and only after the client's consent is recorded. Withdrawing consent removes everyone's access at once.
- **Our resources:** list programs and set their availability (open, limited, waitlist). Changes show up in the public finder right away.
- **Help requests:** messages sent from the public finder.
- **Reports:** summary numbers, charts, a spreadsheet you can rearrange and copy into Excel or Google Sheets, and a full-screen slideshow mode. Network-wide reports show counts only.
- **Sharing activity:** a log of every share, unshare and note.

**Public side (no sign-in)**
- Search, filter by category, show only what's open now, and ask an organization to make contact.

## Running it

No build step and nothing to install. Open `index.html` in a browser.

To serve it locally instead (useful on some browsers):

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000.

**Demo accounts:** on the sign-in page, click any account under "Demo accounts". Any password works.

**Reset the data:** click "Reset demo data" at the bottom of the home page.

## Project layout

| File | What's in it |
|---|---|
| `index.html` | Page shell. Loads fonts, `styles.css` and `app.js`. |
| `styles.css` | All styling. Colors are CSS variables on `:root`, with a dark theme. |
| `data.js` | Organizations, categories and the made-up demo data generator. Also used by `scripts/export-seed.js`. |
| `app.js` | The app: data storage, views, reports and event handlers. |
| `scripts/build-demo.py` | Bundles everything into `dist/common-table.html` for the hosted demo. |
| `scripts/export-seed.js` | Writes the demo data as one JSON file per shared-database document, in `dist/seed/`. |

### Inside `app.js`

The app is plain JavaScript with no framework. Each screen is a function that returns an HTML string, and `render()` redraws the page whenever state changes.

- **Demo data (`data.js`):** `seed()` creates the sample clients and resources. `addHistory()` adds two years of made-up clients, services and help requests so the reports have something to show. `toSources()` converts it into the stored shape below.
- **Data store:** `connect()` uses the shared database when available, otherwise `startLocal()` uses `localStorage`. `rebuild()` turns the stored documents into `db` (the arrays every screen reads). Every change goes through `put()` and its helpers (`saveClient`, `addNote`, `saveRequest`, `saveResource`, `log`), never by editing `db` directly.
- **UI state:** `S` holds the current view, signed-in organization, filters and report settings.
- **Views:** `homeView`, `loginView`, `staffView` (with `clientsPane`, `clientPane`, `addPane`, `resourcesPane`, `requestsPane`, `reportsPane`, `activityPane`) and `publicView`.
- **Charts:** `colChart`, `hbarChart` and `heatmap` draw SVG charts by hand. `chartDefs()` lists the report charts, which the Reports tab and presentation mode both use.
- **Events:** one click, change, input and submit listener each, routed by `data-act` attributes.

### Data model

- **Organization:** `id`, `name`, `short`, `color`, `email`
- **Client:** `id`, `first`, `last`, `dob`, `phone`, `household`, `language`, `owner` (organization id), `consent {given, date, by}`, `sharedWith` (organization ids), `external` (emails), `needs` (categories), `intake`, `notes [{org, author, date, text}]`
- **Resource:** `id`, `org`, `cat`, `name`, `desc`, `address`, `hours`, `days`, `open`, `phone`, `eligibility`, `status`, `languages`
- **Service** (one visit or pickup): `date`, `org`, `cat`, `client`
- **Help request:** `id`, `resource`, `org`, `name`, `contact`, `message`, `date`, `status`

### How data is stored

The shared database holds JSON documents in these collections:

| Collection | One document per | Notes |
|---|---|---|
| `archive` | month (`2026-10`) | Past clients, services and help requests for that month. Read-only history; keeps the demo data to a few dozen documents. |
| `clients` | client | New clients, and any archived client someone has edited. A client here replaces the archived copy with the same id. |
| `notes` | case note | Each note is its own document, so two organizations adding notes at once never overwrite each other. |
| `requests` | help request | Same override rule as `clients`. |
| `resources` | program | |
| `activity` | logged action | The sharing activity log. |

If you change the shape of the data, bump `KEY` in `app.js` (for example `common-table-demo-v4`) so browsers load fresh local demo data instead of an old saved copy.

## Updating the hosted demo

```bash
python3 scripts/build-demo.py
```

This writes `dist/common-table.html` (ignored by git). The hosted demo is a Claude artifact with the `db` and `user` capabilities turned on, so ask Claude to republish it from that file. Republishing keeps the shared data.

To reload the starting demo data into an empty shared database, run `node scripts/export-seed.js` and ask Claude to write the files in `dist/seed/` into the artifact's database.

## Toward a real product

Things a production version would need:

- A production database instead of the demo's built-in shared storage
- Secure sign-in for each organization (single sign-on, two-factor authentication)
- Server-side access rules, so a record is only ever sent to organizations it's shared with
- Encryption, audit logs that can't be edited, and data retention rules
- Legal review for privacy rules that apply, such as HIPAA for health records, 42 CFR Part 2 for substance use treatment records, and FERPA for school records
- Accessibility and translation for the public finder
