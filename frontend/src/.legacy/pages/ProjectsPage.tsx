import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/api';
import { ProjectCard } from '@/components/ProjectCard';
import type { ProjectsResponse } from '@/types';

interface ProjectsPageProps {
  workspaceId: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
] as const;

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'due_date', label: 'Due date' },
] as const;

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
] as const;

function classNames(...classes: (string | false | undefined | null | Record<string, boolean>)[]): string {
  return classes.flatMap((value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    return Object.entries(value).filter(([, active]) => active).map(([name]) => name);
  }).join(' ');
}

export function ProjectsPage({ workspaceId }: ProjectsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const sort = searchParams.get('sort') ?? 'created_at';
  const direction = searchParams.get('direction') ?? 'desc';
  const page = Number(searchParams.get('page')) || 1;

  const queryKey = useMemo(
    () => ['/workspaces', workspaceId, 'projects', status, sort, direction, page],
    [workspaceId, status, sort, direction, page],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProjectsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (sort) params.set('sort', sort);
      if (direction) params.set('direction', direction);
      if (status) params.set('status', status);
      const res = await api.get(`/workspaces/${workspaceId}/projects?${params.toString()}`);
      return res.data;
    },
  });

  const projects = data?.data ?? [];
  const totalPages = data?.last_page ?? 1;
  const currentPage = data?.current_page ?? 1;
  const totalProjects = data?.total ?? projects.length;

  const setStatus = (next: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('status', next);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const setSort = (next: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sort', next);
    setSearchParams(nextParams);
  };

  const setDirection = (next: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('direction', next);
    setSearchParams(nextParams);
  };

  const goToPage = (next: number) => {
    if (next === currentPage) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(next));
    setSearchParams(nextParams);
  };

  const pageNumbers = useMemo(() => {
    const list: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) list.push(i);
    } else {
      list.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i += 1) list.push(i);
      list.push(totalPages);
    }
    return list;
  }, [totalPages, currentPage]);

  const handleCreateProject = () => {
    window.location.href = '/projects';
  };

  return (
    <div className="tf-page">
      <div className="tf-page-head">
        <div className="tf-page-head-text">
          <p className="tf-page-head-eyebrow">Projects</p>
          <h1 className="tf-page-head-title">Projects</h1>
          <p className="tf-page-head-desc">
            {totalProjects} project{totalProjects !== 1 ? 's' : ''} total
          </p>
        </div>
        <button type="button" className="tf-page-head-action" onClick={handleCreateProject}>
          <Plus className="tf-page-head-action-icon" aria-hidden="true" />
          <span className="tf-page-head-action-label">New project</span>
        </button>
      </div>

      <div className="tf-toolbar">
        <div className="tf-filter-chips" role="group" aria-label="Filter projects by status">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={classNames('tf-filter-chip', { 'tf-filter-chip--active': status === option.value })}
              onClick={() => setStatus(option.value)}
            >
              {option.value ? option.label : 'All'}
            </button>
          ))}
        </div>

        <div className="tf-sort-row">
          <label className="tf-label" htmlFor="sort-projects">
            Sort by
          </label>
          <select
            id="sort-projects"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="tf-select"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            className="tf-select"
            aria-label="Sort direction"
          >
            {DIRECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="tf-skeleton-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="tf-skeleton-row" />
          ))}
        </div>
      ) : isError ? (
        <div className="tf-error-banner" role="alert">
          Could not load projects. {error instanceof Error ? error.message : 'Please try again.'}{' '}
          <button type="button" className="tf-error-banner__retry" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="tf-empty">
          <div className="tf-empty-icon" aria-hidden="true">
            <LayoutDashboard className="h-7 w-7" />
          </div>
          <h3 className="tf-empty-title">No projects yet</h3>
          <p className="tf-empty-desc">
            {status ? 'No projects match your current filters.' : 'Create a project to get started.'}
          </p>
          {status ? (
            <button type="button" className="tf-empty-btn tf-empty-btn--ghost" onClick={() => setStatus('')}>
              Clear filters
            </button>
          ) : (
            <button type="button" className="tf-empty-btn" onClick={handleCreateProject}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create a project
            </button>
          )}
        </div>
      ) : (
        <div className="tf-project-list">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={() => {}} />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <nav className="tf-pagination" aria-label="Projects">
          <button
            type="button"
            className="tf-pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="tf-pagination-btn-icon" aria-hidden="true" />
            <span className="tf-pagination-btn-label">Previous</span>
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={classNames('tf-pagination-btn', { 'tf-pagination-btn--active': pageNumber === currentPage })}
              onClick={() => goToPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="tf-pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <span className="tf-pagination-btn-label">Next</span>
            <ChevronRight className="tf-pagination-btn-icon" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
