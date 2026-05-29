# Codecov CLI Maintenance

This document covers management of the Codecov CLI binary used in CI —
version updates, GPG key rotation, and fingerprint verification.

## Current Values

Set in **Organization → Settings → Secrets and variables → Actions → Variables**.

| Variable                  | Value                                               |
| ------------------------- | --------------------------------------------------- |
| `CODECOV_GPG_KEY`         | Full ASCII-armored PGP public key                   |
| `CODECOV_GPG_FINGERPRINT` | `2703 4E7F DB85 0E0B BC2C 62FF 806B B28A ED77 9869` |
| `CODECOV_VERSION`         | `v11.2.8`                                           |

## Updating the CLI Version

### When to Update

- A new CLI version fixes a known bug or security vulnerability that affects us.
- A required feature is only available in a newer version.
- The current version produces errors or unexpected behavior.

**To reduce supply chain risk**, observe a minimum **30-day delay** between a
new version's release and updating `CODECOV_VERSION`. This allows time for:

- Community detection of regressions or malicious releases
- Patch releases for any critical issues in the new version

For routine updates, a **quarterly cadence** is recommended — batch version bumps
into a single maintenance window rather than updating immediately on every
release.

### How to Check the Latest Version

```bash
# API endpoint (returns version metadata)
curl -s https://cli.codecov.io/api/linux/latest
```

OR  
Visit Codecov CLI [GitHub releases](https://github.com/getsentry/prevent-cli/releases).

### How to Update

In GitHub → **Organization → Settings → Secrets and variables → Actions → Variables**,
update `CODECOV_VERSION` to the new version string (e.g., `v11.3.0`).

No code changes or PR needed. The next CI run will download the specified
version. Verify the version in the CI logs under the upload step output.

## GPG Key Rotation

### When to Rotate

- Codecov announces a new signing key or the current key expires.
- The `gpgv` step in CI fails with a signature verification error.
- A security audit or incident requires key rotation.

### Rotation Procedure

#### 1. Obtain and Verify the New Key

```bash
curl -fsSL https://keybase.io/codecovsecurity/pgp_keys.asc -o /tmp/codecov_new.asc
gpg --show-keys --fingerprint /tmp/codecov_new.asc
```

Confirm the fingerprint and key ID matches what [Codecov publishes](https://docs.codecov.com/docs/codecov-uploader#integrity-checking-the-codecov-cli).

#### 2. Update the Key Variable

Copy the full ASCII-armored key content (including `-----BEGIN PGP PUBLIC KEY BLOCK-----` and `-----END PGP PUBLIC KEY BLOCK-----` markers).

In GitHub → **Organization → Settings → Secrets and variables → Actions → Variables**, paste the content into `CODECOV_GPG_KEY`.

#### 3. Update the Fingerprint Variable

In GitHub → **Organization → Settings → Secrets and variables → Actions → Variables**, update `CODECOV_GPG_FINGERPRINT` to the new fingerprint.

#### 4. Verify

Trigger a CI run and confirm:

- The GPG key imports without error
- The fingerprint check passes
- `gpgv` successfully verifies the binary signature
- Coverage, test results, and bundle analysis upload successfully

## Verification Chain

1. The key is written from `$CODECOV_GPG_KEY` to a temp file and imported via `gpg --import`.
2. `gpg --fingerprint` prints the key fingerprint, matched against `$CODECOV_GPG_FINGERPRINT`. CI aborts if it doesn't match.
3. The CLI binary, its SHA256SUM, and signature are downloaded from `cli.codecov.io`.
4. `gpgv` verifies the SHA256SUM file is signed by the imported key.
5. `sha256sum -c` confirms the binary hash matches.
