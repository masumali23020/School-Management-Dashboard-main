"use client";

import { useRef } from "react";

import { X, Printer, FileDown } from "lucide-react";
import { StudentResultData } from "@/Actions/ResultAction/resultSearchAction";
import { generateStudentResultPDF } from "@/lib/generateStudentResultPDF";

interface ResultSheetProps {
  data: StudentResultData;
  onClose: () => void;
}

function getSubjectGrade(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "A-";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D";
  return "F";
}

function getSubjectGPA(score: number, total: number): string {
  const pct = (score / total) * 100;
  if (pct >= 80) return "5.00";
  if (pct >= 70) return "4.00";
  if (pct >= 60) return "3.50";
  if (pct >= 50) return "3.00";
  if (pct >= 40) return "2.00";
  if (pct >= 33) return "1.00";
  return "0.00";
}

export function ResultSheet({ data, onClose }: ResultSheetProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePdf = () => {
    try {
      generateStudentResultPDF(data);
    } catch (e) {
      console.error(e);
      alert("Could not generate PDF. Try Print / Download instead.");
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Result Sheet - ${data.student.name} ${data.student.surname}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Noto+Serif+Bengali:wght@400;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Merriweather', 'Noto Serif Bengali', serif; 
              background: white;
              color: #1a1a1a;
            }
            
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 15mm;
              position: relative;
            }
            
            /* Outer border */
            .outer-border {
              border: 3px double #1a3a5c;
              padding: 8px;
              min-height: calc(297mm - 30mm);
            }
            .inner-border {
              border: 1px solid #1a3a5c;
              padding: 16px;
              min-height: calc(297mm - 46mm);
            }
            
            /* School header */
            .school-header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #1a3a5c; margin-bottom: 12px; }
            .school-name { font-size: 20px; font-weight: 900; color: #1a3a5c; text-transform: uppercase; letter-spacing: 2px; }
            .school-address { font-size: 10px; color: #555; margin-top: 3px; }
            .school-motto { font-size: 9px; color: #1a3a5c; font-style: italic; margin-top: 2px; }
            
            /* Exam title banner */
            .exam-banner {
              text-align: center;
              background: #1a3a5c;
              color: white;
              padding: 6px 12px;
              margin: 10px 0;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            
            /* Report card title */
            .report-title {
              text-align: center;
              font-size: 11px;
              color: #1a3a5c;
              font-weight: 700;
              border-bottom: 1px solid #1a3a5c;
              padding-bottom: 8px;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            
            /* Student info grid */
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 16px;
              margin-bottom: 12px;
              padding: 10px;
              border: 1px solid #c8a84b;
              background: #fffdf5;
            }
            .info-row { display: flex; font-size: 9.5px; gap: 4px; }
            .info-label { font-weight: 700; color: #1a3a5c; min-width: 90px; text-transform: uppercase; font-size: 8.5px; }
            .info-value { color: #222; border-bottom: 1px dotted #aaa; flex: 1; }
            
            /* Photo box */
            .photo-box { 
              width: 70px; height: 80px; border: 1px solid #1a3a5c; 
              display: flex; align-items: center; justify-content: center;
              font-size: 7px; color: #999; text-align: center;
              float: right; margin-left: 10px; margin-bottom: 10px;
            }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            
            /* Marks table */
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; }
            thead tr { background: #1a3a5c; color: white; }
            th { padding: 5px 6px; text-align: center; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #1a3a5c; }
            th.left { text-align: left; }
            td { padding: 4px 6px; border: 1px solid #c8c8c8; text-align: center; }
            td.left { text-align: left; }
            tbody tr:nth-child(even) { background: #f9f7f2; }
            tbody tr:nth-child(odd) { background: white; }
            .fail { color: #c0392b; font-weight: 700; }
            
            /* Summary */
            .summary-box {
              border: 2px solid #1a3a5c;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              text-align: center;
              margin-bottom: 12px;
            }
            .summary-cell { padding: 8px 4px; border-right: 1px solid #1a3a5c; }
            .summary-cell:last-child { border-right: none; }
            .summary-label { font-size: 7.5px; text-transform: uppercase; color: #555; letter-spacing: 0.5px; font-weight: 700; }
            .summary-value { font-size: 16px; font-weight: 900; color: #1a3a5c; margin-top: 3px; }
            .summary-value.grade { color: #c8a84b; font-size: 20px; }
            
            /* Grading table */
            .grade-table { font-size: 7.5px; }
            .grade-table th { font-size: 7px; }
            .grade-table td { font-size: 7.5px; padding: 3px 5px; }
            
            /* Footer */
            .footer-sigs {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 24px;
              padding-top: 8px;
            }
            .sig-line { border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            
            .stamp-area {
              text-align: center;
              padding: 10px;
              margin: 12px 0;
              background: #f5f0e8;
              border: 1px dashed #c8a84b;
              font-size: 8px;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { margin: 0; padding: 10mm; }
            }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const isAdvanced = data.student.class.grade.level >= 6;
  const studentName = `${data.student.name} ${data.student.surname}`;
  const schoolTitle = data.schoolName?.trim() || "Bright Future School & College";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
      {/* Controls */}
      <div className="fixed top-4 right-4 flex flex-wrap justify-end gap-2 z-50 max-w-[min(100vw-2rem,520px)]">
        <button
          type="button"
          onClick={handlePdf}
          className="flex items-center gap-2 bg-[#c8a84b] text-[#1a3a5c] px-4 py-2 font-bold text-sm uppercase tracking-widest hover:bg-[#b8943d] transition-colors shadow-lg"
        >
          <FileDown className="w-4 h-4" />
          Save PDF
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2 font-bold text-sm uppercase tracking-widest hover:bg-[#0f2a47] transition-colors shadow-lg"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 font-bold text-sm uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* The Printable Sheet */}
      <div ref={printRef} className="bg-white shadow-2xl" style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }}>
        {/* Outer Border */}
        <div style={{ border: "3px double #1a3a5c", padding: "8px" }}>
          <div style={{ border: "1px solid #1a3a5c", padding: "16px" }}>
            {/* School Header */}
            <div style={{ textAlign: "center", paddingBottom: "12px", borderBottom: "2px solid #1a3a5c", marginBottom: "12px" }}>
              {/* Logo row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "8px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1a3a5c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#c8a84b", fontSize: "20px", fontWeight: 900 }}>✦</span>
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: "2px", fontFamily: "Merriweather, serif" }}>
                    {schoolTitle}
                  </div>
                  <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
                    123 Education Road, Dhaka, Bangladesh | Phone: 01700-000000
                  </div>
                  <div style={{ fontSize: "9px", color: "#c8a84b", fontStyle: "italic", marginTop: "2px" }}>
                    `Education is the most powerful weapon — Estd. 1985`
                  </div>
                </div>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1a3a5c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#c8a84b", fontSize: "20px", fontWeight: 900 }}>✦</span>
                </div>
              </div>
            </div>

            {/* Exam Banner */}
            <div style={{ textAlign: "center", background: "#1a3a5c", color: "white", padding: "6px 12px", margin: "10px 0", fontSize: "13px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" }}>
              {data.exam.title} — Session: {data.exam.session}
            </div>

            {/* Report Card Title */}
            <div style={{ textAlign: "center", fontSize: "11px", color: "#1a3a5c", fontWeight: 700, borderBottom: "1px solid #1a3a5c", paddingBottom: "8px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "2px" }}>
              Academic Progress Report / মার্কশীট
            </div>

            {/* Student Info + Photo */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
              <div style={{ flex: 1, border: "1px solid #c8a84b", background: "#fffdf5", padding: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px" }}>
                  {[
                    ["Student Name", studentName],
                    ["Class", data.student.class.name],
                    ["Roll No.", data.student.roll ?? "—"],
                    ["Section", "A"],
                    ["Father's Name", data.student.parent?.name ?? "—"],
                    ["Phone", data.student.parent?.phone ?? "—"],
                    ["Blood Group", data.student.bloodType],
                    ["Date of Birth", new Date(data.student.birthday).toLocaleDateString("en-GB")],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", fontSize: "9.5px", gap: "4px" }}>
                      <span style={{ fontWeight: 700, color: "#1a3a5c", minWidth: "90px", textTransform: "uppercase", fontSize: "8.5px" }}>
                        {label}:
                      </span>
                      <span style={{ color: "#222", borderBottom: "1px dotted #aaa", flex: 1 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Photo */}
              <div style={{ width: "70px", height: "90px", border: "1px solid #1a3a5c", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", color: "#999", textAlign: "center", overflow: "hidden" }}>
                {data.student.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.student.img} alt="Student" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>Photo</span>
                )}
              </div>
            </div>

            {/* Marks Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "9px" }}>
              <thead>
                <tr style={{ background: "#1a3a5c", color: "white" }}>
                  <th style={{ padding: "5px 6px", textAlign: "left", fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "0.5px", border: "1px solid #1a3a5c", width: "30%" }}>
                    Subject / বিষয়
                  </th>
                  {isAdvanced ? (
                    <>
                      <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                        MCQ<br /><span style={{ fontSize: "7px", fontWeight: 400 }}>(30)</span>
                      </th>
                      <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                        Written<br /><span style={{ fontSize: "7px", fontWeight: 400 }}>(60)</span>
                      </th>
                      <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                        Practical<br /><span style={{ fontSize: "7px", fontWeight: 400 }}>(10)</span>
                      </th>
                    </>
                  ) : null}
                  <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                    Total<br /><span style={{ fontSize: "7px", fontWeight: 400 }}>(marks)</span>
                  </th>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                    Grade
                  </th>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                    GPA
                  </th>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontSize: "8.5px", textTransform: "uppercase", border: "1px solid #1a3a5c" }}>
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r, idx) => {
                  const cap = r.maxMarks && r.maxMarks > 0 ? r.maxMarks : 100;
                  const isFail = r.totalScore < cap * 0.33;
                  const grade = getSubjectGrade(r.totalScore, cap);
                  const gpa = getSubjectGPA(r.totalScore, cap);
                  return (
                    <tr key={r.id} style={{ background: idx % 2 === 0 ? "white" : "#f9f7f2" }}>
                      <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "left", fontWeight: 600, fontSize: "9px" }}>
                        {r.subjectName}
                      </td>
                      {isAdvanced ? (
                        <>
                          <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontSize: "9px" }}>
                            {r.mcqScore ?? "—"}
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontSize: "9px" }}>
                            {r.writtenScore ?? "—"}
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontSize: "9px" }}>
                            {r.practicalScore ?? "—"}
                          </td>
                        </>
                      ) : null}
                      <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700, fontSize: "9px", color: isFail ? "#c0392b" : "#1a3a5c" }}>
                        {r.totalScore}/{cap}
                      </td>
                      <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700, color: isFail ? "#c0392b" : "#c8a84b", fontSize: "9px" }}>
                        {grade}
                      </td>
                      <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontSize: "9px" }}>
                        {gpa}
                      </td>
                      <td style={{ padding: "4px 6px", border: "1px solid #c8c8c8", textAlign: "center", fontSize: "8.5px", color: isFail ? "#c0392b" : "#2e7d32" }}>
                        {isFail ? "FAIL" : "PASS"}
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ background: "#1a3a5c", color: "white" }}>
                  <td colSpan={isAdvanced ? 4 : 1} style={{ padding: "5px 6px", border: "1px solid #1a3a5c", textAlign: "right", fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Marks Obtained:
                  </td>
                  <td style={{ padding: "5px 6px", border: "1px solid #1a3a5c", textAlign: "center", fontWeight: 900, fontSize: "10px" }}>
                    {data.totalObtained} / {data.totalMarks}
                  </td>
                  <td colSpan={3} style={{ padding: "5px 6px", border: "1px solid #1a3a5c", textAlign: "center", fontSize: "8.5px" }}>
                    {data.percentage.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Summary Box */}
            <div style={{ border: "2px solid #1a3a5c", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", textAlign: "center", marginBottom: "12px" }}>
              {[
                { label: "Total Marks", value: `${data.totalObtained}/${data.totalMarks}`, big: false },
                { label: "Percentage", value: `${data.percentage.toFixed(1)}%`, big: false },
                { label: "Grade", value: data.grade, big: true },
                { label: "GPA", value: data.gpa.toFixed(2), big: false },
              ].map((item, i) => (
                <div key={item.label} style={{ padding: "8px 4px", borderRight: i < 3 ? "1px solid #1a3a5c" : "none" }}>
                  <div style={{ fontSize: "7.5px", textTransform: "uppercase", color: "#555", letterSpacing: "0.5px", fontWeight: 700 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: item.big ? "22px" : "16px", fontWeight: 900, color: item.big ? "#c8a84b" : "#1a3a5c", marginTop: "3px" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Grading Scale */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                Grading Scale / গ্রেড স্কেল
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5px" }}>
                <thead>
                  <tr style={{ background: "#e8e0d0" }}>
                    {["Marks Range", "Grade", "GPA", "Marks Range", "Grade", "GPA"].map((h) => (
                      <th key={h} style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700, color: "#1a3a5c", fontSize: "7px" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "white" }}>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>80–100</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700, color: "#c8a84b" }}>A+</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>5.00</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>50–59</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700 }}>B</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>3.00</td>
                  </tr>
                  <tr style={{ background: "#f9f7f2" }}>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>70–79</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700 }}>A</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>4.00</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>40–49</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700 }}>C</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>2.00</td>
                  </tr>
                  <tr style={{ background: "white" }}>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>60–69</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700 }}>A-</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>3.50</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>33–39</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center", fontWeight: 700 }}>D</td>
                    <td style={{ padding: "3px 5px", border: "1px solid #c8c8c8", textAlign: "center" }}>1.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Stamp area */}
            <div style={{ textAlign: "center", padding: "10px", margin: "10px 0", background: "#f5f0e8", border: "1px dashed #c8a84b", fontSize: "8px", color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>
              Official Seal / সিলমোহর
            </div>

            {/* Signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "20px", paddingTop: "8px" }}>
              {["Class Teacher", "Headmaster / Principal", "Guardian"].map((sig) => (
                <div key={sig} style={{ borderTop: "1px solid #333", paddingTop: "4px", textAlign: "center", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1a3a5c", fontWeight: 700 }}>
                  {sig}
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div style={{ textAlign: "center", marginTop: "14px", fontSize: "7.5px", color: "#888", borderTop: "1px dashed #ccc", paddingTop: "8px" }}>
              This is a computer-generated result sheet. | Issued: {new Date().toLocaleDateString("en-GB")} |
              Any alteration makes this document invalid.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}