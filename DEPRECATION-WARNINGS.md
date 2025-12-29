# Deprecation Warnings - Expected Behavior

## Overview

When running `npm install`, you may see deprecation warnings for the following packages:

1. **`lodash.isequal@4.5.0`** - Deprecated in favor of `require('node:util').isDeepStrictEqual`
2. **`fstream@1.0.12`** - Package is no longer supported

## Why These Warnings Appear

These are **transitive dependencies** (dependencies of dependencies), not direct dependencies of this project:

- `lodash.isequal` comes from: `exceljs` → `fast-csv` → `@fast-csv/format`
- `fstream` comes from: `exceljs` → `unzipper`

## Are These Security Issues?

**No.** These are deprecation warnings, not security vulnerabilities. The packages still function correctly, they're just no longer actively maintained.

## Current Status

- ✅ **Security**: No known vulnerabilities in these packages
- ⚠️ **Maintenance**: Packages are deprecated but still functional
- 📦 **Source**: Transitive dependencies from `exceljs`

## What We Can Do

### Option 1: Accept the Warnings (Recommended)
These warnings are informational and don't affect functionality. The packages are used by `exceljs`, which is actively maintained and secure.

### Option 2: Monitor for Updates
Watch for updates to `exceljs` that may remove these deprecated dependencies in future versions.

### Option 3: Use npm overrides (Not Recommended)
We could use npm overrides to replace these packages, but this could break functionality since:
- `lodash.isequal` has a different API than `util.isDeepStrictEqual`
- `fstream` is a file stream library with specific functionality

## Recommendation

**Accept these warnings as expected behavior.** They don't pose a security risk and don't affect application functionality. The `exceljs` package maintainers will address these in future updates.

## Related Packages

- `exceljs@4.4.0` - Main package using these dependencies
- `fast-csv@4.3.6` - CSV processing library
- `unzipper@0.10.14` - ZIP file handling

## Checking for Updates

To check if newer versions of `exceljs` are available:

```bash
npm outdated exceljs
```

To update `exceljs` (if a newer version is available):

```bash
npm install exceljs@latest
```

