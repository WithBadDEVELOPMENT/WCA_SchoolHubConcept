const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "admin123";

const activeAdminTokens = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'teachers.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { approved: [], pending: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function requireActiveAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: "Unauthorized: Active admin login required." });
  }
  next();
}

app.get('/api/teachers', (req, res) => {
  const data = loadData();
  res.json(data.approved);
});

app.post('/api/teachers/submit', (req, res) => {
  const { name, role, category, email } = req.body;
  if (!name || !role || !email) {
    return res.status(400).json({ error: "Missing required teacher fields." });
  }

  const data = loadData();
  const newRequest = { 
    id: Date.now(), 
    name, 
    role, 
    category: category || 'Elementary', 
    email, 
    submittedAt: new Date().toISOString() 
  };

  data.pending.push(newRequest);
  saveData(data);

  res.json({ success: true, message: "Teacher request sent to admin queue." });
});

app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;
  if (passcode === ADMIN_PASSCODE) {
    const token = 'srv_token_' + Math.random().toString(36).substring(2) + Date.now();
    activeAdminTokens.add(token);
    return res.json({ success: true, token });
  }
  return res.status(401).json({ error: "Invalid admin passcode." });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) activeAdminTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/pending', requireActiveAdmin, (req, res) => {
  const data = loadData();
  res.json(data.pending);
});

app.post('/api/admin/approve/:id', requireActiveAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const data = loadData();
  
  const index = data.pending.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Item not found in pending queue." });
  }

  const [approvedTeacher] = data.pending.splice(index, 1);
  data.approved.push(approvedTeacher);
  saveData(data);

  res.json({ success: true, approvedTeacher });
});

app.post('/api/admin/reject/:id', requireActiveAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const data = loadData();
  
  data.pending = data.pending.filter(item => item.id !== id);
  saveData(data);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
