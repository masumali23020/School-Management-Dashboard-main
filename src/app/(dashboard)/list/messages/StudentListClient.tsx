// app/list/students/StudentListClient.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

// Define types locally to avoid import issues
type StudentData = {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  img: string | null;
  bloodType: string;
  sex: string;
  birthday: string;
  createdAt: string;
  class: {
    id: number;
    name: string;
  } | null;
  parent: {
    phone: string;
    name: string;
  } | null;
};

// Simple inline components to avoid import issues
const Pagination = ({ page, count }: { page: number; count: number }) => {
  const totalPages = Math.ceil(count / 10);
  
  return (
    <div className="p-4 flex items-center justify-between text-gray-500">
      <button
        disabled={page === 1}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <div className="flex items-center gap-2 text-sm">
        {Array.from({ length: totalPages }, (_, index) => (
          <Link
            key={index}
            href={`?page=${index + 1}`}
            className={`px-2 rounded-sm ${
              page === index + 1 ? "bg-lamaSky" : ""
            }`}
          >
            {index + 1}
          </Link>
        ))}
      </div>
      <button
        disabled={page === totalPages}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

const TableSearch = () => {
  return (
    <div className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
      <Image src="/search.png" alt="" width={14} height={14} />
      <input
        type="text"
        placeholder="Search..."
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </div>
  );
};

const Table = ({ 
  columns, 
  renderRow, 
  data 
}: { 
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
}) => {
  return (
    <table className="w-full mt-4">
      <thead>
        <tr className="text-left text-gray-500 text-sm">
          {columns.map((col) => (
            <th key={col.accessor} className={col.className}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{data.map((item) => renderRow(item))}</tbody>
    </table>
  );
};

// Simple FormContainer for delete
const FormContainer = ({ table, type, id }: { table: string; type: string; id: string }) => {
  if (type === "delete") {
    return (
      <form>
        <input type="hidden" name="id" value={id} />
        <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
          <Image src="/delete.png" alt="" width={16} height={16} />
        </button>
      </form>
    );
  }
  
  if (type === "create") {
    return (
      <Link href={`/list/students/create`}>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
          <Image src="/create.png" alt="" width={14} height={14} />
        </button>
      </Link>
    );
  }
  
  return null;
};

// SMS Button Component (inline version)
const SMSButton = ({ 
  selectedStudents, 
  onSuccess 
}: { 
  selectedStudents: string[];
  onSuccess: () => void;
}) => {
  const [isSending, setIsSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const sendSMS = async (messageType: string, customText?: string) => {
    if (selectedStudents.length === 0) {
      setFeedbackMessage("Please select at least one student");
      setTimeout(() => setFeedbackMessage(""), 3000);
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents,
          messageType,
          customMessage: customText,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFeedbackMessage(`✅ SMS sent to ${data.sent} parents! Balance remaining: ${data.balanceRemaining}`);
        onSuccess();
      } else if (response.status === 402) {
        // Balance insufficient error
        setFeedbackMessage(`❌ ${data.error}\n${data.details}`);
      } else {
        setFeedbackMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setFeedbackMessage("❌ Failed to send SMS");
    } finally {
      setIsSending(false);
      setTimeout(() => setFeedbackMessage(""), 5000);
    }
  };

  return (
    <>
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed top-4 right-4 z-50 bg-white px-4 py-3 rounded-md shadow-lg border border-gray-300 max-w-sm whitespace-pre-wrap text-sm">
          {feedbackMessage}
        </div>
      )}

      {/* Custom Message Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Custom Message</h3>
            <textarea
              className="w-full border rounded-md p-3 h-32"
              placeholder="Type your message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomMessage("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  sendSMS("custom", customMessage);
                  setCustomMessage("");
                }}
                disabled={isSending}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Button */}
      <div className="relative group">
        <button
          className="bg-blue-500 text-white text-xs px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
          disabled={isSending}
        >
          {isSending ? (
            "Sending..."
          ) : (
            <>
              📱 Send SMS {selectedStudents.length > 0 && `(${selectedStudents.length})`}
            </>
          )}
        </button>

        {/* Dropdown */}
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40">
          <div className="py-2">
            <div className="px-4 py-2 border-b">
              <p className="text-xs font-semibold">Select Message Type</p>
            </div>
            {[
              { label: "📚 Exam Fee Notice", type: "exam-fee" },
              { label: "👥 Meeting Notice", type: "meeting" },
              { label: "🏫 School Notice", type: "school-notice" },
              { label: "✏️ Custom Message", type: "custom" },
            ].map(({ label, type }) => (
              <button
                key={type}
                onClick={() => type === "custom" ? setShowCustomModal(true) : sendSMS(type)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// Main Component
const StudentListClient = ({
  students,
  count,
  role,
  page,
}: {
  students: StudentData[];
  count: number;
  role: string;
  page: number;
}) => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const columns = [
    { header: "Select", accessor: "select", className: "w-12" },
    { header: "Info", accessor: "info" },
    { header: "Student ID", accessor: "studentId", className: "hidden md:table-cell" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Parent Phone", accessor: "parentPhone", className: "hidden lg:table-cell" },
    { header: "Address", accessor: "address", className: "hidden lg:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: StudentData) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="p-4">
        <input
          type="checkbox"
          className="size-4 cursor-pointer"
          checked={selectedStudents.includes(item.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedStudents([...selectedStudents, item.id]);
            } else {
              setSelectedStudents(selectedStudents.filter(id => id !== item.id));
            }
          }}
        />
      </td>
      <td className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-sm">
            {item.name[0]}{item.surname[0]}
          </span>
        </div>
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name} {item.surname}</h3>
          <p className="text-xs text-gray-500">{item?.class?.name || "No Class"}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">{item.class?.name || "N/A"}</td>
      <td className="hidden lg:table-cell">
        {item.parent?.phone || <span className="text-red-400">No phone</span>}
      </td>
      <td className="hidden lg:table-cell">{item.address || "N/A"}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <FormContainer table="student" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="hidden md:block text-lg font-semibold">
            All Students ({count})
          </h1>
          <SMSButton
            selectedStudents={selectedStudents}
            onSuccess={() => setSelectedStudents([])}
          />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormContainer table="student" type="create" id="" />}
          </div>
        </div>
      </div>

      {/* Select All Bar */}
      <div className="mt-4 mb-2 flex items-center gap-3 p-2 bg-gray-50 rounded-md">
        <input
          type="checkbox"
          className="size-4 cursor-pointer"
          checked={selectedStudents.length === students.length && students.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedStudents(students.map(s => s.id));
            } else {
              setSelectedStudents([]);
            }
          }}
        />
        <label className="text-sm text-gray-700 font-medium">
          Select All ({selectedStudents.length}/{students.length})
        </label>
      </div>

      {/* TABLE */}
      <Table columns={columns} renderRow={renderRow} data={students} />

      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default StudentListClient;