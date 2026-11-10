const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const state = {
  dashboard: null,
  schedule: [],
  assignments: [],
  todos: []
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return {};
}

function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatLongDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

async function loadData() {
  try {
    const [dashboard, schedule, assignments, todos] = await Promise.all([
      apiRequest('/api/dashboard'),
      apiRequest('/api/schedule'),
      apiRequest('/api/assignments'),
      apiRequest('/api/todos')
    ]);

    state.dashboard = dashboard;
    state.schedule = schedule;
    state.assignments = assignments;
    state.todos = todos;
    renderAll();
  } catch (error) {
    console.error(error);
    alert('Failed to load data from the database.');
  }
}

function setActiveTab(tabName) {
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.nav === tabName);
  });

  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

function renderDashboard() {
  const dashboard = state.dashboard;
  if (!dashboard) return;

  document.getElementById('dashboardGreeting').textContent = `Good afternoon, norn sreylis`;
  document.getElementById('dashboardDate').textContent = dashboard.dateLabel;
  document.getElementById('statClasses').textContent = dashboard.classCount;
  document.getElementById('statDue').textContent = dashboard.assignmentCount;
  document.getElementById('statTodos').textContent = dashboard.todoCount;

  const todayClasses = dashboard.todayClasses || [];
  const todayClassesHost = document.getElementById('todayClasses');
  if (!todayClasses.length) {
    todayClassesHost.innerHTML = '<div class="empty-day">No classes scheduled today.</div>';
  } else {
    todayClassesHost.innerHTML = todayClasses.map((item) => `
      <div class="single-class">
        <div>
          <div class="class-pill">Now</div>
          <div class="single-class-name">${item.title}</div>
          <div class="single-class-meta">${item.start_time} - ${item.end_time}</div>
        </div>
        <div class="single-class-meta">${item.room || 'Room TBD'}</div>
      </div>
    `).join('');
  }

  const nextAssignments = dashboard.nextAssignments || [];
  const nextAssignmentsHost = document.getElementById('nextAssignments');
  if (!nextAssignments.length) {
    nextAssignmentsHost.innerHTML = '<div class="empty-day">No upcoming assignments.</div>';
  } else {
    nextAssignmentsHost.innerHTML = nextAssignments.map((item) => `
      <div class="single-class">
        <div>
          <div class="single-class-name">${item.title}</div>
          <div class="single-class-meta">${item.course || 'General'}</div>
        </div>
        <div class="badge">${item.priority || 'Medium'}</div>
      </div>
    `).join('');
  }

  const todoPreview = dashboard.openTodos || [];
  const todoPreviewHost = document.getElementById('todoPreview');
  if (!todoPreview.length) {
    todoPreviewHost.innerHTML = '<div class="empty-day">Everything is clear.</div>';
  } else {
    todoPreviewHost.innerHTML = todoPreview.map((item) => `
      <div class="single-class">
        <div class="single-class-name">${item.title}</div>
        <div class="single-class-meta">${item.done ? 'Completed' : 'Open'}</div>
      </div>
    `).join('');
  }
}

function renderTimetable() {
  const host = document.getElementById('timetableGrid');
  const byDay = DAYS.map((dayName) => ({
    day: dayName,
    items: state.schedule.filter((item) => item.day === dayName)
  }));

  const todayName = new Date().getDay();
  const displayDay = DAYS[(todayName + 6) % 7];

  host.innerHTML = byDay.map(({ day, items }) => `
    <div class="day-column ${day === displayDay ? 'today' : ''}">
      <div class="day-header">
        <h4>${day}</h4>
        ${day === displayDay ? '<span class="day-tag">Today</span>' : ''}
      </div>
      <div class="day-list">
        ${items.length ? items.map((item) => `
          <div class="day-item">
            <div class="day-item-title">${item.title}</div>
            <span class="day-item-time">${item.start_time} - ${item.end_time}</span>
            <span class="day-item-room">${item.room || 'Room TBD'}</span>
            <div class="day-item-actions">
              <button class="action-link" data-edit-schedule="${item.id}">Edit</button>
              <button class="action-link danger" data-delete-schedule="${item.id}">Delete</button>
            </div>
          </div>
        `).join('') : '<div class="empty-day">Free day</div>'}
      </div>
    </div>
  `).join('');
}

