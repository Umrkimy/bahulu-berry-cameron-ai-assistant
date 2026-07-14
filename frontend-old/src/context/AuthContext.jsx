import { useState } from "react";

import AuthContext from "./authContext";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("access_token"));

  function loginUser(access_token) {
    localStorage.setItem("access_token", access_token);

    setToken(access_token);
  }

  function logout() {
    localStorage.removeItem("access_token");

    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        loginUser,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
