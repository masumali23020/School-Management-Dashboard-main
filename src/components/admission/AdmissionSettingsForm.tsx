"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { upsertAdmissionSettings } from "@/Actions/admission/admission.actions";

type Props = {
  initial: {
    admissionEnabled: boolean;
    bkashNumber: string | null;
    paymentInstruction: string | null;
    applicationPrefix: string;
    admissionPrefix: string;
    invoicePrefix: string;
  };
};

export default function AdmissionSettingsForm({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.admissionEnabled);
  const [bkashNumber, setBkashNumber] = useState(initial.bkashNumber ?? "");
  const [paymentInstruction, setPaymentInstruction] = useState(
    initial.paymentInstruction ?? ""
  );
  const [applicationPrefix, setApplicationPrefix] = useState(
    initial.applicationPrefix
  );
  const [admissionPrefix, setAdmissionPrefix] = useState(initial.admissionPrefix);
  const [invoicePrefix, setInvoicePrefix] = useState(initial.invoicePrefix ?? "INV-ADM");
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    startTransition(async () => {
      const res = await upsertAdmissionSettings({
        admissionEnabled: enabled,
        bkashNumber,
        paymentInstruction,
        applicationPrefix,
        admissionPrefix,
        invoicePrefix,
      });
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admission Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Enable Public Admission</Label>
            <p className="text-sm text-muted-foreground">
              Allow applicants to submit via public page
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>bKash Number</Label>
            <Input value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Application Prefix</Label>
            <Input
              value={applicationPrefix}
              onChange={(e) => setApplicationPrefix(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice Prefix</Label>
            <Input
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Payment Instructions</Label>
          <Textarea
            rows={4}
            value={paymentInstruction}
            onChange={(e) => setPaymentInstruction(e.target.value)}
            placeholder="Send payment to bKash and submit TrxID..."
          />
        </div>
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
