import Image from "next/image";

import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import TableSearch from "../../../../components/TableSearch";
import { Prisma } from "@prisma/client";
import prisma from "../../../../lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";

type PaymentListPageType = {
  id: string;
  invoiceNumber: string;
  monthLabel: string;
  academicYear: string;
  amountPaid: number;
  paymentMethod: string;
  paidAt: Date;
  personName: string;
  detail: string;
};

const TransectionPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, ...queryParams } = searchParams;
  const { role, schoolId, userId } = await getUserRoleAuth();

  const p = page ? parseInt(page) : 1;
  const itemPerPage = 10;

  // Check if user has school access
  if (!schoolId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500 py-8">
          <p>Error: No school associated with this account.</p>
          <p className="text-sm mt-2">Please contact administrator.</p>
        </div>
      </div>
    );
  }

  const normalizedRole = role?.toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const isStudent = normalizedRole === "student";
  const isParent = normalizedRole === "parent";
  const isFeeHistory = isStudent || isParent;

  let paymentsData: PaymentListPageType[];
  let count: number;
  let linkedStudentCount = 0;

  if (isFeeHistory) {
    const parentStudentIds = isParent && userId
      ? (await prisma.student.findMany({
          where: { parentId: userId, schoolId },
          select: { id: true },
        })).map((student) => student.id)
      : [];
    linkedStudentCount = parentStudentIds.length;

    const feeQuery: Prisma.FeePaymentWhereInput = {
      ...(isStudent
        ? { studentId: userId ?? "__missing_student__" }
        : { studentId: { in: parentStudentIds } }),
    };
    const admissionQuery: Prisma.AdmissionPaymentWhereInput = {
      schoolId,
      status: "VERIFIED",
      application: {
        is: {
          schoolId,
          studentId: isStudent ? userId ?? "__missing_student__" : { in: parentStudentIds },
        },
      },
    };

    if (queryParams.search) {
      const search = queryParams.search;
      const searchFilters: Prisma.FeePaymentWhereInput[] = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { monthLabel: { contains: search, mode: "insensitive" } },
        { academicYear: { contains: search, mode: "insensitive" } },
        ...(isParent
          ? [
              {
                student: {
                  is: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" as const } },
                      { surname: { contains: search, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ]
          : []),
      ];
      feeQuery.OR = searchFilters;

      admissionQuery.OR = [
        { transactionId: { contains: search, mode: "insensitive" } },
        {
          application: {
            is: {
              OR: [
                { applicationNumber: { contains: search, mode: "insensitive" } },
                { studentName: { contains: search, mode: "insensitive" } },
                { surname: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    const [feePayments, feeCount, admissionPayments, admissionCount] = await prisma.$transaction([
      prisma.feePayment.findMany({
        where: feeQuery,
        include: {
          student: { select: { name: true, surname: true } },
          classFeeStructure: { include: { feeType: { select: { name: true } } } },
        },
        take: itemPerPage * p,
        orderBy: { paidAt: "desc" },
      }),
      prisma.feePayment.count({ where: feeQuery }),
      prisma.admissionPayment.findMany({
        where: admissionQuery,
        include: {
          application: {
            select: {
              studentName: true,
              surname: true,
              admissionSession: { select: { academicYear: true } },
            },
          },
        },
        take: itemPerPage * p,
        orderBy: [{ verifiedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.admissionPayment.count({ where: admissionQuery }),
    ]);

    const history = [
      ...feePayments.map((payment) => ({
        id: `fee-${payment.id}`,
        invoiceNumber: payment.invoiceNumber,
        monthLabel: payment.monthLabel || "—",
        academicYear: payment.academicYear,
        amountPaid: payment.amountPaid,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        personName: `${payment.student.name} ${payment.student.surname}`.trim(),
        detail: payment.classFeeStructure.feeType.name,
      })),
      ...admissionPayments.map((payment) => ({
        id: `admission-${payment.id}`,
        invoiceNumber: payment.transactionId,
        monthLabel: "Admission Fee",
        academicYear: payment.application.admissionSession.academicYear,
        amountPaid: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        paidAt: payment.verifiedAt ?? payment.createdAt,
        personName: `${payment.application.studentName} ${payment.application.surname}`.trim(),
        detail: "Admission Fee",
      })),
    ].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

    paymentsData = history.slice(itemPerPage * (p - 1), itemPerPage * p);
    count = feeCount + admissionCount;
  } else {
    const salaryQuery: Prisma.EmployeeSalaryPaymentWhereInput = { schoolId };

    if (!isAdmin && userId) {
      salaryQuery.employeeId = userId;
    }

    if (queryParams.search) {
      salaryQuery.OR = [
        { invoiceNumber: { contains: queryParams.search, mode: "insensitive" } },
        { monthLabel: { contains: queryParams.search, mode: "insensitive" } },
        { academicYear: { contains: queryParams.search, mode: "insensitive" } },
      ];
    }

    const [salaryPayments, salaryCount] = await prisma.$transaction([
      prisma.employeeSalaryPayment.findMany({
        where: salaryQuery,
        include: {
          employee: { select: { name: true, surname: true } },
          salaryType: { select: { name: true } },
        },
        take: itemPerPage,
        skip: itemPerPage * (p - 1),
        orderBy: { paidAt: "desc" },
      }),
      prisma.employeeSalaryPayment.count({ where: salaryQuery }),
    ]);

    paymentsData = salaryPayments.map((payment) => ({
      id: `salary-${payment.id}`,
      invoiceNumber: payment.invoiceNumber,
      monthLabel: payment.monthLabel || "—",
      academicYear: payment.academicYear,
      amountPaid: Number(payment.amountPaid),
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      personName: payment.employee
        ? `${payment.employee.name} ${payment.employee.surname || ""}`.trim()
        : "—",
      detail: payment.salaryType?.name || "—",
    }));
    count = salaryCount;
  }

  // Columns definition
  const columns = [
    ...(isAdmin || isParent
      ? [
          {
            header: isAdmin ? "Employee" : "Student",
            accessor: "person",
          },
        ]
      : []),
    {
      header: "Invoice No",
      accessor: "invoiceNumber",
      className: "hidden md:table-cell",
    },
    {
      header: "Month",
      accessor: "monthLabel",
    },
    {
      header: isFeeHistory ? "Fee Type" : "Salary Type",
      accessor: "detail",
    },
    {
      header: "Academic Year",
      accessor: "academicYear",
      className: "hidden lg:table-cell",
    },
    {
      header: "Amount",
      accessor: "amountPaid",
    },
    {
      header: "Method",
      accessor: "paymentMethod",
      className: "hidden md:table-cell",
    },
    {
      header: "Paid At",
      accessor: "paidAt",
      className: "hidden lg:table-cell",
    },
    ...(isAdmin
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: PaymentListPageType) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      {(isAdmin || isParent) && (
        <td className="flex items-center gap-4 p-4">
          <Image
            src={"/avatar.png"}
            alt=""
            width={40}
            height={40}
            className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <h3 className="font-semibold">
              {item.personName}
            </h3>
          </div>
        </td>
      )}
      <td className="hidden md:table-cell font-mono text-xs text-gray-600">
        {item.invoiceNumber}
      </td>
      <td>
        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold">
          {item.monthLabel || "—"}
        </span>
      </td>
      <td className="text-gray-700">{item.detail || "—"}</td>
      <td className="hidden lg:table-cell text-gray-600">
        {item.academicYear}
      </td>
      <td className="font-bold text-emerald-600">
        ৳{Number(item.amountPaid).toFixed(2)}
      </td>
      <td className="hidden md:table-cell">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
          {item.paymentMethod}
        </span>
      </td>
      <td className="hidden lg:table-cell text-gray-500 text-xs">
        {new Date(item.paidAt).toLocaleDateString()}
      </td>
      {isAdmin && (
        <td>
          <div className="flex items-center gap-2">
            {/* 
            <FormContainer table="salaryPayment" type="update" data={item} />
            <FormContainer table="salaryPayment" type="delete" id={item.id} />
            */}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {isAdmin
            ? "Employee Salary Payments"
            : isParent
              ? "Children's Fee Payment History"
              : isStudent
                ? "My Fee Payment History"
                : "My Salary History"} ({count})
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {/* {isAdmin && <FormContainer table="salaryPayment" type="create" />} */}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={paymentsData} />
      {paymentsData.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          {isParent && linkedStudentCount === 0
            ? "No students are linked to this parent account."
            : isFeeHistory
              ? "No fee payment records found."
              : "No salary payment records found."}
        </p>
      )}

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default TransectionPage;