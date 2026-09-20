import React, { useState, useEffect } from 'react';
import { PlayCircle, Terminal, CheckCircle2, AlertCircle, RefreshCw, Zap, Sparkles, Server } from 'lucide-react';
import { Feature, FeatureQualifier, FeatureRule, EvaluationResult } from '../types/domain';
import { evaluateFeature } from '../services/mockData';
import { evaluationService } from '../services/evaluationService';

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

  // Update selected feature code when project changes
  useEffect(() => {
    if (projectFeatures.length > 0 && !projectFeatures.some((f) => f.code === selectedFeatureCode)) {
      setSelectedFeatureCode(projectFeatures[0].code);
    }
  }, [projectId, projectFeatures, selectedFeatureCode]);

  // Dynamic context map for qualifiers
  const [requestContext, setRequestContext] = useState<Record<string, string>>({
    USER_ID: 'usr_alpha_99',
    USER_SEGMENT: 'VIP',
    REQUEST_CHANNEL: 'IOS',
    APP_VERSION: '2.4.0',
    AGREEMENT_NO: 'AGR-PREMIUM-77',
  });

  const [useBackendEngine, setUseBackendEngine] = useState<boolean>(true);
  const [backendResult, setBackendResult] = useState<EvaluationResult | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const handleContextChange = (qualifierCode: string, value: string) => {
    setRequestContext((prev) => ({
      ...prev,
      [qualifierCode]: value,
    }));
  };

  const handleResetContext = () => {
    setRequestContext({});
  };

  // Client-side local evaluation (always available as baseline / fallback)
  const currentFeature = projectFeatures.find((f) => f.code === selectedFeatureCode);
  const clientResult: EvaluationResult | null = currentFeature
    ? evaluateFeature(currentFeature, rules, qualifiers, requestContext)
    : null;

  // Evaluate via backend when selectedFeatureCode or requestContext changes and backend engine is enabled
  useEffect(() => {
    if (!useBackendEngine || !selectedFeatureCode) {
      setBackendResult(null);
      setBackendError(null);
      return;
    }

    let isMounted = true;
    const runBackendEvaluation = async () => {
      setIsEvaluating(true);
      setBackendError(null);
      try {
        const resp = await evaluationService.evaluateFeature({
          featureCode: selectedFeatureCode,
          projectId,
          requestContext,
        });

        if (isMounted) {
          const matchedRuleId = resp.matchingRuleId;
          const matchingQualifier = resp.matchingQualifierCode
            ? qualifiers.find((q) => q.code === resp.matchingQualifierCode)
            : undefined;

          setBackendResult({
            featureCode: resp.featureCode,
            featureName: resp.featureName || currentFeature?.name || selectedFeatureCode,
            resolvedValue: resp.resolvedValue,
            source: resp.source === 'RULE_MATCH' ? 'RULE_MATCH' : 'DEFAULT_VALUE',
            matchingRule: matchedRuleId
              ? {
                  ruleId: matchedRuleId,
                  qualifierCode: resp.matchingQualifierCode || '',
                  qualifierPriority: matchingQualifier?.priority ?? 0,
                  expectedValue: rules.find((r) => r.id === matchedRuleId)?.qualifierValue || '',
                  receivedValue: requestContext[resp.matchingQualifierCode || ''] || '',
                }
              : undefined,
            evaluationLog: resp.logs || [],
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setBackendError(err.message || 'Failed to evaluate via backend');
          setBackendResult(null);
        }
      } finally {
        if (isMounted) {
          setIsEvaluating(false);
        }
      }
    };

    const timer = setTimeout(runBackendEvaluation, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedFeatureCode, projectId, requestContext, useBackendEngine, qualifiers, rules, currentFeature]);

  // Active displayed result: backend result if available, otherwise clientResult
  const activeResult: EvaluationResult | null = (useBackendEngine && backendResult)
    ? backendResult
    : clientResult;

  // Evaluate all features in project (client side overview)
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`btn ${useBackendEngine ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setUseBackendEngine(!useBackendEngine)}
            title="Toggle between Spring Boot Backend Engine and Local Client Engine"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <Server size={14} />
            Engine: {useBackendEngine ? 'Backend REST API' : 'Local Client (mockData)'}
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleResetContext}>
            <RefreshCw size={14} />
            Clear Context
          </button>
        </div>
      </div>

      {backendError && useBackendEngine && (
        <div
          style={{
            padding: '0.6rem 1rem',
            marginBottom: '1rem',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={16} />
          <span>Backend evaluation notice: {backendError}. Falling back to client-side evaluation engine.</span>
        </div>
      )}

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
                {isEvaluating && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>(Evaluating...)</span>}
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

            {activeResult && (
              <div
                className={`result-card ${
                  activeResult.source === 'RULE_MATCH'
                    ? 'matched'
                    : activeResult.source === 'DEFAULT_VALUE'
                    ? 'default'
                    : 'disabled'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeResult.source === 'RULE_MATCH' ? (
                      <CheckCircle2 size={20} color="var(--accent-emerald)" />
                    ) : (
                      <AlertCircle size={20} color="var(--accent-amber)" />
                    )}
                    <strong>{activeResult.featureName}</strong>
                  </div>

                  <span
                    className={`qualifier-pill ${
                      activeResult.source === 'RULE_MATCH' ? 'boolean' : 'text'
                    }`}
                  >
                    {activeResult.source === 'RULE_MATCH'
                      ? 'Rule Override Matched'
                      : activeResult.source === 'DEFAULT_VALUE'
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
                      color: activeResult.source === 'RULE_MATCH' ? '#34d399' : '#818cf8',
                    }}
                  >
                    {activeResult.resolvedValue}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Source: {useBackendEngine && backendResult ? 'Backend Engine (/api/evaluations)' : 'Local Evaluator'}
                  </span>
                </div>

                {activeResult.matchingRule && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Matched by <strong>Rule #{activeResult.matchingRule.ruleId}</strong> on qualifier{' '}
                    <code>{activeResult.matchingRule.qualifierCode}</code> (priority{' '}
                    {activeResult.matchingRule.qualifierPriority}) with value "
                    <strong>{activeResult.matchingRule.receivedValue}</strong>"
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
                Execution Trace & Decision Log ({useBackendEngine && backendResult ? 'Spring Boot EvaluationController' : 'Client Simulator'})
              </div>

              <div className="log-console">
                {activeResult?.evaluationLog.map((log, index) => {
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
