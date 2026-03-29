from flask import Flask, render_template, request, redirect, make_response
import base64
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'drawing-assistant-secret-key'

# Try to import Flask-SocketIO for collaboration features
try:
    from flask_socketio import SocketIO, emit, join_room, leave_room
    socketio = SocketIO(app, cors_allowed_origins="*")
    SOCKETIO_AVAILABLE = True
except ImportError:
    socketio = None
    SOCKETIO_AVAILABLE = False

# Store active collaboration sessions
collaboration_sessions = {}

@app.route("/")
def home():
    username = request.cookies.get("username")
    return render_template("landing.html", username=username)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        resp = make_response(redirect("/"))
        resp.set_cookie("username", username, max_age = 60*60*24)
        return resp
    return render_template("login.html")

# REGISTER
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        return redirect("/login")
    return render_template("register.html")


# FORGOT PASSWORD
@app.route("/forget", methods=["GET", "POST"])
def forgot():
    if request.method == "POST":
        return redirect("/login")
    return render_template("forget.html")

@app.route("/new-canvas")
def new_canvas():
    return render_template("canvas_size.html")

@app.route("/draw")
def draw():
    username = request.cookies.get("username")
    if not username:
        return redirect("/login")
    tool = request.args.get("tool", "brush")
    width = request.args.get("width", 800)
    height = request.args.get("height", 600)

    return render_template(
        "drawing.html",
        tool=tool,
        width=width,
        height=height
    )

@app.route("/save", methods=["POST"])  
def save_drawing():
    username = request.cookies.get("username")
    image_data = request.form["image"]

    # Decode base64 image
    image_data = image_data.split(",")[1]
    image_bytes = base64.b64decode(image_data)

    # Save file
    os.makedirs("saved_drawings", exist_ok=True)
    file_path = f"saved_drawings/{username}.png"

    with open(file_path, "wb") as f:
        f.write(image_bytes)

    return "Drawing saved successfully"

# COLLABORATION MODE - WebSocket Events
if SOCKETIO_AVAILABLE:
    @socketio.on('connect')
    def handle_connect():
        print(f"User connected: {request.sid}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print(f"User disconnected: {request.sid}")
        
        # Clean up session
        for session_id, session_data in list(collaboration_sessions.items()):
            if request.sid in session_data.get('users', {}):
                session_data['users'].pop(request.sid)
                emit('user_left', {'user': session_data['users'][request.sid].get('username', 'Unknown')}, 
                     to=session_id)
    
    @socketio.on('join_session')
    def handle_join_session(data):
        session_id = data.get('session_id')
        username = data.get('username')
        
        join_room(session_id)
        
        # Initialize session if new
        if session_id not in collaboration_sessions:
            collaboration_sessions[session_id] = {
                'users': {},
                'canvas_data': None,
                'created_at': None
            }
        
        # Add user to session
        collaboration_sessions[session_id]['users'][request.sid] = {
            'username': username,
            'connected_at': request.sid
        }
        
        # Notify others
        emit('user_joined', {'user': username, 'count': len(collaboration_sessions[session_id]['users'])}, 
             to=session_id)
        
        print(f"{username} joined session {session_id}")
    
    @socketio.on('draw')
    def handle_draw(data):
        session_id = data.get('session_id')
        emit('remote_draw', data, to=session_id, skip_sid=request.sid)
        
        print(f"Drawing action broadcasted in {session_id}")
    
    @socketio.on('cursor_move')
    def handle_cursor_move(data):
        session_id = data.get('session_id')
        emit('remote_cursor', data, to=session_id, skip_sid=request.sid)
    
    @socketio.on('chat')
    def handle_chat(data):
        session_id = data.get('session_id')
        emit('chat_message', data, to=session_id)
        
        print(f"Chat in {session_id}: {data.get('message')}")
    
    @socketio.on('sync_request')
    def handle_sync_request(data):
        session_id = data.get('session_id')
        session = collaboration_sessions.get(session_id)
        
        if session and session['canvas_data']:
            emit('canvas_sync', {'canvas_data': session['canvas_data']})
        
        print(f"Sync requested for {session_id}")

# Run the application
if __name__ == "__main__":
    if SOCKETIO_AVAILABLE:
        socketio.run(app, debug=True, host="127.0.0.1", port=5000)
    else:
        app.run(debug=True, host="127.0.0.1", port=5000)

@app.route("/load")
def load_drawing():
    username = request.cookies.get("username")
    file_path = f"saved_drawings/{username}.png"

    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return encoded
    return ""
@app.route("/logout")
def logout():
    resp = make_response(redirect("/login"))
    resp.delete_cookie("username")
    return resp
if __name__ == "__main__":
    app.run(debug=True)