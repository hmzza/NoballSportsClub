from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
from datetime import datetime, timedelta
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import sql
import json
from datetime import datetime, timedelta
from admin_routes import admin_bp

app = Flask(__name__)
app.secret_key = "your-secret-key-here"  # Change this to a random secret key

app.register_blueprint(admin_bp)
app.config["SESSION_TYPE"] = "filesystem"
app.config["SECRET_KEY"] = "mysecretkey"
# Database configuration
DATABASE_CONFIG = {
    "host": "localhost",
    "database": "noball_sports",
    "user": "postgres",  # Replace with your PostgreSQL username
    "password": "admin@123",  # Replace with your PostgreSQL password
    "port": "5432",
}

# Court mapping for multi-purpose courts
MULTI_PURPOSE_COURTS = {
    "cricket-2": "multi-130x60",  # Cricket Court 2 (130x60ft)
    "futsal-1": "multi-130x60",  # Futsal Court 1 (130x60ft)
}


def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def init_database():
    """Initialize database tables"""
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return False

    try:
        cursor = conn.cursor()

        # Create bookings table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS bookings (
                id VARCHAR(50) PRIMARY KEY,
                sport VARCHAR(50) NOT NULL,
                court VARCHAR(50) NOT NULL,
                court_name VARCHAR(100) NOT NULL,
                booking_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                duration DECIMAL(3,1) NOT NULL,
                selected_slots JSONB NOT NULL,
                player_name VARCHAR(100) NOT NULL,
                player_phone VARCHAR(20) NOT NULL,
                player_email VARCHAR(100),
                player_count VARCHAR(10) DEFAULT '2',
                special_requests TEXT,
                payment_type VARCHAR(20) DEFAULT 'advance',
                total_amount INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending_payment',
                payment_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                confirmed_at TIMESTAMP,
                cancelled_at TIMESTAMP
            )
        """
        )

        # Create contacts table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                sport VARCHAR(50),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Create index for better performance
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_bookings_date_court 
            ON bookings(booking_date, court, status)
        """
        )

        conn.commit()
        cursor.close()
        conn.close()
        print("Database initialized successfully")
        return True

    except Exception as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False


@app.route("/")
def index():
    """Main page route"""
    return render_template("index.html")


@app.route("/booking")
def booking():
    """Booking page route"""
    return render_template("booking.html")


