# Development and validation

## Setup

Install Node.js and Python 3, then run these commands from the project root:

```sh
npm install
npx playwright install chromium
```

Playwright's [browser installation documentation](https://playwright.dev/docs/browsers) describes additional system dependencies if needed.

## Automated checks

```sh
npm test
npm run test:chrome
```

`npm test` runs date, page-bridge and Happy DOM regressions. It covers month boundaries, native calendar navigation, card identity, information drawers, current-week jumps, filters, popup menus, partial loading, retry and Calendar/Releases transitions.

`npm run test:chrome` runs a Chromium fixture with real IntersectionObserver loading. It checks card and image identity, loading and restoration, route transitions, popup menus and hover-border stability.

`TEST_HAPPY_DOM_PATH` can select an existing Happy DOM installation. `TEST_CHROMIUM_PATH` can select an existing Chromium executable.

## Build

```sh
python3 scripts/package.py
```

Alternatively, run `npm run build`. The build creates runtime, source and store-assets ZIPs in `dist/`. It validates the root manifest, local file references, version consistency, image dimensions and ZIP contents. The source archive includes the project files; the runtime archive includes the manifest, production scripts, stylesheet, extension icon and license notices.

## Validation for 1.0.0

The 37 date, bridge and DOM checks and the Chromium fixture passed before the version-only 1.0.0 repack. JavaScript syntax and archive validation passed for that repack. This documentation and licensing update changes no production code. All production files are compared with the previous 1.0.0 runtime archive to confirm they are byte for byte identical.

The fixtures simulate Trakt pages and inject the production scripts. They do not verify signed-in live Trakt behavior, account writes or the current website's visual layout. The available headless browser did not support the separate unpacked-extension installation check. Validate the runtime package in regular Chrome on signed-in Trakt before publication.
