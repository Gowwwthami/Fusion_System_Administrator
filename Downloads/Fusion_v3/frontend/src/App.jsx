import { useState, useEffect } from "react";
import Sidebar from "./components/dashboard/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import UserDirectoryPage from "./pages/UserDirectoryPage";
import AddStudentPage from "./pages/AddStudentPage";
import AddFacultyPage from "./pages/AddFacultyPage";
import RolesPage from "./pages/RolesPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import RBACPage from "./pages/RBACPage";
import EmergencyAccessControlPage from "./pages/EmergencyAccessControlPage";
import LoginPage from "./pages/LoginPage";
import { ToastProvider } from "./utils/toast";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [page, setPage] = useState("dashboard");
  const [directoryTab, setDirectoryTab] = useState("students");

  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem("access_token"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!token) {
    return <LoginPage onLogin={() => setToken(localStorage.getItem("access_token"))} />;
  }

  const navigateToDirectory = (tab = "students") => {
    setDirectoryTab(tab);
    setPage("user-directory");
  };

  const pages = {
    dashboard: <DashboardPage onNavigate={setPage} />,
    "user-directory": <UserDirectoryPage initialTab={directoryTab} />,
    "add-student": <AddStudentPage onBulkCreateSuccess={navigateToDirectory} />,
    "add-faculty": <AddFacultyPage onBulkCreateSuccess={navigateToDirectory} />,
    "role-management": <RolesPage />,
    "audit-logs": <AuditLogsPage />,
    "rbac": <RBACPage />,
    "emergency-control": <EmergencyAccessControlPage />,
  };

  return (
    <ToastProvider>
      <div className="app-container">
        <main className="main-content">
          {pages[page] || <UserDirectoryPage />}
        </main>
        <Sidebar
          activePage={page}
          onNavigate={setPage}
          onLogout={() => {
            localStorage.removeItem("access_token");
            setToken(null);
          }}
        />
      </div>
    </ToastProvider>
  );
}
