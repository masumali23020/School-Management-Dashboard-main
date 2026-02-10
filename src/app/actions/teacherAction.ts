import prisma from "../../lib/db";
import { itemPerPage } from "../../lib/setting";



/**
 * Fetches a paginated list of teachers and the total count.
 * @param page The current page number (1-based index).
 */
export const getTeachersAndPaginated = async (page: number, ...queryParams: any[]) => {
  const p = page > 0 ? page : 1; // Ensure page is at least 1

  // The $transaction call to fetch data and count
  const [teachers, count] = await prisma.$transaction([
    prisma.teacher.findMany({
     
      include: {
        subjects: true,
        classes: true,
      },
      take: itemPerPage,
      skip: itemPerPage * (p - 1),
      orderBy: {
        createdAt: "desc"
      }
   
    }),
    prisma.teacher.count(),
  ]);

  return { teachers, count };
};