@app.route("/api/booked-slots", methods=["POST"])
def get_booked_slots():
    """Get booked time slots for a specific court and date"""
    try:
        data = request.json
        court = data.get("court")
        date = data.get("date")

        if not court or not date:
            return jsonify({"error": "Missing court or date"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = conn.cursor()

        # Get booked slots for the specific court and date
        booked_slots = []

        # Query for direct court matches
        cursor.execute(
            """
            SELECT selected_slots FROM bookings 
            WHERE status IN ('confirmed', 'pending_payment') 
            AND booking_date = %s 
            AND court = %s
        """,
            (date, court),
        )

        direct_bookings = cursor.fetchall()
        for booking in direct_bookings:
            slots = booking[0]  # selected_slots is JSONB
            for slot in slots:
                booked_slots.append(slot["time"])

        # Check for multi-purpose court conflicts
        if court in MULTI_PURPOSE_COURTS:
            multi_court_type = MULTI_PURPOSE_COURTS[court]

            # Find other courts that share the same multi-purpose space
            conflicting_courts = [
                k
                for k, v in MULTI_PURPOSE_COURTS.items()
                if v == multi_court_type and k != court
            ]

            if conflicting_courts:
                format_strings = ",".join(["%s"] * len(conflicting_courts))
                cursor.execute(
                    f"""
                    SELECT selected_slots FROM bookings 
                    WHERE status IN ('confirmed', 'pending_payment') 
                    AND booking_date = %s 
                    AND court IN ({format_strings})
                """,
                    [date] + conflicting_courts,
                )

                conflict_bookings = cursor.fetchall()
                for booking in conflict_bookings:
                    slots = booking[0]  # selected_slots is JSONB
                    for slot in slots:
                        booked_slots.append(slot["time"])

        cursor.close()
        conn.close()

        return jsonify(booked_slots)

    except Exception as e:
        print(f"Error getting booked slots: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/check-conflicts", methods=["POST"])
def check_conflicts():
    """Check for conflicts before final booking confirmation"""
    try:
        data = request.json
        court = data.get("court")
        date = data.get("date")
        selected_slots = data.get("selectedSlots", [])

        if not court or not date or not selected_slots:
            return (
                jsonify({"hasConflict": True, "message": "Missing required data"}),
                400,
            )

        # Check if slots are still available
        available = are_slots_available(court, date, selected_slots)

        return jsonify(
            {
                "hasConflict": not available,
                "message": (
                    "Slots no longer available" if not available else "Slots available"
                ),
            }
        )
    except Exception as e:
        print(f"Error checking conflicts: {e}")
        return (
            jsonify({"hasConflict": True, "message": "Error checking availability"}),
            500,
        )


@app.route("/api/create-booking", methods=["POST"])
def create_booking():
    """Create a new booking with conflict prevention"""
    try:
        booking_data = request.json

        # Log the received data for debugging
        print(f"Received booking data: {booking_data}")

        # Validate required fields
        required_fields = [
            "sport",
            "court",
            "courtName",
            "date",
            "startTime",
            "endTime",
            "duration",
            "selectedSlots",
            "playerName",
            "playerPhone",
        ]

        missing_fields = []
        for field in required_fields:
            value = booking_data.get(field)
            if (
                value is None
                or value == ""
                or (isinstance(value, list) and len(value) == 0)
            ):
                missing_fields.append(field)

        if missing_fields:
            error_msg = f'Missing required fields: {", ".join(missing_fields)}'
            return jsonify({"success": False, "message": error_msg}), 400

        # Validate minimum duration (1 hour)
        duration = booking_data.get("duration", 0)
        if duration < 1:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Minimum booking duration is 1 hour",
                    }
                ),
                400,
            )

        # Validate selectedSlots format
        selected_slots = booking_data.get("selectedSlots", [])
        if not isinstance(selected_slots, list) or len(selected_slots) < 2:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid time slots selection - minimum 2 slots required",
                    }
                ),
                400,
            )

        # Generate booking ID
        booking_id = generate_booking_id()

        conn = get_db_connection()
        if not conn:
            return (
                jsonify({"success": False, "message": "Database connection failed"}),
                500,
            )

        try:
            cursor = conn.cursor()

            # Begin transaction for atomic operation
            conn.autocommit = False

            # Double-check for conflicts within the transaction (prevents race conditions)
            if not are_slots_available_db(
                cursor, booking_data["court"], booking_data["date"], selected_slots
            ):
                conn.rollback()
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "One or more selected time slots are no longer available",
                        }
                    ),
                    409,
                )

            # Insert the booking
            cursor.execute(
                """
                INSERT INTO bookings (
                    id, sport, court, court_name, booking_date, start_time, end_time,
                    duration, selected_slots, player_name, player_phone, player_email,
                    player_count, special_requests, payment_type, total_amount, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """,
                (
                    booking_id,
                    booking_data["sport"],
                    booking_data["court"],
                    booking_data["courtName"],
                    booking_data["date"],
                    booking_data["startTime"],
                    booking_data["endTime"],
                    booking_data["duration"],
                    json.dumps(selected_slots),
                    booking_data["playerName"],
                    booking_data["playerPhone"],
                    booking_data.get("playerEmail", ""),
                    booking_data.get("playerCount", "2"),
                    booking_data.get("specialRequests", ""),
                    booking_data.get("paymentType", "advance"),
                    booking_data.get("totalAmount", 0),
                    "pending_payment",
                ),
            )

            # Commit the transaction
            conn.commit()
            cursor.close()
            conn.close()

            print(f"Saved booking {booking_id} successfully")
            print(
                f"Email notifications will be sent by frontend for booking {booking_id}"
            )

            return jsonify({"success": True, "bookingId": booking_id})

        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            print(f"Error saving booking: {e}")
            return jsonify({"success": False, "message": "Failed to save booking"}), 500

    except Exception as e:
        print(f"Error creating booking: {str(e)}")
        return (
            jsonify({"success": False, "message": f"Internal server error: {str(e)}"}),
            500,
        )


