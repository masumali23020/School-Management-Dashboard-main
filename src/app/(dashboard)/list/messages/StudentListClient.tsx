"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Types
type StudentData = {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  class: { id: number; name: string } | null;
  parent: { phone: string; name: string } | null;
};

// --- Sub-components (Pagination, Table, etc. updated for brevity) ---

const StudentListClient = ({
  students,
  count,
  role,
  page,
  classes,
}: {
  students: StudentData[];
  count: number;
  role: string;
  page: number;
  classes: { id: number; name: string }[];
}) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  // ডাইনামিক ফিল্টার ফাংশন
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // ফিল্টার করলে সবসময় ১ম পেজে নিয়ে যাবে
    router.push(`?${params.toString()}`);
  };

  if (!mounted) return <div className="p-10">Loading Students...</div>;

  const columns = [
    { header: "Select", accessor: "select", className: "w-12" },
    { header: "Info", accessor: "info" },
    { header: "Student ID", accessor: "studentId", className: "hidden md:table-cell" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Parent Phone", accessor: "parentPhone", className: "hidden lg:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP SECTION */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold">All Students ({count})</h1>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          {/* Class Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500">CLASS:</label>
            <select
              className="p-2 border rounded-md text-xs bg-gray-50 outline-none focus:ring-2 ring-lamaSky"
              onChange={(e) => handleFilterChange("classId", e.target.value)}
              value={searchParams.get("classId") || ""}
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter (Optional - Dynamic placeholder) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500">SECTION:</label>
            <select
              className="p-2 border rounded-md text-xs bg-gray-50 outline-none"
              onChange={(e) => handleFilterChange("sectionId", e.target.value)}
              value={searchParams.get("sectionId") || ""}
            >
              <option value="">All Sections</option>
              <option value="1">Section A</option>
              <option value="2">Section B</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2 bg-white">
            <Image src="/search.png" alt="" width={14} height={14} />
            <input
              type="text"
              placeholder="Search by name..."
              className="w-[150px] p-2 bg-transparent outline-none"
              onChange={(e) => handleFilterChange("search", e.target.value)}
              defaultValue={searchParams.get("search") || ""}
            />
          </div>
          
          <div className="flex items-center gap-2">
             <SMSButton selectedStudents={selectedStudents} onSuccess={() => setSelectedStudents([])} />
             {role === "admin" && (
                <Link href="/list/students/create" className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
                   <Image src="/create.png" alt="" width={14} height={14} />
                </Link>
             )}
          </div>
        </div>
      </div>

      {/* Select All Bar */}
      <div className="mt-4 mb-2 flex items-center gap-3 p-2 bg-slate-50 rounded-md border border-gray-100">
        <input
          type="checkbox"
          className="size-4 cursor-pointer"
          checked={selectedStudents.length === students.length && students.length > 0}
          onChange={(e) => {
            if (e.target.checked) setSelectedStudents(students.map(s => s.id));
            else setSelectedStudents([]);
          }}
        />
        <span className="text-xs font-medium text-gray-600">
          Select All Visible ({selectedStudents.length} / {students.length})
        </span>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full mt-4">
          <thead>
            <tr className="text-left text-gray-500 text-sm border-b">
              {columns.map((col) => (
                <th key={col.accessor} className={`pb-2 ${col.className}`}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 even:bg-slate-50/50 text-sm hover:bg-lamaSkyLight transition-colors">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(item.id)}
                    onChange={() => {
                        setSelectedStudents(prev => 
                            prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                        );
                    }}
                  />
                </td>
                <td className="p-3">
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-700">{item.name} {item.surname}</span>
                        <span className="text-[10px] text-gray-400">{item.email}</span>
                    </div>
                </td>
                <td className="hidden md:table-cell">{item.username}</td>
                <td className="hidden md:table-cell font-medium text-blue-600">{item.class?.name || "N/A"}</td>
                <td className="hidden lg:table-cell">{item.parent?.phone || "No Phone"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/list/students/${item.id}`} className="p-1.5 bg-lamaSky rounded-full">
                      <Image src="/view.png" alt="" width={14} height={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

// --- Pagination Component ---
const Pagination = ({ page, count }: { page: number; count: number }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const totalPages = Math.ceil(count / 10);
  
    const changePage = (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`?${params.toString()}`);
    };
  
    return (
      <div className="p-4 flex items-center justify-between text-gray-500">
        <button
          disabled={page === 1}
          onClick={() => changePage(page - 1)}
          className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50"
        >
          Prev
        </button>
        <div className="flex items-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => changePage(i + 1)}
              className={`px-3 py-1 rounded-sm ${page === i + 1 ? "bg-lamaSky text-white" : "hover:bg-gray-100"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          disabled={page === totalPages}
          onClick={() => changePage(page + 1)}
          className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
};

export default StudentListClient;