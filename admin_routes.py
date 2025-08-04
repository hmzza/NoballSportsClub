# admin_routes.py
# Flask routes for admin functionality - Compatible with existing routes

from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, Response
from datetime import datetime, timedelta
import json
import csv
import io
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from functools import wraps

admin_bp = Blueprint('admin_panel', __name__, url_prefix='/admin')

# Database configuration - import from your main app
DATABASE_CONFIG = {
    "host": "localhost",
    "database": "noball_sports",
    "user": "postgres",
    "password": "admin@123",
    "port": "5432",
}

# Court configurations - CORRECTED 
COURT_CONFIG = {
    'padel': [
        {'id': 'padel-1', 'name': 'Court 1: Teracotta Court'},
        {'id': 'padel-2', 'name': 'Court 2: Purple Mondo'}
    ],
    'cricket': [
        {'id': 'cricket-1', 'name': 'Court 1: 110x50ft'},
        {'id': 'cricket-2', 'name': 'Court 2: 130x60ft Multi'}
    ],
    'futsal': [
        {'id': 'futsal-1', 'name': 'Court 1: 130x60ft Multi'}
    ],
    'pickleball': [
        {'id': 'pickleball-1', 'name': 'Court 1: Professional'}
    ]
}

# Multi-purpose court mapping - Cricket Court 2 and Futsal Court 1 share the same physical court
# This MUST match the configuration in your main app.py
MULTI_PURPOSE_COURTS = {
    'cricket-2': 'multi-130x60',  # Cricket Court 2 (130x60ft)
    'futsal-1': 'multi-130x60'    # Futsal Court 1 (130x60ft) - SAME COURT
}

print("🏟️  Multi-purpose court configuration loaded:")
for court, multi_type in MULTI_PURPOSE_COURTS.items():
    print(f"   {court} -> {multi_type}")

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Admin authentication decorator with unique name
def admin_required(f):
    @wraps(f)
    def admin_decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_panel.admin_login'))
        return f(*args, **kwargs)
    return admin_decorated_function

@admin_bp.route('/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Simple admin authentication (replace with proper auth in production)
        if username == 'admin' and password == 'admin123':
            session['admin_logged_in'] = True
            return redirect(url_for('admin_panel.admin_dashboard'))
        else:
            return render_template('admin_login.html', error='Invalid credentials')
    
    return render_template('admin_login.html')

@admin_bp.route('/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_panel.admin_login'))

