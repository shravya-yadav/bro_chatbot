import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatGeminiResponse } from '../src/utils/formatGeminiResponse.jsx';
import HistoryPanel from './HistoryPanel';
import './ChatBox.css';

const BASE_URL = import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');

function ChatBox({ selectedHistory, onSendQuery, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const userId = user.user_id;

  // Fetch saved history on mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/get_history/${userId}`);
        const historyData = res.data;

        const formattedMessages = historyData.flatMap(item => ([
          { sender: 'user', text: item.query },
          { sender: 'bot', text: item.response }
        ]));

        setMessages(formattedMessages);
        const prompts = historyData.map(item => extractPrompt(item.query));
        setHistory(prompts);
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };

    fetchChatHistory();
  }, [userId]);

  // Handle query from selected past item
  useEffect(() => {
    if (selectedHistory) {
      setInput(selectedHistory);
      sendMessage(selectedHistory);
    }
  }, [selectedHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const extractPrompt = (text) => {
    const periodIndex = text.indexOf('.');
    return periodIndex !== -1 ? text.substring(0, periodIndex + 1).trim() : text.trim();
  };

  const buildContextFromHistory = (messages) => {
    const recent = messages.slice(-6); // last 3 exchanges
    return recent.map(msg => `${msg.sender === 'user' ? 'You' : 'BRO'}: ${msg.text}`).join('\n');
  };

  const sendMessage = async (customInput = null) => {
    const finalInput = customInput || input;
    if (!finalInput.trim()) return;

    const userMsg = { sender: 'user', text: finalInput };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const prompt = extractPrompt(finalInput);
    onSendQuery(prompt);

    const historyContext = buildContextFromHistory(messages);

    try {
      const res = await axios.post(`${BASE_URL}/chat`, {
        user_id: userId,
        message: `${historyContext}\n${finalInput}` // <- no extra "You:"
      });

      const responseText = res.data.response;
      const aiMsg = { sender: 'bot', text: responseText };
      setMessages(prev => [...prev, aiMsg]);

      // Save query and response
      await axios.post(`${BASE_URL}/save_history`, {
        user_id: userId,
        query: prompt,
        response: responseText
      });

      // Refresh prompt list for HistoryPanel
      const updatedHistRes = await axios.get(`${BASE_URL}/get_history/${userId}`);
      const updatedPrompts = updatedHistRes.data.map(item => extractPrompt(item.query));
      setHistory(updatedPrompts);
    } catch (error) {
      console.error("Chat error:", error);
    }

    setLoading(false);
  };

  const resetChat = async () => {
    setMessages([]);
    setInput('');
    try {
      await axios.post(`${BASE_URL}/start_session/${userId}`);
    } catch (err) {
      console.error("Failed to reset session:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        <div className="chat-section">
          <div className="chat-header">
            <h3>Hi {user.username} 👋 — Chat with <span className="bro-text">BRO</span></h3>
            <button onClick={resetChat}>Clear Chat</button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`msg ${msg.sender}`}>
                <div>
                  <strong>{msg.sender === 'bot' ? 'BRO' : 'You'}:</strong>
                  <div>{msg.sender === 'bot' ? formatGeminiResponse(msg.text) : msg.text}</div>
                </div>
              </div>
            ))}
            {loading && <div className="loading">Thinking...🤔</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => sendMessage()}>Send</button>
          </div>
        </div>

        <HistoryPanel history={history} onSelect={sendMessage} />
      </div>
    </div>
  );
}

export default ChatBox;
