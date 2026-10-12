Everyday Sorted V52.5 TEST patch — NOT FOR MAIN/PRODUCTION

Contains only index.html, owner.html, version.json.

Changes: debounced automatic save after in-app plan edits, first-device auto load when no local plan, saved status, collision protection on first sign-in. Existing Save and Load buttons remain.

TEST FIRST ON A SEPARATE BRANCH/TEST DEPLOYMENT.

Caution: Returning devices with existing local data do not auto-load cloud data, to prevent overwriting edits. Use manual Load when needed. This is an intentionally conservative first release.

Suggested tests: signed-in plan edit -> saved status -> manual load; sign out/in; guest; offline save failure; second private browser; ensure no unwanted overwrite.
