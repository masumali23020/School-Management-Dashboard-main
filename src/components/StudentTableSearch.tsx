"use client";

import { useState } from "react";
import Image from "next/image";

const TableSearchStudent = ({ onSearch }: { onSearch: (term: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, ID, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <Image
          src="/search.png"
          alt=""
          width={14}
          height={14}
          className="absolute left-3 top-1/2 transform -translate-y-1/2"
        />
      </div>
      <button
        type="submit"
        className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-600"
      >
        Search
      </button>
    </form>
  );
};

export default TableSearchStudent;