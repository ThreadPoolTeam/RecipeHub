"""Replay the supplied Gimkit archive locally. No outbound requests or real accounts.
Run from any directory: python docs/plans/261031-quiz-ui-preview/gimkit-offline.py
Only editor/list preview operations listed below are implemented; other APIs return 501.
Original JS/CSS stay in ZIP, unchanged. Kit and account data are explicit local fixtures.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import mimetypes
import re
import threading
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[3]
ARCHIVE = ROOT / 'docs/materials/referance-wweb/www.gimkit.com.zip'
ZIP = zipfile.ZipFile(ARCHIVE)
FILES = {name: ZIP.read(name) for name in ZIP.namelist()}
HOSTS = sorted({name.split('/')[0] for name in FILES if '/' in name})
KIT_ID = '6ae51247bca02ad882c1cff0'
USER_ID = '6ae512470000000000000001'
LOCK = threading.Lock()
USER = {
    '_id': USER_ID, 'id': USER_ID, 'firstName': 'Offline', 'lastName': 'Preview',
    'name': 'Offline Preview', 'email': 'preview@example.invalid',
    'accountType': 'educator', 'type': 'pro', 'planSource': 'offline-fixture',
    'incompleteAccount': False, 'flags': [], 'username': 'offline-preview',
    'freeTrial': {'currentlyOnFreeTrial': False, 'freeTrialCompleted': True,
                  'extendedFreeTrialCompleted': True, 'freeTrialExtended': False},
    'seasonTicket': {'active': False}, 'acceptedLatestPolicies': True,
}

def question(number, text, options):
    return {'_id': f'offline-question-{number}', 'type': 'mc', 'text': text,
            'image': None, 'audio': None, 'latex': None,
            'answers': [{'_id': f'offline-answer-{number}-{i}', 'text': content,
                         'correct': i == 0, 'image': None} for i, content in enumerate(options)]}

KIT = {
    '_id': KIT_ID, 'title': 'Offline sample · Beverage basics',
    'gif': '', 'image': '', 'privacy': 'private', 'lang': 'en',
    'gradeLevel': 'Other', 'subject': 'Other', 'creator': USER_ID,
    'questions': [
        question(1, 'How is espresso prepared?', ['Hot water under pressure', 'Cold steeping', 'Boiling in a pot', 'Steam alone']),
        question(2, 'What is suitable milk foam for latte art?', ['Fine and glossy microfoam', 'Large dry bubbles', 'Stiff whipped cream', 'Cold milk only']),
        question(3, 'Why weigh ingredients?', ['Keep a consistent recipe ratio', 'Skip cleaning equipment', 'Replace ingredient quality', 'Increase the ice in every drink']),
    ],
}

NOTICE = '''<style>
#offline-reference-notice{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#fff7dd;color:#352b15;border-top:1px solid #ccb76d;padding:8px 16px;font:12px/1.5 sans-serif;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
#offline-reference-notice a{color:#56388c;text-decoration:underline}
#offline-reference-notice span{flex:1;min-width:200px}
#offline-reference-notice button{font:inherit;cursor:pointer;background:white;border:1px solid #ccb76d;border-radius:4px;padding:2px 8px}
</style><aside id="offline-reference-notice"><span><b>OFFLINE REFERENCE</b> · JS/CSS gốc trong ZIP Gimkit. Tài khoản &amp; 3 câu hỏi là dữ liệu mẫu, không phải kit gốc. Không kết nối Gimkit; thay đổi chỉ ở RAM.</span><a href="/create/6ae51247bca02ad882c1cff0/editor">Soạn đề</a><a href="/view/6ae51247bca02ad882c1cff0">Xem kit</a><a href="/_offline-info">Giới hạn</a><button onclick="document.getElementById('offline-reference-notice').remove()">Ẩn chú thích</button></aside>'''
INFO = '''<!doctype html><meta charset="utf-8"><title>Gimkit offline reference</title><main style="max-width:800px;margin:48px auto;font:16px/1.7 sans-serif"><h1>Gimkit archive: disconnected replay</h1><p>Source: docs/materials/referance-wweb/www.gimkit.com.zip.</p><p>Giao diện dùng JS/CSS từ ZIP; không tự vẽ lại layout bằng suy đoán. ZIP chỉ lưu HTML shell và assets, không lưu tài khoản hoặc dữ liệu kit. Server cung cấp tài khoản, đề và câu hỏi minh họa để mở editor gốc.</p><p>Không gọi Internet: CSP chỉ cho tài nguyên và API cùng localhost; external assets chỉ được map sang file có trong ZIP. Không có proxy ra Internet.</p><p>Phạm vi: xem danh sách câu, mở/sửa/thêm/xóa câu, đổi tên đề tại RAM. Không đăng nhập thật, không lưu lên Gimkit hoặc RecipeHub, không AI, không game, không cộng tác. API chưa hỗ trợ trả lỗi 501, không giả thành công.</p><p>Chú thích màu vàng là phần bổ sung, không thuộc layout Gimkit. Có thể ẩn để xem layout.</p><p><a href="/create/6ae51247bca02ad882c1cff0/editor">Mở editor gốc</a> · <a href="/view/6ae51247bca02ad882c1cff0">Mở trang kit gốc</a></p></main>'''
CSP = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'"

# All replacements resolve to archive bytes only, never a live reverse proxy.
def localize(text):
    for host in HOSTS:
        text = text.replace('https://' + host + '/', '/_archive/' + host + '/')
        text = text.replace('http://' + host + '/', '/_archive/' + host + '/')
    return text

class Handler(BaseHTTPRequestHandler):
    def send(self, data, status=200, kind='application/json; charset=utf-8'):
        if isinstance(data, (dict, list)):
            data = json.dumps(data, ensure_ascii=False).encode()
        elif isinstance(data, str):
            data = data.encode()
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Security-Policy', CSP)
        self.end_headers()
        self.wfile.write(data)

    def error_json(self, message, status=501):
        self.send({'message': {'text': 'Offline preview: ' + message}}, status)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/':
            self.send_response(302)
            self.send_header('Location', f'/create/{KIT_ID}/editor')
            self.end_headers()
            return
        if path == '/_offline-info':
            return self.send(INFO, kind='text/html; charset=utf-8')
        if path == '/pages/general':
            return self.send({'userData': USER})
        if path == '/api/refetch-token':
            return self.send(USER)
        if path == f'/api/games/fetch/{KIT_ID}':
            with LOCK:
                return self.send({'kit': KIT, 'creator': {'_id': USER_ID, 'name': 'Offline Preview'}})
        if path.startswith('/api/') or path.startswith('/pages/'):
            return self.error_json('endpoint not implemented: ' + path)
        if path.startswith('/_archive/'):
            member = path[len('/_archive/'):]
        else:
            member = 'www.gimkit.com' + path
        if member in FILES:
            data = FILES[member]
            suffix = Path(member).suffix
            kind = {'.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
                    '.woff2': 'font/woff2', '.otf': 'font/otf', '.ttf': 'font/ttf'}.get(suffix)
            kind = kind or mimetypes.guess_type(member)[0] or 'application/octet-stream'
            if suffix in ('.js', '.css', '.html'):
                data = localize(data.decode('utf-8')).encode()
            return self.send(data, kind=kind)
        if path.startswith('/create/') or path.startswith('/view/'):
            html = FILES[f'www.gimkit.com/view/{KIT_ID}.html'].decode('utf-8')
            # Integrity belongs to remote resource bytes; rewritten local paths use supplied bytes.
            html = re.sub(r' integrity="[^"]*"', '', html)
            html = localize(html).replace('</body>', NOTICE + '</body>')
            return self.send(html, kind='text/html; charset=utf-8')
        return self.error_json('asset/route not present in archive: ' + path, 404)

    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            data = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or '{}')
        except (ValueError, UnicodeError):
            return self.error_json('invalid JSON', 400)
        with LOCK:
            if path == '/api/v1/editor/edit-session':
                return self.send({'offline': True})
            if path == '/api/v1/editor/rename':
                KIT['title'] = data.get('title', KIT['title'])
                return self.send({'title': KIT['title']})
            if path == '/api/v1/editor/questions/add':
                result = []
                for incoming in data.get('questions', []):
                    identifier = incoming.get('replacingQuestion')
                    previous = next((q for q in KIT['questions'] if q['_id'] == identifier), None)
                    item = {'_id': identifier if previous else uuid.uuid4().hex[:24],
                            'type': incoming.get('type', 'mc'), 'text': incoming.get('questionText', ''),
                            'image': incoming.get('image'), 'audio': incoming.get('audio'),
                            'latex': incoming.get('latex'), 'answers': incoming.get('answers', [])}
                    for answer in item['answers']:
                        answer.setdefault('_id', uuid.uuid4().hex[:24])
                    if previous:
                        KIT['questions'][KIT['questions'].index(previous)] = item
                    else:
                        KIT['questions'].insert(0, item)
                    result.append({'question': item, 'replaced': identifier if previous else None})
                return self.send(result)
            if path == '/api/v1/editor/questions/remove':
                ids = data.get('questions', [])
                KIT['questions'] = [q for q in KIT['questions'] if q['_id'] not in ids]
                return self.send({'offline': True})
            return self.error_json('operation not implemented: ' + path)

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 4319), Handler)
    print('Gimkit offline ready http://127.0.0.1:4319', flush=True)
    server.serve_forever()
