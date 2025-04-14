import React, { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import SideBar from '../components/SideBar';
import HistoryPanel from '../components/HistoryPanel';
import './App.css';
import axios from 'axios';

function App() {
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [history, setHistory] = useState([]);

  const handleHistoryClick = (query) => {
    setSelectedHistory(query);
  };

  const updateHistory = (prompt) => {
    setHistory((prev) => (prev.includes(prompt) ? prev : [...prev, prompt]));
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/get_history/user123`);
        const prompts = res.data.map(item => item.prompt);
        setHistory(prompts);
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="app-wrapper">
      <div className="app-box">
        <SideBar onHistoryClick={handleHistoryClick} history={history} />
        <ChatBox selectedHistory={selectedHistory} onSendQuery={updateHistory} />
        {/* <HistoryPanel history={history} onSelect={handleHistoryClick} /> */}
      </div>
    </div>
  );
}

export default App;
