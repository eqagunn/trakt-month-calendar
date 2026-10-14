# Development and validation

## Setup

Install Node.js and Python 3, then run these commands from the project root:

```sh
npm install
npx playwright install chromium firefox webkit
```

Playwright's [browser installation documentation](https://playwright.dev/docs/browsers) describes additional system dependencies if needed.

## Automated checks

```sh
npm test
npm run test:chrome
npm run test:browsers
```

`npm test` runs date, page-bridge and Happy DOM regressions. It covers month boundaries, native navigation, card identity, information drawers, current-week jumps, filters, popup menus, partial loading, retry and Calendar/Releases transitions.

`npm run test:browsers` runs the same production-script fixture in Chromium, Firefox and WebKit. To select engines, use `npm run test:browsers -- firefox webkit`. The fixture uses real IntersectionObserver loading and checks card/image identity, loading and restoration, route transitions, popup menus and hover-border stability.

`TEST_HAPPY_DOM_PATH` can select an existing Happy DOM installation. `TEST_CHROMIUM_PATH`, `TEST_FIREFOX_PATH` and `TEST_WEBKIT_PATH` can select existing browser executables. `TEST_DISABLE_SANDBOX=1` relaxes Firefox's sandbox only for automated tests in restricted containers; it does not change extension code or installed browser settings.

## Build

```sh
python3 scripts/package.py
```

Alternatively, run `npm run build`. The build creates Chrome/Edge, Firefox and Safari runtime ZIPs, a source ZIP and a store-assets ZIP in `dist/`. It validates the root manifests, local file references, version consistency, image dimensions and ZIP contents.

Each runtime ZIP contains the same production scripts, stylesheet, icon and license notices. Only the browser manifest differs. The source archive includes the shared manifest, test scripts, build script and documentation.

## Validation for 1.0.1

All 38 date, bridge and DOM checks pass. Both normal and overlay document-scrollbar cases pass in Chromium, Firefox and WebKit (six browser cases). A real temporary Firefox installation of the generated package loads the monthly calendar and successfully exchanges string-valued events between the isolated content script and MAIN-world navigation bridge. Mozilla's validator reports zero errors, notices and warnings for the Firefox target.

The native browser fixture checks native navbar geometry, shadow-viewport ownership, visible scrollbar colors, dragging after Jump to Current Week, and reaching the final week and website footer without moving the background page. It verifies these properties even when page styles hide all page-level scrollbars, and checks that the navbar does not cover the top of the thumb.

Playwright’s headless Firefox hides every thumb with an automation stylesheet, so its normal headless run verifies mouse-wheel scrolling. Use `TEST_HEADED=1 TEST_BROWSER=firefox npm run test:chrome` to test thumb dragging in a visible Firefox window. This rebuild passed the Firefox thumb tests using a local test-browser copy with only that automation stylesheet disabled; no browser binary is included in the extension.

The fixtures use simulated Trakt pages. They do not verify signed-in live account writes or every current website layout. WebKit testing does not verify Apple's Safari extension wrapper; the packaged Safari app must still be tested in Safari.
