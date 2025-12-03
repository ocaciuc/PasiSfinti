import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Pilgrimages from "./pages/Pilgrimages";
import PilgrimageDetail from "./pages/PilgrimageDetail";
import Profile from "./pages/Profile";
import Candle from "./pages/Candle";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import AccountDeleted from "./pages/AccountDeleted";
import UserDataDeletion from "./pages/UserDataDeletion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/pilgrimages" element={<Pilgrimages />} />
          <Route path="/pilgrimage/:id" element={<PilgrimageDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/candle" element={<Candle />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account-deleted" element={<AccountDeleted />} />
          <Route path="/user-data-deletion" element={<UserDataDeletion />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
