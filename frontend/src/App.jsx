import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Payments from "./pages/payments/Payments";
import PaymentDetailsPage from "./pages/payments/PaymentDetails";
import SupportPage from "./pages/aiassistant/AIAssistant";
import AuthPage from "./pages/auth/Auth";
import AIChatPlaceholder from "./pages/aiassistant/AIChatPlaceholder.jsx";

export default function App() {
    return (
        <Routes>
            {/* Redirect root path to /payments (pagina principală) */}
            <Route path="/" element={<Navigate to="/payments" replace />} />
            <Route path="/auth" element={<AuthPage />} />

            <Route element={<AppLayout />}>
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/:transactionId" element={<PaymentDetailsPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/ai" element={<AIChatPlaceholder />} />
            </Route>
            {/* Catch-all: if user types an unknown path, send to auth */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
    );
}
