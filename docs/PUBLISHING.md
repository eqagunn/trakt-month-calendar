# Publishing

This document is for maintainers. README.md is the public repository introduction, and RELEASE-NOTES.md contains the release description for users.

## Distribution files

Run `python3 scripts/package.py` from the project root. The output files are:

- `dist/trakt-month-calendar-v1.0.2-chrome.zip`: Chrome/Edge runtime package.
- `dist/trakt-month-calendar-v1.0.2-firefox.zip`: Firefox package for Mozilla submission or temporary testing.
- `dist/trakt-month-calendar-v1.0.2-safari.zip`: web-extension input for Apple's Safari packager.
- `dist/trakt-month-calendar-v1.0.2-source.zip`: shared source, tests, documentation and listing assets.
- `dist/trakt-month-calendar-v1.0.2-store-assets.zip`: listing images, privacy-policy text and publisher reference documents.

Each browser ZIP has `manifest.json` at its root. The calendar scripts and stylesheet are identical in all builds. Upload the contents of the source archive's inner `trakt-month-calendar` folder to the repository root.

## GitHub

Commit the repository files before creating a release. Use tag `v1.0.2`, title `Trakt Month Calendar 1.0.2`, and RELEASE-NOTES.md for its description. Attach the browser ZIPs and source ZIP. Describe the Firefox ZIP as unsigned and the Safari ZIP as untested packager input.

Keep LICENSE and NOTICE.md in the repository and runtime archives.

## Browser stores

Publish the updated PRIVACY.md at the existing public privacy-policy URL before submission. The extension now stores four local preferences. The new `storage` permission is used only for those preferences; add that justification in the store dashboard if requested. Calendar/account data is not stored, and no data is transmitted by the extension.

Upload the Chrome/Edge runtime ZIP to update the existing Chrome Web Store item. Its version `1.0.2` is higher than `1.0.1`.

Submit the Firefox ZIP to Mozilla for validation and signing. Keep its add-on ID unchanged in later versions. The included metadata declares no data sent outside the local add-on/browser; local processing is still disclosed in the privacy policy.

Upload the Safari ZIP to Apple's Safari Web Extension Packager in App Store Connect. Test the resulting app through Safari/TestFlight before submitting it for App Store review. Apple packaging and Mozilla signing are separate from this local build.

Use [STORE-LISTING.md](STORE-LISTING.md) for Chrome listing text and declarations. Use the publicly accessible [privacy-policy page](https://github.com/eqagunn/trakt-month-calendar/blob/main/PRIVACY.md), [repository](https://github.com/eqagunn/trakt-month-calendar) and [Issues page](https://github.com/eqagunn/trakt-month-calendar/issues) for the appropriate dashboard links.

## Source of this rebuild

The production files were taken from GitHub release `v1.0.0` (tag commit `995984e4e49315d9a21cac392a805e7726affac4`). Its published `trakt-month-calendar-v1.0.0-chrome.zip` has SHA-256 `a259fa5d5e21390f6ab40ebb6ba02f84ff11869cc4edee2ae70d35ae0475c3c6` and matches the tagged runtime files byte for byte. Version 1.0.1 added browser manifests and the protected month scroller. Version 1.0.2 builds on that source, fixes the retained-view current-week jump and adds a popup with four locally stored Auto/Manual preferences.
