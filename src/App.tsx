import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import JonOptions from "./pages/JonOptions.tsx";
import NewInvoice from "./pages/NewInvoice.tsx";
import InvoicesList from "./pages/InvoicesList.tsx";
import Clients from "./pages/Clients.tsx";
import Settings from "./pages/Settings.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/jon" element={<ProtectedRoute adminOnly><JonOptions /></ProtectedRoute>} />
            <Route path="/nueva" element={<ProtectedRoute adminOnly><NewInvoice /></ProtectedRoute>} />
            <Route path="/facturas" element={<ProtectedRoute><InvoicesList /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/ajustes" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
