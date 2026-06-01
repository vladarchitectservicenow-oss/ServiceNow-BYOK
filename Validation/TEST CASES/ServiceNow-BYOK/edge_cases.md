# Edge Cases — BYOK Autoconfigurator (x_byok)

## Input Boundary Cases

| Edge Case | Trigger | Expected Behavior | Observed Behavior (v1.0.0) |
|-----------|---------|-------------------|---------------------------|
| Empty string provider | `autoconfigure('', {})` | `Failed Prerequisites` — provider plugin name resolves to undefined | `Failed Prerequisites` with "Provider plugin not found: undefined" |
| Very long endpoint URL (> 2000 chars) | `config.endpoint = 'https://' + 'a'.repeat(2000) + '.com'` | Stored in DB without truncation | Accepted as-is; GlideRecord field limits (4000 chars) not exceeded |
| Null config object | `autoconfigure('azure_openai', null)` | TypeError in `_validatePrerequisites` — config is not accessed there, but `_testConnectivity` uses `config.endpoint` | `_testConnectivity` will crash on `null.endpoint` |
| Provider name with leading/trailing whitespace | `autoconfigure('  azure_openai  ', config)` | Key lookup in providerPlugins map fails silently | Provider not found — should trim input |
| Unicode characters in model name | `config.model = 'gpt-4-α'` | Stored as-is in `x_byok_provider_config` | Stored correctly; ServiceNow string fields support UTF-8 |
| Missing `api_key` in config (required for connectivity but not used by validation) | `config = { endpoint: '...' }` without `api_key` | Prerequisites pass; connectivity test depends on endpoint only (no auth header in v1.0.0) | Connectivity test uses generic payload without auth — will succeed/fail based on endpoint |
| Multiple providers called sequentially with different configs | 4 `autoconfigure()` calls for all providers | Each creates independent records; no cross-contamination | Independent execution confirmed; no shared state between calls |

## Operational Edge Cases

| Edge Case | Scenario | Impact |
|-----------|----------|--------|
| `x_byok_audit_log.errors` field overflow | 50+ unique errors concatenated with `; ` | Field stores as mediumtext; ServiceNow 4000 char limit may truncate |
| Instance clock skew during `execution_time_ms` calculation | NTP sync in progress during autoconfigure call | Negative time possible; mitigated by Math.abs() in v1.1.0 |
| Credential table missing (vanilla PDI without Discovery) | `discovery_credentials` table absent | `_storeInCredentialStore` returns null sys_id; `_storeCredentials` links to null credential_ref |
| AI Control Tower plugin present but not fully activated | Plugin row exists, `active=true`, but AI Control Tower UI not accessible | `_validatePrerequisites` passes, `_provisionProvider` succeeds — but actual AI Control Tower UI may not show the provider |

