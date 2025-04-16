import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/login`, { username, password });
      localStorage.setItem('user_id', res.data.user_id);
      localStorage.setItem('username', res.data.username);
      setUser({ user_id: res.data.user_id, username: res.data.username });
      navigate("/chat");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="auth-container">
      <div>
      <h2>Login</h2>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleLogin}>Log In</button>
      <p onClick={() => navigate("/signup")}>Don't have an account? Sign up</p>
    </div>
    </div>
  );
};

export default Login;
