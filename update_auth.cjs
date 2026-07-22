const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /const \{ password: _, \.\.\.userSafe \} = newUser;\n\s+res\.status\(201\)\.json\(userSafe\);/g,
  `const { password: _, ...userSafe } = newUser;
  const token = jwt.sign({ id: userSafe.id, role: userSafe.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ user: userSafe, token });`
);

server = server.replace(
  /const \{ password: _, \.\.\.userSafe \} = user;\n\s+return res\.status\(200\)\.json\(userSafe\);/g,
  `const { password: _, ...userSafe } = user;
    const token = jwt.sign({ id: userSafe.id, role: userSafe.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ user: userSafe, token });`
);

server = server.replace(
  /const \{ password: _, \.\.\.userSafe \} = user;\n\s+res\.json\(userSafe\);/g,
  `const { password: _, ...userSafe } = user;
  const token = jwt.sign({ id: userSafe.id, role: userSafe.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: userSafe, token });`
);

fs.writeFileSync('server.ts', server);
console.log("Updated auth endpoints in server.ts");
