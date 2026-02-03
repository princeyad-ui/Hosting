import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Deploy from "./pages/Deploy";
import Sites from "./pages/Sites";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

import "./styles/global.css";
import "./styles/layout.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN IS THE DEFAULT PAGE */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* PROTECTED PAGES */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deploy"
          element={
            <ProtectedRoute>
              <Deploy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sites"
          element={
            <ProtectedRoute>
              <Sites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
