<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskLabel;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class DemoSeeder extends Seeder
{
    /**
     * Seed the demo dataset: super admin, team, workspace, projects, labels, tasks,
     * sprints, dependencies and supporting activity/comment records.
     */
    public function run(): void
    {
        $this->createSuperAdmin();
        $demoUser = $this->createDemoUser();
        $team = $this->createTeam();
        $team[$demoUser->email] = $demoUser;
        $workspace = $this->createWorkspace($team);

        $projects = $this->createProjects($workspace, $team);
        $labels = $this->createLabels($workspace);
        $tasks = $this->createTasks($projects, $workspace, $team);
        $this->createDependencies($tasks);
        $sprints = $this->createSprints($projects);
        $this->createSeedData($tasks, $workspace, $team);
    }

    private function createSuperAdmin(): User
    {
        return User::firstOrCreate(
            ["email" => "superadmin@taskforge.local"],
            [
                "name" => "TaskForge Super Admin",
                "email" => "superadmin@taskforge.local",
                "password" => "SuperAdmin-1234",
                "role" => "super_admin",
                "is_super_admin" => true,
            ],
        );
    }

    private function createDemoUser(): User
    {
        // Keep the documented local demo credentials usable after the database
        // has already been seeded with an older password.
        return User::updateOrCreate(
            ["email" => "demo@taskforge.local"],
            [
                "name" => "Demo Account",
                "email" => "demo@taskforge.local",
                "password" => "password",
                "role" => "member",
            ],
        );
    }

    private function createTeam(): array
    {
        $members = [
            "alice@taskforge.local" => "owner",
            "bob@taskforge.local" => "admin",
            "carol@taskforge.local" => "member",
            "dave@taskforge.local" => "viewer",
        ];

        $users = [];
        foreach ($members as $email => $role) {
            $users[$email] = User::firstOrCreate(
                ["email" => $email],
                [
                    "name" =>
                        ucfirst(str_replace("@taskforge.local", "", $email)) .
                        " " .
                        mb_strtoupper($role[0]),
                    "email" => $email,
                    "password" => "password123",
                    "role" => $role,
                ],
            );
        }

        return $users;
    }

    private function createWorkspace(array $team): Workspace
    {
        $admin = User::where(
            "email",
            "superadmin@taskforge.local",
        )->firstOrFail();
        $workspace = Workspace::firstOrCreate(
            ["slug" => "taskforge-studio"],
            ["name" => "TaskForge Studio", "owner_id" => $admin->id],
        );

        $membership = [$admin->id => ["role" => "owner"]];
        foreach ($team as $user) {
            $membership[$user->id] = ["role" => $user->role];
        }
        $workspace->members()->syncWithoutDetaching($membership);

        return $workspace;
    }

    private function createProjects(Workspace $workspace, array $team): array
    {
        $projects = [
            [
                "key" => "LAUNCH",
                "name" => "Product launch",
                "description" => "Plan and deliver the next TaskForge release.",
                "status" => "active",
                "start_date" => now()->subDays(12)->toDateString(),
                "due_date" => now()->addDays(30)->toDateString(),
            ],
            [
                "key" => "ENG",
                "name" => "Engineering backbone",
                "description" =>
                    "Build the foundation every workspace relies on.",
                "status" => "active",
                "start_date" => now()->subDays(10)->toDateString(),
                "due_date" => now()->addDays(45)->toDateString(),
            ],
            [
                "key" => "ARCH",
                "name" => "Architecture & docs",
                "description" => "APIs, runbooks and platform hardening.",
                "status" => "paused",
                "start_date" => null,
                "due_date" => null,
            ],
        ];

        $projectsOut = [];
        foreach ($projects as $projectData) {
            $project = Project::firstOrCreate(
                [
                    "workspace_id" => $workspace->id,
                    "key" => $projectData["key"],
                ],
                $projectData,
            );
            $memberIds = [$workspace->owner_id];
            foreach ($team as $member) {
                $memberIds[] = $member->id;
            }
            $project->members()->syncWithoutDetaching($memberIds);

            $projectsOut[] = $project;
        }

        return $projectsOut;
    }

    private function createLabels(Workspace $workspace): Collection
    {
        return collect([
            ["name" => "Design", "color" => "#8274e8"],
            ["name" => "Feature", "color" => "#34d399"],
            ["name" => "Bug", "color" => "#f87171"],
            ["name" => "Docs", "color" => "#60a5fa"],
        ])
            ->map(
                fn(array $label) => TaskLabel::firstOrCreate(
                    [
                        "workspace_id" => $workspace->id,
                        "name" => $label["name"],
                    ],
                    $label,
                ),
            )
            ->unique("id");
    }

    private function createTasks(
        array $projects,
        Workspace $workspace,
        array $team,
    ): array {
        $demo = User::where("email", "demo@taskforge.local")->first();
        $alice = User::where("email", "alice@taskforge.local")->first();
        $bob = User::where("email", "bob@taskforge.local")->first();
        $carol = User::where("email", "carol@taskforge.local")->first();

        $seeds = [
            [
                "project" => $projects[0],
                "title" => "Map the onboarding flow",
                "status" => "backlog",
                "priority" => "high",
                "estimate_minutes" => 120,
                "deadline" => now()->addDays(5)->toDateString(),
                "assignee" => $alice,
            ],
            [
                "project" => $projects[0],
                "title" => "Review launch checklist",
                "status" => "todo",
                "priority" => "medium",
                "estimate_minutes" => 60,
                "deadline" => now()->addDays(5)->toDateString(),
                "assignee" => $bob,
            ],
            [
                "project" => $projects[0],
                "title" => "Build workspace settings",
                "status" => "in_progress",
                "priority" => "urgent",
                "estimate_minutes" => 240,
                "deadline" => now()->addDays(5)->toDateString(),
                "assignee" => $demo,
            ],
            [
                "project" => $projects[0],
                "title" => "QA the invite experience",
                "status" => "in_review",
                "priority" => "high",
                "estimate_minutes" => 90,
                "deadline" => now()->addDays(4)->toDateString(),
                "assignee" => $alice,
            ],
            [
                "project" => $projects[0],
                "title" => "Set up project milestones",
                "status" => "done",
                "priority" => "low",
                "estimate_minutes" => 45,
                "deadline" => now()->subDay()->toDateString(),
                "assignee" => $bob,
            ],
            [
                "project" => $projects[1],
                "title" => "Configure CI pipeline",
                "status" => "backlog",
                "priority" => "medium",
                "estimate_minutes" => 300,
                "deadline" => now()->addDays(20)->toDateString(),
                "assignee" => $carol,
            ],
            [
                "project" => $projects[1],
                "title" => "Refactor auth module",
                "status" => "todo",
                "priority" => "high",
                "estimate_minutes" => 480,
                "deadline" => now()->addDays(25)->toDateString(),
                "assignee" => $bob,
            ],
            [
                "project" => $projects[1],
                "title" => "Update developer README",
                "status" => "done",
                "priority" => "low",
                "estimate_minutes" => 30,
                "deadline" => now()->subDay()->toDateString(),
                "assignee" => $demo,
            ],
            [
                "project" => $projects[2],
                "title" => "Draft API specification",
                "status" => "backlog",
                "priority" => "medium",
                "estimate_minutes" => 200,
                "deadline" => now()->addDays(18)->toDateString(),
                "assignee" => $alice,
            ],
            [
                "project" => $projects[2],
                "title" => "Write operator runbook",
                "status" => "todo",
                "priority" => "low",
                "estimate_minutes" => 90,
                "deadline" => now()->addDays(14)->toDateString(),
                "assignee" => $carol,
            ],
        ];

        $tasks = [];
        foreach ($seeds as $seed) {
            $task = Task::firstOrCreate(
                [
                    "project_id" => $seed["project"]->id,
                    "title" => $seed["title"],
                ],
                [
                    "project_id" => $seed["project"]->id,
                    "assignee_id" => $seed["assignee"]->id,
                    "created_by" => $demo->id,
                    "description" =>
                        "Demo seed task created for the TaskForge demo workspace.",
                    "status" => $seed["status"],
                    "priority" => $seed["priority"],
                    "deadline" => $seed["deadline"],
                    "estimate_minutes" => $seed["estimate_minutes"],
                    "position" => Task::where(
                        "project_id",
                        $seed["project"]->id,
                    )->count(),
                ],
            );
            $tasks[] = $task;
        }

        // Tag at least one label onto every task so the first seed iteration is fully wired.
        $labels = TaskLabel::all();
        foreach ($tasks as $task) {
            $task
                ->labels()
                ->syncWithoutDetaching(
                    $labels->random(min(2, $labels->count()))->pluck("id"),
                );
        }

        return $tasks;
    }

    private function createDependencies(array $tasks): void
    {
        $byTitle = collect($tasks)->keyBy("title");

        $edges = [
            "Map the onboarding flow" => "Review launch checklist",
            "Review launch checklist" => "Build workspace settings",
            "Configure CI pipeline" => "Refactor auth module",
            "Draft API specification" => "Write operator runbook",
        ];

        foreach ($edges as $from => $to) {
            $fromTask = $byTitle[$from];
            $toTask = $byTitle[$to];
            $fromTask->dependencies()->syncWithoutDetaching([$toTask->id]);
        }
    }

    private function createSprints(array $projects): void
    {
        $now = now();
        $project = $projects[0];
        Sprint::firstOrCreate(
            ["project_id" => $project->id, "name" => "Sprint 1"],
            [
                "starts_at" => $now->startOfWeek()->toDateString(),
                "ends_at" => $now->addDays(10)->toDateString(),
                "status" => "active",
            ],
        )
            ->tasks()
            ->syncWithoutDetaching(
                Task::where("project_id", $project->id)
                    ->whereIn("title", [
                        "Map the onboarding flow",
                        "Review launch checklist",
                    ])
                    ->pluck("id"),
            );

        $project2 = $projects[1];
        $sprint = Sprint::firstOrCreate(
            ["project_id" => $project2->id, "name" => "Sprint 1"],
            [
                "starts_at" => $now->addWeeks(1)->startOfWeek()->toDateString(),
                "ends_at" => $now->addWeeks(1)->addDays(10)->toDateString(),
                "status" => "planned",
            ],
        );
        $sprint->tasks()->syncWithoutDetaching(
            Task::where("project_id", $project2->id)
                ->whereIn("title", [
                    "Configure CI pipeline",
                    "Refactor auth module",
                ])
                ->pluck("id"),
        );
    }

    private function createSeedData(
        array $tasks,
        Workspace $workspace,
        array $team,
    ): void {
        $demo = $this->demoUser();
        $alice = $this->user("alice@taskforge.local");
        $bob = $this->user("bob@taskforge.local");

        $this->createCommentIfNeeded(
            $tasks[0],
            $alice,
            "Adding the user-flow notes here so the designer can review before planning.",
        );
        $this->createCommentIfNeeded(
            $tasks[2],
            $demo,
            "Blocked on design tokens; will unblock once the colour palette is signed off.",
        );
        $this->createCommentIfNeeded(
            $tasks[4],
            $bob,
            "Milestone completed and checklist accepted.",
        );

        // Activity log for the demo login, so the inbox is not empty on first open.
        if (
            $workspace
                ->activityLogs()
                ->where("subject_type", Task::class)
                ->where("subject_id", $tasks[2]->id)
                ->where("user_id", $demo->id)
                ->doesntExist()
        ) {
            $workspace->activityLogs()->create([
                "user_id" => $demo->id,
                "subject_type" => Task::class,
                "subject_id" => $tasks[2]->id,
                "action" => "commented",
                "properties" => [
                    "comment_id" => $tasks[2]
                        ->comments()
                        ->where("user_id", $demo->id)
                        ->latest("id")
                        ->value("id"),
                ],
            ]);
        }
    }

    private function createCommentIfNeeded(
        Task $task,
        User $author,
        string $body,
    ): void {
        if (
            $task
                ->comments()
                ->where("user_id", $author->id)
                ->where("body", $body)
                ->exists()
        ) {
            return;
        }

        $task->comments()->create(["user_id" => $author->id, "body" => $body]);
    }

    private function user(string $email): ?User
    {
        return User::where("email", $email)->first();
    }

    private function demoUser(): User
    {
        return User::where("email", "demo@taskforge.local")->first();
    }
}
