// app/components/SMSButton.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";


interface SMSButtonProps {
  selectedStudents: string[];
  onSuccess: () => void;
  examTypes?: { label: string; value: string }[];
}

export default function SMSButton({ selectedStudents, onSuccess, examTypes }: SMSButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [examType, setExamType] = useState("Mid-Term");
  const [examTitle, setExamTitle] = useState("");
  const [messageType, setMessageType] = useState("");

  const sendSMS = async (type: string, customText?: string) => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    const loadingToast = toast.loading(`Sending SMS to ${selectedStudents.length} students...`);

    try {
      setIsSending(true);

      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents,
          messageType: type,
          customMessage: customText || undefined,
          examType: type.includes("exam") || type === "result" ? examType : undefined,
          examTitle: type.includes("exam") || type === "result" ? examTitle : undefined,
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (response.ok && data.success) {
        toast.success(
          `✅ SMS sent to ${data.sent} parents!\n📱 ${data.withoutParentPhone || 0} had no phone\n\nPreview:\n${data.sampleMessage || ''}`,
          
        );
        onSuccess();
      } else {
        toast.error(data.error || "Failed to send SMS", );
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSMS = (type: string) => {
    setMessageType(type);
    
    if (type === "custom") {
      setShowCustomModal(true);
      return;
    }

    if (type.includes("exam") || type === "result") {
      // Show exam type selection before sending
      sendSMS(type);
      return;
    }
    
    // Show preview before sending
    setShowPreviewModal(true);
  };

  const messageTypes = [
    { 
      label: "Exam Fee Notice", 
      icon: "📚", 
      type: "exam-fee",
      color: "blue",
      description: "Send exam fee payment reminder with student details"
    },
    { 
      label: "Meeting Notice", 
      icon: "👥", 
      type: "meeting",
      color: "green",
      description: "Invite parents to parent-teacher meeting"
    },
    { 
      label: "Result Published", 
      icon: "📊", 
      type: "result",
      color: "purple",
      description: "Notify parents about published exam results"
    },
    { 
      label: "Attendance Notice", 
      icon: "📋", 
      type: "attendance",
      color: "orange",
      description: "Send attendance related notifications"
    },
    { 
      label: "Fee Reminder", 
      icon: "💰", 
      type: "fee-reminder",
      color: "red",
      description: "Remind parents about outstanding fees"
    },
    { 
      label: "School Notice", 
      icon: "🏫", 
      type: "school-notice",
      color: "indigo",
      description: "Send general school notices and announcements"
    },
    { 
      label: "Custom Message", 
      icon: "✏️", 
      type: "custom",
      color: "gray",
      description: "Write your own custom message"
    },
  ];

  return (
    <>
      {/* Main SMS Button with Dropdown */}
      <div className="relative group">
        <button
          className={`bg-blue-600 text-white text-xs px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50`}
          disabled={isSending}
        >
          {isSending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Send SMS {selectedStudents.length > 0 && `(${selectedStudents.length})`}
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="p-2">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Select SMS Type</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedStudents.length > 0 
                  ? `Sending to ${selectedStudents.length} student(s)`
                  : '⚠️ No students selected'}
              </p>
            </div>
            
            <div className="mt-1 max-h-80 overflow-y-auto">
              {messageTypes.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleSendSMS(item.type)}
                  disabled={isSending}
                  className="w-full px-3 py-3 text-left hover:bg-gray-50 rounded-md disabled:opacity-50 transition-colors mb-1"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Type Selection Modal */}
      {(messageType.includes("exam") || messageType === "result") && showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Exam Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                >
                  <option value="Mid-Term">Mid-Term</option>
                  <option value="Final">Final</option>
                  <option value="Monthly Test">Monthly Test</option>
                  <option value="Weekly Test">Weekly Test</option>
                  <option value="Class Test">Class Test</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Exam Title (Optional)</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g., First Term Exam 2025"
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                />
              </div>
              
              <div className="bg-blue-50 rounded-md p-3">
                <p className="text-xs text-blue-700">
                  📱 SMS will include: Student Name, Class, Roll No, Academic Year, School Name, and Exam Details
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  sendSMS(messageType);
                }}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Message Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">Custom SMS</h3>
            
            <textarea
              className="w-full border rounded-md p-3 h-40 resize-none text-sm"
              placeholder="Type your message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              maxLength={500}
            />
            
            <div className="bg-gray-50 rounded-md p-3 mt-2">
              <p className="text-xs text-gray-600">
                ℹ️ Student details (Name, Class, Roll No, School) will be automatically added to your message
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomMessage("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  sendSMS("custom", customMessage);
                  setCustomMessage("");
                }}
                disabled={!customMessage.trim()}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}