def are_slots_available(court, date, selected_slots):
    """Check if all selected time slots are available for booking"""
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cursor = conn.cursor()
        result = are_slots_available_db(cursor, court, date, selected_slots)
        cursor.close()
        conn.close()
        return result
    except Exception as e:
        print(f"Error checking slot availability: {e}")
        return False


def are_slots_available_db(cursor, court, date, selected_slots):
    """Check if all selected time slots are available for booking (using existing cursor)"""
    try:
        # Get list of time slots from selected_slots
        slot_times = [slot["time"] for slot in selected_slots]

        # Check direct court conflicts
        cursor.execute(
            """
            SELECT selected_slots FROM bookings 
            WHERE status IN ('confirmed', 'pending_payment') 
            AND booking_date = %s 
            AND court = %s
        """,
            (date, court),
        )

        direct_bookings = cursor.fetchall()
        for booking in direct_bookings:
            booking_slots = booking[0]  # selected_slots is JSONB
            booking_slot_times = [slot["time"] for slot in booking_slots]

            # Check if any slots overlap
            if any(slot_time in booking_slot_times for slot_time in slot_times):
                return False

        # Check for multi-purpose court conflicts
        if court in MULTI_PURPOSE_COURTS:
            multi_court_type = MULTI_PURPOSE_COURTS[court]

            # Find other courts that share the same multi-purpose space
            conflicting_courts = [
                k
                for k, v in MULTI_PURPOSE_COURTS.items()
                if v == multi_court_type and k != court
            ]

            if conflicting_courts:
                format_strings = ",".join(["%s"] * len(conflicting_courts))
                cursor.execute(
                    f"""
                    SELECT selected_slots FROM bookings 
                    WHERE status IN ('confirmed', 'pending_payment') 
                    AND booking_date = %s 
                    AND court IN ({format_strings})
                """,
                    [date] + conflicting_courts,
                )

                conflict_bookings = cursor.fetchall()
                for booking in conflict_bookings:
                    booking_slots = booking[0]  # selected_slots is JSONB
                    booking_slot_times = [slot["time"] for slot in booking_slots]

                    # Check if any slots overlap
                    if any(slot_time in booking_slot_times for slot_time in slot_times):
                        return False

        return True

    except Exception as e:
        print(f"Error in are_slots_available_db: {e}")
        return False


def generate_booking_id():
    """Generate a unique booking ID"""
    date = datetime.now()
    date_str = date.strftime("%Y%m%d")
    random_str = str(uuid.uuid4())[:8].upper()
    return f"NB{date_str}{random_str}"


