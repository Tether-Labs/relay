import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";
import { SignUpPage } from "@/pages/sign-up";
import { DashboardPage } from "@/pages/dashboard";
import { PublishPage } from "@/pages/publish";
import { ArtifactDetailPage } from "@/pages/artifact-detail";
import { UserProfilePage } from "@/pages/user-profile";

const router = createBrowserRouter([
  { path: "/user/:handle", element: <UserProfilePage /> },
  { path: "/", element: <HomePage /> },
  { path: "/login/*", element: <LoginPage /> },
  { path: "/sign-up/*", element: <SignUpPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/publish", element: <PublishPage /> },
  { path: "/artifacts/:slug", element: <ArtifactDetailPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
