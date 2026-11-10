const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DB_PATH = path.join(__dirname, 'schedule-db.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { schedule: [], assignments: [], todos: [] };
    }
    return {
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      todos: Array.isArray(parsed.todos) ? parsed.todos : []
    };
  } catch (error) {
    return { schedule: [], assignments: [], todos: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function ensureSeedData() {
  const data = readDb();

  if (!data.schedule.length) {
    data.schedule = [
      { id: 1, title: 'Data Structure', day: 'Wednesday', start_time: '08:00', end_time: '09:53', room: '408' },
      { id: 2, title: 'OOP', day: 'Wednesday', start_time: '14:00', end_time: '15:00', room: '309' },
      { id: 3, title: 'Computer Network', day: 'Wednesday', start_time: '16:00', end_time: '17:51', room: '308' },
      { id: 4, title: 'System Analysis', day: 'Thursday', start_time: '08:00', end_time: '10:00', room: '304' },
      { id: 5, title: 'Math', day: 'Thursday', start_time: '08:00', end_time: '10:00', room: '309' },
      { id: 6, title: 'Flutter', day: 'Monday', start_time: '10:00', end_time: '11:50', room: '304' },
      { id: 7, title: 'Server administrator', day: 'Monday', start_time: '13:00', end_time: '14:30', room: '102' },
      { id: 8, title: 'Network Quiz next week', day: 'Friday', start_time: '13:00', end_time: '15:00', room: '204' }
    ];
  }

  if (!data.assignments.length) {
    data.assignments = [{
      id: 1,
      title: 'ASP.NET',
      course: 'CS100',
      due_date: '2026-01-13',
      priority: 'Medium',
      status: 'Not started',
      notes: ''
    }];
  }

  if (!data.todos.length) {
    data.todos = [
      { id: 1, title: 'Flutter', done: false },
      { id: 2, title: 'Server administrator', done: false },
      { id: 3, title: 'Assignment data structure', done: false },
      { id: 4, title: 'Network Quiz next week', done: false }
    ];
  }

  writeDb(data);
}

function getNextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function formatDashboard() {
  const data = readDb();
  const { schedule, assignments, todos } = data;
  const now = new Date();
  const todayName = DAYS[(now.getDay() + 6) % 7];
  const todayClasses = schedule.filter((item) => item.day === todayName);
  const openAssignments = assignments.filter((item) => item.status !== 'Done');
  const openTodos = todos.filter((item) => !item.done);

  return {
    dateLabel: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).format(now),
    classCount: todayClasses.length,
    assignmentCount: openAssignments.length,
    todoCount: openTodos.length,
    todayClasses,
    nextAssignments: openAssignments.slice(0, 2),
    openTodos: openTodos.slice(0, 4)
  };
}

ensureSeedData();

app.get('/api/dashboard', (req, res) => {
  res.json(formatDashboard());
});

app.get('/api/schedule', (req, res) => {
  const items = readDb().schedule;
  items.sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });
  res.json(items);
});

app.get('/api/assignments', (req, res) => {
  const items = readDb().assignments;
  items.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  res.json(items);
});

app.get('/api/todos', (req, res) => {
  const items = readDb().todos;
  items.sort((a, b) => Number(a.done) - Number(b.done));
  res.json(items);
});

app.post('/api/schedule', (req, res) => {
  const { title, day, start_time, end_time, room } = req.body || {};
  if (!title || !day || !start_time || !end_time) {
    return res.status(400).json({ error: 'Title, day, start time and end time are required.' });
  }

  const data = readDb();
  const item = { id: getNextId(data.schedule), title, day, start_time, end_time, room: room || '' };
  data.schedule.push(item);
  writeDb(data);
  res.status(201).json({ id: item.id });
});

app.put('/api/schedule/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, day, start_time, end_time, room } = req.body || {};
  const data = readDb();
  const itemIndex = data.schedule.findIndex((item) => Number(item.id) === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Schedule item not found.' });
  }

  data.schedule[itemIndex] = { ...data.schedule[itemIndex], title, day, start_time, end_time, room: room || '' };
  writeDb(data);
  res.json({ ok: true });
});

app.delete('/api/schedule/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readDb();
  const next = data.schedule.filter((item) => Number(item.id) !== id);

  if (next.length === data.schedule.length) {
    return res.status(404).json({ error: 'Schedule item not found.' });
  }

  data.schedule = next;
  writeDb(data);
  res.json({ ok: true });
});

app.post('/api/assignments', (req, res) => {
  const { title, course, due_date, priority, status, notes } = req.body || {};
  if (!title || !due_date) {
    return res.status(400).json({ error: 'Assignment title and due date are required.' });
  }

  const data = readDb();
  const item = {
    id: getNextId(data.assignments),
    title,
    course: course || '',
    due_date,
    priority: priority || 'Medium',
    status: status || 'Not started',
    notes: notes || ''
  };

  data.assignments.push(item);
  writeDb(data);
  res.status(201).json({ id: item.id });
});

app.put('/api/assignments/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, course, due_date, priority, status, notes } = req.body || {};
  const data = readDb();
  const itemIndex = data.assignments.findIndex((item) => Number(item.id) === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  data.assignments[itemIndex] = { ...data.assignments[itemIndex], title, course: course || '', due_date, priority: priority || 'Medium', status: status || 'Not started', notes: notes || '' };
  writeDb(data);
  res.json({ ok: true });
});

app.delete('/api/assignments/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readDb();
  const next = data.assignments.filter((item) => Number(item.id) !== id);

  if (next.length === data.assignments.length) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  data.assignments = next;
  writeDb(data);
  res.json({ ok: true });
});

app.post('/api/todos', (req, res) => {
  const { title } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'Todo title is required.' });
  }

  const data = readDb();
  const item = { id: getNextId(data.todos), title, done: false };
  data.todos.push(item);
  writeDb(data);
  res.status(201).json({ id: item.id });
});

app.put('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, done } = req.body || {};
  const data = readDb();
  const itemIndex = data.todos.findIndex((item) => Number(item.id) === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Todo not found.' });
  }

  data.todos[itemIndex] = { ...data.todos[itemIndex], title: title || data.todos[itemIndex].title, done: Boolean(done) };
  writeDb(data);
  res.json({ ok: true });
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readDb();
  const next = data.todos.filter((item) => Number(item.id) !== id);

  if (next.length === data.todos.length) {
    return res.status(404).json({ error: 'Todo not found.' });
  }

  data.todos = next;
  writeDb(data);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const FALLBACK_PORT = 3002;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`MySchedule server running at http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      if (port === DEFAULT_PORT) {
        console.log(`Port ${DEFAULT_PORT} is busy. Retrying on ${FALLBACK_PORT}...`);
        startServer(FALLBACK_PORT);
        return;
      }
      console.error(`Port ${port} is also busy. Please stop the running process or set PORT to a free port.`);
      process.exit(1);
    }

    throw error;
  });
}

startServer(DEFAULT_PORT);
