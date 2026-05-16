# ServiceNow BYOK Autoconfigurator

**Copyright (C) 2026 Vladimir Kapustin**  
**SPDX-License-Identifier: AGPL-3.0-or-later**

## What is this?

The **BYOK Autoconfigurator** eliminates the manual, error-prone steps needed to connect ServiceNow Australia’s **Generative AI Controller** to external LLM providers:

- **Azure OpenAI**
- **Amazon Bedrock**
- **Google Vertex AI**
- **IBM watsonx**

## Why it matters

Reddit pain: _"Admin wasn't able to install the Generative AI Controller plugins."_  
Root cause: BYOK setup requires manual credential exchange, endpoint construction, and AI Control Tower navigation. ADIS tells you what’s broken; **BYOK fixes the AI connection.**

## Quick Start

```javascript
var byok = new BYOKAutoconfigurator();
var result = byok.autoconfigure('azure_openai', {
    endpoint: 'https://your-resource.openai.azure.com/openai/deployments/gpt-4',
    model: 'gpt-4',
    api_key: 'YOUR_KEY_HERE'  // stored securely via Credential Store
});
gs.info('State: ' + result.state + ' | Errors: ' + result.errors.length);
```

## Tables

| Table | Purpose |
|-------|---------|
| `x_byok_provider_config` | Stores provider endpoint + model + status |
| `x_byok_audit_log` | Audit trail of every autoconfig run |

## License

AGPL-3.0-only. Commercial use requires separate agreement with Vladimir Kapustin.
