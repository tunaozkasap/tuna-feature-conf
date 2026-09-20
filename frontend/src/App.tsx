import { useState, useEffect, useCallback } from 'react';
import { Project, Feature, FeatureQualifier, FeatureRule } from './types/domain';
import {
  INITIAL_PROJECTS,
  INITIAL_FEATURES,
  INITIAL_QUALIFIERS,
  INITIAL_RULES,
} from './services/mockData';
import {
  projectService,
  featureService,
  qualifierService,
  ruleService,
} from './services';
import { Navbar } from './components/Navbar';
import { FeatureList } from './components/FeatureList';
import { QualifierManager } from './components/QualifierManager';
import { RuleMatrix } from './components/RuleMatrix';
import { EvaluationSimulator } from './components/EvaluationSimulator';
import { ProjectModal } from './components/ProjectModal';
import { Wifi, WifiOff, RefreshCw, Database, AlertCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'features' | 'qualifiers' | 'rules' | 'simulator'>(
    'features'
  );

  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  const [features, setFeatures] = useState<Feature[]>(INITIAL_FEATURES);
  const [qualifiers, setQualifiers] = useState<FeatureQualifier[]>(INITIAL_QUALIFIERS);
  const [rules, setRules] = useState<FeatureRule[]>(INITIAL_RULES);

  const [selectedFeatureIdFilter, setSelectedFeatureIdFilter] = useState<number | null>(null);

  // Backend connection state
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Fetch all data from backend REST API
  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const backendProjects = await projectService.getAll();
      setIsBackendConnected(true);

      if (backendProjects.length > 0) {
        setProjects(
          backendProjects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
          }))
        );

        // Ensure selected project is valid
        const activeProjId = backendProjects.some((p) => p.id === selectedProjectId)
          ? selectedProjectId
          : backendProjects[0].id;
        setSelectedProjectId(activeProjId);

        // Load features, qualifiers, rules for active project
        const [backendFeatures, backendQualifiers, backendRules] = await Promise.all([
          featureService.getAll(activeProjId),
          qualifierService.getAll(activeProjId),
          ruleService.getAll({ projectId: activeProjId }),
        ]);

        setFeatures(
          backendFeatures.map((f) => ({
            id: f.id,
            code: f.code,
            name: f.name,
            description: f.description || '',
            projectId: f.projectId,
            defaultValue: f.defaultValue || 'false',
            enabled: f.enabled !== false,
          }))
        );

        setQualifiers(
          backendQualifiers.map((q) => ({
            id: q.id,
            code: q.code,
            name: q.name,
            description: q.description || '',
            priority: q.priority ?? 0,
            valueType: q.valueType,
            projectId: q.projectId,
          }))
        );

        setRules(
          backendRules.map((r) => ({
            id: r.id,
            featureId: r.featureId,
            qualifierId: r.qualifierId,
            qualifierValue: r.qualifierValue,
            featureValue: r.featureValue,
            priority: r.priority,
            enabled: r.enabled !== false,
            effectiveFrom: r.effectiveFrom,
            effectiveTo: r.effectiveTo,
            description: r.description,
          }))
        );
      }
    } catch {
      // Backend is unavailable, fall back cleanly to mockData
      setIsBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Seed backend database with INITIAL_* mockData
  const handleSeedBackend = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      for (const p of INITIAL_PROJECTS) {
        const createdProject = await projectService.create({
          name: p.name,
          description: p.description,
        });

        // Seed qualifiers for this project
        const projQualifiers = INITIAL_QUALIFIERS.filter((q) => q.projectId === p.id);
        const qualifierIdMap = new Map<number, number>();
        for (const q of projQualifiers) {
          const createdQ = await qualifierService.create({
            code: q.code,
            name: q.name,
            description: q.description,
            priority: q.priority,
            valueType: q.valueType,
            projectId: createdProject.id,
          });
          qualifierIdMap.set(q.id, createdQ.id);
        }

        // Seed features for this project
        const projFeatures = INITIAL_FEATURES.filter((f) => f.projectId === p.id);
        const featureIdMap = new Map<number, number>();
        for (const f of projFeatures) {
          const createdF = await featureService.create({
            code: f.code,
            name: f.name,
            description: f.description,
            projectId: createdProject.id,
          });
          featureIdMap.set(f.id, createdF.id);
        }

        // Seed rules
        const projRules = INITIAL_RULES.filter((r) =>
          projFeatures.some((f) => f.id === r.featureId)
        );
        for (const r of projRules) {
          const targetFeatureId = featureIdMap.get(r.featureId);
          const targetQualifierId = qualifierIdMap.get(r.qualifierId);
          if (targetFeatureId && targetQualifierId) {
            await ruleService.create({
              featureId: targetFeatureId,
              qualifierId: targetQualifierId,
              qualifierValue: r.qualifierValue,
              featureValue: r.featureValue,
              priority: r.priority,
              enabled: r.enabled,
              description: r.description,
            });
          }
        }
      }
      await loadBackendData();
    } catch (err: any) {
      setErrorNotice(`Failed to seed backend: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Project Actions
  const handleSaveProject = async (projectData: Omit<Project, 'id'>) => {
    if (isBackendConnected) {
      try {
        const created = await projectService.create(projectData);
        const newProj: Project = {
          id: created.id,
          name: created.name,
          description: created.description || '',
        };
        setProjects((prev) => [...prev, newProj]);
        setSelectedProjectId(newProj.id);
        return;
      } catch (err: any) {
        setErrorNotice(`Error saving project to backend: ${err.message}`);
      }
    }
    // Fallback/offline
    const newProject: Project = {
      id: Date.now(),
      ...projectData,
    };
    setProjects((prev) => [...prev, newProject]);
    setSelectedProjectId(newProject.id);
  };

  // Feature Actions
  const handleSaveFeature = async (featureData: Omit<Feature, 'id'>) => {
    if (isBackendConnected) {
      try {
        const created = await featureService.create({
          code: featureData.code,
          name: featureData.name,
          description: featureData.description,
          projectId: featureData.projectId,
        });
        const newFeature: Feature = {
          id: created.id,
          code: created.code,
          name: created.name,
          description: created.description || '',
          projectId: created.projectId,
          defaultValue: featureData.defaultValue || 'false',
          enabled: true,
        };
        setFeatures((prev) => [...prev, newFeature]);
        return;
      } catch (err: any) {
        setErrorNotice(`Error creating feature on backend: ${err.message}`);
      }
    }
    // Fallback/offline
    const newFeature: Feature = {
      id: Date.now(),
      ...featureData,
    };
    setFeatures((prev) => [...prev, newFeature]);
  };

  const handleToggleFeature = (featureId: number) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleSelectFeatureForRules = (featureId: number) => {
    setSelectedFeatureIdFilter(featureId);
    setActiveTab('rules');
  };

  // Qualifier Actions
  const handleSaveQualifier = async (qualifierData: Omit<FeatureQualifier, 'id'>) => {
    if (isBackendConnected) {
      try {
        const created = await qualifierService.create({
          code: qualifierData.code,
          name: qualifierData.name,
          description: qualifierData.description,
          priority: qualifierData.priority,
          valueType: qualifierData.valueType,
          projectId: qualifierData.projectId,
        });
        const newQualifier: FeatureQualifier = {
          id: created.id,
          code: created.code,
          name: created.name,
          description: created.description || '',
          priority: created.priority ?? 0,
          valueType: created.valueType,
          projectId: created.projectId,
        };
        setQualifiers((prev) => [...prev, newQualifier]);
        return;
      } catch (err: any) {
        setErrorNotice(`Error creating qualifier on backend: ${err.message}`);
      }
    }
    // Fallback/offline
    const newQualifier: FeatureQualifier = {
      id: Date.now(),
      ...qualifierData,
    };
    setQualifiers((prev) => [...prev, newQualifier]);
  };

  // Rule Actions
  const handleSaveRule = async (ruleData: Omit<FeatureRule, 'id'>) => {
    if (isBackendConnected) {
      try {
        const created = await ruleService.create({
          featureId: ruleData.featureId,
          qualifierId: ruleData.qualifierId,
          qualifierValue: ruleData.qualifierValue,
          featureValue: ruleData.featureValue,
          priority: ruleData.priority,
          enabled: ruleData.enabled,
          effectiveFrom: ruleData.effectiveFrom,
          effectiveTo: ruleData.effectiveTo,
          description: ruleData.description,
        });
        const newRule: FeatureRule = {
          id: created.id,
          featureId: created.featureId,
          qualifierId: created.qualifierId,
          qualifierValue: created.qualifierValue,
          featureValue: created.featureValue,
          priority: created.priority,
          enabled: created.enabled !== false,
          effectiveFrom: created.effectiveFrom,
          effectiveTo: created.effectiveTo,
          description: created.description,
        };
        setRules((prev) => [...prev, newRule]);
        return;
      } catch (err: any) {
        setErrorNotice(`Error creating rule on backend: ${err.message}`);
      }
    }
    // Fallback/offline
    const newRule: FeatureRule = {
      id: Date.now(),
      ...ruleData,
    };
    setRules((prev) => [...prev, newRule]);
  };

  const handleToggleRule = async (ruleId: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newEnabled = !rule.enabled;

    if (isBackendConnected) {
      try {
        await ruleService.update(ruleId, { enabled: newEnabled });
      } catch (err: any) {
        setErrorNotice(`Error updating rule on backend: ${err.message}`);
      }
    }

    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: newEnabled } : r))
    );
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (isBackendConnected) {
      try {
        await ruleService.delete(ruleId);
      } catch (err: any) {
        setErrorNotice(`Error deleting rule on backend: ${err.message}`);
      }
    }
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onOpenNewProject={() => setIsProjectModalOpen(true)}
      />

      {/* Backend Connection Status Bar */}
      <div
        style={{
          padding: '0.5rem 1.5rem',
          backgroundColor: isBackendConnected
            ? 'rgba(16, 185, 129, 0.08)'
            : 'rgba(245, 158, 11, 0.08)',
          borderBottom: `1px solid ${
            isBackendConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isBackendConnected ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--accent-emerald, #10b981)',
                fontWeight: 600,
              }}
            >
              <Wifi size={15} /> REST API Connected (http://localhost:8080/api)
            </span>
          ) : (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#f59e0b',
                fontWeight: 600,
              }}
            >
              <WifiOff size={15} /> Offline Mock Mode (mockData.ts active)
            </span>
          )}

          {isBackendConnected && projects.length === 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              Backend DB is currently empty.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isBackendConnected && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSeedBackend}
              disabled={isLoading}
              title="Populate backend database with mock data"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
            >
              <Database size={13} />
              Seed Demo Data to Backend
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadBackendData}
            disabled={isLoading}
            title="Reload from backend"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            {isLoading ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {errorNotice && (
        <div
          style={{
            padding: '0.6rem 1.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorNotice}</span>
          <button
            onClick={() => setErrorNotice(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'features' && (
          <FeatureList
            features={features}
            rules={rules}
            projectId={selectedProjectId}
            onToggleFeature={handleToggleFeature}
            onSaveFeature={handleSaveFeature}
            onSelectFeatureForRules={handleSelectFeatureForRules}
          />
        )}

        {activeTab === 'qualifiers' && (
          <QualifierManager
            qualifiers={qualifiers}
            projectId={selectedProjectId}
            onSaveQualifier={handleSaveQualifier}
          />
        )}

        {activeTab === 'rules' && (
          <RuleMatrix
            features={features}
            qualifiers={qualifiers}
            rules={rules}
            projectId={selectedProjectId}
            selectedFeatureIdFilter={selectedFeatureIdFilter}
            onClearFeatureFilter={() => setSelectedFeatureIdFilter(null)}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
            onSaveRule={handleSaveRule}
          />
        )}

        {activeTab === 'simulator' && (
          <EvaluationSimulator
            features={features}
            qualifiers={qualifiers}
            rules={rules}
            projectId={selectedProjectId}
          />
        )}
      </main>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
      />
    </div>
  );
}

export default App;
