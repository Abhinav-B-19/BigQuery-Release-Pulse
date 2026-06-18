import time
import requests
import feedparser
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Simple in-memory cache
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 600  # 10 minutes

def get_feed(force_refresh=False):
    now = time.time()
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > CACHE_DURATION):
        try:
            # Fetch feed with a timeout to avoid hanging
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(FEED_URL, headers=headers, timeout=10)
            response.raise_for_status()
            parsed = feedparser.parse(response.content)
            
            entries = []
            for entry in parsed.entries:
                content_val = ""
                if "content" in entry and entry.content:
                    content_val = entry.content[0].value
                elif "summary" in entry:
                    content_val = entry.summary
                
                entries.append({
                    "id": entry.get("id", ""),
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "updated": entry.get("updated", ""),
                    "content": content_val
                })
            
            cache["data"] = {
                "title": parsed.feed.get("title", "BigQuery Release Notes"),
                "link": parsed.feed.get("link", "https://docs.cloud.google.com/bigquery/docs/release-notes"),
                "entries": entries
            }
            cache["last_fetched"] = now
        except Exception as e:
            if cache["data"]:
                # If fetch fails, return cached data if available
                return cache["data"], True
            raise e
    return cache["data"], False

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def api_releases():
    try:
        data, was_cached = get_feed()
        return jsonify({
            "success": True,
            "data": data,
            "cached": was_cached
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/releases/refresh")
def api_releases_refresh():
    try:
        data, _ = get_feed(force_refresh=True)
        return jsonify({
            "success": True,
            "data": data,
            "cached": False
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
