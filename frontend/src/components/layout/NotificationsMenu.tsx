import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/api";
import { message } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type NotificationItem = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
  read_at?: string | null;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unread_count: number;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function normalizeNotifications(payload: unknown): NotificationsResponse {
  const root = asRecord(payload);
  const envelope = asRecord(root?.data) ?? root;
  const collection = envelope?.data;
  const paginated = asRecord(collection);
  const items = Array.isArray(collection)
    ? collection
    : Array.isArray(paginated?.data)
      ? paginated.data
      : [];

  return {
    items: items as NotificationItem[],
    unread_count: Number(envelope?.unread_count ?? root?.unread_count ?? 0),
  };
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: ["notifications", open],
    enabled: open,
    queryFn: async () =>
      normalizeNotifications((await api.get<unknown>("/notifications")).data),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["notifications"] });

  const markAll = useMutation({
    mutationFn: async () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      invalidate();
      toast.success("All notifications marked as read");
    },
    onError: (error) => toast.error(message(error).message),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: invalidate,
    onError: (error) => toast.error(message(error).message),
  });

  const unread = notifications.data?.unread_count ?? 0;
  const items = notifications.data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={markAll.isPending || unread === 0}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-80">
          {notifications.isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Spinner className="size-4" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="grid w-full gap-1 border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-accent"
                onClick={() => markOne.mutate(item.id)}
              >
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {String(item.type).replaceAll("_", " ")}
                  </Badge>
                  {unread > 0 &&
                    item.id === items.find((i) => !i.read_at)?.id && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                </span>
                <span className="text-sm">
                  {String(
                    item.data?.title ??
                      item.data?.workspace ??
                      "You have a new update.",
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
