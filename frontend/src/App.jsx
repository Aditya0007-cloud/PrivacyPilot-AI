import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AuditLogsPage } from "./pages/AuditLogsPage.jsx";
import { CompanyConsentOverviewPage } from "./pages/CompanyConsentOverviewPage.jsx";
import { CompanyDashboard } from "./pages/CompanyDashboard.jsx";
import { CompanyDeletionRequestsPage } from "./pages/CompanyDeletionRequestsPage.jsx";
import { ConsentCenterPage } from "./pages/ConsentCenterPage.jsx";
import { DataDeletionPage } from "./pages/DataDeletionPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { PrivacyActivityPage } from "./pages/PrivacyActivityPage.jsx";
import { PrivacyAssistantPage } from "./pages/PrivacyAssistantPage.jsx";
import { PrivacyPolicyAnalyzerPage } from "./pages/PrivacyPolicyAnalyzerPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { UserDashboard } from "./pages/UserDashboard.jsx";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute allowedRoles={["company"]} />}>
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route
            path="/company/privacy-policy-analyzer"
            element={<PrivacyPolicyAnalyzerPage />}
          />
          <Route path="/company/consents" element={<CompanyConsentOverviewPage />} />
          <Route
            path="/company/deletion-requests"
            element={<CompanyDeletionRequestsPage />}
          />
          <Route path="/company/privacy-assistant" element={<PrivacyAssistantPage />} />
          <Route path="/company/audit-logs" element={<AuditLogsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/privacy-assistant" element={<PrivacyAssistantPage />} />
          <Route path="/user/consents" element={<ConsentCenterPage />} />
          <Route path="/user/deletion-requests" element={<DataDeletionPage />} />
          <Route path="/user/privacy-activity" element={<PrivacyActivityPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
