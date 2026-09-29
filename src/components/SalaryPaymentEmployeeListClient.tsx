"use client";

// src/components/Salary/SalaryPaymentListClient.tsx

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllSalaryPayments, getFullSalaryInvoiceForPDF } from "@/Actions/Salaryactions/Salaryactions";
import { generateSalaryPDF, type SalaryInvoiceData } from "@/lib/Generatesalarypdf";
import { generateSalaryReportPDF, type SalaryReportPayment } from "@/lib/generateSalaryReportPDF";
import Pagination from "@/components/Pagination";
import { itemPerPage } from "@/lib/setting";
import { loadSchoolLogoDataUrl } from "@/lib/admission/pdf/pdf-assets";



export default function SalaryPaymentEmployeeListClient({
  salaryTypes,
  academicYears,

  loginusername
}: {
  salaryTypes:   SalaryTypeFilter[];
  academicYears: string[];
  
  loginusername: string;
 

  
}) {

  console.log("seleart transection", salaryTypes)
  
  // ─────────────────────────────────────────────────────────────────────────
  return (
   <div>
    Transecton page
   </div>
  );
}