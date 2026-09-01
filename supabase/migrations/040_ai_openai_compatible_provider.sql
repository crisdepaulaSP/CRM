-- ============================================================
-- 040_ai_openai_compatible_provider
--
-- Adds a third AI provider option: `openai_compatible`. Many hosts
-- speak the exact OpenAI Chat Completions wire format at a different
-- base URL — Groq, OpenRouter, Together, DeepSeek, a local Ollama, etc.
-- Several of those have a genuinely free tier (Groq serves Kimi K2 as
-- `moonshotai/kimi-k2-instruct` at no cost), so this is the path to a
-- free AI agent without writing a bespoke adapter per host.
--
-- Two changes:
--
--   1. `ai_configs.base_url` — the OpenAI-compatible endpoint root
--      (scheme + host, e.g. https://api.groq.com/openai/v1). NULL for
--      the built-in `openai` / `anthropic` providers, which have fixed
--      URLs baked into their adapters. Required when provider is
--      `openai_compatible` (enforced by the CHECK below).
--
--   2. The `provider` CHECK constraints on `ai_configs` (migration 029)
--      and `ai_usage_log` (migration 033) are widened to allow the new
--      value. Both were created inline and unnamed, so Postgres named
--      them `<table>_provider_check`; we drop and re-add under the same
--      name.
-- ============================================================

ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS base_url text;

ALTER TABLE ai_configs
  DROP CONSTRAINT IF EXISTS ai_configs_provider_check;

ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'openai_compatible'));

-- A custom endpoint is meaningless without its URL; a built-in provider
-- must not carry a stray one.
ALTER TABLE ai_configs
  DROP CONSTRAINT IF EXISTS ai_configs_base_url_check;

ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_base_url_check
  CHECK (
    (provider = 'openai_compatible' AND base_url IS NOT NULL)
    OR (provider <> 'openai_compatible' AND base_url IS NULL)
  );

ALTER TABLE ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;

ALTER TABLE ai_usage_log
  ADD CONSTRAINT ai_usage_log_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'openai_compatible'));
