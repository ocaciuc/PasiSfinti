import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ConfirmareCont from "./pages/ConfirmareCont";
import Onboarding from "./pages/Onboarding";
import Pilgrimages from "./pages/Pilgrimages";
import PilgrimageDetail from "./pages/PilgrimageDetail";
import Profile from "./pages/Profile";
import Candle from "./pages/Candle";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import AccountDeleted from "./pages/AccountDeleted";
import UserDataDeletion from "./pages/UserDataDeletion";
import SpiritualDiary from "./pages/SpiritualDiary";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/confirmare-cont" element={<ConfirmareCont />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/pilgrimages" element={<Pilgrimages />} />
          <Route path="/pilgrimage/:id" element={<PilgrimageDetail />} />
          <Route path="/pilgrimage/:pilgrimageId/diary" element={<SpiritualDiary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/candle" element={<Candle />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account-deleted" element={<AccountDeleted />} />
          <Route path="/user-data-deletion" element={<UserDataDeletion />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
