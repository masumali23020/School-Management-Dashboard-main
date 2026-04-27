// app/api/send-sms/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, messageType, customMessage, examType, examTitle } = body;

    console.log("📥 Received SMS request:", {
      studentCount: studentIds?.length,
      messageType,
      examType,
      examTitle,
      customMessage: customMessage ? "Yes" : "No"
    });

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No students selected" },
        { status: 400 }
      );
    }

    // Fetch students with all related information including ClassHistory
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        class: {
          select: {
            name: true,
            id: true,
          },
        },
        grade: {
          select: {
            level: true,
          },
        },
        parent: {
          select: {
            phone: true,
            name: true,
          },
        },
        school: {
          select: {
            id: true,
            schoolName: true,
            shortName: true,
            phone: true,
            academicSession: true,
            email: true,
            address: true,
          },
        },
        // Get the latest class history for current academic year
        classHistory: {
          where: {
            academicYear: {
              contains: "2025", // Current academic year
            },
          },
          orderBy: {
            promotedAt: "desc",
          },
          take: 1,
          select: {
            rollNumber: true,
            academicYear: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log("👥 Found students:", students.length);

    // Get exam information if exam type is selected
    let examInfo = null;
    if (examType || examTitle) {
      if (students.length > 0 && students[0].school?.id) {
        const whereCondition: any = {
          schoolId: students[0].school.id,
        };
        
        if (examType && examType !== "all") {
          whereCondition.examType = examType;
        }
        
        if (examTitle) {
          whereCondition.title = { contains: examTitle, mode: "insensitive" };
        }

        examInfo = await prisma.exam.findFirst({
          where: whereCondition,
          orderBy: {
            startTime: "desc",
          },
          select: {
            id: true,
            title: true,
            examType: true,
            startTime: true,
            endTime: true,
          },
        });
        
        console.log("📝 Exam info:", examInfo);
      }
    }

    // Filter out students without parent phone numbers
    const studentsWithParentPhone = students.filter(
      (student) => student.parent?.phone && student.parent.phone.trim() !== ""
    );

    console.log("📱 Students with parent phone:", studentsWithParentPhone.length);

    if (studentsWithParentPhone.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "No valid parent phone numbers found for selected students",
          details: "Please ensure parents have phone numbers in their profile"
        },
        { status: 400 }
      );
    }

    // Prepare messages with all details
    const messages = studentsWithParentPhone.map((student) => {
      let messageText = "";
      const studentFullName = `${student.name} ${student.surname}`;
      const parentName = student.parent?.name || "Dear Parent";
      const className = student.class?.name || "N/A";
      const gradeLevel = student.grade?.level || "";
      
      // Get roll number and academic year from class history
      const currentClassHistory = student.classHistory?.[0];
      const rollNumber = currentClassHistory?.rollNumber?.toString() || "N/A";
      const academicYear = currentClassHistory?.academicYear || student.school?.academicSession || "2025-2026";
      
      const schoolName = student.school?.shortName || student.school?.schoolName || "School";
      const schoolPhone = student.school?.phone || "";
      const schoolAddress = student.school?.address || "";
      
      // Create formatted info block
      const infoLines = [
        `👨‍🎓 Student: ${studentFullName}`,
        `📚 Class: ${className}`,
        rollNumber !== "N/A" ? `🔢 Roll No: ${rollNumber}` : null,
        gradeLevel ? `📊 Grade: ${gradeLevel}` : null,
        `📅 Session: ${academicYear}`,
        `🏫 School: ${schoolName}`,
      ].filter(Boolean).join("\n");
      
      // School signature
      const signature = [
        `\n---`,
        `${schoolName}`,
        schoolPhone ? `📞 ${schoolPhone}` : null,
        schoolAddress ? `📍 ${schoolAddress}` : null,
      ].filter(Boolean).join("\n");
      
      switch (messageType) {
        case "exam-fee":
          messageText = [
            `Dear ${parentName},`,
            ``,
            `This is to inform you that the exam fees for your child are due.`,
            ``,
            infoLines,
            ``,
            examInfo ? `📝 Exam: ${examInfo.title}` : null,
       
            examInfo?.startTime ? `📅 Date: ${new Date(examInfo.startTime).toLocaleDateString()}` : null,
            ``,
            `Please clear the payment at your earliest convenience.`,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        case "meeting":
          messageText = [
            `Dear ${parentName},`,
            ``,
            `You are invited to a parents-teacher meeting regarding your child's progress.`,
            ``,
            infoLines,
            ``,
            `Please attend at the school premises on the scheduled date.`,
            `Contact the class teacher for more details.`,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        case "school-notice":
          messageText = [
            `Dear ${parentName},`,
            ``,
            `Important school notice regarding your child.`,
            ``,
            infoLines,
            ``,
            `Please check the school notice board or contact the class teacher for details.`,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        case "result":
          messageText = [
            `Dear ${parentName},`,
            ``,
            `Exam results have been published.`,
            ``,
            infoLines,
            ``,
            examInfo ? `📝 Exam: ${examInfo.title}` : null,
         
            ``,
            `Please check the student portal or contact the school for detailed results.`,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        case "attendance":
          messageText = [
            `Dear ${parentName},`,
            ``,
            `Attendance notice for your child.`,
            ``,
            infoLines,
            ``,
            `Please ensure regular attendance as per school guidelines.`,
            `Contact the class teacher for attendance details.`,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        case "fee-reminder":
          messageText = [
            `Dear ${parentName},`,
            ``,
            `Fee payment reminder.`,
            ``,
            infoLines,
            ``,
            `Please clear any outstanding fees to avoid inconvenience.`,
            `Contact the school office for payment details.`,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        case "custom":
          messageText = [
            customMessage || "Message from school",
            ``,
            `Student Details:`,
            infoLines,
            signature,
          ].filter(Boolean).join("\n");
          break;
          
        default:
          messageText = [
            `Dear ${parentName},`,
            ``,
            `Message regarding your child's education.`,
            ``,
            infoLines,
            ``,
            `Please contact the school for more information.`,
            signature,
          ].filter(Boolean).join("\n");
      }

      // Format phone number for BulkSMS BD
      let phoneNumber = student.parent!.phone.replace(/[^0-9]/g, '');
      
      // Ensure proper Bangladeshi number format
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '88' + phoneNumber;
      } else if (phoneNumber.startsWith('880')) {
        // Already in correct format
      } else if (!phoneNumber.startsWith('88')) {
        phoneNumber = '88' + phoneNumber;
      }

      // Validate phone number length (Bangladeshi numbers should be 13 digits with country code)
      if (phoneNumber.length === 11 && phoneNumber.startsWith('0')) {
        phoneNumber = '880' + phoneNumber.substring(1);
      }

      return {
        to: phoneNumber,
        message: messageText,
      };
    });

    // Remove duplicates (same parent with multiple children)
    const uniqueMessages = messages.reduce((acc, current) => {
      const exists = acc.find(m => m.to === current.to);
      if (!exists) {
        acc.push(current);
      } else {
        // If parent has multiple children, combine messages
        exists.message += `\n\n---\n\nAlso regarding:\n${current.message.split('\n').slice(0, 5).join('\n')}`;
      }
      return acc;
    }, [] as { to: string; message: string }[]);

    console.log("📨 Prepared messages:", uniqueMessages.length);
    console.log("📋 SMS Preview:");
    console.log("=" .repeat(50));
    console.log(uniqueMessages[0]?.message);
    console.log("=" .repeat(50));

    // Check API credentials
    const BULK_SMS_API_KEY = process.env.BULK_SMS_API_KEY;
    const BULK_SMS_SENDER_ID = process.env.BULK_SMS_SENDER_ID;

    if (!BULK_SMS_API_KEY || BULK_SMS_API_KEY === "YOUR_API_KEY_HERE") {
      return NextResponse.json(
        { success: false, error: "BulkSMS API key not configured" },
        { status: 500 }
      );
    }

    if (!BULK_SMS_SENDER_ID || BULK_SMS_SENDER_ID === "YOUR_SENDER_ID") {
      return NextResponse.json(
        { success: false, error: "BulkSMS Sender ID not configured" },
        { status: 500 }
      );
    }

    // Log SMS to database
    try {
      await prisma.sMSLog.create({
        data: {
          schoolId: students[0]?.school?.id || 1,
          messageType: messageType,
          receiverNo: uniqueMessages[0]?.to || "",
          message: uniqueMessages[0]?.message || "",
          recipientCount: uniqueMessages.length,
          studentCount: studentIds.length,
          messageContent: uniqueMessages[0]?.message?.substring(0, 100) || "",
          status: "PENDING",
          sentAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Failed to log SMS:", logError);
    }

    // Send to BulkSMS BD API
    const smsPayload = {
      api_key: BULK_SMS_API_KEY,
      senderid: BULK_SMS_SENDER_ID,
      messages: uniqueMessages,
    };

    console.log("📤 Sending to BulkSMS BD...");
    console.log("📊 Summary:", {
      totalMessages: uniqueMessages.length,
      totalStudents: studentIds.length,
      studentsWithPhone: studentsWithParentPhone.length,
      withoutPhone: studentIds.length - studentsWithParentPhone.length,
    });

    const response = await fetch("http://bulksmsbd.net/api/smsapimany", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const responseText = await response.text();
    console.log("📥 BulkSMS Response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response:", responseText);
      result = { raw: responseText };
    }

    // Update SMS log status
    if (response.ok) {
      try {
        await prisma.sMSLog.updateMany({
          where: {
            schoolId: students[0]?.school?.id || 1,
            status: "PENDING",
          },
          data: {
            status: "SENT",
            responseData: JSON.stringify(result),
          },
        });
      } catch (updateError) {
        console.error("Failed to update SMS log:", updateError);
      }

      return NextResponse.json({
        success: true,
        message: `SMS sent successfully to ${uniqueMessages.length} parents`,
        sent: uniqueMessages.length,
        totalSelected: studentIds.length,
        withoutParentPhone: studentIds.length - studentsWithParentPhone.length,
        messageType: messageType,
        timestamp: new Date().toISOString(),
        response: result,
        sampleMessage: uniqueMessages[0]?.message?.substring(0, 200) + "...",
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result?.message || result?.error || "Failed to send SMS",
          details: result
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("❌ SMS API Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to send SMS",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}