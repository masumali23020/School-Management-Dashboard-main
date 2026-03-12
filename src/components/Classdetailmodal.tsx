"use client";

import { useState } from "react";

type Subject = { id: number; name: string };
type Teacher = { id: number; name: string; surname: string };
type ClassSubjectTeacher = {
  id: number;
  subject: Subject;
  teacher: Teacher;
  academicYear: string;
};
type Grade = { level: number };

type ClassWithRelations = {
  id: number;
  name: string;
  capacity: number;
  supervisor: Teacher | null;
  grade: Grade;
  subjectTeachers: ClassSubjectTeacher[];
};

export default function ClassDetailModal({ item }: { item: ClassWithRelations }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Clickable Class Name */}
      <button
        onClick={() => setOpen(true)}
        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left"
      >
        {item.name}
      </button>

      {/* Modal Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* Modal Box */}
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mb-1">
                  Class Details
                </p>
                <h2 className="text-white text-2xl font-bold">{item.name}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-xl font-light"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Info Cards Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <p className="text-indigo-400 text-xs uppercase tracking-wider mb-1">Grade</p>
                  <p className="text-indigo-700 text-2xl font-bold">{item.grade.level}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-purple-400 text-xs uppercase tracking-wider mb-1">Capacity</p>
                  <p className="text-purple-700 text-2xl font-bold">{item.capacity}</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-4 text-center">
                  <p className="text-sky-400 text-xs uppercase tracking-wider mb-1">Subjects</p>
                  <p className="text-sky-700 text-2xl font-bold">{item.subjectTeachers.length}</p>
                </div>
              </div>

              {/* Supervisor */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {item.supervisor
                    ? item.supervisor.name.charAt(0).toUpperCase()
                    : "–"}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Supervisor</p>
                  <p className="text-gray-800 font-semibold">
                    {item.supervisor
                      ? `${item.supervisor.name} ${item.supervisor.surname || ""}`
                      : "No supervisor assigned"}
                  </p>
                </div>
              </div>

              {/* Subjects & Teachers Table */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">
                  Subjects &amp; Teachers
                </p>
                {item.subjectTeachers.length > 0 ? (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Teacher
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Academic Year
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.subjectTeachers.map((st, i) => (
                          <tr
                            key={st.id}
                            className={`border-b border-gray-50 last:border-0 hover:bg-indigo-50/40 transition-colors ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                <span className="font-medium text-gray-700">
                                  {st.subject.name}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {st.teacher.name} {st.teacher.surname}
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                {st.academicYear}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                    No subjects assigned to this class yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}