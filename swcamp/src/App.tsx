import "./App.css";
import Welcome from "./screens/Welcome";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import Transaction from "./screens/Transaction.tsx";
import Register from "./screens/Register.tsx";
import Settings from "./screens/Settings.tsx";

export default function App() {
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    if (path === "/login") return <Login />;
    if (path === "/dashboard") return <Dashboard />;
    if (path === "/transaction") return <Transaction />;
    if (path === "/register") return <Register />;
    if (path === "/settings") return <Settings />;
    return <Welcome />;
}