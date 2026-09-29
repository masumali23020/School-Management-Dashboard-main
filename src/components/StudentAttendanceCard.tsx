import React from 'react'
import prisma from '../lib/db';
const StudentAttendanceCard = async({id}:{id: string}) => {
    const attendanceData = await prisma.attendance.findMany({
        where:{
            studentId:id,
            date: {
                gte: new Date( new Date().getFullYear(), 0,1)
            }
        },
   
    })
    const totalDays = attendanceData.length
    const presentDays = attendanceData.filter(day => day.present).length
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
  return (
    <div>
        <h1 className='text-xl font-semibold'>{attendancePercentage.toFixed(0)} %</h1>
        <span className='text-sm text-gray-400'>attendance</span>
    </div>
  )
}

export default StudentAttendanceCard