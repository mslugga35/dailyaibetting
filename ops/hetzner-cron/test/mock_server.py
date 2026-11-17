"""Mock of the DailyAI app + Telegram for validating dailyai-job.sh locally.

python3 mock_server.py <port> <config.json> <requests.jsonl>

config.json: {"<path>": {"status": 200, "body": {...}, "delay": 0}}  (re-read per request)
Every request is appended to requests.jsonl as {"path", "auth", "form"}.
"""
import json
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT, CONFIG, LOG = int(sys.argv[1]), sys.argv[2], sys.argv[3]


class Handler(BaseHTTPRequestHandler):
    def _handle(self):
        path = urllib.parse.urlparse(self.path).path
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode() if length else ""
        with open(LOG, "a") as f:
            f.write(json.dumps({
                "path": path,
                "auth": self.headers.get("Authorization"),
                "form": dict(urllib.parse.parse_qsl(raw)) if raw else None,
            }) + "\n")
        if path.startswith("/bot") and path.endswith("/sendMessage"):
            rule = {"status": 200, "body": {"ok": True}}
        else:
            try:
                rules = json.load(open(CONFIG))
            except Exception:
                rules = {}
            rule = rules.get(path, {"status": 404, "body": {"success": False, "error": "no route"}})
        time.sleep(rule.get("delay", 0))
        body = json.dumps(rule.get("body", {})).encode()
        try:
            self.send_response(rule.get("status", 200))
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    do_GET = _handle
    do_POST = _handle

    def log_message(self, format, *args):  # noqa: A002 - silence default access log
        return


ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
