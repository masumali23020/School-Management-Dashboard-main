"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ApplicationPreviewClient, {
  type ApplicationPreviewData,
} from "@/components/admission/ApplicationPreviewClient";
import { getApplicationPreview } from "@/Actions/admission/admission.actions";

export default function ApplicationAccessGate({
  schoolSlug,
  schoolBasePath,
  applicationNumber,
  initialVerificationCode,
  initialMobile,
}: {
  schoolSlug: string;
  schoolBasePath: string;
  applicationNumber: string;
  initialVerificationCode?: string;
  initialMobile?: string;
}) {
  const [mobile, setMobile] = useState(initialMobile ?? "");
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<ApplicationPreviewData | null>(null);
  const [attemptedAuto, setAttemptedAuto] = useState(false);

  const loadPreview = (mobileValue?: string, code?: string) => {
    startTransition(async () => {
      const preview = await getApplicationPreview({
        schoolSlug,
        applicationNumber,
        mobile: mobileValue,
        verificationCode: code,
      });
      setData(preview as ApplicationPreviewData | null);
    });
  };

  useEffect(() => {
    if (initialVerificationCode && !attemptedAuto) {
      setAttemptedAuto(true);
      loadPreview(undefined, initialVerificationCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVerificationCode, attemptedAuto]);

  if (data) {
    return (
      <ApplicationPreviewClient
        data={data}
        schoolSlug={schoolSlug}
        schoolBasePath={schoolBasePath}
        accessMobile={mobile || initialMobile}
        verificationCode={initialVerificationCode}
      />
    );
  }

  if (initialVerificationCode && pending) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading application preview...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify to View Application</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Application: <strong>{applicationNumber}</strong>
        </p>
        <div className="space-y-2">
          <Label>Registered Mobile Number</Label>
          <Input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>
        <Button onClick={() => loadPreview(mobile)} disabled={pending || mobile.length < 10}>
          {pending ? "Verifying..." : "View Application"}
        </Button>
        <Button asChild variant="link" className="px-0">
          <Link href={`${schoolBasePath}/admission/search`}>Search by Application ID</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
