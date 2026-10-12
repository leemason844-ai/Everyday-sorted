V52.4 TEST BUILD — NOT FOR LIVE GITHUB PAGES MAIN BRANCH

This build retains all V52.3 assets, recipe publishing, photographs and functionality.
Adds opt-in manual cloud save/load in More. Guest planning remains local.
Requires public.user_meal_plans with RLS policies (already set up in Supabase).

IMPORTANT: This package is NOT an automatically deployed test site. GitHub Pages currently serves main only.
DO NOT upload this full package to main or change GitHub Pages settings.
For a test-branch patch, use the companion THREE-FILE PATCH ZIP.
If deploying to a separate Pages host, REMOVE CNAME and verify Supabase allowed auth redirect URLs.

Before production: test two accounts, cross-device save/load, guest mode, existing plan backups,
recipe publication, images, and login/logout. Manual sync does not update automatically.