function renderAssignments() {
  const host = document.getElementById('assignmentList');

  if (!state.assignments.length) {
    host.innerHTML = '<div class="empty-day">No assignments yet.</div>';
    return;
  }

  host.innerHTML = state.assignments.map((item) => `
    <div class="assignment-item">
      <div class="assignment-card">
        <div class="assignment-card-input"></div>
        <div class="assignment-main">
          <div class="assignment-title">${item.title}</div>
          <div class="assignment-meta">${item.course || 'General'} · ${formatDate(item.due_date)}</div>
        </div>
      </div>
      <div class="assignment-actions">
        <span class="badge">${item.priority || 'Medium'}</span>
        <button class="action-link" data-edit-assignment="${item.id}">Edit</button>
        <button class="action-link danger" data-delete-assignment="${item.id}">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderTodos() {
  const host = document.getElementById('todoList');

  if (!state.todos.length) {
    host.innerHTML = '<li class="empty-day">No tasks added yet.</li>';
    return;
  }

  host.innerHTML = state.todos.map((item) => `
    <li class="todo-item ${item.done ? 'done' : ''}">
      <input class="todo-check" type="checkbox" data-toggle-todo="${item.id}" ${item.done ? 'checked' : ''} />
      <span class="todo-text">${item.title}</span>
      <button class="todo-delete" data-delete-todo="${item.id}">Delete</button>
    </li>
  `).join('');
}

function renderAll() {
  renderDashboard();
  renderTimetable();
  renderAssignments();
  renderTodos();
}

function fillScheduleForm(item) {
  const form = document.getElementById('scheduleForm');
  form.title.value = item.title || '';
  form.day.value = item.day || 'Wednesday';
  form.start_time.value = item.start_time || '';
  form.end_time.value = item.end_time || '';
  form.room.value = item.room || '';
  form.dataset.editingId = String(item.id);
  form.querySelector('button[type="submit"]').textContent = 'Save class';
}

function resetScheduleForm() {
  const form = document.getElementById('scheduleForm');
  form.reset();
  delete form.dataset.editingId;
  form.querySelector('button[type="submit"]').textContent = 'Add class';
}

async function handleScheduleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    title: form.title.value.trim(),
    day: form.day.value,
    start_time: form.start_time.value,
    end_time: form.end_time.value,
    room: form.room.value.trim()
  };

  if (!payload.title || !payload.day || !payload.start_time || !payload.end_time) {
    alert('Please complete all required schedule fields.');
    return;
  }

  try {
    const method = form.dataset.editingId ? 'PUT' : 'POST';
    const url = form.dataset.editingId ? `/api/schedule/${form.dataset.editingId}` : '/api/schedule';
    await apiRequest(url, {
      method,
      body: JSON.stringify(payload)
    });
    resetScheduleForm();
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not save the class schedule.');
  }
}

async function handleAssignmentSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    title: form.title.value.trim(),
    course: form.course.value.trim(),
    due_date: form.due_date.value,
    priority: form.priority.value,
    status: 'Not started',
    notes: ''
  };

  if (!payload.title || !payload.due_date) {
    alert('Assignment title and due date are required.');
    return;
  }

  try {
    await apiRequest('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    form.reset();
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not save the assignment.');
  }
}

async function handleTodoAdd() {
  const input = document.getElementById('todoInput');
  const title = input.value.trim();
  if (!title) return;

  try {
    await apiRequest('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    input.value = '';
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not add the to-do item.');
  }
}

async function deleteTodo(todoId) {
  try {
    await apiRequest(`/api/todos/${todoId}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not delete that to-do item.');
  }
}

async function toggleTodo(todoId, done) {
  try {
    await apiRequest(`/api/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: state.todos.find((item) => item.id === Number(todoId)).title, done: done ? 1 : 0 })
    });
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not update the to-do item.');
  }
}

async function deleteSchedule(scheduleId) {
  try {
    await apiRequest(`/api/schedule/${scheduleId}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not delete the class.');
  }
}

async function deleteAssignment(assignmentId) {
  try {
    await apiRequest(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    console.error(error);
    alert('Could not delete the assignment.');
  }
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setActiveTab(link.dataset.nav);
    });
  });

  document.getElementById('scheduleForm').addEventListener('submit', handleScheduleSubmit);
  document.getElementById('assignmentForm').addEventListener('submit', handleAssignmentSubmit);
  document.getElementById('addTodoButton').addEventListener('click', handleTodoAdd);
  document.getElementById('todoInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleTodoAdd();
    }
  });

  document.getElementById('assignmentTrigger').addEventListener('click', () => {
    document.getElementById('assignmentFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('timetableTrigger').addEventListener('click', () => {
    document.getElementById('classFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('scheduleForm').title.focus();
  });

  document.addEventListener('click', async (event) => {
    const deleteTodoButton = event.target.closest('[data-delete-todo]');
    if (deleteTodoButton) {
      await deleteTodo(Number(deleteTodoButton.dataset.deleteTodo));
      return;
    }

    const toggleTodoBox = event.target.closest('[data-toggle-todo]');
    if (toggleTodoBox) {
      await toggleTodo(Number(toggleTodoBox.dataset.toggleTodo), toggleTodoBox.checked);
      return;
    }

    const editScheduleButton = event.target.closest('[data-edit-schedule]');
    if (editScheduleButton) {
      const item = state.schedule.find((entry) => entry.id === Number(editScheduleButton.dataset.editSchedule));
      if (item) {
        fillScheduleForm(item);
        document.getElementById('classFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const deleteScheduleButton = event.target.closest('[data-delete-schedule]');
    if (deleteScheduleButton) {
      await deleteSchedule(Number(deleteScheduleButton.dataset.deleteSchedule));
      return;
    }

    const editAssignmentButton = event.target.closest('[data-edit-assignment]');
    if (editAssignmentButton) {
      const assignment = state.assignments.find((item) => item.id === Number(editAssignmentButton.dataset.editAssignment));
      if (assignment) {
        const form = document.getElementById('assignmentForm');
        form.title.value = assignment.title || '';
        form.course.value = assignment.course || '';
        form.due_date.value = assignment.due_date || '';
        form.priority.value = assignment.priority || 'Medium';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const deleteAssignmentButton = event.target.closest('[data-delete-assignment]');
    if (deleteAssignmentButton) {
      await deleteAssignment(Number(deleteAssignmentButton.dataset.deleteAssignment));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadData();
});
