import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBDT } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { SummaryCardItem } from "@/types/finance";


interface SummaryCardsProps {
  items: SummaryCardItem[];
}

export function SummaryCards({ items }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg", item.bgColor)}>
              <item.icon className={cn("h-4 w-4", item.color)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {/* যদি ভ্যালু নম্বর হয় তবে ফরম্যাট করবে, স্ট্রিং হলে সরাসরি দেখাবে */}
              {typeof item.value === "number" ? formatBDT(item.value) : item.value}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}