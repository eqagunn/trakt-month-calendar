# Trakt Month Calendar

A browser extension that adds a monthly view to Trakt Calendar and Releases, while keeping Trakt's native cards and controls.

![Trakt Month Calendar preview](store-assets/screenshot.png)

## Features

- View releases in a monthly grid, with days loaded chronologically.
- Browse previous and next months, or jump to the current week.
- Switch between Month View and Trakt's Original View.
- Keep native images, watched controls and card menus.
- Open show, movie, season and episode information in Trakt's glance drawers.
- Process calendar content locally, without a separate Trakt API key, analytics or persistent extension storage.

## Install in Chrome or Edge

[Install Trakt Month Calendar from the Chrome Web Store](https://chromewebstore.google.com/detail/trakt-month-calendar/nkkmmbjfgblbddjicacanfhomgpgegcj)

In Edge, allow extensions from other stores if prompted.

After installation, open or reload Trakt Calendar or Releases. Month View appears automatically.

Use **Switch to Original View** to return to Trakt's weekly calendar.

## Firefox and Safari

The same source produces Firefox and Safari packages. The Firefox package can be loaded temporarily for development testing; normal installation requires Mozilla signing. The Safari ZIP is input for Apple's Safari Web Extension Packager, which creates the installable app. **The Safari version is untested in Safari.**

See [browser support and installation](docs/BROWSER-SUPPORT.md) for requirements and validation status.

## Using the calendar

Month View appears automatically on Calendar and Discover → Releases. Use **Previous Month** and **Next Month** to browse. **Jump to Current Week** returns to the current month when needed and scrolls to the current week after its data is loaded.

Select **Switch to Original View** to return to Trakt's weekly calendar. Select **Switch to Month View** to return to the monthly grid. Existing Trakt filters continue to determine which cards appear.

If loading stops, use **Load Month** to retry the remaining days.

## Privacy

The extension processes Trakt page content locally in your browser. It does not send account information or page content to the developer, and it contains no analytics or persistent extension storage. Trakt continues to handle its normal website requests and account actions.

Read the [privacy policy](PRIVACY.md) for details.

## Support

[Report a problem on GitHub Issues](https://github.com/eqagunn/trakt-month-calendar/issues). Include your browser and version, whether the problem occurs in Calendar or Releases, the active filters, and steps to reproduce it.

## Development

Build and test instructions are in [TESTING.md](TESTING.md). Run `python3 scripts/package.py` to create the browser packages and source archive in `dist/`.

## License

The extension's source code is licensed under the [MIT License](LICENSE). See [NOTICE.md](NOTICE.md) for third-party content.

---

Created by **eqagunn**. Independent extension; not affiliated with or endorsed by Trakt.