def format_booking_time_display(booking):
    """Format booking time for admin display in 12-hour format with proper date handling"""
    start_time = booking.get("start_time")
    end_time = booking.get("end_time")
    booking_date = booking.get("booking_date")

    if not start_time or not end_time or not booking_date:
        return "Time not available"

    def format_time_12hr(time_obj):
        """Convert time object to 12-hour format"""
        if isinstance(time_obj, str):
            time_obj = datetime.strptime(time_obj, "%H:%M:%S").time()

        hour = time_obj.hour
        minute = time_obj.minute
        ampm = "AM" if hour < 12 else "PM"
        display_hour = 12 if hour == 0 else hour if hour <= 12 else hour - 12
        return f"{display_hour}:{minute:02d}{ampm}"

    def is_next_day_time(time_obj):
        """Check if time is in next day (00:00-05:30)"""
        if isinstance(time_obj, str):
            time_obj = datetime.strptime(time_obj, "%H:%M:%S").time()
        return 0 <= time_obj.hour <= 5

    def format_date_short(date_obj):
        """Format date as 'DD MMM, YYYY'"""
        if isinstance(date_obj, str):
            date_obj = datetime.strptime(date_obj, "%Y-%m-%d").date()
        return date_obj.strftime("%d %b, %Y")

    # Format times with inline styles
    time_style = "color: #28a745; font-size: 1em; font-weight: 600;"
    start_12hr = format_time_12hr(start_time)
    end_12hr = format_time_12hr(end_time)

    # Check if booking spans multiple days
    start_is_next_day = is_next_day_time(start_time)
    end_is_next_day = is_next_day_time(end_time)

    if not start_is_next_day and not end_is_next_day:
        # Same day booking
        return f'<span style="{time_style}">{start_12hr}</span> - <span style="{time_style}">{end_12hr}</span> ({format_date_short(booking_date)})'
    elif not start_is_next_day and end_is_next_day:
        # Starts today, ends tomorrow
        if isinstance(booking_date, str):
            booking_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
        next_day = booking_date + timedelta(days=1)
        return f'<span style="{time_style}">{start_12hr}</span> ({format_date_short(booking_date)}) - <span style="{time_style}">{end_12hr}</span> ({next_day.strftime("%d %b, %Y")})'
    elif start_is_next_day and not end_is_next_day:
        # Starts tomorrow, ends day after (rare case)
        if isinstance(booking_date, str):
            booking_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
        start_day = booking_date + timedelta(days=1)
        end_day = booking_date + timedelta(days=2)
        return f'<span style="{time_style}">{start_12hr}</span> ({start_day.strftime("%d %b, %Y")}) - <span style="{time_style}">{end_12hr}</span> ({end_day.strftime("%d %b, %Y")})'
    else:
        # Both times are next day
        if isinstance(booking_date, str):
            booking_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
        next_day = booking_date + timedelta(days=1)
        return f'<span style="{time_style}">{start_12hr}</span> - <span style="{time_style}">{end_12hr}</span> ({next_day.strftime("%d %b, %Y")})'


def get_booking_display_date(booking):
    """Get the date that should be used for filtering - based on start time"""
    start_time = booking.get("start_time")
    booking_date = booking.get("booking_date")

    if not start_time or not booking_date:
        return booking_date

    def is_next_day_time(time_obj):
        """Check if time is in next day (00:00-05:30)"""
        if isinstance(time_obj, str):
            time_obj = datetime.strptime(time_obj, "%H:%M:%S").time()
        return 0 <= time_obj.hour <= 5

    # If start time is in next day (00:00-05:30), the actual booking date is the next day
    if is_next_day_time(start_time):
        if isinstance(booking_date, str):
            booking_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
        actual_date = booking_date + timedelta(days=1)
        return actual_date.strftime("%Y-%m-%d")

    if isinstance(booking_date, str):
        return booking_date
    return booking_date.strftime("%Y-%m-%d")


