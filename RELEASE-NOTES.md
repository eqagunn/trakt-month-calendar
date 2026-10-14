# Trakt Month Calendar 1.0.1

Rebuilt from the published GitHub 1.0.0 release, with browser-specific packages for Chrome/Edge, Firefox and Safari.

## Changes

- Give Month View its own protected scroll viewport, separate from the inactive page scrollbar.
- Keep the calendar scrollbar visible independently of page scrollbar styles, including in Firefox.
- Let dragging scroll through the final week and website footer after using Jump to Current Week.
- Prevent the top navbar from covering the beginning of the calendar scrollbar on overlay-scrollbar systems.
- Preserve native cards, controls and navbar positions.
- Include `-chrome` in the Chrome/Edge package filename.
- Shared Manifest V3 source with explicit browser requirements.
- Firefox package with an add-on ID and Mozilla data-transmission declaration.
- Safari package prepared for Apple's Safari Web Extension Packager.
- The same calendar scripts and stylesheet in all browser packages.
- A browser test runner for Chromium, Firefox and WebKit.
- Updated installation, privacy and browser-support documentation.

Calendar features and loading behavior are retained from 1.0.0. **The Safari version is untested in Safari.**

## Downloads

- `trakt-month-calendar-v1.0.1-chrome.zip`: Chrome/Edge runtime package.
- `trakt-month-calendar-v1.0.1-firefox.zip`: Firefox package for temporary testing or Mozilla submission; it is not signed.
- `trakt-month-calendar-v1.0.1-safari.zip`: input for Apple's packager; it is not an installable Safari app and is untested in Safari.
- `trakt-month-calendar-v1.0.1-source.zip`: complete shared source and documentation.

For unpacked Chrome/Edge installation, extract the runtime ZIP, open your browser's extensions page, enable Developer mode, and load the folder containing `manifest.json`. Firefox and Safari instructions are in the repository's browser-support guide.

Released under the **MIT License**. Third-party Trakt content and media artwork are excluded from the license grant.

Created by **eqagunn**. Independent extension; not affiliated with or endorsed by Trakt.
