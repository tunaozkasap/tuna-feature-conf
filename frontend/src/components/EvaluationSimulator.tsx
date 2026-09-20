import React, { useState } from 'react';
import { PlayCircle, Terminal, CheckCircle2, AlertCircle, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { Feature, FeatureQualifier, FeatureRule, EvaluationResult } from '../types/domain';
import { evaluateFeature } from '../services/mockData';

interface EvaluationSimulatorProps {
  features: Feature[];
  qualifiers: FeatureQualifier[];
  rules: FeatureRule[];
  projectId: number;
}

export const EvaluationSimulator: React.FC<EvaluationSimulatorProps> = ({
  features,
  qualifiers,
  rules,
  projectId,
}) => {
  const projectFeatures = features.filter((f) => f.projectId === projectId);
  const projectQualifiers = qualifiers.filter((q) => q.projectId === projectId);

  const [selectedFeatureCode, setSelectedFeatureCode] = useState<string>(
    projectFeatures.length > 0 ? projectFeatures[0].code : ''
  );

  // Dynamic context map for qualifiers
  const [requestContext, setRequestContext] = useState<Record<string, string>>({
    USER_ID: 'usr_alpha_99',
    USER_SEGMENT: 'VIP',
    REQUEST_CHANNEL: 'IOS',
    APP_VERSION: '2.4.0',
    AGREEMENT_NO: 'AGR-PREMIUM-77',
  });

  const handleContextChange = (qualifierCode: string, value: string) => {
    setRequestContext((prev) => ({
      ...prev,
      [qualifierCode]: value,
    }));
  };

  const handleResetContext = () => {
    setRequestContext({});
  };

  // Evaluate selected feature
  const currentFeature = projectFeatures.find((f) => f.code === selectedFeatureCode);
  const currentResult: EvaluationResult | null = currentFeature
    ? evaluateFeature(currentFeature, rules, qualifiers, requestContext)
    : null;

  // Evaluate all features in project
  const allResults: EvaluationResult[] = projectFeatures.map((f) =>
    evaluateFeature(f, rules, qualifiers, requestContext)
  );

  return (
    <section>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div className="view-header-title-block">
          <h1>
            <PlayCircle size={28} color="var(--accent-primary)" />
            Real-Time Request Simulator & Sandbox
          </h1>
          <p>
            Simulate incoming request headers, user context, and verify rule precedence & evaluation output.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleResetContext}>
          <RefreshCw size={16} />
          Clear Context
        </button>
      </div>

      <div className="simulator-layout">
        {/* Left column: Incoming Request Context */}
        <div className="simulator-box">
          <div className="simulator-box-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
              <Zap size={18} color="var(--accent-cyan)" />
              Incoming Request Context
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {projectQualifiers.length} qualifier dimension{projectQualifiers.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projectQualifiers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No qualifiers defined for this project. Create some in the Qualifiers tab.
              </p>
            ) : (
              projectQualifiers.map((q) => (
                <div key={q.id} className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="feature-code-badge" style={{ fontSize: '0.75rem' }}>
                        {q.code}
                      </span>
                      <span>({q.name})</span>
                    </label>
                    <span className="priority-badge" style={{ fontSize: '0.7rem' }}>
                      Priority {q.priority}
                    </span>
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    placeholder={`e.g. value for ${q.code}`}
                    value={requestContext[q.code] || ''}
                    onChange={(e) => handleContextChange(q.code, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Real-Time Resolution & Execution Trace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="simulator-box">
            <div className="simulator-box-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                Live Feature Evaluation
              </h3>

              <select
                className="form-select"
                style={{ maxWidth: '240px' }}
                value={selectedFeatureCode}
                onChange={(e) => setSelectedFeatureCode(e.target.value)}
              >
                {projectFeatures.map((f) => (
                  <option key={f.id} value={f.code}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
            </div>

            {currentResult && (
              <div
                className={`result-card ${
                  currentResult.source === 'RULE_MATCH'
                    ? 'matched'
                    : currentResult.source === 'DEFAULT_VALUE'
                    ? 'default'
                    : 'disabled'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {currentResult.source === 'RULE_MATCH' ? (
                      <CheckCircle2 size={20} color="var(--accent-emerald)" />
                    ) : (
                      <AlertCircle size={20} color="var(--accent-amber)" />
                    )}
                    <strong>{currentResult.featureName}</strong>
                  </div>

                  <span
                    className={`qualifier-pill ${
                      currentResult.source === 'RULE_MATCH' ? 'boolean' : 'text'
                    }`}
                  >
                    {currentResult.source === 'RULE_MATCH'
                      ? 'Rule Override Matched'
                      : currentResult.source === 'DEFAULT_VALUE'
                      ? 'Default Fallback'
                      : 'Disabled'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Resolved Value:
                  </span>
                  <span
                    className="code-value"
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: currentResult.source === 'RULE_MATCH' ? '#34d399' : '#818cf8',
                    }}
                  >
                    {currentResult.resolvedValue}
                  </span>
                </div>

                {currentResult.matchingRule && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Matched by <strong>Rule #{currentResult.matchingRule.ruleId}</strong> on qualifier{' '}
                    <code>{currentResult.matchingRule.qualifierCode}</code> (priority{' '}
                    {currentResult.matchingRule.qualifierPriority}) with value "
                    <strong>{currentResult.matchingRule.receivedValue}</strong>"
                  </div>
                )}
              </div>
            )}

            {/* Evaluation Trace Log */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                <Terminal size={14} />
                Execution Trace & Decision Log
              </div>

              <div className="log-console">
                {currentResult?.evaluationLog.map((log, index) => {
                  const isMatch = log.includes('>> MATCH FOUND');
                  return (
                    <div key={index} className={`log-line ${isMatch ? 'match' : ''}`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* All Features Quick Overview */}
          <div className="simulator-box">
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Full Project Feature Resolution Matrix
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {allResults.map((res) => (
                <div
                  key={res.featureCode}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.featureCode}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="code-value" style={{ fontSize: '0.85rem' }}>
                      {res.resolvedValue}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: res.source === 'RULE_MATCH' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                      }}
                    >
                      {res.source === 'RULE_MATCH' ? 'MATCH' : 'DEFAULT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