@app.route("/admin/bookings")
def admin_bookings():
    """Admin route to view all bookings"""
    try:
        conn = get_db_connection()
        if not conn:
            return "Database connection failed", 500

        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT * FROM bookings 
            ORDER BY created_at DESC
        """
        )

        bookings = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert to list of dicts and add formatted fields
        bookings_list = []
        for booking in bookings:
            booking_dict = dict(booking)

            # Convert snake_case to camelCase for template compatibility
            # Convert datetime objects to strings for template compatibility
            created_at = booking_dict.get("created_at")
            if created_at:
                booking_dict["createdAt"] = created_at.isoformat()
                booking_dict["createdDate"] = created_at.strftime("%Y-%m-%d")
                booking_dict["createdTime"] = created_at.strftime(
                    "%I:%M %p"
                )  # 12-hour format
                booking_dict["createdDateTime"] = created_at.strftime(
                    "%d %b %Y, %I:%M %p"
                )
            else:
                booking_dict["createdAt"] = None
                booking_dict["createdDate"] = "N/A"
                booking_dict["createdTime"] = "N/A"
                booking_dict["createdDateTime"] = "N/A"

            confirmed_at = booking_dict.get("confirmed_at")
            if confirmed_at:
                booking_dict["confirmedAt"] = confirmed_at.isoformat()
                booking_dict["confirmedDateTime"] = confirmed_at.strftime(
                    "%d %b %Y, %I:%M %p"
                )
            else:
                booking_dict["confirmedAt"] = None
                booking_dict["confirmedDateTime"] = None

            cancelled_at = booking_dict.get("cancelled_at")
            if cancelled_at:
                booking_dict["cancelledAt"] = cancelled_at.isoformat()
                booking_dict["cancelledDateTime"] = cancelled_at.strftime(
                    "%d %b %Y, %I:%M %p"
                )
            else:
                booking_dict["cancelledAt"] = None
                booking_dict["cancelledDateTime"] = None
            booking_dict["totalAmount"] = booking_dict.get("total_amount")
            booking_dict["playerName"] = booking_dict.get("player_name")
            booking_dict["playerPhone"] = booking_dict.get("player_phone")
            booking_dict["playerEmail"] = booking_dict.get("player_email")
            booking_dict["playerCount"] = booking_dict.get("player_count")
            booking_dict["specialRequests"] = booking_dict.get("special_requests")
            booking_dict["paymentType"] = booking_dict.get("payment_type")
            booking_dict["courtName"] = booking_dict.get("court_name")
            booking_dict["paymentVerified"] = booking_dict.get("payment_verified")

            # Add formatted fields
            booking_dict["formatted_time"] = format_booking_time_display(booking_dict)
            booking_dict["display_date"] = get_booking_display_date(booking_dict)

            bookings_list.append(booking_dict)

        return render_template("admin_bookings.html", bookings=bookings_list)

    except Exception as e:
        print(f"Error loading bookings: {e}")
        import traceback

        traceback.print_exc()
        return "Error loading bookings", 500


@app.route("/admin/confirm-booking/<booking_id>")
def confirm_booking(booking_id):
    """Admin route to confirm a booking"""
    try:
        conn = get_db_connection()
        if not conn:
            return "Database connection failed", 500

        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE bookings 
            SET status = 'confirmed', payment_verified = TRUE, confirmed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """,
            (booking_id,),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return redirect(url_for("admin_bookings"))

    except Exception as e:
        print(f"Error confirming booking: {e}")
        return "Error confirming booking", 500


@app.route("/admin/decline-booking/<booking_id>")
def decline_booking(booking_id):
    """Admin route to decline a booking"""
    try:
        conn = get_db_connection()
        if not conn:
            return "Database connection failed", 500

        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE bookings 
            SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """,
            (booking_id,),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return redirect(url_for("admin_bookings"))

    except Exception as e:
        print(f"Error declining booking: {e}")
        return "Error declining booking", 500


@app.route("/submit-contact", methods=["POST"])
def submit_contact():
    """Handle contact form submissions"""
    try:
        # Get form data
        name = request.form.get("name")
        email = request.form.get("email")
        phone = request.form.get("phone")
        sport = request.form.get("sport")
        message = request.form.get("message")

        # Validate required fields
        if not all([name, email, phone, message]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        conn = get_db_connection()
        if not conn:
            return (
                jsonify({"success": False, "error": "Database connection failed"}),
                500,
            )

        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO contacts (name, email, phone, sport, message)
            VALUES (%s, %s, %s, %s, %s)
        """,
            (name, email, phone, sport, message),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify(
            {"success": True, "message": "Contact form submitted successfully"}
        )

    except Exception as e:
        print(f"Error processing contact form: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@app.route("/admin/contacts")
def admin_contacts():
    """Admin route to view contact submissions"""
    try:
        conn = get_db_connection()
        if not conn:
            return "Database connection failed", 500

        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT * FROM contacts 
            ORDER BY created_at DESC
        """
        )

        contacts = cursor.fetchall()
        cursor.close()
        conn.close()

        return render_template("admin_contacts.html", contacts=contacts)

    except Exception as e:
        print(f"Error loading contacts: {e}")
        return "Error loading contacts", 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template("404.html"), 404


@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return render_template("500.html"), 500


if __name__ == "__main__":
    # Initialize database on startup
    if init_database():
        print("Starting Flask application...")
        app.run(debug=True, host="0.0.0.0", port=5001)
    else:
        print("Failed to initialize database. Please check your PostgreSQL connection.")
