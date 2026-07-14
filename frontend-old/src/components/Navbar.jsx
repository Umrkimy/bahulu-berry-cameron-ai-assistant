import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold">Admin Dashboard</h2>

      <button
        onClick={logout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </header>
  );
}
