import React, { useState } from 'react';
import { Sliders, Plus, Search, Filter, Trash2, Award, ArrowRight } from 'lucide-react';
import { Feature, FeatureQualifier, FeatureRule } from '../types/domain';
import { RuleBuilderModal } from './RuleBuilderModal';

interface RuleMatrixProps {
  features: Feature[];
  qualifiers: FeatureQualifier[];
  rules: FeatureRule[];
  projectId: number;
  selectedFeatureIdFilter?: number | null;
  onClearFeatureFilter: () => void;
  onToggleRule: (ruleId: number) => void;
  onDeleteRule: (ruleId: number) => void;
  onSaveRule: (rule: Omit<FeatureRule, 'id'>) => void;
}

export const RuleMatrix: React.FC<RuleMatrixProps> = ({
  features,
  qualifiers,
  rules,
  projectId,
  selectedFeatureIdFilter,
  onClearFeatureFilter,
  onToggleRule,
  onDeleteRule,
  onSaveRule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [featureFilter, setFeatureFilter] = useState<number | 'ALL'>(
    selectedFeatureIdFilter ?? 'ALL'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state if selectedFeatureIdFilter prop changes
  React.useEffect(() => {
    if (selectedFeatureIdFilter) {
      setFeatureFilter(selectedFeatureIdFilter);
    }
  }, [selectedFeatureIdFilter]);

  const projectFeatures = features.filter((f) => f.projectId === projectId);
  const projectFeatureIds = new Set(projectFeatures.map((f) => f.id));
  const projectQualifiers = qualifiers.filter((q) => q.projectId === projectId);

  const featureMap = new Map<number, Feature>();
  features.forEach((f) => featureMap.set(f.id, f));

  const qualifierMap = new Map<number, FeatureQualifier>();
  qualifiers.forEach((q) => qualifierMap.set(q.id, q));

  const filteredRules = rules
    .filter((r) => {
      if (!projectFeatureIds.has(r.featureId)) return false;
      if (featureFilter !== 'ALL' && r.featureId !== featureFilter) return false;

      const f = featureMap.get(r.featureId);
      const q = qualifierMap.get(r.qualifierId);

      const matchSearch =
        r.qualifierValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.featureValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f && (f.code.toLowerCase().includes(searchQuery.toLowerCase()) || f.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (q && (q.code.toLowerCase().includes(searchQuery.toLowerCase()) || q.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSearch;
    })
    .sort((a, b) => {
      const qA = qualifierMap.get(a.qualifierId);
      const qB = qualifierMap.get(b.qualifierId);
      const prioA = qA ? qA.priority : 0;
      const prioB = qB ? qB.priority : 0;
      if (prioA !== prioB) return prioB - prioA;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

  return (
    <section>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div className="view-header-title-block">
          <h1>
            <Sliders size={28} color="var(--accent-primary)" />
            Configuration Rule Matrix
          </h1>
          <p>
            Evaluation rules mapping real-time request qualifiers to dynamic feature values.
          </p>
        </div>

        <div className="header-actions-group">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by rule, feature, or value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <select
              className="form-select"
              style={{ padding: '0.55rem 0.85rem' }}
              value={featureFilter}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setFeatureFilter(val);
                if (val === 'ALL') onClearFeatureFilter();
              }}
            >
              <option value="ALL">All Features</option>
              {projectFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            Add Rule
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Target Feature</th>
              <th>Qualifier Condition</th>
              <th></th>
              <th>Resolved Value</th>
              <th>Qualifier Priority</th>
              <th>Description / Notes</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                  No rules found matching the criteria. Click 'Add Rule' to create one.
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => {
                const f = featureMap.get(rule.featureId);
                const q = qualifierMap.get(rule.qualifierId);

                return (
                  <tr key={rule.id} style={{ opacity: rule.enabled ? 1 : 0.6 }}>
                    <td>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => onToggleRule(rule.id)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{f?.name ?? `Feature #${rule.featureId}`}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <code>{f?.code}</code>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="feature-code-badge">{q?.code ?? `Q#${rule.qualifierId}`}</span>
                        <span style={{ color: 'var(--text-muted)' }}>==</span>
                        <strong style={{ color: 'var(--text-code)' }}>"{rule.qualifierValue}"</strong>
                      </div>
                    </td>

                    <td>
                      <ArrowRight size={15} color="var(--accent-primary)" />
                    </td>

                    <td>
                      <span className="code-value" style={{ color: '#34d399' }}>
                        {rule.featureValue}
                      </span>
                    </td>

                    <td>
                      <span className="priority-badge">
                        <Award size={13} />
                        Priority {q?.priority ?? 0}
                      </span>
                    </td>

                    <td style={{ color: 'var(--text-secondary)', maxWidth: '280px', fontSize: '0.825rem' }}>
                      {rule.description || '—'}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon-only btn-danger"
                        title="Delete Rule"
                        onClick={() => onDeleteRule(rule.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <RuleBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveRule={onSaveRule}
        features={projectFeatures}
        qualifiers={projectQualifiers}
        defaultFeatureId={typeof featureFilter === 'number' ? featureFilter : undefined}
      />
    </section>
  );
};
