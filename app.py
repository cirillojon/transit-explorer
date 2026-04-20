import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")
    port = int(os.getenv("FLASK_PORT", "5000"))
    app.run(debug=debug, host="0.0.0.0", port=port)
