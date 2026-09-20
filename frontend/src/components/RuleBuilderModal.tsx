import React, { useState } from 'react';
import { X, Sliders, ArrowRight } from 'lucide-react';
import { Feature, FeatureQualifier, FeatureRule } from '../types/domain';

interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: Omit<FeatureRule, 'id'>) => void;
  features: Feature[];
  qualifiers: FeatureQualifier[];
  defaultFeatureId?: number;
}

export const RuleBuilderModal: React.FC<RuleBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  features,
  qualifiers,
  defaultFeatureId,
}) => {
  const [featureId, setFeatureId] = useState<number>(
    defaultFeatureId || (features.length > 0 ? features[0].id : 0)
  );
  const [qualifierId, setQualifierId] = useState<number>(
    qualifiers.length > 0 ? qualifiers[0].id : 0
  );
  const [qualifierValue, setQualifierValue] = useState('');
  const [featureValue, setFeatureValue] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const selectedFeature = features.find((f) => f.id === featureId);
  const selectedQualifier = qualifiers.find((q) => q.id === qualifierId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureId || !qualifierId || !qualifierValue.trim() || !featureValue.trim()) {
      return;
    }

    onSaveRule({
      featureId,
      qualifierId,
      qualifierValue: qualifierValue.trim(),
      featureValue: featureValue.trim(),
      priority: Number(priority) || 1,
      enabled: true,
      description: description.trim(),
    });

    setQualifierValue('');
    setFeatureValue('');
    setDescription('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} color="var(--accent-primary)" />
            Configure Feature Override Rule
          </h3>
          <button className="btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Target Feature *</label>
                <select
                  className="form-select"
                  value={featureId}
                  onChange={(e) => setFeatureId(Number(e.target.value))}
                  required
                >
                  {features.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Targeting Qualifier *</label>
                <select
                  className="form-select"
                  value={qualifierId}
                  onChange={(e) => setQualifierId(Number(e.target.value))}
                  required
                >
                  {qualifiers.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition preview box */}
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px dashed rgba(99, 102, 241, 0.3)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>IF</span>{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>
                  {selectedQualifier ? selectedQualifier.code : 'QUALIFIER'}
                </strong>{' '}
                == <span style={{ color: 'var(--text-code)' }}>"{qualifierValue || 'value'}"</span>
              </div>
              <ArrowRight size={16} color="var(--accent-primary)" />
              <div>
                <span style={{ color: 'var(--text-muted)' }}>SET</span>{' '}
                <strong style={{ color: 'var(--accent-emerald)' }}>
                  {selectedFeature ? selectedFeature.code : 'FEATURE'}
                </strong>{' '}
                = <span style={{ color: 'var(--accent-emerald)' }}>"{featureValue || 'resolved_value'}"</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Qualifier Match Value *</label>
                <input
                  className="form-input"
                  placeholder="e.g. VIP, MOBILE, 1001"
                  value={qualifierValue}
                  onChange={(e) => setQualifierValue(e.target.value)}
                  required
                  autoFocus
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Value received in incoming request.
                </small>
              </div>

              <div className="form-group">
                <label>Resolved Feature Value *</label>
                <input
                  className="form-input"
                  placeholder="e.g. true, 50000, dark_theme"
                  value={featureValue}
                  onChange={(e) => setFeatureValue(e.target.value)}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Value returned if this condition matches.
                </small>
              </div>
            </div>

            <div className="form-group">
              <label>Rule Priority (Tie-Breaker within same Qualifier)</label>
              <input
                type="number"
                className="form-input"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Description / Rationale</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Reason or ticket reference for this override..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
