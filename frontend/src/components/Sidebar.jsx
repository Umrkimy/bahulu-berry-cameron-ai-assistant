import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-5">
      <h1 className="text-2xl font-bold mb-8">Bahulu Admin</h1>

      <nav className="space-y-3">
        <Link className="block hover:bg-gray-700 p-3 rounded" to="/dashboard">
          Dashboard
        </Link>

        <Link className="block hover:bg-gray-700 p-3 rounded" to="/products">
          Products
        </Link>

        <Link className="block hover:bg-gray-700 p-3 rounded" to="/inventory">
          Inventory
        </Link>

        <Link className="block hover:bg-gray-700 p-3 rounded" to="/customers">
          Customers
        </Link>

        <Link className="block hover:bg-gray-700 p-3 rounded" to="/orders">
          Orders
        </Link>
      </nav>
    </aside>
  );
}
