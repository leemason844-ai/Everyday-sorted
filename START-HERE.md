# Everyday Sorted V52.2.2 — app fixes

This package fixes functional problems in the uploaded V52.2.1 batch-one archive. It is a beta update, not a completed 65-photo release. Use this document and CURRENT-PHOTO-AUDIT.csv rather than the older review notes retained in the archive.

## Fixed

- Repeated update banner: app and version.json now use the same version number.
- Shopping no longer includes breakfast/lunch before a weekly plan exists.
- Breakfast/lunch toggle immediately refreshes the visible planner.
- Printed cost uses the actual serving count for every meal, including skipped meals.
- Vegetarian generation and daytime swaps exclude meat/fish recipes; swaps respect ingredient exclusions.
- Meal style and ingredient exclusions persist after reopening.
- Duplicate recipe names consolidated: 65 unique dinners remain.
- Corrected pork-steak, courgette, spaghetti, cheese, milk and passata units; teaspoon/tablespoon/stock units now display consistently in meal ingredients and shopping.
- Malformed saved state is normalized before rendering; valid saved plans remain supported.
- Removed stale recipe count/version labels.
- Three image references now use larger existing versions; the unrelated glazed-chicken image no longer represents the Eid pilaf. All original image files and the ten batch-one images are retained byte-for-byte.

## Testing

16 automated checks passed in jsdom, with no script errors. Tests cover startup, recipe uniqueness/methods, image file existence, generation, skipped meals, print totals, full-day toggle, ingredient units, vegetarian generation/swaps, exclusions, pantry controls, saved-data reload, malformed-state recovery, search/favourites, zero portions and version checks.

Full visual browser and iPhone/Safari testing was not completed: the Chromium download failed in this environment. Feedback delivery and live hosting were not tested. No live website or GitHub repository was changed.

## Photos still outstanding

24 of the 65 dinners have no assigned image. 33 assigned images have a dimension below 250 pixels. Existing generated images may show ingredients or garnish that differ from the recipe. See CURRENT-PHOTO-AUDIT.csv for each recipe. No new images were generated.

## Upload

1. Back up the current GitHub files and use More → Back up my data on your phone.
2. Extract this ZIP. Upload its contents to the same repository folder that currently contains index.html (not the ZIP itself or an enclosing folder).
3. Commit the files and wait for your existing Netlify deployment to finish.
4. Reopen the app. The header should show V52.2.2. Generate a plan, change one serving count, and check Shopping on your iPhone.

No build command or new dependency is required. Keep the existing hosting and domain settings.
