import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Payments from "./pages/payments/Payments";
import PaymentDetailsPage from "./pages/payments/PaymentDetails";
import AuthPage from "./pages/auth/Auth";
import AIChat from "./pages/aiassistant/AIChat.jsx";
import Profile from "./pages/profiles/Profile.jsx";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/payments" replace />} />
            <Route path="/auth" element={<AuthPage />} />

            <Route element={<AppLayout />}>
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/:transactionId" element={<PaymentDetailsPage />} />
                <Route path="/ai" element={<AIChat />} />
                <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
    );
}
