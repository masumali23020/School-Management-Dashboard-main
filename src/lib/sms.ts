// lib/sms.ts বা অ্যাকশন ফাইলের নিচে
export async function sendSMS(numbers: string, message: string) {
  // আপনার নতুন দেওয়া তথ্য অনুযায়ী API Key এবং Sender ID
  const API_KEY = "6f4U2UAoOr3aSZjm9Td7"; 
  const SENDER_ID = "8809648908024"; // আপনার এপ্রুভড সেন্ডার আইডি এখানে দিন
  const URL = "http://bulksmsbd.net/api/smsapi";

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: API_KEY,
        senderid: SENDER_ID,
        number: numbers, // এখানে "88017...,88018..." এভাবে কমা দিয়ে একাধিক নাম্বার পাঠানো যাবে
        message: message,
      }),
    });

    const result = await response.json();
    
    if (result.response_code == 202) {
      console.log("✅ SMS Sent Successfully:", result.success_message);
    } else {
      console.error(`❌ SMS Error (${result.response_code}):`, result.error_message);
    }
    
    return result;
  } catch (error) {
    console.error("🌐 SMS Connection Error:", error);
    return null;
  }
}