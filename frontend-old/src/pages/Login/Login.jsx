import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../../api/auth";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { loginUser } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await login(email, password);

      loginUser(data.access_token);

      navigate("/dashboard");
    } catch (error) {
      console.log(error);
      console.log(error.response);
      console.log(error.message);

      setError(error.response?.data?.detail || error.message || "Login failed");
    }
  }

  return (
    <div>
      <h1>Admin Login</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>

        {error && <p>{error}</p>}
      </form>
    </div>
  );
}
