import { Routes, Route, Navigate } from "react-router-dom";
import React from 'react';
import AppLayout from "./layouts/AppLayout";
import Payments from "./pages/payments/Payments";
import { PaymentsProvider } from './pages/payments/PaymentsContext';
import PaymentDetailsPage from "./pages/payments/PaymentDetails";
import AuthPage from "./pages/auth/Auth";
import CasesPage from './pages/cases/Cases';
import CaseDetails from './pages/cases/CaseDetails';
import { CasesProvider } from './pages/cases/CasesContext';
import AnalyticsPage from './pages/cases/Analytics';
import Profile from "./pages/profiles/Profile.jsx";
import AIChat from "./pages/aiassistant/AIChat.jsx"; // restored

function RequireAuth({ children }) {
    // Simple client guard (localStorage token presence)
    let ok = false;
    try { ok = !!localStorage.getItem('cb_user'); } catch(_) {}
    if(!ok) return <Navigate to="/auth" replace />;
    return children;
}

export default function App() {
    return (
    <CasesProvider>
            <Routes>
                {/* Redirect root path to /payments (pagina principală) */}
                <Route path="/" element={<Navigate to="/payments" replace />} />
                <Route path="/auth" element={<AuthPage />} />

                <Route element={<RequireAuth><PaymentsProvider><AppLayout /></PaymentsProvider></RequireAuth>}>
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/payments/:transactionId" element={<PaymentDetailsPage />} />
                    <Route path="/cases" element={<CasesPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/cases/:caseId" element={<CaseDetails />} />
                    <Route path="/cases/analytics" element={<AnalyticsPage />} />
                    <Route path="/ai" element={<AIChat />} />
                </Route>
                {/* Catch-all: if user types an unknown path, send to auth */}
                <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
        </CasesProvider>
    );
}
