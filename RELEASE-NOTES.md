# Trakt Month Calendar 1.0.2

- Keep dense Releases calendars aligned to the current week's first row, including short final weeks and late cards arriving above it. Manual scrolling cancels the alignment.
- Use the same smooth wheel scrolling over the fixed top filter bar, month controls and calendar grid, including distance and direction changes.
- Use Trakt's original navbar blur with its original height, gradient and strength, following the monthly scroll position.
- Return immediately to a fully loaded month when Trakt remounts its native weeks. Batch card measurements to reduce the cost of mounting large release lists.
- Align the Releases monthly grid with the Calendar grid, including its resting top after a current-week jump.
- Wait for preceding releases and current-week row sizes to settle before the automatic jump; later weeks do not hold it up.
- Keep browser zoom and menu scrolling available when forwarding wheel input from the fixed top bar and month controls.

- Fix Jump to Current Week after switching to Original View and back to a retained Month View.
- Add settings when clicking the extension icon: choose Auto or Manual separately for Month View and Jump to Current Week in Calendar and Releases.
- Default all four settings to Auto. Automatic jumps happen once the current week has loaded, without waiting for the entire month.
- Apply preference changes to open Trakt tabs and remember them locally between browser sessions. Manual page buttons remain available.
- Update the privacy policy to explain local preference storage. No calendar or account data is stored or sent to the developer.

The protected calendar scrollbar, native Trakt cards and controls are retained.

## Downloads

- `trakt-month-calendar-v1.0.2-chrome.zip`: Chrome/Edge runtime.
- `trakt-month-calendar-v1.0.2-firefox.zip`: Firefox runtime for temporary testing or Mozilla submission; unsigned.
- `trakt-month-calendar-v1.0.2-safari.zip`: input for Apple’s Safari Web Extension Packager, not an installable Safari app. **The Safari version is untested in Safari.**
- `trakt-month-calendar-v1.0.2-source.zip`: shared source, tests and documentation.

MIT License. Created by eqagunn. Independent extension; not affiliated with or endorsed by Trakt.
