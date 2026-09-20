import React, { useState } from 'react';
import { Layers, Plus, Search, Award, Type, X } from 'lucide-react';
import { FeatureQualifier, FeatureQualifierValueType } from '../types/domain';

interface QualifierManagerProps {
  qualifiers: FeatureQualifier[];
  projectId: number;
  onSaveQualifier: (qualifier: Omit<FeatureQualifier, 'id'>) => void;
}

export const QualifierManager: React.FC<QualifierManagerProps> = ({
  qualifiers,
  projectId,
  onSaveQualifier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(50);
  const [valueType, setValueType] = useState<FeatureQualifierValueType>('TEXT');

  const filteredQualifiers = qualifiers
    .filter(
      (q) =>
        q.projectId === projectId &&
        (q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => b.priority - a.priority);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    onSaveQualifier({
      code: code.trim().toUpperCase().replace(/\s+/g, '_'),
      name: name.trim(),
      description: description.trim(),
      priority: Number(priority) || 0,
      valueType,
      projectId,
    });

    setCode('');
    setName('');
    setDescription('');
    setPriority(50);
    setValueType('TEXT');
    setIsModalOpen(false);
  };

  const getTypePillClass = (type: FeatureQualifierValueType) => {
    switch (type) {
      case 'NUMERIC':
        return 'qualifier-pill numeric';
      case 'BOOLEAN':
        return 'qualifier-pill boolean';
      case 'JSON':
        return 'qualifier-pill json';
      case 'TEXT':
      default:
        return 'qualifier-pill text';
    }
  };

  return (
    <section>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div className="view-header-title-block">
          <h1>
            <Layers size={28} color="var(--accent-primary)" />
            Targeting Qualifiers
          </h1>
          <p>
            Define targeting dimensions (e.g. USER_SEGMENT, USER_ID, AGREEMENT_NO, REQUEST_CHANNEL) and their precedence.
          </p>
        </div>

        <div className="header-actions-group">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search qualifiers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            New Qualifier
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Evaluation Priority</th>
              <th>Qualifier Key</th>
              <th>Display Name</th>
              <th>Value Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredQualifiers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No qualifiers configured for this project.
                </td>
              </tr>
            ) : (
              filteredQualifiers.map((q) => (
                <tr key={q.id}>
                  <td>
                    <span className="priority-badge">
                      <Award size={13} />
                      Priority {q.priority}
                    </span>
                  </td>
                  <td>
                    <span className="feature-code-badge">{q.code}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{q.name}</td>
                  <td>
                    <span className={getTypePillClass(q.valueType)}>
                      <Type size={12} />
                      {q.valueType}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '350px' }}>
                    {q.description || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Qualifier Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--accent-primary)" />
                Create Targeting Qualifier
              </h3>
              <button className="btn-icon-only" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Qualifier Key / Code *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. USER_ID, AGREEMENT_NO, CHANNEL"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Display Name *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Customer Segment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Evaluation Priority (Higher = First) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Value Type *</label>
                    <select
                      className="form-select"
                      value={valueType}
                      onChange={(e) => setValueType(e.target.value as FeatureQualifierValueType)}
                    >
                      <option value="TEXT">TEXT</option>
                      <option value="NUMERIC">NUMERIC</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="JSON">JSON</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Explain what incoming context parameter this qualifier matches..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  Save Qualifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
