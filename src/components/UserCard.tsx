import Image from "next/image";
import prisma from "../lib/db"
import { UserRole } from "@prisma/client";

const UserCard = async({ type }: { type: "staff" | "student" | "teacher" | "parent"| "cashier" }) => {

  const modelMap: Record<typeof type, any> ={
    staff: prisma?.employee,
    cashier: prisma?.employee,
    teacher: prisma?.employee,
    student: prisma?.student,
    parent: prisma?.parent
  }
const roleMap: Record<string, UserRole> = {
  admin: UserRole.STAFF,
  teacher: UserRole.TEACHER,
  staff: UserRole.STAFF,
};

const queryOptions = 
  (type === "staff" || type === "teacher" || type === "cashier")
    ? { where: { role: roleMap[type] } }
    : {};
    const count = await modelMap[type]?.count(queryOptions);
  return (
    <div className="rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          2024/25
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4">{count}</h1>
      <h2 className="capitalize text-sm font-medium text-gray-500">{type}s</h2>
    </div>
  );
};

export default UserCard;
