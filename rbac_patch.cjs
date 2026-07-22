const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

function addCheck(pattern, roles) {
  const checkCode = `
  if (!req.user || !${JSON.stringify(roles)}.includes(req.user.role)) {
    return res.status(403).json({ error: "Accès refusé. Permissions insuffisantes." });
  }`;
  code = code.replace(pattern, (match) => {
    if (match.includes("Accès refusé")) return match;
    return match + checkCode;
  });
}

const adminRoutes = [
  /app\.get\("\/api\/admin\/users", \(req, res\) => \{/g,
  /app\.delete\("\/api\/admin\/users\/:id", \(req, res\) => \{/g,
  /app\.get\("\/api\/admin\/courses", \(req, res\) => \{/g,
  /app\.delete\("\/api\/admin\/courses\/:id", \(req, res\) => \{/g,
  /app\.get\("\/api\/admin\/exams", \(req, res\) => \{/g,
  /app\.delete\("\/api\/admin\/exams\/:id", \(req, res\) => \{/g
];

adminRoutes.forEach(r => addCheck(r, ["admin"]));

const teacherRoutes = [
  /app\.post\("\/api\/courses", \(req, res\) => \{/g,
  /app\.put\("\/api\/courses\/:id", \(req, res\) => \{/g,
  /app\.post\("\/api\/courses\/:courseId\/exams", \(req, res\) => \{/g,
  /app\.put\("\/api\/exams\/:id", \(req, res\) => \{/g,
  /app\.delete\("\/api\/exams\/:id", \(req, res\) => \{/g,
  /app\.post\("\/api\/exams\/:examId\/questions", \(req, res\) => \{/g,
  /app\.put\("\/api\/questions\/:id", \(req, res\) => \{/g,
  /app\.delete\("\/api\/questions\/:id", \(req, res\) => \{/g,
  /app\.post\("\/api\/exams\/:examId\/generate", async \(req, res\) => \{/g,
  /app\.get\("\/api\/exams\/:examId\/submissions", \(req, res\) => \{/g,
  /app\.post\("\/api\/submissions\/:submissionId\/grade", \(req, res\) => \{/g,
  /app\.get\("\/api\/courses\/:courseId\/grades-export", \(req, res\) => \{/g,
  /app\.get\("\/api\/exams\/:id\/export-grades", \(req, res\) => \{/g,
  /app\.get\("\/api\/exams\/:examId\/monitoring", \(req, res\) => \{/g,
  /app\.get\("\/api\/exams\/:examId\/monitoring\/:studentId", \(req, res\) => \{/g,
];

teacherRoutes.forEach(r => addCheck(r, ["admin", "teacher"]));

const studentRoutes = [
  /app\.post\("\/api\/courses\/join", \(req, res\) => \{/g,
  /app\.post\("\/api\/exams\/:examId\/submit", \(req, res\) => \{/g,
  /app\.post\("\/api\/submissions\/:submissionId\/ai-explain", async \(req, res\) => \{/g,
  /app\.post\("\/api\/exams\/:examId\/monitoring", \(req, res\) => \{/g,
];

studentRoutes.forEach(r => addCheck(r, ["admin", "student"]));

fs.writeFileSync('server.ts', code);
console.log("RBAC checks added to server.ts");