@admin_bp.route('/dashboard')
@admin_required
def admin_dashboard():
    """Enhanced admin dashboard"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all bookings with formatted data
        cursor.execute('''
            SELECT * FROM bookings 
            ORDER BY created_at DESC
        ''')
        
        bookings = cursor.fetchall()
        
        # Format booking data
        formatted_bookings = []
        for booking in bookings:
            booking_dict = dict(booking)
            
            # Convert PostgreSQL field names to template-compatible names
            booking_dict['id'] = booking_dict.get('id')
            booking_dict['sport'] = booking_dict.get('sport')
            booking_dict['courtName'] = booking_dict.get('court_name')
            booking_dict['playerName'] = booking_dict.get('player_name')
            booking_dict['playerPhone'] = booking_dict.get('player_phone')
            booking_dict['totalAmount'] = booking_dict.get('total_amount')
            booking_dict['status'] = booking_dict.get('status')
            
            # Format datetime fields
            created_at = booking_dict.get('created_at')
            if created_at:
                booking_dict['createdDateTime'] = created_at.strftime('%m/%d/%Y %I:%M %p')
            
            confirmed_at = booking_dict.get('confirmed_at')
            if confirmed_at:
                booking_dict['confirmedDateTime'] = confirmed_at.strftime('%m/%d/%Y %I:%M %p')
                
            # Format time display
            booking_dict['formatted_time'] = format_booking_time_postgresql(
                booking_dict.get('booking_date'),
                booking_dict.get('start_time'), 
                booking_dict.get('end_time')
            )
            
            formatted_bookings.append(booking_dict)
        
        conn.close()
        
        return render_template('admin_dashboard.html', bookings=formatted_bookings)
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return render_template('admin_dashboard.html', bookings=[])

@admin_bp.route('/schedule')
@admin_required
def admin_schedule():
    """Schedule management page"""
    return render_template('admin_schedule.html')

@admin_bp.route('/booking-control')
@admin_required
def admin_booking_control():
    """Booking control center"""
    return render_template('admin_booking_control.html')

# API Routes

@admin_bp.route('/api/dashboard-stats')
@admin_required
def api_dashboard_stats():
    """Get dashboard statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get booking counts by status
        cursor.execute('SELECT status, COUNT(*) FROM bookings GROUP BY status')
        status_results = cursor.fetchall()
        status_counts = dict(status_results)
        
        # Get total revenue from confirmed bookings
        cursor.execute('SELECT SUM(total_amount) FROM bookings WHERE status = %s', ('confirmed',))
        total_revenue = cursor.fetchone()[0] or 0
        
        conn.close()
        
        stats = {
            'totalBookings': sum(status_counts.values()),
            'pendingPayment': status_counts.get('pending_payment', 0),
            'confirmed': status_counts.get('confirmed', 0),
            'cancelled': status_counts.get('cancelled', 0),
            'revenue': int(total_revenue) if total_revenue else 0
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/schedule-data', methods=['POST'])
@admin_required
def api_schedule_data():
    """Get schedule data for date range"""
    try:
        data = request.json
        start_date = data.get('startDate')
        end_date = data.get('endDate') 
        sport_filter = data.get('sport')
        
        print(f"📅 Schedule request: {start_date} to {end_date}, sport: {sport_filter}")
        
        # Always return success with empty schedule initially
        schedule = {}
        
        try:
            conn = get_db_connection()
            if not conn:
                print("❌ Database connection failed")
                return jsonify({
                    'success': True,
                    'schedule': schedule,
                    'message': 'Database connection failed, showing empty schedule'
                })
            
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Build query with optional sport filter
            query = '''
                SELECT * FROM bookings 
                WHERE booking_date BETWEEN %s AND %s
                AND status IN ('pending_payment', 'confirmed')
            '''
            params = [start_date, end_date]
            
            if sport_filter:
                query += ' AND sport = %s'
                params.append(sport_filter)
            
            cursor.execute(query, params)
            bookings = cursor.fetchall()
            print(f"📋 Found {len(bookings)} active bookings")
            
            # Process bookings if any exist
            if bookings:
                for booking in bookings:
                    try:
                        booking_dict = dict(booking)
                        date = str(booking_dict['booking_date'])
                        court = booking_dict['court']
                        start_time = str(booking_dict['start_time']).split('.')[0]  # Remove microseconds
                        duration = float(booking_dict['duration'])
                        
                        print(f"📋 Processing booking: {booking_dict['id']} - {court} on {date} at {start_time}")
                        
                        if date not in schedule:
                            schedule[date] = {}
                        if court not in schedule[date]:
                            schedule[date][court] = {}
                        
                        # Calculate time slots for this booking
                        slots = calculate_time_slots_simple(start_time, duration)
                        print(f"🕐 Generated slots for {court}: {slots}")
                        
                        status_map = {
                            'pending_payment': 'booked-pending',
                            'confirmed': 'booked-confirmed'
                        }
                        
                        booking_info = {
                            'status': status_map.get(booking_dict['status'], 'booked-pending'),
                            'title': booking_dict['player_name'],
                            'subtitle': f'PKR {booking_dict["total_amount"]}',
                            'bookingId': booking_dict['id'],
                            'playerName': booking_dict['player_name'],
                            'playerPhone': booking_dict['player_phone'],
                            'amount': booking_dict['total_amount'],
                            'duration': booking_dict['duration']
                        }
                        
                        # Add booking to the specific court
                        for slot_time in slots:
                            schedule[date][court][slot_time] = booking_info
                        
                        # CRITICAL: Handle multi-purpose court conflicts
                        if court in MULTI_PURPOSE_COURTS:
                            multi_court_type = MULTI_PURPOSE_COURTS[court]
                            print(f"🔄 {court} is multi-purpose type: {multi_court_type}")
                            
                            # Find ALL conflicting courts that share the same physical space
                            conflicting_courts = [
                                k for k, v in MULTI_PURPOSE_COURTS.items() 
                                if v == multi_court_type and k != court
                            ]
                            
                            print(f"⚠️  Conflicting courts for {court}: {conflicting_courts}")
                            
                            for conflict_court in conflicting_courts:
                                print(f"🚫 Blocking {conflict_court} due to {court} booking")
                                
                                if date not in schedule:
                                    schedule[date] = {}
                                if conflict_court not in schedule[date]:
                                    schedule[date][conflict_court] = {}
                                
                                # Create conflict booking info
                                conflict_info = {
                                    'status': 'booked-conflict',
                                    'title': f"{booking_dict['player_name']} ({court.split('-')[0].title()})",
                                    'subtitle': f"Multi-Court Booked - {booking_info['subtitle']}",
                                    'bookingId': booking_dict['id'],
                                    'playerName': booking_dict['player_name'],
                                    'playerPhone': booking_dict['player_phone'],
                                    'amount': booking_dict['total_amount'],
                                    'duration': booking_dict['duration'],
                                    'originalCourt': court,
                                    'conflictCourt': conflict_court
                                }
                                
                                # Mark ALL the same time slots as blocked in the conflicting court
                                for slot_time in slots:
                                    schedule[date][conflict_court][slot_time] = conflict_info
                                    print(f"🔒 Blocked {conflict_court} at {slot_time}")
                            
                    except Exception as e:
                        print(f"⚠️  Error processing booking {booking.get('id', 'unknown')}: {e}")
                        import traceback
                        traceback.print_exc()
                        continue
            
            conn.close()
            print(f"✅ Schedule data prepared: {len(schedule)} dates")
            
        except Exception as e:
            print(f"⚠️  Database error (returning empty schedule): {e}")
        
        return jsonify({
            'success': True,
            'schedule': schedule
        })
        
    except Exception as e:
        print(f"❌ Schedule API error: {e}")
        return jsonify({
            'success': True,  # Still return success with empty schedule
            'schedule': {},
            'message': f'Error loading schedule: {str(e)}'
        })

def calculate_time_slots_simple(start_time, duration_hours):
    """Simple time slot calculation"""
    slots = []
    try:
        # Parse start time
        if ':' in start_time:
            parts = start_time.split(':')
            hour = int(parts[0])
            minute = int(parts[1])
        else:
            hour = int(start_time)
            minute = 0
            
        # Calculate slots
        slots_count = int(duration_hours * 2)  # 2 slots per hour
        
        for i in range(slots_count):
            slot_hour = hour + (minute + 30 * i) // 60
            slot_minute = (minute + 30 * i) % 60
            
            # Handle day overflow
            if slot_hour >= 24:
                slot_hour -= 24
                
            slots.append(f"{slot_hour:02d}:{slot_minute:02d}")
            
    except Exception as e:
        print(f"Time slot calculation error: {e}")
        
    return slots

@admin_bp.route('/api/admin-create-booking', methods=['POST'])
@admin_required
def api_admin_create_booking():
    """Admin create booking"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['court', 'date', 'startTime', 'duration', 'playerName', 'playerPhone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                })
        
        # Calculate end time
        start_time = data['startTime']
        duration = float(data['duration'])
        end_time = calculate_end_time(start_time, duration)
        
        # Get sport and calculate pricing
        sport = get_court_sport(data['court'])
        total_amount = calculate_booking_amount(sport, duration)
        
        # Generate booking ID
        booking_id = generate_booking_id()
        
        # Create selected_slots for compatibility
        selected_slots = []
        slots = calculate_time_slots(start_time, duration)
        for i, slot_time in enumerate(slots):
            selected_slots.append({
                'time': slot_time,
                'index': i
            })
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO bookings (
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, selected_slots, player_name, player_phone, player_email,
                player_count, special_requests, payment_type, total_amount, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        ''', [
            booking_id,
            sport,
            data['court'],
            get_court_name(data['court']),
            data['date'],
            start_time,
            end_time,
            duration,
            json.dumps(selected_slots),
            data['playerName'],
            data['playerPhone'],
            data.get('playerEmail', ''),
            data.get('playerCount', '2'),
            data.get('specialRequests', ''),
            'full',  # Admin bookings are full payment by default
            total_amount,
            data.get('status', 'confirmed')
        ])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'bookingId': booking_id,
            'message': 'Booking created successfully'
        })
        
    except Exception as e:
        print(f"Admin create booking error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/admin-block-slot', methods=['POST'])
@admin_required
def api_admin_block_slot():
    """Block a time slot"""
    try:
        data = request.json
        
        # Calculate end time
        start_time = data['startTime']
        duration = float(data['duration'])
        end_time = calculate_end_time(start_time, duration)
        
        # Generate block ID
        block_id = f"BLOCK_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create blocked_slots table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS blocked_slots (
                id VARCHAR(50) PRIMARY KEY,
                court VARCHAR(50) NOT NULL,
                booking_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                duration DECIMAL(3,1) NOT NULL,
                reason VARCHAR(100) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert blocked slot
        cursor.execute('''
            INSERT INTO blocked_slots (
                id, court, booking_date, start_time, end_time, duration, reason, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', [
            block_id,
            data['court'],
            data['date'],
            start_time,
            end_time,
            duration,
            data['reason'],
            data.get('notes', '')
        ])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Slot blocked successfully'
        })
        
    except Exception as e:
        print(f"Block slot error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/search-bookings', methods=['POST'])
@admin_required
def api_search_bookings():
    """Search bookings by various criteria"""
    try:
        data = request.json
        method = data['method']
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'id':
            cursor.execute('SELECT * FROM bookings WHERE id = %s', [data['value']])
        elif method == 'phone':
            cursor.execute('SELECT * FROM bookings WHERE player_phone LIKE %s', [f'%{data["value"]}%'])
        elif method == 'name':
            cursor.execute('SELECT * FROM bookings WHERE player_name ILIKE %s', [f'%{data["value"]}%'])
        elif method == 'date':
            cursor.execute('SELECT * FROM bookings WHERE booking_date BETWEEN %s AND %s', [data['startDate'], data['endDate']])
        
        bookings = cursor.fetchall()
        conn.close()
        
        # Format results
        formatted_bookings = []
        for booking in bookings:
            booking_dict = dict(booking)
            # Convert PostgreSQL fields to expected format
            booking_dict['playerName'] = booking_dict['player_name']
            booking_dict['playerPhone'] = booking_dict['player_phone']
            booking_dict['playerEmail'] = booking_dict.get('player_email', '')
            booking_dict['courtName'] = booking_dict['court_name']
            booking_dict['totalAmount'] = booking_dict['total_amount']
            booking_dict['formatted_time'] = format_booking_time_postgresql(
                booking_dict['booking_date'],
                booking_dict['start_time'], 
                booking_dict['end_time']
            )
            formatted_bookings.append(booking_dict)
        
        return jsonify({
            'success': True,
            'bookings': formatted_bookings
        })
        
    except Exception as e:
        print(f"Search bookings error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/update-booking', methods=['POST'])
@admin_required  
def api_update_booking():
    """Update booking details"""
    try:
        data = request.json
        booking_id = data['bookingId']
        
        # Calculate end time if time/duration changed
        if 'startTime' in data and 'duration' in data:
            end_time = calculate_end_time(data['startTime'], float(data['duration']))
            data['endTime'] = end_time
        
        # Build update query dynamically  
        update_fields = []
        update_values = []
        
        updatable_fields = [
            'sport', 'court', 'court_name', 'booking_date', 'start_time', 'end_time', 'duration',
            'player_name', 'player_phone', 'player_email', 'player_count', 
            'special_requests', 'total_amount', 'status'
        ]
        
        for field in updatable_fields:
            # Map camelCase to snake_case
            snake_field = field
            camel_field = field
            if field == 'court_name':
                camel_field = 'courtName'
            elif field == 'booking_date':
                camel_field = 'date'  
            elif field == 'start_time':
                camel_field = 'startTime'
            elif field == 'end_time':  
                camel_field = 'endTime'
            elif field == 'player_name':
                camel_field = 'playerName'
            elif field == 'player_phone':
                camel_field = 'playerPhone'
            elif field == 'player_email':
                camel_field = 'playerEmail'
            elif field == 'player_count':
                camel_field = 'playerCount'
            elif field == 'special_requests':
                camel_field = 'specialRequests'
            elif field == 'total_amount':
                camel_field = 'totalAmount'
                
            if camel_field in data:
                update_fields.append(f'{snake_field} = %s')
                update_values.append(data[camel_field])
        
        if not update_fields:
            return jsonify({
                'success': False,
                'message': 'No fields to update'
            })
        
        update_values.append(booking_id)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(f'''
            UPDATE bookings 
            SET {', '.join(update_fields)}
            WHERE id = %s
        ''', update_values)
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Booking updated successfully'
        })
        
    except Exception as e:
        print(f"Update booking error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/delete-booking', methods=['POST'])
@admin_required
def api_delete_booking():
    """Delete booking"""
    try:
        data = request.json
        booking_id = data['bookingId']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM bookings WHERE id = %s', [booking_id])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Booking deleted successfully'
        })
        
    except Exception as e:
        print(f"Delete booking error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/bulk-bookings', methods=['POST'])
@admin_required
def api_bulk_bookings():
    """Get bookings for bulk operations"""
    try:
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query with filters
        query = 'SELECT * FROM bookings WHERE 1=1'
        params = []
        
        if data.get('status'):
            query += ' AND status = %s'
            params.append(data['status'])
        
        if data.get('sport'):
            query += ' AND sport = %s'
            params.append(data['sport'])
        
        if data.get('dateFrom'):
            query += ' AND booking_date >= %s'
            params.append(data['dateFrom'])
        
        if data.get('dateTo'):
            query += ' AND booking_date <= %s'
            params.append(data['dateTo'])
        
        query += ' ORDER BY booking_date DESC, start_time DESC'
        
        cursor.execute(query, params)
        bookings = cursor.fetchall()
        conn.close()
        
        # Format results
        formatted_bookings = []
        for booking in bookings:
            booking_dict = dict(booking)
            booking_dict['playerName'] = booking_dict['player_name']
            booking_dict['playerPhone'] = booking_dict['player_phone'] 
            booking_dict['courtName'] = booking_dict['court_name']
            booking_dict['totalAmount'] = booking_dict['total_amount']
            booking_dict['formatted_time'] = format_booking_time_postgresql(
                booking_dict['booking_date'],
                booking_dict['start_time'], 
                booking_dict['end_time']
            )
            formatted_bookings.append(booking_dict)
        
        return jsonify({
            'success': True,
            'bookings': formatted_bookings
        })
        
    except Exception as e:
        print(f"Bulk bookings error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@admin_bp.route('/api/bulk-action', methods=['POST'])
@admin_required
def api_bulk_action():
    """Perform bulk action on bookings"""
    try:
        data = request.json
        action = data['action']
        booking_ids = data['bookingIds']
        
        if not booking_ids:
            return jsonify({
                'success': False,
                'message': 'No bookings selected'
            })
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if action == 'confirm':
            for booking_id in booking_ids:
                cursor.execute('''
                    UPDATE bookings 
                    SET status = 'confirmed', payment_verified = TRUE, confirmed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                ''', [booking_id])
                
        elif action == 'cancel':
            for booking_id in booking_ids:
                cursor.execute('''
                    UPDATE bookings 
                    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                ''', [booking_id])
                
        elif action == 'delete':
            for booking_id in booking_ids:
                cursor.execute('DELETE FROM bookings WHERE id = %s', [booking_id])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Bulk {action} completed for {len(booking_ids)} bookings'
        })
        
    except Exception as e:
        print(f"Bulk action error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

# Utility functions

def format_booking_time_postgresql(booking_date, start_time, end_time):
    """Format booking time for display - PostgreSQL version"""
    try:
        if not start_time or not end_time or not booking_date:
            return "Time not available"
        
        # Convert to 12-hour format
        start_12hr = format_time_12hr(str(start_time))
        end_12hr = format_time_12hr(str(end_time))
        
        # Format date
        if isinstance(booking_date, str):
            date_obj = datetime.strptime(booking_date, '%Y-%m-%d')
        else:
            date_obj = booking_date
            
        formatted_date = date_obj.strftime('%a, %b %d')
        
        return f'<div class="time-display">{formatted_date}</div><div style="font-weight: 600; color: #28a745;">{start_12hr} - {end_12hr}</div>'
    except Exception as e:
        print(f"Time formatting error: {e}")
        return f"{start_time} - {end_time}"

def format_time_12hr(time_24):
    """Convert 24hr time to 12hr format"""
    try:
        if isinstance(time_24, str):
            time_obj = datetime.strptime(time_24.split('.')[0], '%H:%M:%S')
        else:
            time_obj = datetime.combine(datetime.today(), time_24)
        return time_obj.strftime('%I:%M %p').lstrip('0')
    except Exception as e:
        print(f"12hr format error: {e}")
        return str(time_24)

def calculate_time_slots(start_time, duration_hours):
    """Calculate 30-minute time slots for a booking"""
    slots = []
    
    # Handle different time formats
    if isinstance(start_time, str):
        # Remove microseconds if present
        time_str = start_time.split('.')[0]
        if len(time_str.split(':')) == 3:
            # Format: HH:MM:SS
            start_dt = datetime.strptime(time_str, '%H:%M:%S')
        else:
            # Format: HH:MM
            start_dt = datetime.strptime(time_str, '%H:%M')
    else:
        # Handle time objects
        start_dt = datetime.combine(datetime.today(), start_time)
    
    slots_count = int(duration_hours * 2)  # 2 slots per hour
    
    for i in range(slots_count):
        slot_time = start_dt + timedelta(minutes=30 * i)
        slots.append(slot_time.strftime('%H:%M'))
    
    return slots

def calculate_end_time(start_time, duration_hours):
    """Calculate end time given start time and duration"""
    # Handle different time formats
    if isinstance(start_time, str):
        # Remove microseconds if present
        time_str = start_time.split('.')[0]
        if len(time_str.split(':')) == 3:
            # Format: HH:MM:SS
            start_dt = datetime.strptime(time_str, '%H:%M:%S')
        else:
            # Format: HH:MM
            start_dt = datetime.strptime(time_str, '%H:%M')
    else:
        # Handle time objects
        start_dt = datetime.combine(datetime.today(), start_time)
    
    end_dt = start_dt + timedelta(hours=duration_hours)
    return end_dt.strftime('%H:%M')

def get_court_sport(court_id):
    """Get sport for a court ID"""
    sport_map = {
        'padel-1': 'padel', 'padel-2': 'padel',
        'cricket-1': 'cricket', 'cricket-2': 'cricket',
        'futsal-1': 'futsal',
        'pickleball-1': 'pickleball'
    }
    return sport_map.get(court_id, 'unknown')

def get_court_name(court_id):
    """Get court display name"""
    court_names = {
        'padel-1': 'Court 1: Purple Mondo',
        'padel-2': 'Court 2: Teracotta',
        'cricket-1': 'Court 1: 110x50ft',
        'cricket-2': 'Court 2: 130x60ft (Multi-purpose)',
        'futsal-1': 'Court 1: 130x60ft (Multi-purpose)',
        'pickleball-1': 'Court 1: Professional Setup'
    }
    return court_names.get(court_id, court_id)

def calculate_booking_amount(sport, duration):
    """Calculate booking amount"""
    pricing = {
        'padel': 5500,
        'cricket': 3000,
        'futsal': 2500,
        'pickleball': 2500
    }
    
    hourly_rate = pricing.get(sport, 2500)
    return int(hourly_rate * duration)

def generate_booking_id():
    """Generate unique booking ID"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_str = str(uuid.uuid4())[:8].upper()
    return f'NB{date_str}{random_str}'