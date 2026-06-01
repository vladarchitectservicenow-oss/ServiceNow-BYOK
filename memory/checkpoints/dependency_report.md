# Dependency Report — BYOK Autoconfigurator (x_byok)

## ServiceNow Platform Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| AI Control Tower (`sn_aicontrol_tower`) | Plugin | Yes, must be active | N/A — critical gate |
| Generative AI Controller | Plugin | Yes | N/A — critical gate |
| `sn_generative_ai.azure_openai` | Plugin | Conditional (Azure) | Skip Azure provider |
| `sn_generative_ai.aws_bedrock` | Plugin | Conditional (Bedrock) | Skip Bedrock provider |
| `sn_generative_ai.google_vertex` | Plugin | Conditional (Vertex AI) | Skip Vertex provider |
| `sn_generative_ai.ibm_watsonx` | Plugin | Conditional (watsonx) | Skip watsonx provider |
| `gs.getProperty()` | Server API | Yes | N/A — core platform |
| `gs.hasRole()` | Server API | Yes | N/A — core platform |
| `gs.getUserID()` | Server API | Yes | N/A — core platform |
| `gs.info()` / `gs.error()` | Server API | Yes | N/A — core platform |
| `sn_ws.RESTMessageV2` | Server API | Yes | N/A — core platform |
| `GlideRecord` | Server API | Yes | N/A — core platform |
| `Class.create()` | Server API | Yes | N/A — core platform |

## Table Dependencies

| Table | Scope | Purpose |
|-------|-------|---------|
| `x_byok_credential` | x_byok (custom) | Stores credential references (provider, endpoint, credential_ref) |
| `x_byok_provider_config` | x_byok (custom) | Provider configuration (endpoint, model, status, credential_ref) |
| `x_byok_audit_log` | x_byok (custom) | Audit trail (provider, state, errors, warnings, execution_time_ms) |
| `v_plugin` | global | Read-only — checks if provider plugins are active |
| `discovery_credentials` | global | Write — stores API keys securely |

## Role Dependencies

| Role | Required | Purpose |
|------|----------|---------|
| `ai_control_tower_admin` | Yes | Required to provision providers in AI Control Tower |
| `admin` | Yes (fallback) | Alternate access path |

## External Dependencies

| Dependency | Type | Required | Notes |
|------------|------|----------|-------|
| Provider endpoints (URLs provided by user) | HTTP endpoint | Yes | Azure OpenAI, Bedrock, Vertex AI, or watsonx API endpoints |
| API keys (per provider) | Credential | Yes | Stored via `discovery_credentials` table, never in plaintext |

## Node.js Test Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Test runner for Script Include validation |
| `assert` (built-in) | stdlib | Test assertions |
| `fs` (built-in) | stdlib | File reading for mock source loading |

