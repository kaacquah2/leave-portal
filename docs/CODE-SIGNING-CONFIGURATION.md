# Code Signing Configuration

## Overview

Code signing configuration for Electron builds using electron-builder. This document explains how to configure code signing for Windows and macOS.

## Windows Code Signing

### Configuration

Code signing for Windows is configured in `package.json`:

```json
{
  "build": {
    "cscLink": "${env.CSC_LINK}",
    "cscKeyPassword": "${env.CSC_KEY_PASSWORD}",
    "win": {
      "signAndEditExecutable": false
    }
  }
}
```

### Environment Variables

Set these environment variables before building:

```bash
# Windows
CSC_LINK=/path/to/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password
```

### Certificate Requirements

- **Format**: PFX (PKCS#12) file
- **Contains**: Code signing certificate and private key
- **Issued by**: Trusted Certificate Authority (CA)

### How to Obtain

**Cost**: Typically $200-$500/year

1. **Purchase from CA**: Buy a code signing certificate from a trusted CA:
   - **DigiCert**: ~$400/year (most trusted)
   - **Sectigo (formerly Comodo)**: ~$200/year (popular, cheaper)
   - **GlobalSign**: ~$300/year
   - **Certum**: ~$200/year (European)

2. **Purchase Process**:
   - Visit CA website
   - Choose "Code Signing Certificate"
   - Complete identity verification (may take 1-3 days)
   - Download certificate
   - Export to PFX format with private key

3. **Export to PFX**: 
   - Windows: Use Certificate Manager or PowerShell
   - Export certificate with private key
   - Choose PFX format
   - Set a password

4. **Set Environment Variables**: Point `CSC_LINK` to the PFX file

### Notes

- `signAndEditExecutable: false` - Disables automatic signing (set to `true` if you have a certificate)
- Publisher name is embedded in the certificate, not in the config
- Certificate must be valid and not expired

## macOS Code Signing

### Configuration

Code signing for macOS is configured in `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "${env.APPLE_IDENTITY}",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    }
  }
}
```

### Environment Variables

Set this environment variable before building:

```bash
# macOS
APPLE_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
```

### Requirements

1. **Apple Developer Account**: Active paid membership ($99/year)
2. **Developer ID Certificate**: Issued by Apple
3. **Identity**: Format: `Developer ID Application: Your Name (TEAM_ID)`

### How to Obtain

1. **Join Apple Developer Program**: https://developer.apple.com/programs/
2. **Create Certificate**: In Apple Developer Portal, create a "Developer ID Application" certificate
3. **Download & Install**: Download and install the certificate in Keychain Access
4. **Set Identity**: Use the certificate name as `APPLE_IDENTITY`

### Notes

- `hardenedRuntime: true` - Enables macOS hardened runtime (required for notarization)
- `gatekeeperAssess: false` - Disables Gatekeeper assessment during build
- Certificate must be installed in your keychain

## Free Code Signing Options

### ❌ **There is NO free code signing for production use**

Code signing certificates must be issued by trusted Certificate Authorities (CAs), and they cost money because:
- CAs verify your identity (prevents malware)
- CAs maintain trust with operating systems
- CAs provide ongoing support and validation

### 🆓 **Free Alternatives (Limited Use)**

#### 1. **Self-Signed Certificates (NOT Recommended for Distribution)**

You can create self-signed certificates, but:
- ❌ **Windows**: Will show "Unknown Publisher" warning (same as no signing)
- ❌ **macOS**: Will show "App is damaged" warning
- ❌ **Not trusted**: Operating systems don't trust self-signed certificates
- ✅ **Free**: But provides no security benefit

**For Windows (PowerShell):**
```powershell
# Create self-signed certificate (for testing only)
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Your Name" -KeyUsage DigitalSignature -FriendlyName "Code Signing" -CertStoreLocation Cert:\CurrentUser\My

# Export to PFX
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert
Export-PfxCertificate -Cert $cert -FilePath "certificate.pfx" -Password (ConvertTo-SecureString -String "YourPassword" -Force -AsPlainText)
```

**Note**: This is only useful for testing. Users will still see warnings.

#### 2. **Open Source Projects**

Some organizations provide free certificates for open source projects:
- **SignPath.io** - Free for open source (requires approval)
- **DigiCert** - Sometimes sponsors open source projects
- **Let's Encrypt** - Only for SSL/TLS, NOT code signing

#### 3. **Build Without Signing (Recommended for Free)**

**This is the best option if you can't afford certificates:**

- ✅ **Free**: No cost
- ✅ **Works**: App functions normally
- ⚠️ **Warning**: Users see "Unknown Publisher" but can click "Run anyway"
- ✅ **Acceptable**: For internal use, testing, or small deployments

**To build without signing:**
- Simply don't set `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables
- The build will complete successfully
- Users can still install and run the app (with a warning)

## Building Without Code Signing

If you don't have code signing certificates, the build will still work but:

- **Windows**: Users may see "Unknown Publisher" warning (they can click "More info" → "Run anyway")
- **macOS**: Users may see "App is damaged" warning (can be bypassed via System Preferences)
- **Linux**: No signing required

**To build without signing:**
- Simply don't set the environment variables (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_IDENTITY`)
- The build will complete successfully
- The app will work normally, just with security warnings

## Verification

### Windows

After building, verify the signature:

```powershell
Get-AuthenticodeSignature "path\to\your\app.exe"
```

### macOS

After building, verify the signature:

```bash
codesign -dv --verbose=4 "path/to/your/app.app"
```

## Troubleshooting

### Windows

**Error: "Certificate file not found"**
- Check that `CSC_LINK` points to a valid PFX file
- Verify the file path is correct

**Error: "Invalid certificate password"**
- Verify `CSC_KEY_PASSWORD` is correct
- Check for special characters that need escaping

### macOS

**Error: "No identity found"**
- Verify `APPLE_IDENTITY` matches your certificate name exactly
- Check that certificate is installed in Keychain Access
- Run `security find-identity -v -p codesigning` to list available identities

**Error: "Hardened runtime not enabled"**
- Ensure `hardenedRuntime: true` is set
- May need entitlements file for certain capabilities

## Notarization (macOS)

For distribution outside the Mac App Store, you may need to notarize your app:

1. Build and sign the app
2. Submit to Apple for notarization
3. Staple the notarization ticket

This is typically done via CI/CD pipeline, not during local builds.

## References

- [electron-builder Windows Configuration](https://www.electron.build/configuration/win)
- [electron-builder macOS Configuration](https://www.electron.build/configuration/mac)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/code_signing_services)

---

**Note**: Code signing is optional but recommended for production releases. The app will build and run without certificates, but users may see security warnings.

