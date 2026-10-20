/**
 * Every screen and its address. Read this file to know which file draws which page.
 *
 *   /projects                                 ProjectsPage         all projects
 *   /projects/:projectId                      ProjectOverviewPage  one project at a glance
 *   /projects/:projectId/features             FeaturesPage         the project's features
 *   /projects/:projectId/features/:featureId  FeatureDetailPage    one feature and its rules per environment
 *   /projects/:projectId/rules                RulesPage            all rules of the project, with filters
 *   /projects/:projectId/evaluate             EvaluatePage         try what a feature resolves to
 *   /projects/:projectId/environments         EnvironmentsPage     DEV, STAGING, PROD, ...
 *   /projects/:projectId/qualifiers           QualifiersPage       what rules can match on (COUNTRY, USER_ID, ...)
 *
 * The service forwards every /projects/... address to index.html (SpaForwardController), so these addresses work when
 * typed in or reloaded. A new top-level address needs a mapping there too.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectOverviewPage } from './pages/overview/ProjectOverviewPage';
import { FeaturesPage } from './pages/features/FeaturesPage';
import { FeatureDetailPage } from './pages/features/FeatureDetailPage';
import { RulesPage } from './pages/rules/RulesPage';
import { EvaluatePage } from './pages/evaluate/EvaluatePage';
import { EnvironmentsPage } from './pages/environments/EnvironmentsPage';
import { QualifiersPage } from './pages/qualifiers/QualifiersPage';

export function App() {
  return (
    <Routes>
      {/* AppLayout draws the header and side menu; the matching page appears inside it */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
        <Route path="/projects/:projectId/features" element={<FeaturesPage />} />
        <Route path="/projects/:projectId/features/:featureId" element={<FeatureDetailPage />} />
        <Route path="/projects/:projectId/rules" element={<RulesPage />} />
        <Route path="/projects/:projectId/evaluate" element={<EvaluatePage />} />
        <Route path="/projects/:projectId/environments" element={<EnvironmentsPage />} />
        <Route path="/projects/:projectId/qualifiers" element={<QualifiersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
