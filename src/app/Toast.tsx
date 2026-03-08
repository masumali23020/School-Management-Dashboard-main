type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className="bg-black text-white px-4 py-2 rounded cursor-pointer"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}