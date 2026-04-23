import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import JonOptions from "./pages/JonOptions.tsx";
import NewInvoice from "./pages/NewInvoice.tsx";
import InvoicesList from "./pages/InvoicesList.tsx";
import Clients from "./pages/Clients.tsx";
import Settings from "./pages/Settings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/jon" element={<JonOptions />} />
          <Route path="/nueva" element={<NewInvoice />} />
          <Route path="/facturas" element={<InvoicesList />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/ajustes" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
