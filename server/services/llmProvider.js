/**
 * LLM Provider Registry
 *
 * Controls which AI backend Quantix uses — configured entirely via environment
 * variables. No code changes needed when switching providers.
 *
 * ─── Configuration ────────────────────────────────────────────────────────────
 *  LLM_PROVIDER  — which provider to use (default: "gemini")
 *                  supported values: gemini | openai | azure | anthropic | groq | ollama
 *
 *  LLM_MODEL     — override the default model for the selected provider (optional)
 *                  e.g. "gpt-4-turbo", "claude-3-5-sonnet-20241022", "llama3"
 *
 *  LLM_BASE_URL  — override the base URL (required for azure; optional for ollama)
 *                  e.g. "https://my-instance.openai.azure.com/openai/deployments/my-model"
 *
 * ─── Provider → API key mapping ───────────────────────────────────────────────
 *  gemini      → GEMINI_API_KEY
 *  openai      → OPENAI_API_KEY
 *  azure       → AZURE_OPENAI_API_KEY   (+ LLM_BASE_URL required)
 *  anthropic   → ANTHROPIC_API_KEY
 *  groq        → GROQ_API_KEY
 *  ollama      → no key needed (local server)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OpenAI    = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// ─── Provider definitions ─────────────────────────────────────────────────────

const PROVIDERS = {
  gemini: {
    label:          'Google Gemini',
    clientType:     'openai-compat',
    baseURL:        'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv:      'GEMINI_API_KEY',
    defaultModel:   'gemini-2.5-flash',
    supportsJsonMode: true,
  },
  openai: {
    label:          'OpenAI',
    clientType:     'openai-compat',
    baseURL:        null,
    apiKeyEnv:      'OPENAI_API_KEY',
    defaultModel:   'gpt-4o',
    supportsJsonMode: true,
  },
  azure: {
    label:          'Azure OpenAI',
    clientType:     'openai-compat',
    baseURL:        null,  // must be set via LLM_BASE_URL
    apiKeyEnv:      'AZURE_OPENAI_API_KEY',
    defaultModel:   null,  // must be set via LLM_MODEL (deployment name)
    supportsJsonMode: true,
  },
  anthropic: {
    label:          'Anthropic Claude',
    clientType:     'anthropic',
    baseURL:        null,
    apiKeyEnv:      'ANTHROPIC_API_KEY',
    defaultModel:   'claude-opus-4-5',
    supportsJsonMode: false,  // uses text output — JSON extracted via safeParseJSON
  },
  groq: {
    label:          'Groq',
    clientType:     'openai-compat',
    baseURL:        'https://api.groq.com/openai/v1',
    apiKeyEnv:      'GROQ_API_KEY',
    defaultModel:   'llama-3.3-70b-versatile',
    supportsJsonMode: true,
  },
  ollama: {
    label:          'Ollama (local)',
    clientType:     'openai-compat',
    baseURL:        'http://localhost:11434/v1',
    apiKeyEnv:      null,  // no key required for local Ollama
    defaultModel:   'llama3',
    supportsJsonMode: false,  // depends on model; default off for safety
  },
};

// ─── Active provider resolution ───────────────────────────────────────────────

function getActiveProviderConfig() {
  const providerName = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const config = PROVIDERS[providerName];

  if (!config) {
    const valid = Object.keys(PROVIDERS).join(', ');
    throw new Error(
      `Unknown LLM_PROVIDER "${providerName}". Valid options: ${valid}`
    );
  }

  // Azure requires a base URL
  if (providerName === 'azure' && !process.env.LLM_BASE_URL) {
    throw new Error('LLM_BASE_URL is required when LLM_PROVIDER=azure.');
  }

  // Azure requires a model (deployment) name
  if (providerName === 'azure' && !config.defaultModel && !process.env.LLM_MODEL) {
    throw new Error('LLM_MODEL (deployment name) is required when LLM_PROVIDER=azure.');
  }

  // Resolve final values — LLM_BASE_URL and LLM_MODEL override provider defaults
  const baseURL = process.env.LLM_BASE_URL || config.baseURL;
  const model   = process.env.LLM_MODEL    || config.defaultModel;

  // Validate that the required API key is present (skip for Ollama)
  if (config.apiKeyEnv && !process.env[config.apiKeyEnv]) {
    throw new Error(
      `${config.apiKeyEnv} environment variable is required for provider "${providerName}".`
    );
  }

  return {
    name:             providerName,
    label:            config.label,
    clientType:       config.clientType,
    baseURL,
    apiKey:           config.apiKeyEnv ? process.env[config.apiKeyEnv] : 'ollama',
    model,
    supportsJsonMode: config.supportsJsonMode,
  };
}

// ─── Client singletons ────────────────────────────────────────────────────────

let _cachedProvider = null;
let _openaiClient   = null;
let _anthropicClient = null;

function getClients() {
  const provider = getActiveProviderConfig();

  // Bust cache if provider name changed at runtime
  if (_cachedProvider !== provider.name) {
    _cachedProvider  = provider.name;
    _openaiClient    = null;
    _anthropicClient = null;
  }

  if (provider.clientType === 'anthropic') {
    if (!_anthropicClient) {
      _anthropicClient = new Anthropic({ apiKey: provider.apiKey });
    }
    return { type: 'anthropic', client: _anthropicClient, provider };
  }

  // openai-compat
  if (!_openaiClient) {
    const opts = { apiKey: provider.apiKey };
    if (provider.baseURL) opts.baseURL = provider.baseURL;
    _openaiClient = new OpenAI(opts);
  }
  return { type: 'openai-compat', client: _openaiClient, provider };
}

// ─── Public info (safe to expose in API response) ─────────────────────────────

function getProviderInfo() {
  const provider = getActiveProviderConfig();
  return {
    provider: provider.name,
    label:    provider.label,
    model:    provider.model,
    supportsJsonMode: provider.supportsJsonMode,
  };
}

module.exports = { getClients, getProviderInfo };
