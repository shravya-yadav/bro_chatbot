import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

const Signup = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const handleSignup = () => {
    axios
      .post(`${BASE_URL}/signup`, { username, password }) // Step 1: Make POST request
      .then((res) => {
        // Step 2: On success, store data in localStorage
        localStorage.setItem('user_id', res.data.user_id);
        localStorage.setItem('username', res.data.username);
  
        // Step 3: Update React state
        setUser({ user_id: res.data.user_id, username: res.data.username });
  
        // Step 4: Redirect to chat page
        navigate("/chat");
      })
      .catch((err) => {
        // Step 5: Handle any error that occurs in the Promise chain
        alert("Signup failed");
        console.error(err);
      });
  };
  

  return (
    <div className="auth-container">
      <div>
      <h2>Signup</h2>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleSignup}>Sign Up</button>
      <p onClick={() => navigate("/")}>Already have an account? Log in</p>
    </div>
    </div>
  );
};

export default Signup;
