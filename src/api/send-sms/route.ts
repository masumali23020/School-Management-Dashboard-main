// app/api/send-sms/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, messageType, customMessage } = body;

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "No students selected" 
        },
        { status: 400 }
      );
    }

    // Fetch students with their parent information
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
          },
        },
        parent: {
          select: {
            phone: true,
            name: true,
          },
        },
      },
    });

    // Filter out students without parents or parent phone numbers
    const studentsWithParentPhone = students.filter(
      (student) => student.parent?.phone && student.parent.phone.trim() !== ""
    );

    if (studentsWithParentPhone.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "No valid parent phone numbers found for selected students" 
        },
        { status: 400 }
      );
    }

    // Prepare messages for BulkSMS BD API
    const messages = studentsWithParentPhone.map((student) => {
      let messageText = "";
      const studentFullName = `${student.name} ${student.surname}`;
      const parentName = student.parent?.name || "Parent";
      
      switch (messageType) {
        case "exam-fee":
          messageText = `Dear ${parentName}, This is to inform you that ${studentFullName}'s exam fees are due. Please clear the payment at your earliest convenience. Class: ${student.class?.name || "N/A"}. Thank you.`;
          break;
          
        case "meeting":
          messageText = `Dear ${parentName}, You are invited to a parents-teacher meeting regarding ${studentFullName}. Please attend at the school premises. Class: ${student.class?.name || "N/A"}. Thank you.`;
          break;
          
        case "school-notice":
          messageText = `Dear ${parentName}, Important school notice regarding ${studentFullName}. Please check the school notice board or contact the class teacher. Class: ${student.class?.name || "N/A"}. Thank you.`;
          break;
          
        case "custom":
          messageText = customMessage || "No message content";
          break;
          
        default:
          messageText = `Dear ${parentName}, Message regarding your child ${studentFullName}. Class: ${student.class?.name || "N/A"}. Please contact school for details.`;
      }

      return {
        to: student.parent!.phone,
        message: messageText,
      };
    });

    // Remove duplicates (same parent with multiple children)
    const uniqueMessages = messages.reduce((acc, current) => {
      const exists = acc.find(m => m.to === current.to);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [] as { to: string; message: string }[]);

    // BulkSMS BD API Configuration
    const BULK_SMS_CONFIG = {
      api_key: process.env.BULK_SMS_API_KEY || "YOUR_API_KEY_HERE",
      senderid: process.env.BULK_SMS_SENDER_ID || "YOUR_SENDER_ID",
    };

    // Prepare the request payload for BulkSMS BD
    const smsPayload = {
      api_key: BULK_SMS_CONFIG.api_key,
      senderid: BULK_SMS_CONFIG.senderid,
      messages: uniqueMessages,
    };

    console.log("📤 Sending SMS via BulkSMS BD:", {
      totalMessages: uniqueMessages.length,
      messageType: messageType,
      recipients: uniqueMessages.map(m => m.to),
    });

    // Send SMS using BulkSMS BD API
    const response = await fetch("http://bulksmsbd.net/api/smsapimany", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const result = await response.json();

    console.log("📥 BulkSMS BD Response:", result);

    // Check if the SMS was sent successfully
    if (response.ok && result) {
      // Log the SMS sending in database (optional)
      try {
        // You can add SMS logging here if needed
        // await prisma.smsLog.create({ ... })
      } catch (logError) {
        console.error("Failed to log SMS:", logError);
      }

      return NextResponse.json({
        success: true,
        message: `SMS sent successfully to ${uniqueMessages.length} parents`,
        sent: uniqueMessages.length,
        totalSelected: studentIds.length,
        withoutParentPhone: studentIds.length - studentsWithParentPhone.length,
        messageType: messageType,
        timestamp: new Date().toISOString(),
        bulkSmsResponse: result,
      });
    } else {
      // BulkSMS BD API returned an error
      console.error("BulkSMS BD API Error:", result);
      
      return NextResponse.json(
        { 
          success: false,
          error: result?.message || "Failed to send SMS. Please check your BulkSMS BD account.",
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
        error: "Failed to send SMS. Please try again later.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}