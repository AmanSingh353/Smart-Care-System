import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PatientProvider } from "@/contexts/PatientContext";
import LoginPage from "./pages/LoginPage";
import ReceptionPage from "./pages/ReceptionPage";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorPanel from "./pages/DoctorPanel";
import PharmacyPage from "./pages/PharmacyPage";
import NursePage from "./pages/NursePage";
import BillingPage from "./pages/BillingPage";
import FamilyDashboard from "./pages/FamilyDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PatientProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/reception" element={<ReceptionPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/doctor" element={<DoctorPanel />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/nurse" element={<NursePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/family/:patientId" element={<FamilyDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
