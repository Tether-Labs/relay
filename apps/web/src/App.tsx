import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { PublishPage } from "@/pages/publish";
import { ArtifactDetailPage } from "@/pages/artifact-detail";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/artifacts/:slug" element={<ArtifactDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
