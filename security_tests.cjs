const assert = require('assert');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "eduquiz_super_secret_key_2026";
const studentToken = jwt.sign({ id: "test_student", role: "student" }, JWT_SECRET);
const teacherToken = jwt.sign({ id: "test_teacher", role: "teacher" }, JWT_SECRET);
const adminToken = jwt.sign({ id: "test_admin", role: "admin" }, JWT_SECRET);

async function runTests() {
  console.log("Démarrage des tests de sécurité RBAC...");

  // Mock Request function using standard fetch
  // Wait, fetch is available in node 18+
  const port = 3000;
  const baseUrl = `http://localhost:${port}/api`;

  async function checkAccess(endpoint, method, token, expectedStatus) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: method === 'POST' || method === 'PUT' ? JSON.stringify({}) : undefined
      });
      if (res.status === expectedStatus || (expectedStatus === 200 && res.status !== 401 && res.status !== 403)) {
        return true;
      }
      console.log(`Échec: ${method} ${endpoint} avec token ${token.substring(0,10)}... (Attendu: ${expectedStatus}, Reçu: ${res.status})`);
      return false;
    } catch (e) {
      console.log(`Erreur de connexion serveur pour ${method} ${endpoint}`);
      return false;
    }
  }

  let passed = 0;
  let total = 0;
  
  function expect(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [SUCCÈS] ${message}`);
    } else {
      console.log(`❌ [ÉCHEC] ${message}`);
    }
  }

  // TEST 1: Un étudiant ne peut pas créer de cours
  let res = await checkAccess('/courses', 'POST', studentToken, 403);
  expect(res, "Un étudiant ne peut pas créer un cours (POST /courses -> 403)");

  // TEST 2: Un étudiant ne peut pas modifier un quiz/examen
  res = await checkAccess('/exams/test_exam_id', 'PUT', studentToken, 403);
  expect(res, "Un étudiant ne peut pas modifier un examen (PUT /exams/:id -> 403)");

  // TEST 3: Un étudiant ne peut pas publier/générer un examen
  res = await checkAccess('/exams/test_exam_id/generate', 'POST', studentToken, 403);
  expect(res, "Un étudiant ne peut pas publier un examen via IA (POST /exams/:id/generate -> 403)");

  // TEST 4: Un étudiant ne peut pas accéder à l'administration
  res = await checkAccess('/admin/users', 'GET', studentToken, 403);
  expect(res, "Un étudiant ne peut pas accéder aux utilisateurs admin (GET /admin/users -> 403)");
  
  // TEST 5: Un enseignant ne peut pas accéder à l'administration
  res = await checkAccess('/admin/courses', 'GET', teacherToken, 403);
  expect(res, "Un enseignant ne peut pas accéder aux cours admin (GET /admin/courses -> 403)");

  // TEST 6: Un enseignant peut créer un cours
  // Assuming 400 because body is empty, but NOT 403
  let resT = await fetch(`${baseUrl}/courses`, { method: 'POST', headers: { 'Authorization': `Bearer ${teacherToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  expect(resT.status !== 403, "Un enseignant a la permission de créer un cours");

  console.log(`\nBilan: ${passed}/${total} tests réussis.`);
}

runTests();
