# Free Code Signing Guide

## TL;DR: There's No Truly Free Code Signing

**Reality Check**: Code signing certificates for production use cost money ($200-$500/year) because they require identity verification and trust infrastructure.

## Options for Limited Budget

### ✅ **Option 1: Build Without Signing (Recommended)**

**Best for**: Internal use, testing, small deployments, personal projects

**How it works**:
- Don't set `CSC_LINK` or `CSC_KEY_PASSWORD` environment variables
- Build completes successfully
- Users see "Unknown Publisher" warning but can click "Run anyway"

**Pros**:
- ✅ Completely free
- ✅ App works normally
- ✅ No technical barriers

**Cons**:
- ⚠️ Users see security warning
- ⚠️ May reduce user trust
- ⚠️ Some corporate firewalls block unsigned apps

**User Experience**:
- Windows: "Windows protected your PC" → Click "More info" → "Run anyway"
- macOS: "App is damaged" → System Preferences → Security → "Open Anyway"
- Linux: No warning (no signing required)

### ❌ **Option 2: Self-Signed Certificates (Not Recommended)**

**Why it's not useful**:
- Creates certificate that only you trust
- Operating systems still show warnings
- Provides no security benefit over no signing
- Same user experience as unsigned

**When to use**: Only for testing your signing process, not for distribution.

### 🎁 **Option 3: Free for Open Source**

Some organizations provide free certificates for qualifying open source projects:

1. **SignPath.io**
   - Free for open source projects
   - Requires project approval
   - Visit: https://signpath.io/

2. **DigiCert Open Source Program**
   - Limited availability
   - Must apply and be approved
   - For significant open source projects

3. **Sponsorships**
   - Some companies sponsor certificates for open source
   - Usually requires significant project visibility

### 💰 **Option 4: Affordable Certificates**

If you have a small budget:

**Cheapest Options**:
- **Certum**: ~$200/year (European, good value)
- **Sectigo**: ~$200/year (popular, widely accepted)
- **K Software**: ~$180/year (budget option)

**Note**: Prices vary, shop around. Look for:
- First-year discounts
- Multi-year discounts
- Reseller deals

## Cost Comparison

| Option | Cost | User Experience | Trust Level |
|--------|------|-----------------|-------------|
| **No Signing** | Free | Warning (can bypass) | Low |
| **Self-Signed** | Free | Warning (can bypass) | Low (same as no signing) |
| **Cheap CA** | ~$200/year | No warning | Medium |
| **Premium CA** | ~$400/year | No warning | High |

## Recommendations by Use Case

### Personal Project / Learning
→ **No signing** (free, acceptable for personal use)

### Internal Company Tool
→ **No signing** (if IT allows) or **cheap certificate** (if required)

### Small Business / Startup
→ **Cheap certificate** ($200/year) if distributing to customers

### Open Source Project
→ **Apply for free certificate** (SignPath.io) or **no signing** if rejected

### Commercial Product
→ **Standard certificate** ($200-$400/year) - cost of doing business

## How to Build Without Signing

### Step 1: Remove/Don't Set Environment Variables

**Windows (PowerShell)**:
```powershell
# Don't set these, or remove if already set
# $env:CSC_LINK = "..."
# $env:CSC_KEY_PASSWORD = "..."
```

**macOS/Linux (Bash)**:
```bash
# Don't set these
# export CSC_LINK="..."
# export CSC_KEY_PASSWORD="..."
```

### Step 2: Build Normally

```bash
npm run electron:build:win
```

The build will complete successfully without signing.

### Step 3: Distribute

Users will see a warning but can proceed:
- **Windows**: "More info" → "Run anyway"
- **macOS**: System Preferences → Security → "Open Anyway"

## When You MUST Have Signing

You need a certificate if:
- ✅ Distributing through Microsoft Store
- ✅ Distributing through Mac App Store
- ✅ Enterprise deployment (many companies block unsigned apps)
- ✅ High-trust applications (financial, medical, etc.)
- ✅ Large user base (reduces support burden)

## Budget Planning

If you need signing but have limited budget:

1. **Start without signing** - Validate your product first
2. **Get certificate later** - When you have revenue/users
3. **Consider it marketing cost** - $200/year is reasonable for professional appearance
4. **Tax deduction** - Business expense if applicable

## Alternative: Use Web App

If code signing cost is prohibitive:
- Consider deploying as web app instead
- No signing needed
- Easier updates
- Cross-platform automatically

## Summary

**For most developers starting out**: Build without signing. It's free, works fine, and users can bypass the warning. Get a certificate later when you have budget or need.

**The warning is not a blocker** - it's just Microsoft/Apple being cautious. Users can easily proceed.

---

**Bottom Line**: Don't let code signing cost stop you from shipping. Build without it, validate your product, then invest in signing when it makes business sense.

