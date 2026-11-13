<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\Workspace;
use Illuminate\Database\Seeder;
use RuntimeException;

class GithubWorkspaceSeeder extends Seeder
{
    public function run(): void
    {
        $workspace = Workspace::query()->where('slug', 'nostudio')->first();
        if (! $workspace) {
            throw new RuntimeException(
                'Workspace "nostudio" (slug: nostudio) was not found.',
            );
        }

        $projects = [
            [
                'key' => 'GHAI',
                'name' => 'GitHub App Integration',
                'description' => 'Connect repositories and GitHub events to the workspace.',
                'tasks' => [
                    ['Define required app permissions', 'todo', 'high', 3, 90],
                    [
                        'Build the OAuth callback flow',
                        'in_progress',
                        'high',
                        5,
                        240,
                    ],
                    [
                        'Add repository selection to settings',
                        'backlog',
                        'medium',
                        8,
                        180,
                    ],
                    [
                        'Persist installation credentials securely',
                        'todo',
                        'urgent',
                        4,
                        150,
                    ],
                    [
                        'Handle installation webhook events',
                        'backlog',
                        'medium',
                        10,
                        210,
                    ],
                    ['Sync repository metadata', 'in_review', 'medium', 6, 120],
                    ['Add API rate-limit handling', 'backlog', 'low', 12, 120],
                    ['Write the GitHub App setup guide', 'done', 'low', -1, 60],
                ],
            ],
            [
                'key' => 'CICD',
                'name' => 'CI/CD Automation',
                'description' => 'Automate testing, builds, and delivery for connected repositories.',
                'tasks' => [
                    [
                        'Map the current build and release process',
                        'done',
                        'medium',
                        -2,
                        90,
                    ],
                    [
                        'Create the GitHub Actions test workflow',
                        'in_progress',
                        'high',
                        4,
                        180,
                    ],
                    [
                        'Add a PHP and Node.js test matrix',
                        'todo',
                        'high',
                        6,
                        150,
                    ],
                    [
                        'Cache Composer and npm dependencies',
                        'backlog',
                        'medium',
                        9,
                        90,
                    ],
                    [
                        'Build and publish the application image',
                        'backlog',
                        'high',
                        12,
                        240,
                    ],
                    [
                        'Add staging deployment approval',
                        'todo',
                        'medium',
                        14,
                        120,
                    ],
                    [
                        'Configure release notes generation',
                        'backlog',
                        'low',
                        18,
                        120,
                    ],
                    [
                        'Notify the team when a workflow fails',
                        'in_review',
                        'medium',
                        7,
                        90,
                    ],
                ],
            ],
            [
                'key' => 'DEVX',
                'name' => 'Developer Experience',
                'description' => 'Improve repository onboarding, contribution guidance, and local tooling.',
                'tasks' => [
                    [
                        'Refresh the local development guide',
                        'in_progress',
                        'high',
                        5,
                        150,
                    ],
                    ['Add pull request template', 'todo', 'medium', 8, 60],
                    [
                        'Create bug and feature issue forms',
                        'backlog',
                        'medium',
                        10,
                        120,
                    ],
                    [
                        'Document branch and commit conventions',
                        'done',
                        'low',
                        -1,
                        60,
                    ],
                    ['Add a one-command quality check', 'todo', 'high', 7, 180],
                    [
                        'Document environment variable setup',
                        'in_review',
                        'medium',
                        4,
                        90,
                    ],
                    [
                        'Add sample API requests for contributors',
                        'backlog',
                        'low',
                        13,
                        120,
                    ],
                    [
                        'Review accessibility of repository docs',
                        'backlog',
                        'low',
                        16,
                        90,
                    ],
                ],
            ],
        ];

        $createdProjects = 0;
        $createdTasks = 0;

        foreach ($projects as $projectData) {
            $project = Project::firstOrCreate(
                [
                    'workspace_id' => $workspace->id,
                    'key' => $projectData['key'],
                ],
                [
                    'name' => $projectData['name'],
                    'description' => $projectData['description'],
                    'status' => 'active',
                    'start_date' => now()->toDateString(),
                    'due_date' => now()->addDays(30)->toDateString(),
                ],
            );
            $createdProjects += $project->wasRecentlyCreated ? 1 : 0;
            $project->members()->syncWithoutDetaching([$workspace->owner_id]);

            foreach (
                $projectData['tasks'] as [$title, $status, $priority, $deadlineDays, $estimate]
            ) {
                $task = Task::firstOrCreate(
                    ['project_id' => $project->id, 'title' => $title],
                    [
                        'assignee_id' => $workspace->owner_id,
                        'created_by' => $workspace->owner_id,
                        'description' => 'Sample task for the Github workspace demo dataset.',
                        'status' => $status,
                        'priority' => $priority,
                        'deadline' => now()
                            ->addDays($deadlineDays)
                            ->toDateString(),
                        'estimate_minutes' => $estimate,
                        'position' => $project->tasks()->count(),
                    ],
                );
                $createdTasks += $task->wasRecentlyCreated ? 1 : 0;
            }
        }

        $this->command?->info(
            "Created {$createdProjects} projects and {$createdTasks} tasks in nostudio.",
        );
    }
}
