import React from "react";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignPage from "./pages/SignPage";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignPage />} />
      <Route path="/dashboard" element={<DashboardPage/>}/>
    </Routes>
  );
}

export default App;
