// components/results/ResultActions.tsx
import { Button } from "@/components/ui/button";
import { Save, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultActionsProps {
  onSave: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  showDelete?: boolean;
  hasChanges?: boolean;
  saveSuccess?: boolean;
  className?: string;
}

export function ResultActions({ 
  onSave, 
  onDelete, 
  isSaving = false,
  showDelete = false,
  hasChanges = false,
  saveSuccess = false,
  className 
}: ResultActionsProps) {
  return (
    <div className={cn("flex justify-end gap-2", className)}>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving || !hasChanges}
        className={cn(
          "transition-all duration-300",
          saveSuccess ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700",
          hasChanges && "animate-pulse"
        )}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Saving...
          </>
        ) : saveSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Saved!
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-1" />
            Save
          </>
        )}
      </Button>
      
      {showDelete && onDelete && (
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          className="transition-all duration-300 hover:scale-105"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}