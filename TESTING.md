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

Each runtime ZIP contains the same production scripts, stylesheets, settings popup, icon and license notices. Only the browser manifest differs. The source archive includes the shared manifest, test scripts, build script and documentation.

## Validation for 1.0.2

All 54 date, bridge, DOM and preference regressions pass. All 15 browser cases pass in Chromium, Firefox and WebKit. Mozilla validation reports zero errors, notices and warnings.

The regression suite covers dates, the navigation bridge, DOM restoration, preference defaults, storage updates, and popup save/failure behavior. The browser fixtures exercise normal and overlay document scrollbars, retained-view jumps and the settings popup’s interaction with both open calendar sections. Storage is supplied by a test adapter for the browser fixtures; these checks do not represent an installed extension test.

Wheel regressions compare bar and grid easing traces with identical input and a controlled frame clock. They also check that a burst keeps its distance when the pointer crosses between the two surfaces, that both ends remain reachable when a browser rounds scroll offsets to whole pixels, and that zoom, menus and Original View keep their own input behavior.

The native browser fixtures check Releases grid alignment with Calendar, late releases increasing an earlier row’s height, equal wheel distances and smooth motion through multiple frames over the fixed filter bar and calendar grid, and preservation of the native blur pseudo-element's dimensions, gradient and strength. They also check zoom preservation, native navbar geometry, shadow-viewport ownership, visible scrollbar colors, dragging after Jump to Current Week, and reaching the final week and website footer without moving the background page. They verify these properties even when page styles hide all page-level scrollbars, and check that the navbar does not cover the top of the thumb.

A dense Releases fixture starts with 206 native cards and a short final current week. It checks exact alignment with the first row's resting top, sufficient scroll range, footer placement, no frame-to-frame shift when more earlier cards arrive, and cancellation after manual scrolling. It also checks that returning from Original View immediately reuses a complete month whose native period elements were remounted. The DOM suite verifies that card geometry is read in a batch before cards are moved.

Playwright’s headless Firefox hides every thumb with an automation stylesheet, so its normal headless run verifies mouse-wheel scrolling. Use `TEST_HEADED=1 TEST_BROWSER=firefox npm run test:chrome` to test thumb dragging in a visible Firefox window. The Chromium and WebKit fixtures exercise native thumb dragging. No browser binary is included in the extension.

The fixtures use simulated Trakt pages. They do not verify signed-in live account writes or every current website layout. WebKit testing does not verify Apple's Safari extension wrapper; the packaged Safari app must still be tested in Safari.
