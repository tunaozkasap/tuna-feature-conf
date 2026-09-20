import React, { useState } from 'react';
import { ToggleLeft, Plus, Search, Layers, X, Code2 } from 'lucide-react';
import { Feature, FeatureRule } from '../types/domain';

interface FeatureListProps {
  features: Feature[];
  rules: FeatureRule[];
  projectId: number;
  onToggleFeature: (featureId: number) => void;
  onSaveFeature: (feature: Omit<Feature, 'id'>) => void;
  onSelectFeatureForRules: (featureId: number) => void;
}

export const FeatureList: React.FC<FeatureListProps> = ({
  features,
  rules,
  projectId,
  onToggleFeature,
  onSaveFeature,
  onSelectFeatureForRules,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDefaultVal, setNewDefaultVal] = useState('false');

  const filteredFeatures = features.filter(
    (f) =>
      f.projectId === projectId &&
      (f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    onSaveFeature({
      code: newCode.trim().toUpperCase().replace(/\s+/g, '_'),
      name: newName.trim(),
      description: newDesc.trim(),
      projectId,
      defaultValue: newDefaultVal.trim() || 'false',
      enabled: true,
    });

    setNewCode('');
    setNewName('');
    setNewDesc('');
    setNewDefaultVal('false');
    setIsModalOpen(false);
  };

  return (
    <section>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div className="view-header-title-block">
          <h1>
            <ToggleLeft size={28} color="var(--accent-primary)" />
            Features & Toggles
          </h1>
          <p>
            Manage feature flag definitions and default fallbacks for this project.
          </p>
        </div>

        <div className="header-actions-group">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search features by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            New Feature
          </button>
        </div>
      </div>

      {filteredFeatures.length === 0 ? (
        <div
          className="glass-panel"
          style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          <ToggleLeft size={44} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No features found for this project</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Click 'New Feature' to create your first configurable flag.
          </p>
        </div>
      ) : (
        <div className="feature-grid">
          {filteredFeatures.map((feature) => {
            const featureRules = rules.filter((r) => r.featureId === feature.id);
            const activeRulesCount = featureRules.filter((r) => r.enabled).length;

            return (
              <div key={feature.id} className="feature-card">
                <div className="feature-card-header">
                  <div>
                    <span className="feature-code-badge">
                      <Code2 size={13} />
                      {feature.code}
                    </span>
                    <h3 className="feature-card-title">{feature.name}</h3>
                  </div>

                  <label className="toggle-switch" title={feature.enabled !== false ? 'Enabled' : 'Disabled'}>
                    <input
                      type="checkbox"
                      checked={feature.enabled !== false}
                      onChange={() => onToggleFeature(feature.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <p className="feature-card-desc">{feature.description || 'No description provided.'}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Default Fallback:</span>
                  <span className="code-value">{feature.defaultValue ?? 'false'}</span>
                </div>

                <div className="feature-card-stats">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={15} color="var(--accent-primary)" />
                    <span>
                      <strong>{activeRulesCount}</strong> active rule{activeRulesCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectFeatureForRules(feature.id)}
                  >
                    View Rules →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Feature Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--accent-primary)" />
                Create New Feature
              </h3>
              <button className="btn-icon-only" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFeature}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Feature Key / Code *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. DARK_MODE_V2, NEW_PRICING_TABLE"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                    autoFocus
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Standard uppercase alphanumeric key used in client code checks.
                  </small>
                </div>

                <div className="form-group">
                  <label>Display Name *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Dark Mode Experience V2"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Default Fallback Value *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. false, 100, standard, or JSON"
                    value={newDefaultVal}
                    onChange={(e) => setNewDefaultVal(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="What behavior does this feature toggle control?"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
