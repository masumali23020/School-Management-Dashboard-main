"use client";

import { useState } from "react";
import { AssignmentMode } from "./AssignmentMode";
import { ExamMode } from "./ExamMode";
import { useSubjectsByClass } from "@/hooks/useResultData";
import type { TeacherClass } from "@/hooks/useResultData";

interface Props {
  teacher: { id: string; name: string; surname: string };
  classes: TeacherClass[];
}

export function ResultPageClient({ teacher, classes }: Props) {
  const [mode, setMode] = useState<"assignment" | "exam">("assignment");
  const [classId, setClassId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const { subjects, loading: subjectsLoading } = useSubjectsByClass(
    mode === "assignment" ? classId : null
  );

  const handleClassChange = (id: number) => {
    setClassId(id);
    setSubjectId(null);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="rp-root">
        {/* ── Header ── */}
        <header className="rp-header">
          <div className="rp-logo">🎓</div>
          <div>
            <h1 className="rp-title">EduResult Pro</h1>
            <p className="rp-subtitle">School Result Management System</p>
          </div>
          <div className="rp-teacher-pill">
            <div className="rp-avatar">{teacher.name[0]}</div>
            <span className="rp-teacher-name">{teacher.name} {teacher.surname}</span>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="rp-main">
          {/* Mode Switcher */}
          <div className="mode-switch">
            <button
              className={`mode-btn ${mode === "assignment" ? "active" : ""}`}
              onClick={() => { setMode("assignment"); setClassId(null); setSubjectId(null); }}
            >
              📝 Assignment Mode
            </button>
            <button
              className={`mode-btn ${mode === "exam" ? "active" : ""}`}
              onClick={() => { setMode("exam"); setClassId(null); setSubjectId(null); }}
            >
              📊 Exam Mode
            </button>
          </div>

          {/* Content */}
          <div className="fade-up">
            {mode === "assignment" ? (
              <AssignmentMode
                classes={classes}
                subjects={subjects}
                selectedClassId={classId}
                selectedSubjectId={subjectId}
                onClassChange={handleClassChange}
                onSubjectChange={setSubjectId}
                subjectsLoading={subjectsLoading}
              />
            ) : (
              <ExamMode
                classes={classes}
                selectedClassId={classId}
                onClassChange={handleClassChange}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.rp-root {
  min-height: 100vh;
  background: linear-gradient(145deg, #0b1120 0%, #112240 55%, #0b1120 100%);
  font-family: 'DM Sans', sans-serif;
  color: #e2e8f0;
}

/* ── Header ── */
.rp-header {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.rp-logo {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.rp-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px; font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.3px;
}
.rp-subtitle { font-size: 12px; color: #475569; margin-top: 1px; }
.rp-teacher-pill {
  margin-left: auto;
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 100px;
  padding: 5px 14px 5px 6px;
}
.rp-avatar {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
}
.rp-teacher-name { font-size: 13px; color: #cbd5e1; font-weight: 500; }

/* ── Main ── */
.rp-main { padding: 28px 32px; max-width: 1280px; margin: 0 auto; }

/* ── Mode Switch ── */
.mode-switch {
  display: flex;
  gap: 0;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 13px;
  padding: 4px;
  width: fit-content;
  margin-bottom: 24px;
}
.mode-btn {
  padding: 9px 24px;
  border-radius: 10px;
  border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  color: #64748b;
  background: transparent;
  transition: all 0.2s;
}
.mode-btn.active {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  box-shadow: 0 3px 12px rgba(37,99,235,0.4);
}

/* ── Cards ── */
.result-card {
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
}
.card-label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
  color: #475569; margin-bottom: 14px;
}

/* ── Selectors ── */
.selector-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
.field-wrap { display: flex; flex-direction: column; gap: 7px; flex: 1; min-width: 180px; }
.field-label {
  font-size: 11px; font-weight: 600;
  color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;
}
.result-select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 9px;
  color: #e2e8f0;
  padding: 9px 13px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
  appearance: none; -webkit-appearance: none;
}
.result-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
.result-select option { background: #112240; color: #e2e8f0; }
.result-select:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Buttons ── */
.btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 22px;
  border-radius: 9px; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  box-shadow: 0 3px 12px rgba(37,99,235,0.3);
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(37,99,235,0.4); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 18px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.09);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
  background: rgba(255,255,255,0.05); color: #64748b;
  transition: all 0.2s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 9px; border-radius: 100px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.4px;
  white-space: nowrap;
}
.badge-blue   { background: rgba(37,99,235,0.18);  color: #60a5fa; border: 1px solid rgba(37,99,235,0.3); }
.badge-purple { background: rgba(124,58,237,0.18); color: #c084fc; border: 1px solid rgba(124,58,237,0.3); }
.badge-green  { background: rgba(22,163,74,0.18);  color: #4ade80; border: 1px solid rgba(22,163,74,0.3); }
.badge-yellow { background: rgba(202,138,4,0.18);  color: #facc15; border: 1px solid rgba(202,138,4,0.3); }
.badge-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* ── Alerts ── */
.alert-warn {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 18px; border-radius: 12px;
  background: rgba(202,138,4,0.1); border: 1px solid rgba(202,138,4,0.25);
  color: #fde68a; font-size: 14px; margin-bottom: 16px;
}
.alert-info {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 12px;
  background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.25);
  color: #bfdbfe; font-size: 14px; margin-bottom: 16px;
}
.alert-icon { font-size: 18px; flex-shrink: 0; padding-top: 1px; }
.alert-title { font-weight: 700; margin-bottom: 2px; }
.alert-desc { font-size: 13px; opacity: 0.85; }

/* ── Table ── */
.table-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 0;
}
.table-wrap.rounded-t-none { border-top-left-radius: 0; border-top-right-radius: 0; }
.result-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.result-table thead tr {
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.09);
}
.result-table th {
  padding: 12px 15px; text-align: left;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.7px; color: #475569;
  white-space: nowrap;
}
.result-table td {
  padding: 9px 15px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  vertical-align: middle;
}
.result-table tr:last-child td { border-bottom: none; }
.result-table tr:hover td { background: rgba(255,255,255,0.02); }
.text-center { text-align: center !important; }
.subject-th { min-width: 160px; }
.subject-th-name { display: block; font-size: 12px; font-weight: 700; color: #e2e8f0; }
.row-num { color: #334155; font-size: 13px; }
.student-name { font-weight: 600; color: #e2e8f0; font-size: 14px; }
.student-id { font-size: 11px; color: #334155; margin-top: 2px; }
.pending-label { color: #334155; font-size: 12px; }
.max-label { display: block; font-size: 10px; color: #334155; font-weight: 400; text-transform: none; letter-spacing: 0; margin-top: 2px; }

/* ── Inputs ── */
input[type=number] {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 8px;
  color: #e2e8f0;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  outline: none;
  text-align: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}
input[type=number]:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
input[type=number].input-error { border-color: #dc2626; }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }

.mark-input    { width: 76px; padding: 7px 8px; }
.mark-input-sm { width: 62px; padding: 6px 6px; font-size: 12px; }
.input-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.error-msg { font-size: 10px; color: #f87171; }

/* Secondary layout */
.sec-input-row { display: flex; gap: 4px; align-items: flex-start; justify-content: center; }
.total-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 52px; padding: 5px 10px;
  border-radius: 7px; font-weight: 700; font-size: 13px;
  background: rgba(22,163,74,0.14); color: #4ade80;
  border: 1px solid rgba(22,163,74,0.28);
}

/* ── Table header row ── */
.table-header-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.assignment-title { margin-left: auto; font-size: 13px; color: #60a5fa; }

/* ── Actions bar ── */
.actions-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  margin-top: 16px; padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.action-btns { display: flex; gap: 10px; }
.fill-count { font-size: 13px; color: #475569; }
.progress-wrap { display: flex; flex-direction: column; gap: 6px; }
.progress-bar {
  width: 180px; height: 5px;
  background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden;
}
.progress-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #2563eb, #0891b2);
  transition: width 0.3s ease;
}

/* ── Empty State ── */
.empty-state {
  text-align: center; padding: 60px 20px; color: #334155;
}
.empty-icon { font-size: 44px; margin-bottom: 10px; }
.empty-title { font-size: 17px; font-weight: 600; color: #475569; margin-bottom: 5px; }
.empty-desc { font-size: 13px; }

/* ── Spinner ── */
.spin {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
.spin-lg { width: 28px; height: 28px; border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.fade-up { animation: fadeUp 0.3s ease; }
.space-y-5 > * + * { margin-top: 16px; }
`;
