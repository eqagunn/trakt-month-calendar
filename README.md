# Trakt Month Calendar

A Chrome extension that adds a monthly view to Trakt Calendar and Releases, while keeping Trakt's native cards and controls.

![Trakt Month Calendar preview](store-assets/screenshot.png)

## Features

- View releases in a monthly grid, with days loaded chronologically.
- Browse previous and next months, or jump to the current week.
- Switch between Month View and Trakt's Original View.
- Keep native images, watched controls and card menus.
- Open show, movie, season and episode information in Trakt's glance drawers.
- Process calendar content locally, without a separate Trakt API key, analytics or persistent extension storage.

## Install in Chrome

[Install Trakt Month Calendar from the Chrome Web Store](https://chromewebstore.google.com/detail/trakt-month-calendar/nkkmmbjfgblbddjicacanfhomgpgegcj)

After installation, open or reload Trakt Calendar or Releases. Month View appears automatically.

Use **Switch to Original View** to return to Trakt’s weekly calendar.

## Using the calendar

Month View appears automatically on Calendar and Discover → Releases. Use **Previous Month** and **Next Month** to browse. **Jump to Current Week** returns to the current month when needed and scrolls to the current week after its data is loaded.

Select **Switch to Original View** to return to Trakt's weekly calendar. Select **Switch to Month View** to return to the monthly grid. Existing Trakt filters continue to determine which cards appear.

If loading stops, use **Load Month** to retry the remaining days.

## Privacy

The extension processes Trakt page content locally in your browser. It does not send account information or page content to the developer, and it contains no analytics or persistent extension storage. Trakt continues to handle its normal website requests and account actions.

Read the [privacy policy](PRIVACY.md) for details.

## Support

Report problems through this repository's **Issues** tab. Include your Chrome version, whether the problem occurs in Calendar or Releases, the active filters, and steps to reproduce it.

## Development

Build and test instructions are in [TESTING.md](TESTING.md). Run `python3 scripts/package.py` to create the distribution archives in `dist/`.

## License

The extension's source code is licensed under the [MIT License](LICENSE). See [NOTICE.md](NOTICE.md) for third-party content.

---

Created by **eqagunn**. Independent extension; not affiliated with or endorsed by Trakt.
