# Chrome overlay

This Manifest V3 extension adds a draggable Maya timer to the current tab. It mirrors
the web timer and keeps the same start/pause and minus/plus 30-second controls.

## Load locally

1. Run the web app at http://localhost:4173.
2. Open chrome://extensions, enable Developer mode, and choose **Load unpacked**.
3. Select this extension directory.
4. Open the web app once so the bridge can sync the timer state.
5. Open any board and click the Standup Timer toolbar button.

The toolbar click grants temporary active-tab access only to the current page. The
extension does not request browsing history, all-site access, or permanent host
permissions.

For production, replace the localhost match entries in manifest.json with the exact
hosted app origin.
