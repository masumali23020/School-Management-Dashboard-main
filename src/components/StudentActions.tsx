"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DownloadCloudIcon, Mail, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteStudent } from "@/Actions/studentAction/deleteStudent/deleteStudent";
import { toast } from "react-toastify";

interface iAppProps {
  id: string;
  onDeleted?: () => void;
}

const StudentActions = ({ id, onDeleted }: iAppProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

const handleDelete = async () => {
  try {
    setLoading(true);
    const result = await deleteStudent(id);

    if (result.success) {
      toast.success(result.message);
      setDialogOpen(false);
      onDeleted?.();
    } else {
      // সার্ভার থেকে আসা নির্দিষ্ট এরর মেসেজ (যেমন: "Cannot delete... records found") দেখাবে
      toast.error(result.message, {
        autoClose: 5000, // মেসেজটি ৫ সেকেন্ড থাকবে যাতে ইউজার পড়তে পারে
      });
    }
  } catch (err) {
    toast.error("Failed to connect to server");
  } finally {
    setLoading(false);
  }
};

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="secondary">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/list/students/${id}`} className="flex items-center gap-2">
                <Pencil className="size-4 mr-2" /> View
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={`/api/Student/${id}`} target="_blank" className="flex items-center gap-2">
                <DownloadCloudIcon className="size-4 mr-2" /> Download
              </Link>
            </DropdownMenuItem>

            <DialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <Trash2 className="size-4 mr-2" /> Delete Student
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete the student and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentActions;