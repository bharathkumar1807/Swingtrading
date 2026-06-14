import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({ label = "Loading analytics..." }: { label?: string }) {
  return (
    <Card>
      <CardContent className="flex h-52 items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} /> {label}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex h-52 flex-col items-center justify-center text-center">
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
