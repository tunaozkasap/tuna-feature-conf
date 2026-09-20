import React from 'react';
import { Sliders, ToggleLeft, Layers, PlayCircle, Plus, FolderKanban } from 'lucide-react';
import { Project } from '../types/domain';

interface NavbarProps {
  activeTab: 'features' | 'qualifiers' | 'rules' | 'simulator';
  setActiveTab: (tab: 'features' | 'qualifiers' | 'rules' | 'simulator') => void;
  projects: Project[];
  selectedProjectId: number;
  onSelectProject: (id: number) => void;
  onOpenNewProject: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
}) => {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Sliders size={22} />
        </div>
        <div>
          <div className="brand-title">Tuna Feature Conf</div>
        </div>
        <span className="brand-badge">Engine v1.0</span>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          <ToggleLeft size={18} />
          Features
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'qualifiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('qualifiers')}
        >
          <Layers size={18} />
          Qualifiers
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Sliders size={18} />
          Rule Matrix
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <PlayCircle size={18} />
          Live Simulator
        </button>
      </nav>

      <div className="project-selector-wrapper">
        <FolderKanban size={18} color="var(--text-secondary)" />
        <select
          className="project-select"
          value={selectedProjectId}
          onChange={(e) => onSelectProject(Number(e.target.value))}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenNewProject}
          title="Create New Project Workspace"
        >
          <Plus size={16} />
          New
        </button>
      </div>
    </header>
  );
};
