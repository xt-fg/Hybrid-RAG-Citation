import { useState, type FormEvent } from 'react';
import type { ProviderConfig } from '../types';

interface ApiSettingsModalProps {
  open: boolean;
  config: ProviderConfig;
  isSaving: boolean;
  onClose: () => void;
  onSave: (config: ProviderConfig) => Promise<void>;
}

export function ApiSettingsModal({ open, config, isSaving, onClose, onSave }: ApiSettingsModalProps) {
  const [draft, setDraft] = useState(config);
  const [showKeys, setShowKeys] = useState(false);
  const [sameCredentials, setSameCredentials] = useState(
    !config.embedding_api_key || (
      Boolean(config.llm_api_key) && config.llm_api_key === config.embedding_api_key
        && config.llm_base_url === config.embedding_base_url
    ),
  );

  if (!open) return null;

  const update = (field: keyof ProviderConfig, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized: ProviderConfig = {
      ...draft,
      llm_api_key: draft.llm_api_key.trim(),
      llm_base_url: draft.llm_base_url.trim().replace(/\/$/, ''),
      llm_model: draft.llm_model.trim(),
      embedding_api_key: sameCredentials ? draft.llm_api_key.trim() : draft.embedding_api_key.trim(),
      embedding_base_url: (sameCredentials ? draft.llm_base_url : draft.embedding_base_url).trim().replace(/\/$/, ''),
      embedding_model: draft.embedding_model.trim(),
    };
    await onSave(normalized);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onClose();
    }}>
      <section className="api-modal" role="dialog" aria-modal="true" aria-labelledby="api-settings-title">
        <header>
          <div>
            <span className="eyebrow">MODEL PROVIDER</span>
            <h2 id="api-settings-title">API 配置</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="关闭">×</button>
        </header>

        <div className="api-priority-note">
          <span>前端配置优先</span>
          请求会优先使用这里的配置；字段留空时才使用服务器环境变量。
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>回答模型</legend>
            <label className="api-field full-field">
              <span>API Key</span>
              <div className="secret-input">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={draft.llm_api_key}
                  onChange={(event) => update('llm_api_key', event.target.value)}
                  placeholder="留空则使用后端 LLM_API_KEY"
                  autoComplete="off"
                />
                <button type="button" onClick={() => setShowKeys((value) => !value)}>{showKeys ? '隐藏' : '显示'}</button>
              </div>
            </label>
            <label className="api-field">
              <span>Base URL</span>
              <input value={draft.llm_base_url} onChange={(event) => update('llm_base_url', event.target.value)} placeholder="https://api.openai.com/v1" />
            </label>
            <label className="api-field">
              <span>模型</span>
              <input value={draft.llm_model} onChange={(event) => update('llm_model', event.target.value)} placeholder="gpt-4o-mini" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Embedding 模型</legend>
            <label className="same-config-toggle">
              <input type="checkbox" checked={sameCredentials} onChange={(event) => setSameCredentials(event.target.checked)} />
              使用相同 Key 和地址
            </label>
            {!sameCredentials && (
              <label className="api-field full-field">
                <span>Embedding API Key</span>
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={draft.embedding_api_key}
                  onChange={(event) => update('embedding_api_key', event.target.value)}
                  placeholder="留空则使用后端 EMBEDDING_API_KEY"
                  autoComplete="off"
                />
              </label>
            )}
            {!sameCredentials && (
              <label className="api-field">
                <span>Base URL</span>
                <input value={draft.embedding_base_url} onChange={(event) => update('embedding_base_url', event.target.value)} placeholder="https://api.openai.com/v1" />
              </label>
            )}
            <label className={`api-field ${sameCredentials ? 'full-field' : ''}`}>
              <span>Embedding 模型</span>
              <input value={draft.embedding_model} onChange={(event) => update('embedding_model', event.target.value)} placeholder="text-embedding-3-small" />
            </label>
          </fieldset>

          <div className="api-security-note">
            密钥仅保存在当前浏览器标签页的 sessionStorage 中，并随相关请求发送到本服务。请勿在不受信任的设备上保存密钥。
          </div>

          <footer>
            <button className="modal-cancel" type="button" onClick={onClose} disabled={isSaving}>取消</button>
            <button className="modal-save" type="submit" disabled={isSaving}>
              {isSaving ? <><span className="spinner" /> 正在保存并更新索引</> : '保存配置'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
