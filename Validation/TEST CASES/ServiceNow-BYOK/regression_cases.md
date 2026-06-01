# Regression Cases — BYOK Autoconfigurator (x_byok)

## Regression Test Catalog

Each regression case tracks a previously observed failure condition to prevent re-occurrence.

| ID | Regression Case | Root Cause | Fix Applied | Verification |
|----|----------------|------------|-------------|--------------|
| R01 | `_validatePrerequisites` returns `{ passed: true, errors: [] }` when plugin name undefined | GlideRecord `next()` returns zero rows for unknown plugin — errors.push is executed but `errors.length === 0` check passes because `pluginGR.next()` returns false before the error is pushed | Moved error push inside the `if (!pluginGR.next())` block, not after | Verify with unknown provider: `_validatePrerequisites('unknown')` → `passed: false` |
| R02 | `_storeCredentials` fails when `discovery_credentials` table missing from vanilla PDI | `discovery_credentials` is a Discovery plugin table, not guaranteed on all instances | `_storeInCredentialStore` wrapped in try/catch; falls back to `x_byok_credential.credential_ref = 'MANUAL'` | Test on PDI without Discovery plugin |
| R03 | `_testConnectivity` crashes on null endpoint | `r.setEndpoint(null)` throws TypeError in `sn_ws.RESTMessageV2` | Endpoint validated as non-empty string before `.setEndpoint()` call | Test with `config.endpoint = null` |
| R04 | Audit record `errors.join('; ')` throws when `status.errors` is undefined | `status.errors` initialized as `[]` in `autoconfigure()` but `_createAuditRecord` receives the status object — if `status.errors` is ever `undefined`, `.join()` fails | Added `(status.errors || [])` guard in `_createAuditRecord` | Test with manually constructed status object missing `errors` key |
| R05 | Provider-specific plugin name mapping incorrect for `vertex_ai` key | Mapping uses `vertex_ai` key but user passes `vertex-ai` (hyphen vs underscore) | Normalized provider key: `provider.toLowerCase().replace(/-/g, '_')` before lookup | Test `autoconfigure('vertex-ai', config)` → key normalization in `_validatePrerequisites` |
| R06 | `execution_time_ms` returns negative when `new Date().getTime()` clock skew | Rare but possible on VM clock adjustments | Changed to `Math.abs(endTime - startTime)` or `Math.max(0, endTime - startTime)` | Mock Date.now() with clock skew |
| R07 | Connectivity test payload incompatible with Bedrock (expects different body format) | `{ messages: [...], max_tokens: 5 }` is OpenAI-specific; Bedrock uses different format | Provider-specific payload mapping in `_testConnectivity` via switch on provider | Test Bedrock autoconfigure — verify test payload matches Bedrock format |
| R08 | `_createAuditRecord` creates duplicate records on retry | `autoconfigure()` always calls `_createAuditRecord` even on retry of same config | No retry logic in v1.0.0 — accepted as known behavior; each call is independent | Verify two sequential identical calls produce 2 audit records, not 1 |
| R09 | `gs.getUserID()` returns empty string in test mock, causing duplicate credential names | `_storeInCredentialStore` generates name as `BYOK_<provider>_<gs.getUserID()>` — if user ID is empty, all credentials have same name | Fallback: if `gs.getUserID().length === 0`, use `'unknown_user'` | Test with mock GS returning empty user ID |
| R10 | README duplicate section detection fails after mass-template contamination | G8 gate: `grep '^## ' README.md | sort | uniq -d` must be empty | README fully rewritten with dedup verification | Run G8 check after every README edit |

