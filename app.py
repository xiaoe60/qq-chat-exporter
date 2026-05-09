"""Flask Web Application for QQ Chat Exporter."""

import os
import json
import uuid
from datetime import datetime
from io import BytesIO
import qrcode
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS

from qq_exporter import QQChatExporter, Message, MessageType

# Initialize Flask app
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max upload
EXPORT_DIR = os.path.join(os.getcwd(), 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)

# Session storage (in production, use database)
sessions = {}
current_user = None


# ==================== Utility Functions ====================
def generate_session_id():
    """Generate a unique session ID."""
    return str(uuid.uuid4())


def create_qrcode():
    """Generate QR code for login."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(f"https://qq.com/qr?session={generate_session_id()}")
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    return img_io


def create_demo_user():
    """Create demo user for demonstration."""
    return {
        'qq_number': '123456789',
        'nickname': '演示用户',
        'is_logged_in': True,
        'timestamp': datetime.now().isoformat()
    }


def create_demo_contacts():
    """Create demo contacts for demonstration."""
    return [
        {
            'id': '1',
            'name': '张三',
            'last_msg': '今天天气真好呀！',
            'timestamp': datetime.now().isoformat()
        },
        {
            'id': '2',
            'name': '李四',
            'last_msg': '会议改到下午3点',
            'timestamp': datetime.now().isoformat()
        },
        {
            'id': '3',
            'name': '王五',
            'last_msg': '文件已发送',
            'timestamp': datetime.now().isoformat()
        },
        {
            'id': '4',
            'name': '家人',
            'last_msg': '晚上一起吃饭',
            'timestamp': datetime.now().isoformat()
        },
    ]


def create_demo_messages():
    """Create demo messages for demonstration."""
    return [
        {
            'sender': '我',
            'content': '你好！',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'sender': '张三',
            'content': '你好，最近怎样？',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'sender': '我',
            'content': '还不错，你呢？',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'sender': '张三',
            'content': '也还可以，今天天气真好呀！',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'sender': '我',
            'content': '是啊，一起出去走走？',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
    ]


# ==================== API Routes ====================

@app.route('/')
def index():
    """Main page."""
    return render_template('index.html')


@app.route('/api/qrcode')
def get_qrcode():
    """Get QR code for login."""
    qr_image = create_qrcode()
    return send_file(qr_image, mimetype='image/png')


@app.route('/api/login', methods=['POST'])
def login():
    """Manual login."""
    global current_user
    
    data = request.get_json()
    qq_number = data.get('qq_number', '')
    password = data.get('password', '')
    
    if not qq_number or not password:
        return jsonify({'success': False, 'error': '请输入 QQ 号和密码'})
    
    try:
        # In production, authenticate with real QQ API
        # For now, simulate successful login
        current_user = {
            'qq_number': qq_number,
            'nickname': f'用户_{qq_number[-4:]}',
            'is_logged_in': True,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify({'success': True, 'user': current_user})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/demo-login', methods=['POST'])
def demo_login():
    """Enter demo mode."""
    global current_user
    
    try:
        current_user = create_demo_user()
        return jsonify({'success': True, 'user': current_user})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user."""
    global current_user
    current_user = None
    return jsonify({'success': True})


@app.route('/api/contacts')
def get_contacts():
    """Get contacts list."""
    if not current_user:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    try:
        # For demo mode, return demo contacts
        contacts = create_demo_contacts()
        return jsonify({'success': True, 'contacts': contacts})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/messages/<contact_id>')
def get_messages(contact_id):
    """Get messages for a contact."""
    if not current_user:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    try:
        # For demo mode, return demo messages
        messages = create_demo_messages()
        return jsonify({'success': True, 'messages': messages})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/export', methods=['POST'])
def export_messages():
    """Export chat messages."""
    if not current_user:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    try:
        data = request.get_json()
        contact_name = data.get('contact_name', '')
        export_format = data.get('format', 'json')
        
        if not contact_name:
            return jsonify({'success': False, 'error': '请选择联系人'})
        
        # For demo mode, create sample export
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{contact_name}_{timestamp}.{export_format}"
        
        # Create sample export file
        export_path = os.path.join(EXPORT_DIR, filename)
        
        if export_format == 'json':
            export_data = {
                'contact': contact_name,
                'export_time': datetime.now().isoformat(),
                'message_count': 5,
                'messages': create_demo_messages()
            }
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        elif export_format == 'csv':
            import csv
            with open(export_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['时间', '发送者', '内容', '消息类型'])
                for msg in create_demo_messages():
                    writer.writerow([
                        msg['timestamp'],
                        msg['sender'],
                        msg['content'],
                        'text'
                    ])
        
        elif export_format == 'txt':
            with open(export_path, 'w', encoding='utf-8') as f:
                for msg in create_demo_messages():
                    f.write(f"{msg['timestamp']} | {msg['sender']}: {msg['content']}\n")
        
        return jsonify({
            'success': True,
            'message': '导出成功',
            'filename': filename
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/export-history')
def get_export_history():
    """Get export history."""
    if not current_user:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    try:
        history = []
        if os.path.exists(EXPORT_DIR):
            for filename in os.listdir(EXPORT_DIR):
                filepath = os.path.join(EXPORT_DIR, filename)
                if os.path.isfile(filepath):
                    file_size = os.path.getsize(filepath)
                    file_ext = filename.split('.')[-1]
                    history.append({
                        'filename': filename,
                        'size': file_size,
                        'format': file_ext,
                        'timestamp': datetime.fromtimestamp(
                            os.path.getmtime(filepath)
                        ).isoformat()
                    })
        
        # Sort by timestamp descending
        history.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({'success': True, 'history': history})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/download/<filename>')
def download_file(filename):
    """Download exported file."""
    if not current_user:
        return jsonify({'success': False, 'error': '未登录'}), 401
    
    try:
        # Sanitize filename to prevent directory traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'success': False, 'error': '非法文件名'}), 400
        
        filepath = os.path.join(EXPORT_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': '文件不存在'}), 404
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'success': False, 'error': '页面不存在'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({'success': False, 'error': '服务器错误'}), 500


# ==================== Main ====================

if __name__ == '__main__':
    print("""
    ╔════════════════════════════════════════╗
    ║   QQ Chat Exporter - Web Service     ║
    ╚════════════════════════════════════════╝
    
    🌐 Server running at http://localhost:5000
    📝 Press CTRL+C to stop
    """)
    
    app.run(
        host='localhost',
        port=5000,
        debug=True,
        use_reloader=False
    )
