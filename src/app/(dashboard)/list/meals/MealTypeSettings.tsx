// src/components/meals/MealTypeSettings.tsx
"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteMealType } from "@/Actions/meals/meal.actions";
import { toast } from "react-toastify";
import { MealTypeForm } from "./MealTypeForm";

interface MealType {
  id: number;
  name: string;
  rate: string;
  guestRate?: string | null;
  isActive: boolean;
}

interface Props {
  initialMealTypes: MealType[];
}

export function MealTypeSettings({ initialMealTypes }: Props) {
  const [mealTypes, setMealTypes] = useState<MealType[]>(initialMealTypes);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (id: number, name: string) => {
    startTransition(async () => {
      const result = await deleteMealType(id);
      if (result.success) {
        toast.success(`"${name}" deactivated`, );
        router.refresh();
      } else {
        toast.error("Failed to deactivate",);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <MealTypeForm onSuccess={() => router.refresh()} />
      </div>

      {mealTypes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg border-dashed">
          <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No meal types yet</p>
          <p className="text-xs mt-1">Add your first meal type to get started.</p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {mealTypes.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{meal.name}</p>
                  {!meal.isActive && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    Regular: ৳{Number(meal.rate).toFixed(2)}
                  </span>
                  {meal.guestRate && (
                    <span className="text-xs text-muted-foreground">
                      Guest: ৳{Number(meal.guestRate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <MealTypeForm
                  mealType={meal}
                  onSuccess={() => router.refresh()}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deactivate {meal.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will hide {meal.name} from meal entry forms.
                        All existing records using this meal type are preserved and
                        billing history remains accurate.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(meal.id, meal.name)}
                      >
                        Deactivate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}