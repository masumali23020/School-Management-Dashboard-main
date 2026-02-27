// components/FormContainer.tsx
import dynamic from "next/dynamic";

// Lazy load forms
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <div>Loading...</div>,
});

const BulkAttendanceForm = dynamic(() => import("./forms/BulkAttendanceForm"), {
  loading: () => <div>Loading...</div>,
});

const DeleteAttendanceForm = dynamic(() => import("./forms/DeleteAttendanceForm"), {
  loading: () => <div>Loading...</div>,
});

const FormContainer = ({
  table,
  type,
  data,
  relatedData,
  id,
  setOpen,
}: {
  table: 
    | "attendance"
    | "bulkAttendance"
    | "student"
    | "teacher"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  relatedData?: any;
  id?: number | string;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const renderForm = () => {
    switch (table) {
      case "attendance":
        if (type === "delete") {
          return <DeleteAttendanceForm id={Number(id)} setOpen={setOpen} />;
        }
        return (
          <AttendanceForm
            type={type}
            data={data}
            setOpen={setOpen}
            relatedData={relatedData}
          />
        );
      
      case "bulkAttendance":
        return (
          <BulkAttendanceForm
            classData={data}
            month={new Date()}
            students={relatedData?.students || []}
          />
        );
      
      // অন্যান্য cases
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg">
      {renderForm()}
    </div>
  );
};

export default FormContainer;