const fs = require('fs');

// Patch App.tsx fetch calls using a monkey-patch in main.tsx instead.
let mainT = fs.readFileSync('src/main.tsx', 'utf8');
const patch = `
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem("eduquiz_token");
  if (token && typeof input === "string" && input.startsWith("/api/")) {
    init = init || {};
    init.headers = {
      ...init.headers,
      Authorization: \`Bearer \${token}\`
    };
  }
  return originalFetch(input, init);
};
`;
if (!mainT.includes('originalFetch')) {
  mainT = mainT.replace("import App from './App.tsx';", "import App from './App.tsx';\n" + patch);
  fs.writeFileSync('src/main.tsx', mainT);
}

// Patch AuthPage.tsx
let authPage = fs.readFileSync('src/components/AuthPage.tsx', 'utf8');
authPage = authPage.replace(
  /const data = await res\.json\(\);\n\s+if \(res\.ok\) \{\n\s+onSuccess\(data\);/g,
  `const data = await res.json();
          if (res.ok) {
            if (data.token) localStorage.setItem("eduquiz_token", data.token);
            onSuccess(data.user ? data.user : data);`
);
fs.writeFileSync('src/components/AuthPage.tsx', authPage);
console.log("Patched AuthPage.tsx and main.tsx");
