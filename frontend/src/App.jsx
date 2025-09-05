import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Payments from "./pages/payments/Payments";
import PaymentDetailsPage from "./pages/payments/PaymentDetails";
import SupportPage from "./pages/aiassistant/AIAssistant";
import AuthPage from "./pages/auth/Auth";

export default function App() {
    return (
        <Routes>
            <Route path="/auth" element={<AuthPage />} />

            <Route element={<AppLayout />}>
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/:transactionId" element={<PaymentDetailsPage />} />
                <Route path="/support" element={<SupportPage />} />
            </Route>
        </Routes>
    );
}
