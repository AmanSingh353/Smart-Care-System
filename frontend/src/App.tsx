import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PatientProvider } from "@/contexts/PatientContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CareGuardProvider } from "@/contexts/CareGuardContext";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import ReceptionPage from "./pages/ReceptionPage";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorPanel from "./pages/DoctorPanel";
import PharmacyPage from "./pages/PharmacyPage";
import NursePage from "./pages/NursePage";
import BillingPage from "./pages/BillingPage";
import FamilyDashboard from "./pages/FamilyDashboard";
import LabPage from "./pages/LabPage";
import CareGuardDashboard from "./pages/CareGuardDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PatientProvider>
          <CareGuardProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reception" element={<ReceptionPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/careguard" element={<CareGuardDashboard />} />
                <Route path="/doctor" element={<DoctorPanel />} />
                <Route path="/pharmacy" element={<PharmacyPage />} />
                <Route path="/nurse" element={<NursePage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/lab" element={<LabPage />} />
                <Route path="/family/:patientId" element={<FamilyDashboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CareGuardProvider>
        </PatientProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
