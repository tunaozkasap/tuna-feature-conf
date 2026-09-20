import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Project } from '../types/domain';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'>) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
    });
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderPlus size={20} color="var(--accent-primary)" />
            Create Project Workspace
          </h3>
          <button className="btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Project Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Payment Gateway V3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe the application domain or microservice scope..."
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
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
