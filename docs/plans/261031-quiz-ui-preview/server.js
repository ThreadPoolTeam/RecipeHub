const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4318;
const DIR = path.join(__dirname);
const ROOT_FONTS = path.resolve(__dirname, '../../..');

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/viewer') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(DIR, 'index.html')));
  }

  if (url === '/editor') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(DIR, 'editor-demo.html')));
  }

  if (url === '/manage' || url === '/catalog' || url === '/quizzes') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(DIR, 'manage-demo.html')));
  }

  if (url.startsWith('/fonts/')) {
    const fontName = path.basename(url);
    const fontPath = path.join(ROOT_FONTS, 'src/frontend/public/fonts', fontName);
    if (fs.existsSync(fontPath)) {
      res.writeHead(200, { 'Content-Type': 'font/woff2' });
      return res.end(fs.readFileSync(fontPath));
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Quiz Preview Hub ready http://127.0.0.1:${PORT}`);
});
