const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;

let submissions = [];

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send({ status: "ok", message: "WCA School Hub Backend is running!" });
});

app.post("/api/submit", (req, res) => {
  const { teacherName, subject, details } = req.body;

  if (!teacherName || !subject) {
    return res.status(400).json({ error: "Teacher name and subject are required." });
  }

  const newSubmission = {
    id: Date.now(),
    teacherName,
    subject,
    details: details || "",
    status: "pending",
    timestamp: new Date().toISOString()
  };

  submissions.push(newSubmission);
  res.status(201).json({ success: true, submission: newSubmission });
});

app.post("/api/admin/login", (req, res) => {
  const { passcode } = req.body;

  if (ADMIN_PASSCODE && passcode === ADMIN_PASSCODE) {
    return res.json({ success: true, message: "Authenticated successfully" });
  }

  res.status(401).json({ success: false, error: "Invalid passcode" });
});

app.post("/api/admin/submissions", (req, res) => {
  const { passcode } = req.body;

  if (!ADMIN_PASSCODE || passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({ submissions });
});

app.post("/api/admin/approve", (req, res) => {
  const { passcode, id, status } = req.body;

  if (!ADMIN_PASSCODE || passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const submission = submissions.find((item) => item.id === Number(id));

  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }

  submission.status = status;
  res.json({ success: true, submission });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
