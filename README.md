f# Treeline

## Publishing updates without hurting testers' data

**Two copies of the site:**
- `main` branch → https://dawkend-gopher.github.io/Treeline/ is the real app your testers use.
- `dev` branch → https://dawkend-gopher.github.io/Treeline/dev/ is your preview. It has its own separate data, so you can break things there safely. In the preview, Setup → "Copy my real data into the preview" lets you test with your real rifles.

**The routine:** put new work on `dev`, open /dev/ on your phone and try it, then merge `dev` into `main` when you're happy. After pushing to `dev`, open the Actions tab → Deploy site → Run workflow to refresh the preview.

**Built-in protection:**
- Testers' data lives on their phones under the site address, so new versions keep it.
- Treeline keeps an automatic snapshot from each of the last 3 days it was opened (Setup → Your data).
- If saved data can't be read, or the app crashes on start, testers get a "Your data is safe" screen. Saving pauses, and they can download their data or go back to a snapshot. Nothing gets overwritten.
- Everything is stored with a format number (`SCHEMA` in js/util.js). If you change how data is stored, add a step to `MIGRATIONS` there.
- Bump `RELEASE.version` in js/config.js and write a note. Testers see it once, along with a reminder that their data is still there.
