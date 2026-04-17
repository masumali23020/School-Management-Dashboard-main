import { subjectSchema } from './FormValidationSchema';
import jsPDF from "jspdf";
import type { StudentResultData } from "@/Actions/ResultAction/resultSearchAction";

function letterGrade(pct: number): string {
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "A-";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D";
  return "F";
}

function rowGpa(pct: number): string {
  if (pct >= 80) return "5.00";
  if (pct >= 70) return "4.00";
  if (pct >= 60) return "3.50";
  if (pct >= 50) return "3.00";
  if (pct >= 40) return "2.00";
  if (pct >= 33) return "1.00";
  return "0.00";
}

/** A4 student mark sheet — saves as .pdf */
export function generateStudentResultPDF(data: StudentResultData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW = 210;
  const ML = 14;
  const MR = 14;
  let y = 16;

  const school =    "School";
  const studentName = `${data.student.name} ${data.student.surname}`.trim();
  const isAdvanced = data.student.class.grade.level >= 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 58, 92);
  doc.text(school, PW / 2, y, { align: "center" });
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Student Result / Mark Sheet", PW / 2, y, { align: "center" });
  y += 9;

  doc.setDrawColor(26, 58, 92);
  doc.setLineWidth(0.4);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  const info: [string, string][] = [
    ["Exam / report", `${data.exam.title} — Session ${data.exam.session}`],
    ["Class", data.student.class.name],
    ["Roll", String(data.student.roll ?? "—")],
    [
      "Parent",
      data.student.parent?.name
        ? `${data.student.parent.name} (${data.student.parent.phone})`
        : "—",
    ],
    ["DOB", new Date(data.student.birthday).toLocaleDateString("en-GB")],
  ];
  for (const [k, v] of info) {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, ML, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(v, PW - ML - MR - 32);
    doc.text(lines, ML + 32, y);
    y += 4 + (lines.length - 1) * 4.2;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const rowH = 7;
  let x = ML;

  const cols: { w: number; label: string; align: "left" | "center" | "right" }[] =
    isAdvanced
      ? [
          { w: 52, label: "Subject", align: "left" },
          { w: 18, label: "MCQ", align: "center" },
          { w: 18, label: "Written", align: "center" },
          { w: 18, label: "Prac.", align: "center" },
          { w: 22, label: "Total", align: "center" },
          { w: 16, label: "Gr.", align: "center" },
          { w: 16, label: "GPA", align: "center" },
        ]
      : [
          { w: 110, label: "Subject", align: "left" },
          { w: 28, label: "Total", align: "center" },
          { w: 22, label: "Gr.", align: "center" },
          { w: 22, label: "GPA", align: "center" },
        ];

  doc.setFillColor(26, 58, 92);
  doc.rect(ML, y, PW - ML - MR, rowH, "F");
  x = ML + 2;
  for (const c of cols) {
    if (c.align === "center") {
      doc.text(c.label, x + c.w / 2, y + 5, { align: "center" });
    } else {
      doc.text(c.label, x + 1, y + 5, { align: "left" });
    }
    x += c.w;
  }
  y += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);

  for (let i = 0; i < data.results.length; i++) {
    const r = data.results[i];
    if (y > 270) {
      doc.addPage();
      y = 16;
    }
    const fill = i % 2 === 0 ? 252 : 248;
    doc.setFillColor(fill, fill, 250);
    doc.rect(ML, y, PW - ML - MR, rowH, "F");
    doc.setDrawColor(200, 200, 200);
    doc.rect(ML, y, PW - ML - MR, rowH, "S");

    const max = r.totalScore && r.totalScore > 0 ? r.totalScore : 100;
    // const max = r.totalScore && r.totalScore > 0 ? r.maxMarks : 100;
    const pct = (r.totalScore / max) * 100;
    x = ML + 2;

    if (isAdvanced) {
      const parts = [
        r.subjectName.slice(0, 36),
        r.mcqScore != null ? String(r.mcqScore) : "—",
        r.writtenScore != null ? String(r.writtenScore) : "—",
        r.practicalScore != null ? String(r.practicalScore) : "—",
        `${r.totalScore}/${max}`,
        letterGrade(pct),
        rowGpa(pct),
      ];
      const widths = [52, 18, 18, 18, 22, 16, 16];
      const aligns: ("left" | "center")[] = [
        "left",
        "center",
        "center",
        "center",
        "center",
        "center",
        "center",
      ];
      for (let j = 0; j < parts.length; j++) {
        const w = widths[j];
        if (aligns[j] === "center") {
          doc.text(parts[j], x + w / 2, y + 5, { align: "center" });
        } else {
          doc.text(parts[j], x + 1, y + 5, { align: "left" });
        }
        x += w;
      }
    } else {
      const parts = [
        r.subjectName.slice(0, 48),
        `${r.totalScore}/${max}`,
        letterGrade(pct),
        rowGpa(pct),
      ];
      const widths = [110, 28, 22, 22];
      const aligns: ("left" | "center")[] = ["left", "center", "center", "center"];
      for (let j = 0; j < parts.length; j++) {
        const w = widths[j];
        if (aligns[j] === "center") {
          doc.text(parts[j], x + w / 2, y + 5, { align: "center" });
        } else {
          doc.text(parts[j], x + 1, y + 5, { align: "left" });
        }
        x += w;
      }
    }
    y += rowH;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(26, 58, 92);
  doc.text(
    `Total: ${data.totalObtained} / ${data.totalMarks}   (${data.percentage.toFixed(2)}%)   Grade: ${data.grade}   GPA: ${data.gpa.toFixed(2)}`,
    ML,
    y
  );
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated ${new Date().toLocaleString("en-GB")} — Official published results only.`,
    ML,
    y
  );

  const safe = studentName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  doc.save(`Result_${safe}_Session_${data.exam.session}.pdf`);
}
