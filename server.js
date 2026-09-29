const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;
const TEACHERS_FILE = path.join(__dirname, "teachers.json");

function loadTeachersFromFile() {
  try {
    if (fs.existsSync(TEACHERS_FILE)) {
      const data = fs.readFileSync(TEACHERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading teachers.json:", err);
  }
  return [];
}

function saveTeachersToFile() {
  try {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to teachers.json:", err);
  }
}

let teachers = loadTeachersFromFile();
let pendingQueue = [];
let activeSessions = new Set();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/teachers", (req, res) => {
  res.json(teachers);
});

app.post("/api/teachers/submit", (req, res) => {
  const { name, role, category, email } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: "Name and role are required." });
  }

  const newTeacher = { id: Date.now(), name, role, category, email };
  pendingQueue.push(newTeacher);
  res.json({ message: "Submitted for approval", teacher: newTeacher });
});

app.post("/api/admin/login", (req, res) => {
  const { passcode } = req.body;

  if (ADMIN_PASSCODE && passcode === ADMIN_PASSCODE) {
    const token = "admin-token-" + Date.now();
    activeSessions.add(token);
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid admin passcode" });
});

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token && activeSessions.has(token)) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/api/admin/pending", auth, (req, res) => {
  res.json(pendingQueue);
});

app.post("/api/admin/approve/:id", auth, (req, res) => {
  const id = parseInt(req.params.id);
  const index = pendingQueue.findIndex((t) => t.id === id);
  if (index !== -1) {
    const [approved] = pendingQueue.splice(index, 1);
    teachers.push(approved);
    saveTeachersToFile();
    res.json({ message: "Approved", teacher: approved });
  } else {
    res.status(404).json({ error: "Teacher not found in queue" });
  }
});

app.post("/api/admin/reject/:id", auth, (req, res) => {
  const id = parseInt(req.params.id);
  pendingQueue = pendingQueue.filter((t) => t.id !== id);
  res.json({ message: "Rejected" });
});

app.post("/api/admin/logout", auth, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    activeSessions.delete(token);
  }
  res.json({ message: "Logged out" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
