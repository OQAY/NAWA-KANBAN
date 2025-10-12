import { describe, it, expect, beforeEach } from 'vitest';
import { useKanbanStore } from './kanbanStore';
import type { Task, Project, KanbanColumn, TaskStatus, TaskPriority } from '../types';

describe('kanbanStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useKanbanStore.setState({
      currentProject: null,
      projects: [],
      tasks: [],
      columns: [],
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { currentProject, projects, tasks, columns } = useKanbanStore.getState();

      expect(currentProject).toBeNull();
      expect(projects).toEqual([]);
      expect(tasks).toEqual([]);
      expect(columns).toEqual([]);
    });
  });

  describe('Projects Management', () => {
    const mockProject: Project = {
      id: 'project-1',
      name: 'Test Project',
      description: 'Test Description',
      createdById: 'user-1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const mockProject2: Project = {
      id: 'project-2',
      name: 'Another Project',
      description: 'Another Description',
      createdById: 'user-1',
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
    };

    it('should set projects', () => {
      useKanbanStore.getState().setProjects([mockProject, mockProject2]);

      const { projects } = useKanbanStore.getState();
      expect(projects).toHaveLength(2);
      expect(projects).toEqual([mockProject, mockProject2]);
    });

    it('should set current project', () => {
      useKanbanStore.getState().setCurrentProject(mockProject);

      const { currentProject } = useKanbanStore.getState();
      expect(currentProject).toEqual(mockProject);
    });

    it('should add a new project', () => {
      useKanbanStore.getState().addProject(mockProject);

      const { projects } = useKanbanStore.getState();
      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual(mockProject);
    });

    it('should update a project', () => {
      useKanbanStore.getState().setProjects([mockProject]);
      useKanbanStore.getState().updateProject('project-1', { name: 'Updated Name' });

      const { projects } = useKanbanStore.getState();
      expect(projects[0].name).toBe('Updated Name');
      expect(projects[0].id).toBe('project-1');
    });

    it('should update current project when it matches updated project', () => {
      useKanbanStore.getState().setProjects([mockProject]);
      useKanbanStore.getState().setCurrentProject(mockProject);
      useKanbanStore.getState().updateProject('project-1', { name: 'Updated Name' });

      const { currentProject, projects } = useKanbanStore.getState();
      expect(currentProject?.name).toBe('Updated Name');
      expect(projects[0].name).toBe('Updated Name');
    });

    it('should not update current project when it does not match updated project', () => {
      useKanbanStore.getState().setProjects([mockProject, mockProject2]);
      useKanbanStore.getState().setCurrentProject(mockProject);
      useKanbanStore.getState().updateProject('project-2', { name: 'Updated Name' });

      const { currentProject, projects } = useKanbanStore.getState();
      expect(currentProject?.name).toBe('Test Project'); // Should remain unchanged
      expect(projects[1].name).toBe('Updated Name');
    });

    it('should delete a project', () => {
      useKanbanStore.getState().setProjects([mockProject, mockProject2]);
      useKanbanStore.getState().deleteProject('project-1');

      const { projects } = useKanbanStore.getState();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('project-2');
    });

    it('should clear current project when deleted', () => {
      useKanbanStore.getState().setProjects([mockProject]);
      useKanbanStore.getState().setCurrentProject(mockProject);
      useKanbanStore.getState().deleteProject('project-1');

      const { currentProject, projects } = useKanbanStore.getState();
      expect(currentProject).toBeNull();
      expect(projects).toHaveLength(0);
    });

    it('should not clear current project when different project is deleted', () => {
      useKanbanStore.getState().setProjects([mockProject, mockProject2]);
      useKanbanStore.getState().setCurrentProject(mockProject);
      useKanbanStore.getState().deleteProject('project-2');

      const { currentProject, projects } = useKanbanStore.getState();
      expect(currentProject).toEqual(mockProject);
      expect(projects).toHaveLength(1);
    });
  });

  describe('Tasks Management', () => {
    const mockTask: Task = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'todo' as TaskStatus,
      priority: 'medium' as TaskPriority,
      projectId: 'project-1',
      createdById: 'user-1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const mockTask2: Task = {
      id: 'task-2',
      title: 'Another Task',
      description: 'Another Description',
      status: 'in_progress' as TaskStatus,
      priority: 'high' as TaskPriority,
      projectId: 'project-1',
      createdById: 'user-1',
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
    };

    it('should set tasks', () => {
      useKanbanStore.getState().setTasks([mockTask, mockTask2]);

      const { tasks } = useKanbanStore.getState();
      expect(tasks).toHaveLength(2);
      expect(tasks).toEqual([mockTask, mockTask2]);
    });

    it('should add a new task', () => {
      useKanbanStore.getState().addTask(mockTask);

      const { tasks } = useKanbanStore.getState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual(mockTask);
    });

    it('should update a task', () => {
      useKanbanStore.getState().setTasks([mockTask]);
      useKanbanStore.getState().updateTask('task-1', {
        title: 'Updated Title',
        status: 'done' as TaskStatus,
      });

      const { tasks } = useKanbanStore.getState();
      expect(tasks[0].title).toBe('Updated Title');
      expect(tasks[0].status).toBe('done');
      expect(tasks[0].id).toBe('task-1');
    });

    it('should not update other tasks when updating one', () => {
      useKanbanStore.getState().setTasks([mockTask, mockTask2]);
      useKanbanStore.getState().updateTask('task-1', { title: 'Updated Title' });

      const { tasks } = useKanbanStore.getState();
      expect(tasks[0].title).toBe('Updated Title');
      expect(tasks[1].title).toBe('Another Task'); // Should remain unchanged
    });

    it('should delete a task', () => {
      useKanbanStore.getState().setTasks([mockTask, mockTask2]);
      useKanbanStore.getState().deleteTask('task-1');

      const { tasks } = useKanbanStore.getState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-2');
    });

    it('should handle deleting non-existent task', () => {
      useKanbanStore.getState().setTasks([mockTask]);
      useKanbanStore.getState().deleteTask('non-existent');

      const { tasks } = useKanbanStore.getState();
      expect(tasks).toHaveLength(1); // Should remain unchanged
    });
  });

  describe('Columns Management', () => {
    const mockColumn: KanbanColumn = {
      id: 'column-1',
      name: 'To Do',
      order: 1,
      projectId: 'project-1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const mockColumn2: KanbanColumn = {
      id: 'column-2',
      name: 'In Progress',
      order: 2,
      projectId: 'project-1',
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
    };

    it('should set columns', () => {
      useKanbanStore.getState().setColumns([mockColumn, mockColumn2]);

      const { columns } = useKanbanStore.getState();
      expect(columns).toHaveLength(2);
      expect(columns).toEqual([mockColumn, mockColumn2]);
    });

    it('should add a new column', () => {
      useKanbanStore.getState().addColumn(mockColumn);

      const { columns } = useKanbanStore.getState();
      expect(columns).toHaveLength(1);
      expect(columns[0]).toEqual(mockColumn);
    });

    it('should update a column', () => {
      useKanbanStore.getState().setColumns([mockColumn]);
      useKanbanStore.getState().updateColumn('column-1', {
        name: 'Updated Column',
        order: 5,
      });

      const { columns } = useKanbanStore.getState();
      expect(columns[0].name).toBe('Updated Column');
      expect(columns[0].order).toBe(5);
      expect(columns[0].id).toBe('column-1');
    });

    it('should not update other columns when updating one', () => {
      useKanbanStore.getState().setColumns([mockColumn, mockColumn2]);
      useKanbanStore.getState().updateColumn('column-1', { name: 'Updated Column' });

      const { columns } = useKanbanStore.getState();
      expect(columns[0].name).toBe('Updated Column');
      expect(columns[1].name).toBe('In Progress'); // Should remain unchanged
    });

    it('should delete a column', () => {
      useKanbanStore.getState().setColumns([mockColumn, mockColumn2]);
      useKanbanStore.getState().deleteColumn('column-1');

      const { columns } = useKanbanStore.getState();
      expect(columns).toHaveLength(1);
      expect(columns[0].id).toBe('column-2');
    });

    it('should handle deleting non-existent column', () => {
      useKanbanStore.getState().setColumns([mockColumn]);
      useKanbanStore.getState().deleteColumn('non-existent');

      const { columns } = useKanbanStore.getState();
      expect(columns).toHaveLength(1); // Should remain unchanged
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      const project: Project = {
        id: 'p1',
        name: 'Project',
        description: 'Desc',
        createdById: 'u1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const task: Task = {
        id: 't1',
        title: 'Task',
        description: 'Desc',
        status: 'todo' as TaskStatus,
        priority: 'low' as TaskPriority,
        projectId: 'p1',
        createdById: 'u1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      const column: KanbanColumn = {
        id: 'c1',
        name: 'Column',
        order: 1,
        projectId: 'p1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      // Add items
      useKanbanStore.getState().addProject(project);
      useKanbanStore.getState().addTask(task);
      useKanbanStore.getState().addColumn(column);

      let state = useKanbanStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.tasks).toHaveLength(1);
      expect(state.columns).toHaveLength(1);

      // Update items
      useKanbanStore.getState().updateProject('p1', { name: 'Updated' });
      useKanbanStore.getState().updateTask('t1', { title: 'Updated' });
      useKanbanStore.getState().updateColumn('c1', { name: 'Updated' });

      state = useKanbanStore.getState();
      expect(state.projects[0].name).toBe('Updated');
      expect(state.tasks[0].title).toBe('Updated');
      expect(state.columns[0].name).toBe('Updated');
    });

    it('should maintain state isolation between different entities', () => {
      const project: Project = {
        id: 'p1',
        name: 'Project',
        description: 'Desc',
        createdById: 'u1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      useKanbanStore.getState().addProject(project);
      useKanbanStore.getState().setCurrentProject(project);

      // Deleting tasks and columns should not affect projects
      useKanbanStore.getState().deleteTask('some-task');
      useKanbanStore.getState().deleteColumn('some-column');

      const { projects, currentProject } = useKanbanStore.getState();
      expect(projects).toHaveLength(1);
      expect(currentProject).toEqual(project);
    });
  });
});
