import { create } from 'zustand';
import type { Task, Project, KanbanColumn } from '../types';

interface KanbanState {
  currentProject: Project | null;
  projects: Project[];
  tasks: Task[];
  columns: KanbanColumn[];

  // Projects
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tasks
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Columns
  setColumns: (columns: KanbanColumn[]) => void;
  addColumn: (column: KanbanColumn) => void;
  updateColumn: (id: string, column: Partial<KanbanColumn>) => void;
  deleteColumn: (id: string) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  currentProject: null,
  projects: [],
  tasks: [],
  columns: [],

  // Projects
  setProjects: (projects) => set({ projects }),

  setCurrentProject: (project) => set({ currentProject: project }),

  addProject: (project) => set((state) => ({
    projects: [...state.projects, project],
  })),

  updateProject: (id, updatedData) => set((state) => ({
    projects: state.projects.map((p) =>
      p.id === id ? { ...p, ...updatedData } : p
    ),
    currentProject: state.currentProject?.id === id
      ? { ...state.currentProject, ...updatedData }
      : state.currentProject,
  })),

  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id),
    currentProject: state.currentProject?.id === id ? null : state.currentProject,
  })),

  // Tasks
  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task],
  })),

  updateTask: (id, updatedData) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, ...updatedData } : t
    ),
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),

  // Columns
  setColumns: (columns) => set({ columns }),

  addColumn: (column) => set((state) => ({
    columns: [...state.columns, column],
  })),

  updateColumn: (id, updatedData) => set((state) => ({
    columns: state.columns.map((c) =>
      c.id === id ? { ...c, ...updatedData } : c
    ),
  })),

  deleteColumn: (id) => set((state) => ({
    columns: state.columns.filter((c) => c.id !== id),
  })),
}));
