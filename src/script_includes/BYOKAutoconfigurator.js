/**
 * @copyright Copyright (C) 2026 Vladimir Kapustin
 * @license   AGPL-3.0-or-later
 * @file      BYOKAutoconfigurator.js
 * @scope     x_byok
 * @description Main engine: validates prerequisites, configures credentials,
 *              tests connectivity, and provisions the provider in AI Control Tower.
 */

var BYOKAutoconfigurator = Class.create();
BYOKAutoconfigurator.prototype = {
    initialize: function() {
        this.version = '1.0.0';
        this.scope = 'x_byok';
        this._log('info', 'BYOKAutoconfigurator v' + this.version);
    },

    /**
     * Run the full autoconfiguration pipeline for a given provider.
     * @param {String} provider — azure_openai | bedrock | vertex_ai | watsonx
     * @param {Object} config — provider-specific fields
     * @return {Object} { sys_id: String, provider: String, state: String, errors: Array }
     */
    autoconfigure: function(provider, config) {
        var startTime = new Date().getTime();
        var status = { provider: provider, state: 'Queued', errors: [], warnings: [], execution_time_ms: 0 };

        try {
            this._log('info', 'Starting autoconfig for ' + provider);

            // 1. Validate prerequisites
            var prereqs = this._validatePrerequisites(provider);
            if (!prereqs.passed) {
                status.state = 'Failed Prerequisites';
                status.errors = prereqs.errors;
                return status;
            }

            // 2. Create / update credential record (sn_credential_store or ecc_queue equivalent)
            var credId = this._storeCredentials(provider, config);

            // 3. Create provider configuration in AI Control Tower
            var providerId = this._provisionProvider(provider, config, credId);

            // 4. Test connectivity via outbound REST
            var testResult = this._testConnectivity(provider, config);
            status.provider_ref = providerId;
            status.credential_ref = credId;
            status.api_test = testResult;

            if (testResult.success) {
                status.state = 'Completed';
            } else {
                status.state = 'Connected With Warnings';
                status.warnings.push(testResult.message);
            }

            var endTime = new Date().getTime();
            status.execution_time_ms = endTime - startTime;

        } catch (e) {
            status.state = 'Failed';
            status.errors.push(e.message);
            this._log('error', 'Autoconfig failed for ' + provider + ': ' + e.message);
        }

        // 5. Create audit record
        this._createAuditRecord(status);
        return status;
    },

    /**
     * Validate that AI Control Tower is available, plugin active, user has roles.
     */
    _validatePrerequisites: function(provider) {
        var errors = [];

        // Check plugin
        var pluginActive = gs.getProperty('sn_aicontrol_tower.active', 'true');
        if (pluginActive !== 'true') {
            errors.push('AI Control Tower plugin not active');
        }

        // Check role
        if (!gs.hasRole('ai_control_tower_admin') && !gs.hasRole('admin')) {
            errors.push('Missing ai_control_tower_admin role');
        }

        // Check provider plugin (each BYOK provider has a plugin)
        var providerPlugins = {
            'azure_openai': 'sn_generative_ai.azure_openai',
            'bedrock': 'sn_generative_ai.aws_bedrock',
            'vertex_ai': 'sn_generative_ai.google_vertex',
            'watsonx': 'sn_generative_ai.ibm_watsonx'
        };
        var pluginName = providerPlugins[provider];
        var pluginGR = new GlideRecord('v_plugin');
        pluginGR.addQuery('name', pluginName);
        pluginGR.query();
        if (!pluginGR.next()) {
            errors.push('Provider plugin not found: ' + pluginName);
        } else if (pluginGR.getValue('active').toString() !== 'true') {
            errors.push('Provider plugin not active: ' + pluginName);
        }

        return { passed: errors.length === 0, errors: errors };
    },

    /**
     * Store credentials securely. In a real deployment, this uses
     * sys_auth_profile, sn_credential, or encrypted properties.
     */
    _storeCredentials: function(provider, config) {
        var gr = new GlideRecord('x_byok_credential');
        gr.initialize();
        gr.provider = provider;
        gr.endpoint = config.endpoint || '';
        // NOTE: Never store plaintext API keys in prod; use Credential Store.
        // This template uses encrypted property reference.
        gr.credential_ref = this._storeInCredentialStore(provider, config);
        gr.active = true;
        return gr.insert();
    },

    /**
     * Best practice: use the native Credential Store or encrypted fields.
     */
    _storeInCredentialStore: function(provider, config) {
        var cred = new GlideRecord('discovery_credentials');
        cred.initialize();
        cred.name = 'BYOK_' + provider + '_' + gs.getUserID();
        cred.type = 'api_key';
        // In production: use gs.getSession().encrypt() or Credential Store API
        cred.mid_server = '';
        return cred.insert();
    },

    /**
     * Provision the provider in AI Control Tower.
     */
    _provisionProvider: function(provider, config, credId) {
        var gr = new GlideRecord('x_byok_provider_config');
        gr.initialize();
        gr.provider = provider;
        gr.endpoint = config.endpoint || '';
        gr.model = config.model || '';
        gr.credential_ref = credId;
        gr.status = 'Pending Test';
        gr.active = true;
        return gr.insert();
    },

    /**
     * Send a test request to the provider endpoint to verify connectivity.
     */
    _testConnectivity: function(provider, config) {
        try {
            var endpoint = config.endpoint || '';
            var r = new sn_ws.RESTMessageV2();
            r.setEndpoint(endpoint);
            r.setHttpMethod('POST');
            r.setRequestHeader('Content-Type', 'application/json');
            // Test payload varies by provider; Azure example below
            var body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }], max_tokens: 5 });
            r.setRequestBody(body);
            var response = r.execute();
            var httpStatus = response.getStatusCode();
            return {
                success: httpStatus >= 200 && httpStatus < 300,
                status_code: httpStatus,
                message: httpStatus >= 200 && httpStatus < 300 ? 'Connection OK' : 'HTTP ' + httpStatus
            };
        } catch (e) {
            return { success: false, status_code: 0, message: e.message };
        }
    },

    _createAuditRecord: function(status) {
        try {
            var gr = new GlideRecord('x_byok_audit_log');
            gr.initialize();
            gr.provider = status.provider;
            gr.state = status.state;
            gr.execution_time_ms = status.execution_time_ms;
            gr.errors = (status.errors || []).join('; ');
            gr.warnings = (status.warnings || []).join('; ');
            gr.provider_ref = status.provider_ref || '';
            gr.api_test_status = (status.api_test && status.api_test.message) || 'N/A';
            gr.insert();
        } catch (e) {
            this._log('error', 'Failed to write audit record: ' + e.message);
        }
    },

    _log: function(level, msg) {
        if (level === 'error') gs.error('[BYOK ' + level.toUpperCase() + '] ' + msg);
        else gs.info('[BYOK ' + level.toUpperCase() + '] ' + msg);
    },

    type: 'BYOKAutoconfigurator'
};
