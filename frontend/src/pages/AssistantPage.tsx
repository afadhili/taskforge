import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  History,
  KeyRound,
  ListChecks,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { useApp } from "@/components/app-context";
import { message } from "@/lib/errors";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChatEntry = {
  id: number;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};
type AssistantReply = {
  answer: string;
  thread_id: number;
  requests_remaining: number;
};
type AssistantThread = {
  id: number;
  title: string;
  updated_at: string;
  messages_count: number;
};
type AssistantThreadDetail = AssistantThread & {
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }>;
};
type AssistantUsage = { requests_used: number; requests_remaining: number };
type KeyStatus = {
  has_custom_key: boolean;
  custom_base_url: string | null;
  model: string | null;
};
type AIModel = { id: string; name: string };
type AIModelsResponse = { models: AIModel[]; selected_model: string | null };

const DAILY_ALLOWANCE = 30;

const EXAMPLE_PROMPTS = [
  {
    icon: BarChart3,
    title: "Project progress",
    prompt: "Give me a summary of project progress and open tasks.",
  },
  {
    icon: ListChecks,
    title: "Task breakdown",
    prompt: "How many tasks are in each status?",
  },
  {
    icon: Users,
    title: "Workload",
    prompt: "How is work distributed across the team?",
  },
];

export function AssistantPage() {
  const app = useApp();
  return (
    <PromptInputProvider key={app.workspace.id}>
      <AssistantChat
        workspaceId={app.workspace.id}
        workspaceName={app.workspace.name}
      />
    </PromptInputProvider>
  );
}

