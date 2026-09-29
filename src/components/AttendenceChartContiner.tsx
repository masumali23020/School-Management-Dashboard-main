
import Image from 'next/image'
import React from 'react'
import AttendanceChart from './AttendanceChart';
import  prisma  from  "../lib/db"
// import AttendanceChart from './AttendanceChart'

const AttendenceChartContiner = async() => {

     const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceSaterDay = dayOfWeek === 0 ? 7 : dayOfWeek - 1;

  const lastSaterDay = new Date(today);

  lastSaterDay.setDate(today.getDate() - daysSinceSaterDay);

  const resData = await prisma.attendance.findMany({
    where: {
      date: {
        gte: lastSaterDay,
      },
    },
    select: {
      date: true,
      present: true,
    },
  });

  // console.log(data)

  const daysOfWeek = ["Sat","Sun", "Mon", "Tue", "Wed", "Thu", ];

  const attendanceMap: { [key: string]: { present: number; absent: number } } =
    {
      Sat: { present: 0, absent: 0 },
      Sun: { present: 0, absent: 0 },
      Mon: { present: 0, absent: 0 },
      Tue: { present: 0, absent: 0 },
      Wed: { present: 0, absent: 0 },
      Thu: { present: 0, absent: 0 },
      Fri: { present: 0, absent: 0 },
    };

  resData.forEach((item) => {
    const itemDate = new Date(item.date);
    const dayOfWeek = itemDate.getDay();
    
    if (dayOfWeek >= 1 && dayOfWeek <= 6) {
      const dayName = daysOfWeek[dayOfWeek - 1];

      if (item.present) {
        attendanceMap[dayName].present += 1;
      } else {
        attendanceMap[dayName].absent += 1;
      }
    }
  });

  const data = daysOfWeek.map((day) => ({
    name: day,
    present: attendanceMap[day].present,
    absent: attendanceMap[day].absent,
  }));

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Attendance</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <AttendanceChart data={data}/>
    </div>
  );
};

export default AttendenceChartContiner;