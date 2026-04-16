"use server";

export {
  canPublishAssignment,
  canPublishExam,
  getAllClasses,
  getAssignmentPublishStatus,
  getExamPublishStatus,
  getExamsByClass,
  getPublishedExamsByClassAndSession,
  getPublishedSessionsByClass,
  getResultPublishSessions,
  publishAssignmentResult,
  publishExamResult,
  searchStudentResult,
  unpublishAssignmentResult,
  unpublishExamResult,
} from "@/Actions/ResultAction/resultSearchAction";

export type {
  ExamPublishStatusItem,
  PublishStatusItem,
  StudentResultData,
} from "@/Actions/ResultAction/resultSearchAction";
