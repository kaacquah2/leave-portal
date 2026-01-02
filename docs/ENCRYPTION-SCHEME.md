# Encryption Scheme Documentation

## Overview

This document describes the encryption scheme used for secure token storage in the Electron application. This documentation is intended for security audits and compliance reviews.

## Architecture

The application uses a **two-tier encryption strategy**:

1. **Primary**: Electron's `safeStorage` API (hardware-backed when available)
2. **Fallback**: AES-256-GCM file-based encryption

## Encryption Methods

### 1. Electron safeStorage (Primary)

**Platform Support:**
- **macOS**: Uses Keychain Services (hardware-backed on T2/M-series chips)
- **Windows**: Uses Windows Credential Manager (DPAPI - hardware-backed on TPM-enabled systems)
- **Linux**: Uses Secret Service API (libsecret)

**Advantages:**
- Hardware-backed encryption when available (TPM, Secure Enclave)
- OS-level key management
- Automatic key rotation by OS
- No application-managed keys

**Implementation:**
```javascript
const encrypted = safeStorage.encryptString(token);
// Encrypted data is stored in base64 format
```

### 2. AES-256-GCM (Fallback)

**Algorithm**: AES-256-GCM (Galois/Counter Mode)

**Key Features:**
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 16 bytes (128 bits)
- **Auth Tag**: 16 bytes (128 bits)
- **Mode**: GCM (provides authenticated encryption - tamper protection)

**Key Derivation:**
- **Method**: PBKDF2 (Password-Based Key Derivation Function 2)
- **Hash Function**: SHA-256
- **Iterations**: 100,000
- **Salt**: SHA-256 hash of (appName + userDataPath)
- **Key Length**: 32 bytes (256 bits)

**Key Derivation Process:**
```javascript
salt = SHA256(appName + userDataPath)
key = PBKDF2(appName + userDataPath, salt, 100000, 32, 'sha256')
```

**Encryption Process:**
1. Generate random 16-byte IV (cryptographically secure)
2. Create AES-256-GCM cipher with derived key and IV
3. Encrypt token data
4. Get 16-byte authentication tag
5. Store: IV (32 hex chars) + AuthTag (32 hex chars) + EncryptedData

**Format:**
```
[IV: 32 hex chars][AuthTag: 32 hex chars][EncryptedData: variable length hex]
```

## Security Properties

### Confidentiality
- ✅ AES-256 encryption (256-bit keys)
- ✅ Random IV for each encryption (prevents pattern analysis)
- ✅ Hardware-backed keys when available (TPM, Secure Enclave)

### Integrity
- ✅ GCM authentication tag (detects tampering)
- ✅ File permissions (0o600 - owner read/write only)

### Availability
- ✅ Fallback mechanism if safeStorage unavailable
- ✅ Backward compatibility with legacy CBC encryption

## Key Management

### Current Implementation

**Key Derivation:**
- Uses application name and user data path
- Deterministic (same app/user = same key)
- No external key storage required

**Limitations:**
- Key is derived from application metadata (not hardware-backed in fallback mode)
- No key rotation mechanism (yet)

### Future Enhancements

**Planned Improvements:**
1. **Hardware-Backed Keys**: Prefer TPM/Secure Enclave when available
2. **Key Rotation**: Periodic key rotation for long-term security
3. **Key Migration**: Seamless migration between encryption methods

## Key Rotation Strategy

### Design Goals
- Zero-downtime rotation
- Backward compatibility during transition
- Automatic migration to new keys

### Implementation Plan

**Phase 1: Dual Encryption**
- Encrypt with both old and new keys
- Decrypt with either key (try new first, fallback to old)

**Phase 2: Migration**
- On successful decryption with new key, re-encrypt with new key only
- Mark old key as deprecated

**Phase 3: Cleanup**
- After migration period, remove old key support
- Update metadata to indicate new key version

## Migration Path

### From CBC to GCM
✅ **Completed**: Automatic migration on read
- Detects encryption method from metadata
- Supports both CBC and GCM decryption
- New tokens use GCM

### From File-Based to safeStorage
✅ **Completed**: Automatic upgrade
- Checks if safeStorage is available
- Migrates to safeStorage on next write
- Maintains fallback for compatibility

### Future: Key Rotation
🔄 **Planned**: Version-based key rotation
- Metadata includes key version
- Multiple key versions supported during transition
- Automatic re-encryption with new key

## Threat Model

### Protected Against
- ✅ Token theft from disk (encrypted at rest)
- ✅ Token tampering (GCM authentication tag)
- ✅ Unauthorized access (file permissions)
- ✅ Key extraction (hardware-backed when available)

### Not Protected Against
- ⚠️ Memory dumps (tokens in plaintext in memory)
- ⚠️ Process inspection (tokens accessible to Electron main process)
- ⚠️ Malware with root/admin access

**Note**: These are inherent limitations of application-level encryption. For maximum security, consider using OS-level credential stores exclusively.

## Compliance Considerations

### FIPS 140-2
- AES-256-GCM is FIPS-approved
- PBKDF2 is FIPS-approved
- Hardware-backed keys (TPM) are FIPS-validated when available

### GDPR
- ✅ Encryption at rest
- ✅ Access controls (file permissions)
- ✅ Secure key management

### HIPAA (if applicable)
- ✅ Encryption of sensitive data
- ✅ Access controls
- ⚠️ Audit logging (to be implemented)

## Recommendations

1. **Prefer safeStorage**: Always use hardware-backed storage when available
2. **Regular Audits**: Review encryption implementation annually
3. **Key Rotation**: Implement key rotation for long-term deployments
4. **Monitoring**: Log encryption method usage for security monitoring
5. **Documentation**: Keep this document updated with any changes

## References

- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [NIST SP 800-38D (GCM)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [NIST SP 800-132 (PBKDF2)](https://csrc.nist.gov/publications/detail/sp/800-132/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