function TypingDots() {
  return (
    <span
      className="flex items-center gap-1 py-1"
      role="status"
      aria-label="The assistant is preparing an answer"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function AssistantChat({
  workspaceId,
  workspaceName,
}: {
  workspaceId: number;
  workspaceName: string;
}) {
  const controller = usePromptInputController();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [asking, setAsking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [askError, setAskError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<AssistantThread | null>(
    null,
  );
  const [deletingThread, setDeletingThread] = useState(false);
  const queryClient = useQueryClient();

  const usage = useQuery({
    queryKey: ["assistant-usage"],
    queryFn: async () =>
      (await api.get("/auth/ai-usage")).data.data as AssistantUsage,
  });
  const keyStatus = useQuery({
    queryKey: ["assistant-key-status"],
    queryFn: async () => (await api.get("/auth/ai-key")).data.data as KeyStatus,
  });
  const models = useQuery({
    queryKey: ["assistant-models"],
    enabled: false,
    queryFn: async () =>
      (await api.get("/auth/ai-models")).data.data as AIModelsResponse,
  });
  const threads = useQuery({
    queryKey: ["assistant-threads", workspaceId],
    queryFn: async () =>
      (await api.get(`/workspaces/${workspaceId}/assistant/threads`)).data
        .data as AssistantThread[],
  });
  const threadDetail = useQuery({
    queryKey: ["assistant-thread", workspaceId, activeThreadId],
    enabled: activeThreadId !== null,
    queryFn: async () => {
      if (activeThreadId === null) throw new Error("No thread selected.");
      return (
        await api.get(
          `/workspaces/${workspaceId}/assistant/threads/${activeThreadId}`,
        )
      ).data.data as AssistantThreadDetail;
    },
  });

  useEffect(() => {
    const thread = threadDetail.data;
    if (!thread || thread.id !== activeThreadId) return;
    setEntries(
      thread.messages.map((entry) => ({
        id: entry.id,
        role: entry.role,
        content: entry.content,
      })),
    );
    setAskError("");
  }, [threadDetail.data, activeThreadId]);

  const requestsLeft =
    remaining ?? usage.data?.requests_remaining ?? DAILY_ALLOWANCE;
  const baseUrlValue = customBaseUrl ?? keyStatus.data?.custom_base_url ?? "";
  const modelValue =
    selectedModel ?? keyStatus.data?.model ?? models.data?.selected_model ?? "";
  const limitReached = requestsLeft <= 0;
  const customProviderNeedsModel = Boolean(baseUrlValue) && !modelValue;
  const isEmpty = entries.length === 0;

  const ask = async ({ text }: PromptInputMessage) => {
    const question = text.trim();
    if (!question || asking || limitReached || customProviderNeedsModel) return;
    setAskError("");
    setAsking(true);
    const userEntry: ChatEntry = {
      id: Date.now(),
      role: "user",
      content: question,
    };
    const assistantEntry: ChatEntry = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      pending: true,
    };
    setEntries((prev) => [...prev, userEntry, assistantEntry]);
    try {
      const apiBase = (api.defaults.baseURL ?? "/api/v1").replace(/\/$/, "");
      const token = localStorage.getItem("tf_token");
      const response = await fetch(
        `${apiBase}/workspaces/${workspaceId}/assistant`,
        {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            question,
            thread_id: activeThreadId,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const failure = message({
          response: { status: response.status, data: body },
        });
        throw new Error(
          failure.hint ? `${failure.message} ${failure.hint}` : failure.message,
        );
      }
      if (!response.body) throw new Error("The assistant stream was empty.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventData: string[] = [];
      const streamedReply: {
        value: Pick<AssistantReply, "thread_id" | "requests_remaining"> | null;
      } = { value: null };

      const processEvent = () => {
        if (!eventData.length) return;
        const event = JSON.parse(eventData.join("\n")) as {
          type: "delta" | "done" | "error";
          text?: string;
          message?: string;
          thread_id?: number;
          requests_remaining?: number;
        };
        eventData = [];

        if (event.type === "delta" && event.text) {
          setEntries((previous) =>
            previous.map((entry) =>
              entry.id === assistantEntry.id
                ? { ...entry, content: entry.content + event.text }
                : entry,
            ),
          );
        } else if (event.type === "done") {
          if (
            typeof event.thread_id !== "number" ||
            typeof event.requests_remaining !== "number"
          ) {
            throw new Error("The assistant stream ended unexpectedly.");
          }
          streamedReply.value = {
            thread_id: event.thread_id,
            requests_remaining: event.requests_remaining,
          };
        } else if (event.type === "error") {
          throw new Error(
            event.message ?? "The assistant could not finish the response.",
          );
        }
      };

      const processLine = (line: string) => {
        const normalizedLine = line.replace(/\r$/, "");
        if (normalizedLine === "") {
          processEvent();
        } else if (normalizedLine.startsWith("data:")) {
          eventData.push(normalizedLine.slice(5).replace(/^ /, ""));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        if (done) buffer += decoder.decode();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(processLine);
        if (done) {
          if (buffer) processLine(buffer);
          processLine("");
          break;
        }
      }

      const reply = streamedReply.value;
      if (!reply) throw new Error("The assistant stream ended unexpectedly.");
      setActiveThreadId(reply.thread_id);
      setRemaining(reply.requests_remaining);
      void queryClient.invalidateQueries({
        queryKey: ["assistant-threads", workspaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["assistant-thread", workspaceId, reply.thread_id],
      });
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === assistantEntry.id ? { ...entry, pending: false } : entry,
        ),
      );
      void usage.refetch();
    } catch (error) {
      const failure = message(error);
      setAskError(
        failure.hint ? `${failure.message} ${failure.hint}` : failure.message,
      );
      // Drop the pending bubble; PromptInput keeps the typed question for a retry.
      setEntries((prev) =>
        prev.filter((entry) => entry.id !== assistantEntry.id),
      );
      throw error;
    } finally {
      setAsking(false);
    }
  };

  const newChat = () => {
    if (asking) return;
    setActiveThreadId(null);
    setEntries([]);
    setAskError("");
    controller.textInput.setInput("");
    setShowHistory(false);
  };

  const openThread = (threadId: number) => {
    if (asking) return;
    setShowHistory(false);
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    setEntries([]);
    setAskError("");
    setShowHistory(false);
  };

  const deleteThread = async () => {
    if (!threadToDelete || asking) return;
    const deletedThread = threadToDelete;
    setDeletingThread(true);
    try {
      await api.delete(
        `/workspaces/${workspaceId}/assistant/threads/${deletedThread.id}`,
      );
      queryClient.removeQueries({
        queryKey: ["assistant-thread", workspaceId, deletedThread.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["assistant-threads", workspaceId],
      });
      if (activeThreadId === deletedThread.id) {
        setActiveThreadId(null);
        setEntries([]);
        setAskError("");
        controller.textInput.setInput("");
        setShowHistory(false);
      }
      setThreadToDelete(null);
      toast.success("Chat deleted.");
    } catch (error) {
      toast.error(message(error).message);
    } finally {
      setDeletingThread(false);
    }
  };

  const saveKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    try {
      await api.put("/auth/ai-key", { api_key: trimmed });
      setApiKey("");
      toast.success("Your key is saved securely. It will not be shown again.");
      await keyStatus.refetch();
    } catch (error) {
      toast.error(message(error).message);
    }
  };

  const saveBaseUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.put("/auth/ai-key", { base_url: baseUrlValue.trim() || null });
      setCustomBaseUrl(null);
      setSelectedModel(null);
      toast.success("Your AI provider URL has been saved.");
      await keyStatus.refetch();
      if (baseUrlValue.trim()) {
        const result = await models.refetch();
        if (result.isError) toast.error(message(result.error).message);
      }
    } catch (error) {
      toast.error(message(error).message);
    }
  };

  const loadModels = async () => {
    const result = await models.refetch();
    if (result.isError) {
      toast.error(message(result.error).message);
    } else {
      toast.success(`${result.data?.models.length ?? 0} model(s) loaded.`);
    }
  };

  const saveModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modelValue) return;
    try {
      await api.put("/auth/ai-key", { model: modelValue });
      setSelectedModel(null);
      toast.success("AI model saved.");
      await keyStatus.refetch();
    } catch (error) {
      toast.error(message(error).message);
    }
  };

  const removeKey = async () => {
    try {
      await api.delete("/auth/ai-key");
      toast.success("Your personal key was removed.");
      await keyStatus.refetch();
    } catch (error) {
      toast.error(message(error).message);
    }
  };

  const composer = (
    <div className="mx-auto w-full max-w-3xl px-4">
      {askError && (
        <Alert variant="destructive" className="mb-3">
          <TriangleAlert />
          <AlertTitle>{askError}</AlertTitle>
          {askError.toLowerCase().includes("api key") && (
            <AlertDescription>
              Add an API key or configure a custom provider URL in settings.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 pl-1"
                onClick={() => setSettingsOpen(true)}
              >
                Open settings
              </Button>
            </AlertDescription>
          )}
        </Alert>
      )}
      <PromptInput
        onSubmit={ask}
        className="rounded-2xl border bg-card shadow-sm transition-shadow focus-within:shadow-md"
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder={`Ask anything about ${workspaceName}…`}
            maxLength={4000}
            rows={2}
            aria-label="Your question"
          />
        </PromptInputBody>
        <PromptInputFooter className="px-2 pb-2">
          <span className="text-xs text-muted-foreground">
            {limitReached
              ? "Daily limit reached"
              : customProviderNeedsModel
                ? "Select a model in settings first"
                : "Enter to send · Shift + Enter for a new line"}
          </span>
          <PromptInputSubmit
            status={asking ? "submitted" : "ready"}
            className="rounded-full"
            disabled={
              !controller.textInput.value.trim() ||
              asking ||
              limitReached ||
              customProviderNeedsModel
            }
          />
        </PromptInputFooter>
      </PromptInput>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Answers are based on a summary of this workspace and may contain
        mistakes.
      </p>
    </div>
  );

  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-[480px] w-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold leading-tight">
            Workspace assistant
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {workspaceName}
            {modelValue ? ` · ${modelValue}` : ""}
          </p>
        </div>

        <div
          className="hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:flex"
          title="Daily allowance"
        >
          <Progress
            value={(requestsLeft / DAILY_ALLOWANCE) * 100}
            className="w-16"
            aria-label={`${requestsLeft} of ${DAILY_ALLOWANCE} requests remaining today`}
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {requestsLeft}/{DAILY_ALLOWANCE}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Chat history"
          onClick={() => setShowHistory((open) => !open)}
        >
          <History className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Start a new chat"
          onClick={newChat}
          disabled={(isEmpty && activeThreadId === null) || asking}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New chat</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="AI provider settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="size-4" />
        </Button>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <aside
          className={`${showHistory ? "flex" : "hidden"} w-full shrink-0 flex-col border-r bg-muted/20 md:flex md:w-64`}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="size-4 text-muted-foreground" />
              Chat history
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {threads.data?.length ?? 0}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {threads.isLoading ? (
              <p
                className="px-2 py-3 text-xs text-muted-foreground"
                role="status"
              >
                Loading chats…
              </p>
            ) : threads.isError ? (
              <div
                className="grid gap-2 p-2 text-xs text-destructive"
                role="alert"
              >
                <span>{message(threads.error).message}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void threads.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : threads.data?.length ? (
              <div className="grid gap-1">
                {threads.data.map((thread) => (
                  <div
                    key={thread.id}
                    className={`flex min-w-0 items-center gap-1 rounded-lg transition-colors hover:bg-accent ${activeThreadId === thread.id ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={asking}
                      onClick={() => openThread(thread.id)}
                      className="grid min-w-0 flex-1 gap-1 px-3 py-2 text-left disabled:opacity-50"
                    >
                      <span className="w-full truncate text-sm font-medium">
                        {thread.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {thread.messages_count} messages ·{" "}
                        {new Date(thread.updated_at).toLocaleDateString()}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="mr-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete chat: ${thread.title}`}
                      title="Delete chat"
                      disabled={asking || deletingThread}
                      onClick={() => setThreadToDelete(thread)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No saved chats yet. Start a conversation to create one.
              </p>
            )}
          </div>
        </aside>

        <main
          className={`${showHistory ? "hidden" : "flex"} min-h-0 min-w-0 flex-1 flex-col md:flex`}
        >
          {threadDetail.isLoading ? (
            <div
              className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground"
              role="status"
            >
              Loading conversation…
            </div>
          ) : threadDetail.isError ? (
            <div
              className="m-auto flex items-center gap-3 p-4 text-sm text-destructive"
              role="alert"
            >
              <span>{message(threadDetail.error).message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void threadDetail.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : isEmpty ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto py-8">
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/10">
                  <Sparkles className="size-7" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  What would you like to know?
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Ask about project progress, open tasks, or how work is
                  distributed across {workspaceName}.
                </p>
              </div>

              {composer}

              <div className="mx-auto grid w-full max-w-3xl gap-2 px-4 sm:grid-cols-3">
                {EXAMPLE_PROMPTS.map(({ icon: Icon, title, prompt }) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => controller.textInput.setInput(prompt)}
                    className="group flex flex-col gap-1.5 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="text-sm font-medium">{title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <Conversation className="min-h-0 flex-1">
                <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
                  {entries.map((entry) => (
                    <Message key={entry.id} from={entry.role}>
                      <MessageContent>
                        {entry.pending && !entry.content ? (
                          <TypingDots />
                        ) : entry.role === "assistant" ? (
                          <MessageResponse>{entry.content}</MessageResponse>
                        ) : (
                          entry.content
                        )}
                      </MessageContent>
                    </Message>
                  ))}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
              <div className="bg-gradient-to-t from-background via-background to-transparent pb-4 pt-2">
                {composer}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              AI provider settings
            </DialogTitle>
            <DialogDescription>
              Configure an OpenAI-compatible URL. A personal API key is optional
              when your provider does not require authentication.
            </DialogDescription>
          </DialogHeader>

          {keyStatus.isError ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-destructive">
                {message(keyStatus.error).message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => keyStatus.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="grid gap-5">
              <form className="grid gap-2" onSubmit={saveBaseUrl}>
                <Label htmlFor="assistant-base-url">Custom provider URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="assistant-base-url"
                    type="url"
                    inputMode="url"
                    value={baseUrlValue}
                    onChange={(event) => setCustomBaseUrl(event.target.value)}
                    placeholder="https://api.example.com/v1"
                    maxLength={2048}
                    className="flex-1"
                  />
                  <Button type="submit">Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the default provider. Custom URLs must use
                  HTTPS.
                </p>
              </form>

              <div className="border-t" />

              {keyStatus.data?.custom_base_url ? (
                <form className="grid gap-2" onSubmit={saveModel}>
                  <Label htmlFor="assistant-model">Model to use</Label>
                  <div className="flex flex-wrap gap-2">
                    <Select value={modelValue} onValueChange={setSelectedModel}>
                      <SelectTrigger
                        id="assistant-model"
                        className="min-w-48 flex-1"
                      >
                        <SelectValue>
                          {(value: string | null) => value ?? "Select a model"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {modelValue &&
                          !models.data?.models.some(
                            (item) => item.id === modelValue,
                          ) && (
                            <SelectItem value={modelValue}>
                              {modelValue} (current)
                            </SelectItem>
                          )}
                        {(models.data?.models ?? []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadModels()}
                      disabled={models.isFetching}
                    >
                      {models.isFetching ? "Loading…" : "Load models"}
                    </Button>
                    <Button type="submit" disabled={!modelValue}>
                      Save
                    </Button>
                  </div>
                  {models.isError && (
                    <p className="text-xs text-destructive" role="alert">
                      {message(models.error).message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Models are fetched from the custom provider's `/models`
                    endpoint.
                  </p>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Using the default model automatically:{" "}
                  <strong className="text-foreground">
                    {modelValue || "Loading…"}
                  </strong>
                </p>
              )}

              <div className="border-t" />

              <form className="grid gap-2" onSubmit={saveKey}>
                <Label htmlFor="assistant-api-key">
                  {keyStatus.data?.has_custom_key
                    ? "Replace personal key"
                    : "API key (optional with a custom URL)"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="assistant-api-key"
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={
                      keyStatus.data?.has_custom_key
                        ? "Enter a new key to replace it"
                        : "Paste your API key"
                    }
                    maxLength={500}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!apiKey.trim()}>
                    Save
                  </Button>
                  {keyStatus.data?.has_custom_key && (
                    <Button type="button" variant="outline" onClick={removeKey}>
                      Remove
                    </Button>
                  )}
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!threadToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingThread) setThreadToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              “{threadToDelete?.title}” and all its messages will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingThread}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingThread}
              onClick={() => void deleteThread()}
            >
              {deletingThread ? "Deleting…" : "Delete chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
