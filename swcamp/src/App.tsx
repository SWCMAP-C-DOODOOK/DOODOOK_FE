import "./App.css";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import Welcome from "./screens/Welcome";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import Transaction from "./screens/Transaction";
import Register from "./screens/Register";
import Settings from "./screens/Settings";
import AuthCallback from "./screens/AuthCallback";
import UserSettings from "./screens/UserSettings";

function RequireAuth() {
    const token = localStorage.getItem("access_token");
    const location = useLocation();

    return token ? (
        <Outlet />
    ) : (
        <Navigate to="/login" state={{ from: location }} replace />
    );
}

export default function App() {
    return (
        <Routes>
            {/* 공개 */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* 보호: 한 번만 RequireAuth 적용 */}
            <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transaction" element={<Transaction />} />
                <Route path="/register" element={<Register />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/usersettings" element={<UserSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}