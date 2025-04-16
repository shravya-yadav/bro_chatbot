import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import SideBar from '../components/SideBar';
import Login from "../components/Login";
import Signup from "../components/SignUp";
import './App.css';
import axios from 'axios';

// Normalize backend URL
const BASE_URL = import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
console.log("Using backend URL:", BASE_URL);

function App() {
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState({
    user_id: localStorage.getItem("user_id"),
    username: localStorage.getItem("username")
  });

  const handleHistoryClick = (query) => {
    setSelectedHistory(query);
  };

  const updateHistory = (prompt) => {
    setHistory((prev) => (prev.includes(prompt) ? prev : [...prev, prompt]));
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user.user_id) return;
      try {
        const res = await axios.get(`${BASE_URL}/get_history/${user.user_id}`);
        const prompts = res.data.map(item => item.query);
        setHistory(prompts);
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };
    fetchHistory();
  }, [user.user_id]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<Signup setUser={setUser} />} />
        <Route path="/chat" element={
          user.user_id ? (
            <div className="app-wrapper">
              <div className="app-box">
                <SideBar onHistoryClick={handleHistoryClick} history={history} />
                <ChatBox
                  selectedHistory={selectedHistory}
                  onSendQuery={updateHistory}
                  user={user}
                />
              </div>
            </div>
          ) : <Navigate to="/" />
        } />
      </Routes>
    </Router>
  );
}

export default App;
