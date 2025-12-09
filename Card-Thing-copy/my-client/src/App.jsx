import React from "react";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignPage from "./pages/SignPage";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import OtherUsers from "./pages/OtherUsers";
import UserCatalog from "./pages/UserCatalog";
import GoogleCallback from "./pages/GoogleCallback";


function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignPage />} />
      <Route path="/googleAuthSuccess" element={<GoogleCallback />} />
      <Route path="/dashboard" element={<DashboardPage/>}/>
      <Route path="/users" element={<OtherUsers/>}/>
      <Route path="/catalog/:userId" element={<UserCatalog />} />
    </Routes>
  );
}

export default App;
