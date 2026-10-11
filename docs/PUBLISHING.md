# Publishing

This document is for maintainers. The public repository introduction is README.md, and RELEASE-NOTES.md contains the release description for users.

## Distribution files

Run `python3 scripts/package.py` from the project root. The output files are:

- `dist/trakt-month-calendar-v1.0.0.zip`: runtime package for Chrome Web Store or unpacked installation.
- `dist/trakt-month-calendar-v1.0.0-source.zip`: repository source, tests, documentation and listing assets.
- `dist/trakt-month-calendar-v1.0.0-store-assets.zip`: listing images, privacy-policy text and publisher reference documents.

The runtime ZIP has `manifest.json` at its root. Upload the contents of the source archive's inner `trakt-month-calendar` folder to the repository root so README.md appears on the repository homepage.

## GitHub

Commit the repository files before creating the release. Use tag `v1.0.0`, title `Trakt Month Calendar 1.0.0`, and the text from RELEASE-NOTES.md. Attach the runtime ZIP for users installing unpacked. The source ZIP may be attached as an additional download.

For an existing release, update its description with the current RELEASE-NOTES.md text and replace any manually attached runtime or source ZIPs with these builds. A release tag does not automatically move when later commits are made; GitHub's generated source archives reflect the tag's commit.

The project uses the MIT License. Include the root LICENSE and NOTICE.md files in the repository and distribution archives.

## Chrome Web Store

Use [STORE-LISTING.md](STORE-LISTING.md) for listing text and privacy declarations. Record the publicly accessible URL of the repository's PRIVACY.md page in the dashboard. The repository and its Issues page can serve as the homepage and support links.

Upload the runtime ZIP as the extension package. Upload the supplied icon, screenshot and promotional image in their corresponding listing fields. Complete account details, distribution preferences and test instructions in the dashboard.

The manifest and footer use version `1.0.0`. Later Web Store uploads require a higher numeric manifest version.
