import { useState } from 'react';
import { Project, Feature, FeatureQualifier, FeatureRule } from './types/domain';
import {
  INITIAL_PROJECTS,
  INITIAL_FEATURES,
  INITIAL_QUALIFIERS,
  INITIAL_RULES,
} from './services/mockData';
import { Navbar } from './components/Navbar';
import { FeatureList } from './components/FeatureList';
import { QualifierManager } from './components/QualifierManager';
import { RuleMatrix } from './components/RuleMatrix';
import { EvaluationSimulator } from './components/EvaluationSimulator';
import { ProjectModal } from './components/ProjectModal';

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

  // Project Actions
  const handleSaveProject = (projectData: Omit<Project, 'id'>) => {
    const newProject: Project = {
      id: Date.now(),
      ...projectData,
    };
    setProjects((prev) => [...prev, newProject]);
    setSelectedProjectId(newProject.id);
  };

  // Feature Actions
  const handleSaveFeature = (featureData: Omit<Feature, 'id'>) => {
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
  const handleSaveQualifier = (qualifierData: Omit<FeatureQualifier, 'id'>) => {
    const newQualifier: FeatureQualifier = {
      id: Date.now(),
      ...qualifierData,
    };
    setQualifiers((prev) => [...prev, newQualifier]);
  };

  // Rule Actions
  const handleSaveRule = (ruleData: Omit<FeatureRule, 'id'>) => {
    const newRule: FeatureRule = {
      id: Date.now(),
      ...ruleData,
    };
    setRules((prev) => [...prev, newRule]);
  };

  const handleToggleRule = (ruleId: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (ruleId: number) => {
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
