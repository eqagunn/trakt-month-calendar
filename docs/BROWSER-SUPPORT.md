# Browser support

All targets use the same calendar scripts and stylesheet. The build adjusts browser-specific manifest metadata; there are no separate calendar implementations.

## Targets

| Target | Minimum declared version | Package |
| --- | --- | --- |
| Chrome / Edge | 111 | `trakt-month-calendar-v1.0.1-chrome.zip` |
| Firefox desktop | 142 | `trakt-month-calendar-v1.0.1-firefox.zip` |
| Safari | 18 | `trakt-month-calendar-v1.0.1-safari.zip` |

The page-level navigation bridge requires `content_scripts.world: "MAIN"`. [MDN's content-script reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts) documents this feature. Firefox's build also includes its current data-consent metadata. Firefox Android is not enabled in this release; mobile browser layouts have not been validated.

## Chrome and Edge

Install the published extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/trakt-month-calendar/nkkmmbjfgblbddjicacanfhomgpgegcj). In Edge, allow extensions from other stores if prompted.

To test a downloaded build, extract the Chrome/Edge ZIP, open `chrome://extensions` or `edge://extensions`, enable Developer mode, and load the extracted folder containing `manifest.json`. Reload Trakt afterward.

## Firefox

Extract the Firefox ZIP. Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select its `manifest.json`. Reload Trakt. Temporary installations are removed when Firefox restarts.

Normal distribution requires Mozilla signing. The Firefox target includes the stable add-on ID `trakt-month-calendar@eqagunn.github.io`; keep this identifier for updates.

The manifest declares `data_collection_permissions.required: ["none"]`. Mozilla's declaration concerns data handled outside the add-on or local browser. This extension processes calendar content locally, uses no custom network requests or analytics, and sends no data to its developer. Its local page-content processing is described in PRIVACY.md.

See [Mozilla's data-consent documentation](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) and [browser-specific manifest settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings) for the declaration and signing requirements.

## Safari

**The Safari version is untested in Safari.** WebKit fixture checks do not establish Safari extension compatibility.

The Safari ZIP is a web-extension source package. It must be packaged as a Safari extension app before it can be installed.

Apple offers the [Safari Web Extension Packager in App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect), which can package the extension from a browser without a Mac or Xcode. It requires Apple Developer Program enrollment. Test the resulting app in Safari with access granted to the Trakt website before submitting it for distribution.

A Playwright WebKit fixture verifies the shared page code and layout. It does not verify Apple's extension wrapper, Safari website-permission prompts or the current live Trakt site. Real Safari extension testing remains required.

## Validation for 1.0.1

- All 38 date, bridge and DOM checks pass.
- The calendar fixture passes with normal and overlay document scrollbars in Chromium, Firefox and WebKit, including dragging the protected calendar thumb to the footer.
- The generated Firefox package loads as a real temporary add-on, and its MAIN/ISOLATED event bridge successfully performs a native week jump.
- Mozilla validation reports zero errors, notices and warnings.
- Real Safari app installation and signed-in account actions remain unverified.
