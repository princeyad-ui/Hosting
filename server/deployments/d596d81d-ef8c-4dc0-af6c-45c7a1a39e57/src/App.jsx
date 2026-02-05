import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./pages/NavBar";
import HomePage from "./pages/HomePage";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Footer from "./pages/Footer";
import Proctor from "./pages/Proctor";
import Sessions from "./pages/Sessions";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import AdminExams from "./pages/AdminExams";
import ExamEntry from "./pages/ExamEntry";
import StudentProctor from "./pages/StudentProctor";
import SendExamEmail from "./pages/SendExamEmail";
import ThankYou from "./pages/ThankYou";
import AdminResultList from "./pages/AdminResultList";
import AdminSessionResult from "./pages/AdminSessionResult";

// Wrapper so we can use useLocation
const Layout = ({ children }) => {
  const location = useLocation();

  // Check if the path starts with /exam/
  const hideLayout =
    location.pathname.startsWith("/exam/") ||
    location.pathname === "/thankyou";

  return (
    <>
      {!hideLayout && <NavBar />}
      {children}
      {!hideLayout && <Footer />}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/proctor" element={<Proctor />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/admindashboard" element={<AdminDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/adminexams" element={<AdminExams />} />
          <Route path="/studentproctor" element={<StudentProctor />} />
          <Route path="/sendexamemail" element={<SendExamEmail />} />
          <Route path="/thankyou" element={<ThankYou />} />
          <Route path="/adminresultlist" element={<AdminResultList />} />
          <Route path="/admin/result/:sessionId" element={<AdminSessionResult />} />

          {/* Exam Entry (NO NAVBAR & FOOTER) */}
          <Route path="/exam/:code" element={<ExamEntry />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
