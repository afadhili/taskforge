import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Circle,
  Command,
  FolderKanban,
  ListTodo,
  MoveRight,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FolderKanban,
    eyebrow: "PROJECTS",
    title: "Give every project a clear path.",
    description:
      "Keep plans, priorities, and progress together. Move from a project overview to the work behind it without losing context.",
    tone: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    icon: Users,
    eyebrow: "TEAMWORK",
    title: "Make ownership visible.",
    description:
      "See who is doing what, balance open work across the team, and give each teammate the right level of access.",
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    icon: Activity,
    eyebrow: "INSIGHTS",
    title: "Spot the work that needs attention.",
    description:
      "Follow completion, overdue tasks, workload, and sprint velocity from project analytics and workspace views.",
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
];

const BOARD_COLUMNS = [
  { name: "To do", color: "bg-violet-500", count: "3" },
  { name: "In progress", color: "bg-blue-500", count: "2" },
  { name: "In review", color: "bg-amber-500", count: "1" },
  { name: "Done", color: "bg-emerald-500", count: "8" },
];

const SAMPLE_TASKS = [
  ["Review launch checklist", "LAUNCH-08", "bg-amber-500"],
  ["Build workspace settings", "LAUNCH-12", "bg-violet-500"],
  ["QA the invite experience", "LAUNCH-15", "bg-sky-500"],
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="TaskForge home">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
        <Command className="size-4" aria-hidden="true" />
      </span>
      <span className="text-base font-bold tracking-tight">TaskForge</span>
    </Link>
  );
}

function ProductPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-5xl"
      role="img"
      aria-label="Illustration of a TaskForge project board with tasks organized by status"
    >
      <div aria-hidden="true" className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl shadow-foreground/10 ring-1 ring-foreground/5">
        <div className="flex h-11 items-center gap-2 border-b border-border/80 bg-muted/50 px-4">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <div className="mx-auto flex h-6 w-48 items-center justify-center rounded-md bg-background/80 text-[10px] text-muted-foreground">
            taskforge.app / LAUNCH
          </div>
        </div>
        <div className="grid min-h-[310px] grid-cols-[132px_1fr] sm:grid-cols-[176px_1fr]">
          <aside className="border-r border-border/80 bg-muted/25 p-3 sm:p-4">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold sm:text-xs">
              <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Command className="size-3" />
              </span>
              TaskForge
            </div>
            <p className="mb-2 px-1 text-[8px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[9px]">
              Workspace
            </p>
            <div className="space-y-1 text-[9px] sm:text-[10px]">
              <div className="flex items-center gap-2 rounded-lg bg-primary px-2 py-2 font-medium text-primary-foreground">
                <ListTodo className="size-3" /> My tasks
              </div>
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground">
                <FolderKanban className="size-3" /> Projects
              </div>
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground">
                <Users className="size-3" /> Team workload
              </div>
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground">
                <Activity className="size-3" /> Analytics
              </div>
            </div>
            <div className="mt-5 border-t border-border/80 pt-4">
              <p className="mb-2 px-1 text-[8px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[9px]">
                Projects
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-2 text-[9px] font-medium sm:text-[10px]">
                <span className="size-2 rounded-sm bg-violet-500" /> Product launch
              </div>
              <div className="mt-1 flex items-center gap-2 px-2 py-2 text-[9px] text-muted-foreground sm:text-[10px]">
                <span className="size-2 rounded-sm bg-sky-500" /> Engineering
              </div>
            </div>
          </aside>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-[8px] text-muted-foreground sm:text-[10px]">LAUNCH · PROJECT BOARD</p>
                <h2 className="mt-1 text-xs font-semibold tracking-tight sm:text-base">Product launch</h2>
              </div>
              <div className="flex -space-x-1.5">
                {["JD", "AM", "RK"].map((person, index) => (
                  <span
                    key={person}
                    className={`grid size-6 place-items-center rounded-full border-2 border-card text-[7px] font-semibold text-white sm:size-7 sm:text-[8px] ${[
                      "bg-sky-600",
                      "bg-emerald-600",
                      "bg-violet-600",
                    ][index]}`}
                  >
                    {person}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {BOARD_COLUMNS.map((column, index) => (
                <div key={column.name} className="min-w-0 rounded-xl bg-muted/55 p-2 sm:p-2.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[8px] font-medium sm:text-[9px]">
                    <span className={`size-1.5 rounded-full ${column.color}`} />
                    <span className="truncate">{column.name}</span>
                    <span className="ml-auto text-muted-foreground">{column.count}</span>
                  </div>
                  <div className="space-y-1.5">
                    {(index === 1 ? SAMPLE_TASKS.slice(1, 3) : index === 0 ? SAMPLE_TASKS.slice(0, 1) : index === 3 ? SAMPLE_TASKS.slice(2, 3) : []).map(([title, key]) => (
                      <div key={key} className="rounded-lg border border-border/80 bg-card p-2 shadow-sm">
                        <div className="mb-1.5 flex items-center justify-between gap-1">
                          <span className="rounded bg-muted px-1 py-0.5 text-[6px] font-semibold text-muted-foreground sm:text-[7px]">{key}</span>
                          <Circle className="size-2.5 text-muted-foreground/50" />
                        </div>
                        <p className="line-clamp-2 text-[7px] font-medium leading-snug sm:text-[9px]">{title}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="flex gap-0.5">
                            <span className="size-1 rounded-full bg-violet-400" />
                            <span className="size-1 rounded-full bg-sky-400" />
                          </span>
                          <span className="size-3.5 rounded-full bg-secondary text-center text-[6px] leading-[14px] text-secondary-foreground">JD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#features">Features</a>
            <a className="transition-colors hover:text-foreground" href="#how-it-works">How it works</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Button render={<Link to="/login?mode=register" />} className="h-9 rounded-xl px-3 sm:px-4">
                Get started <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_66%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Less chasing. More progress.
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-7xl">
              Bring the whole project into focus.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              TaskForge gives your team one clear place to plan projects, move tasks forward, and see what needs attention.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button render={<Link to="/login?mode=register" />} size="lg" className="h-12 rounded-xl px-6 text-sm shadow-md shadow-primary/15">
                  Start with your team <ArrowRight className="ml-2 size-4" />
              </Button>
              <a href="#how-it-works" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                See how it works <ChevronRight className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Projects, tasks, and team progress in one shared workspace.</p>
          </div>
          <div className="mt-12 sm:mt-16 lg:mt-20">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-border/70 bg-card/65 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">A shared rhythm for work</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From the big picture to the next task.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep planning, collaboration, and progress connected as your team moves through the work.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.eyebrow} className="group rounded-2xl border border-border/80 bg-background p-5 transition-colors hover:border-primary/25 sm:p-6">
                  <div className={`grid size-11 place-items-center rounded-xl ${feature.tone}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <p className="mt-6 text-[10px] font-bold tracking-[0.16em] text-muted-foreground">0{index + 1} · {feature.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Keep the details connected</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A little more context makes work move.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              TaskForge keeps the everyday details close to the work, so teammates can make decisions and keep moving without hunting across tools.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                "Track owners, priorities, due dates, and estimates",
                "Connect tasks with labels, comments, files, and dependencies",
                "Review workload and project health as work changes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-muted/55 p-5 sm:p-8">
            <div aria-hidden="true" className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><ListTodo className="size-5" /></span>
                <p className="mt-5 text-xs text-muted-foreground">TASK FLOW</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">One board</p>
                <div className="mt-5 flex items-center gap-1.5" aria-label="Backlog, to do, in progress, in review, and done">
                  {[
                    "bg-slate-300 dark:bg-slate-600",
                    "bg-violet-500",
                    "bg-blue-500",
                    "bg-amber-500",
                    "bg-emerald-500",
                  ].map((color, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${color}`} />)}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Backlog to done, at a glance</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:translate-y-8">
                <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><Users className="size-5" /></span>
                <p className="mt-5 text-xs text-muted-foreground">TEAM VIEW</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">Shared ownership</p>
                <div className="mt-5 flex items-center gap-2">
                  {["AM", "JK", "SL", "+2"].map((person, index) => <span key={person} className={`grid size-8 place-items-center rounded-full text-[9px] font-semibold ${index === 3 ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>{person}</span>)}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Workload by teammate</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Activity className="size-5" /></span>
                <p className="mt-5 text-xs text-muted-foreground">PROJECT INSIGHTS</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">Useful signals</p>
                <div className="mt-4 flex h-10 items-end gap-1.5">
                  {[35, 54, 42, 68, 60, 82, 72, 100, 88, 95].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-primary/75" style={{ height: `${height}%` }} />)}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Completion and overdue work</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:translate-y-8">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Bot className="size-5" /></span>
                <p className="mt-5 text-xs text-muted-foreground">OPTIONAL ASSISTANT</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">Ask the work</p>
                <div className="mt-4 rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">“What needs attention this week?”</div>
                <p className="mt-2 text-[11px] text-muted-foreground">Get answers about your workspace</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-foreground px-6 py-10 text-background sm:px-10 sm:py-14 lg:px-14">
          <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-background/60">Make the next step clear</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Bring your team’s work into focus.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-background/70">Set up a workspace, bring your projects together, and give every task a place to move.</p>
            </div>
            <Button render={<Link to="/login?mode=register" />} size="lg" className="h-12 rounded-xl bg-background px-5 text-foreground shadow-none hover:bg-background/90">
              Get started <MoveRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>Project work, made easier to follow.</p>
          <Link to="/login" className="font-medium transition-colors hover:text-foreground">Sign in <ChevronRight className="inline size-3.5" /></Link>
        </div>
      </footer>
    </main>
  );
}
