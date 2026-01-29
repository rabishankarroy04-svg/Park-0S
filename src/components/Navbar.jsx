import { useState } from "react";

const Navbar = () => {
  const [search, setSearch] = useState("");

  return (
    <nav className="w-full h-16 bg-slate-900 flex items-center px-4 md:px-10 shadow-md">
      {/* Logo */}
      <div className="text-white text-xl font-bold">
        ParkSmart
      </div>

      {/* Search Bar */}
      <div className="flex-1 mx-6">
        <input
          type="text"
          placeholder="Search parking area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-full bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Burger Menu */}
      <button className="text-white text-2xl hover:text-blue-400 transition">
        ☰
      </button>
    </nav>
  );
};

export default Navbar;
