from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
from datetime import datetime, timedelta
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import logging
from admin_routes import admin_bp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = "your-secret-key-here"
app.register_blueprint(admin_bp)

# Database configuration
DATABASE_CONFIG = {
    "host": "localhost",
    "database": "noball_sports",
    "user": "postgres",
    "password": "admin@123",
    "port": "5432",
}

# Court mapping for multi-purpose courts
MULTI_PURPOSE_COURTS = {
    "cricket-2": "multi-130x60",
    "futsal-1": "multi-130x60",
}


class DatabaseManager:
    """Professional database connection manager"""

    @staticmethod
    def get_connection():
        """Get database connection with error handling"""
        try:
            conn = psycopg2.connect(**DATABASE_CONFIG)
            return conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return None

    @staticmethod
    def execute_query(query, params=None, fetch_one=False, fetch_all=True):
        """Execute query with proper error handling"""
        conn = None
        try:
            conn = DatabaseManager.get_connection()
            if not conn:
                return None

            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params or ())

            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            else:
                result = cursor.rowcount

            conn.commit()
            return result

        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Query execution error: {e}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            return None
        finally:
            if conn:
                conn.close()


class BookingService:
    """Professional booking service layer"""

    @staticmethod
    def get_booked_slots(court_id, date):
        """Get all booked time slots for a specific court and date"""
        try:
            logger.info(f"Fetching booked slots for court: {court_id}, date: {date}")

            booked_slots = set()

            # Query direct bookings for this court
            direct_query = """
                SELECT selected_slots FROM bookings 
                WHERE status IN ('confirmed', 'pending_payment') 
                AND booking_date = %s 
                AND court = %s
            """

            direct_bookings = DatabaseManager.execute_query(
                direct_query, (date, court_id)
            )

            if direct_bookings:
                logger.info(f"Found {len(direct_bookings)} direct bookings")
                for booking in direct_bookings:
                    slots = booking["selected_slots"]
                    if slots:
                        for slot in slots:
                            if isinstance(slot, dict) and "time" in slot:
                                booked_slots.add(slot["time"])

            # Check multi-purpose court conflicts
            if court_id in MULTI_PURPOSE_COURTS:
                multi_court_type = MULTI_PURPOSE_COURTS[court_id]
                conflicting_courts = [
                    k
                    for k, v in MULTI_PURPOSE_COURTS.items()
                    if v == multi_court_type and k != court_id
                ]

                if conflicting_courts:
                    logger.info(f"Checking conflicts with courts: {conflicting_courts}")

                    placeholders = ",".join(["%s"] * len(conflicting_courts))
                    conflict_query = f"""
                        SELECT selected_slots FROM bookings 
                        WHERE status IN ('confirmed', 'pending_payment') 
                        AND booking_date = %s 
                        AND court IN ({placeholders})
                    """

                    conflict_params = [date] + conflicting_courts
                    conflict_bookings = DatabaseManager.execute_query(
                        conflict_query, conflict_params
                    )

                    if conflict_bookings:
                        logger.info(
                            f"Found {len(conflict_bookings)} conflicting bookings"
                        )
                        for booking in conflict_bookings:
                            slots = booking["selected_slots"]
                            if slots:
                                for slot in slots:
                                    if isinstance(slot, dict) and "time" in slot:
                                        booked_slots.add(slot["time"])

            result = sorted(list(booked_slots))
            logger.info(f"Total booked slots: {len(result)}")
            return result

        except Exception as e:
            logger.error(f"Error fetching booked slots: {e}")
            return []

    @staticmethod
    def create_booking(booking_data):
        """Create a new booking with validation"""
        try:
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

            for field in required_fields:
                if not booking_data.get(field):
                    raise ValueError(f"Missing required field: {field}")

            # Generate booking ID
            booking_id = BookingService._generate_booking_id()

            # Prepare insert query
            insert_query = """
                INSERT INTO bookings (
                    id, sport, court, court_name, booking_date, start_time, end_time,
                    duration, selected_slots, player_name, player_phone, player_email,
                    player_count, special_requests, payment_type, total_amount, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """

            params = (
                booking_id,
                booking_data["sport"],
                booking_data["court"],
                booking_data["courtName"],
                booking_data["date"],
                booking_data["startTime"],
                booking_data["endTime"],
                booking_data["duration"],
                json.dumps(booking_data["selectedSlots"]),
                booking_data["playerName"],
                booking_data["playerPhone"],
                booking_data.get("playerEmail", ""),
                booking_data.get("playerCount", "2"),
                booking_data.get("specialRequests", ""),
                booking_data.get("paymentType", "advance"),
                booking_data.get("totalAmount", 0),
                "pending_payment",
            )

            result = DatabaseManager.execute_query(
                insert_query, params, fetch_all=False
            )

            if result is not None:
                logger.info(f"Successfully created booking: {booking_id}")
                return booking_id
            else:
                raise Exception("Failed to insert booking")

        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            raise e

    @staticmethod
    def check_slot_availability(court_id, date, selected_slots):
        """Check if selected slots are still available"""
        try:
            booked_slots = BookingService.get_booked_slots(court_id, date)
            slot_times = [slot["time"] for slot in selected_slots]

            conflicts = [slot for slot in slot_times if slot in booked_slots]
            return len(conflicts) == 0, conflicts

        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            return False, []

    @staticmethod
    def _generate_booking_id():
        """Generate unique booking ID"""
        date_str = datetime.now().strftime("%Y%m%d")
        random_str = str(uuid.uuid4())[:8].upper()
        return f"NB{date_str}{random_str}"


def init_database():
    """Initialize database tables"""
    try:
        create_tables_query = """
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
            );
            
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                sport VARCHAR(50),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_bookings_date_court 
            ON bookings(booking_date, court, status);
        """

        result = DatabaseManager.execute_query(create_tables_query, fetch_all=False)
        if result is not None:
            logger.info("Database initialized successfully")
            return True
        else:
            logger.error("Failed to initialize database")
            return False

    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        return False


# Routes
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

        booked_slots = BookingService.get_booked_slots(court, date)
        return jsonify(booked_slots)

    except Exception as e:
        logger.error(f"API error - get_booked_slots: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/check-conflicts", methods=["POST"])
def check_conflicts():
    """Check for conflicts before final booking confirmation"""
    try:
        data = request.json
        court = data.get("court")
        date = data.get("date")
        selected_slots = data.get("selectedSlots", [])

        if not all([court, date, selected_slots]):
            return (
                jsonify({"hasConflict": True, "message": "Missing required data"}),
                400,
            )

        available, conflicts = BookingService.check_slot_availability(
            court, date, selected_slots
        )

        return jsonify(
            {
                "hasConflict": not available,
                "message": (
                    "Slots no longer available" if not available else "Slots available"
                ),
                "conflicts": conflicts,
            }
        )

    except Exception as e:
        logger.error(f"API error - check_conflicts: {e}")
        return (
            jsonify({"hasConflict": True, "message": "Error checking availability"}),
            500,
        )


@app.route("/api/create-booking", methods=["POST"])
def create_booking():
    """Create a new booking with conflict prevention"""
    try:
        booking_data = request.json

        # Final conflict check
        court = booking_data.get("court")
        date = booking_data.get("date")
        selected_slots = booking_data.get("selectedSlots", [])

        available, conflicts = BookingService.check_slot_availability(
            court, date, selected_slots
        )

        if not available:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "One or more selected time slots are no longer available",
                        "conflicts": conflicts,
                    }
                ),
                409,
            )

        # Create booking
        booking_id = BookingService.create_booking(booking_data)

        return jsonify(
            {
                "success": True,
                "bookingId": booking_id,
                "message": "Booking created successfully",
            }
        )

    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"API error - create_booking: {e}")
        return jsonify({"success": False, "message": "Failed to create booking"}), 500


@app.route("/submit-contact", methods=["POST"])
def submit_contact():
    """Handle contact form submissions"""
    try:
        contact_data = {
            "name": request.form.get("name"),
            "email": request.form.get("email"),
            "phone": request.form.get("phone"),
            "sport": request.form.get("sport"),
            "message": request.form.get("message"),
        }

        # Validate required fields
        if not all(
            [
                contact_data["name"],
                contact_data["email"],
                contact_data["phone"],
                contact_data["message"],
            ]
        ):
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        insert_query = """
            INSERT INTO contacts (name, email, phone, sport, message)
            VALUES (%(name)s, %(email)s, %(phone)s, %(sport)s, %(message)s)
        """

        result = DatabaseManager.execute_query(
            insert_query, contact_data, fetch_all=False
        )

        if result is not None:
            return jsonify(
                {"success": True, "message": "Contact form submitted successfully"}
            )
        else:
            raise Exception("Failed to save contact")

    except Exception as e:
        logger.error(f"Contact form error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


# Admin routes for viewing bookings (legacy support)
@app.route("/admin/bookings")
def admin_bookings():
    """Legacy admin bookings route - redirects to new admin panel"""
    return redirect(url_for("admin_panel.admin_dashboard"))


@app.route("/admin/contacts")
def admin_contacts():
    """Admin route to view contact submissions"""
    try:
        query = "SELECT * FROM contacts ORDER BY created_at DESC"
        contacts = DatabaseManager.execute_query(query)

        return render_template("admin_contacts.html", contacts=contacts or [])

    except Exception as e:
        logger.error(f"Error loading contacts: {e}")
        return render_template("admin_contacts.html", contacts=[])


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template("404.html"), 404


@app.errorhandler(500)
def server_error(error):
    return render_template("500.html"), 500


# ADD THESE DEBUG ENDPOINTS TO YOUR app.py FILE


@app.route("/api/debug-bookings-customer", methods=["GET"])
def debug_bookings_customer():
    """Debug endpoint for customer side - no admin auth required"""
    try:
        query = """
            SELECT id, sport, court, booking_date, status, player_name, selected_slots, created_at
            FROM bookings 
            WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY created_at DESC 
            LIMIT 10
        """

        bookings = DatabaseManager.execute_query(query)

        # Format for JSON
        bookings_list = []
        if bookings:
            for booking in bookings:
                booking_dict = dict(booking)
                # Convert date/time objects to strings
                if booking_dict.get("booking_date"):
                    booking_dict["booking_date"] = booking_dict[
                        "booking_date"
                    ].strftime("%Y-%m-%d")
                if booking_dict.get("created_at"):
                    booking_dict["created_at"] = booking_dict["created_at"].isoformat()
                bookings_list.append(booking_dict)

        return jsonify(
            {"success": True, "bookings": bookings_list, "count": len(bookings_list)}
        )

    except Exception as e:
        logger.error(f"Debug bookings error: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/test-db-customer", methods=["GET"])
def test_db_customer():
    """Test database connection for customer side"""
    try:
        # Test basic query
        total_query = "SELECT COUNT(*) as count FROM bookings"
        total_result = DatabaseManager.execute_query(total_query, fetch_one=True)
        total_bookings = total_result["count"] if total_result else 0

        # Test today's bookings
        today_query = """
            SELECT COUNT(*) as count FROM bookings 
            WHERE booking_date = CURRENT_DATE
        """
        today_result = DatabaseManager.execute_query(today_query, fetch_one=True)
        today_bookings = today_result["count"] if today_result else 0

        # Test pending vs confirmed
        status_query = """
            SELECT status, COUNT(*) as count
            FROM bookings 
            WHERE booking_date >= CURRENT_DATE
            GROUP BY status
        """
        status_results = DatabaseManager.execute_query(status_query)
        status_counts = {}
        if status_results:
            for row in status_results:
                status_counts[row["status"]] = row["count"]

        return jsonify(
            {
                "success": True,
                "total_bookings": total_bookings,
                "today_bookings": today_bookings,
                "status_counts": status_counts,
                "message": "Database connection working",
            }
        )

    except Exception as e:
        logger.error(f"Database test error: {e}")
        return jsonify(
            {"success": False, "error": str(e), "message": "Database connection failed"}
        )


@app.route("/api/test-specific-slot", methods=["POST"])
def test_specific_slot():
    """Test a specific court and date combination"""
    try:
        data = request.json
        court = data.get("court", "padel-1")
        date = data.get("date", "2025-08-05")

        logger.info(f"Testing specific slot: {court} on {date}")

        # Get all bookings for this court and date
        query = """
            SELECT id, status, player_name, selected_slots, start_time, end_time, created_at
            FROM bookings 
            WHERE court = %s AND booking_date = %s
            ORDER BY created_at DESC
        """

        bookings = DatabaseManager.execute_query(query, (court, date))

        results = []
        total_slots = []

        if bookings:
            for booking in bookings:
                booking_dict = dict(booking)

                # Parse selected slots
                slots = []
                selected_slots = booking_dict.get("selected_slots")
                if selected_slots:
                    if isinstance(selected_slots, str):
                        selected_slots = json.loads(selected_slots)
                    slots = [
                        slot.get("time")
                        for slot in selected_slots
                        if isinstance(slot, dict) and "time" in slot
                    ]
                    total_slots.extend(slots)

                results.append(
                    {
                        "id": booking_dict.get("id"),
                        "status": booking_dict.get("status"),
                        "player_name": booking_dict.get("player_name"),
                        "slots": slots,
                        "start_time": (
                            str(booking_dict.get("start_time"))
                            if booking_dict.get("start_time")
                            else None
                        ),
                        "end_time": (
                            str(booking_dict.get("end_time"))
                            if booking_dict.get("end_time")
                            else None
                        ),
                        "created_at": (
                            booking_dict.get("created_at").isoformat()
                            if booking_dict.get("created_at")
                            else None
                        ),
                    }
                )

        # Check multi-purpose conflicts
        conflicts = []
        if court in MULTI_PURPOSE_COURTS:
            multi_court_type = MULTI_PURPOSE_COURTS[court]
            conflicting_courts = [
                k
                for k, v in MULTI_PURPOSE_COURTS.items()
                if v == multi_court_type and k != court
            ]

            if conflicting_courts:
                conflict_query = """
                    SELECT id, status, player_name, selected_slots
                    FROM bookings 
                    WHERE court = ANY(%s) AND booking_date = %s AND status IN ('confirmed', 'pending_payment')
                """

                conflict_bookings = DatabaseManager.execute_query(
                    conflict_query, (conflicting_courts, date)
                )

                if conflict_bookings:
                    for conflict_booking in conflict_bookings:
                        conflict_dict = dict(conflict_booking)
                        conflict_slots = conflict_dict.get("selected_slots")
                        if conflict_slots:
                            if isinstance(conflict_slots, str):
                                conflict_slots = json.loads(conflict_slots)
                            conflict_slot_times = [
                                slot.get("time")
                                for slot in conflict_slots
                                if isinstance(slot, dict) and "time" in slot
                            ]
                            conflicts.append(
                                {
                                    "id": conflict_dict.get("id"),
                                    "court": "unknown",  # We'd need to track this better
                                    "player_name": conflict_dict.get("player_name"),
                                    "status": conflict_dict.get("status"),
                                    "slots": conflict_slot_times,
                                }
                            )
                            total_slots.extend(conflict_slot_times)

        unique_booked_slots = sorted(list(set(total_slots)))

        return jsonify(
            {
                "success": True,
                "court": court,
                "date": date,
                "direct_bookings": results,
                "conflicts": conflicts,
                "total_booked_slots": unique_booked_slots,
                "summary": {
                    "direct_booking_count": len(results),
                    "conflict_count": len(conflicts),
                    "total_slot_count": len(unique_booked_slots),
                },
            }
        )

    except Exception as e:
        logger.error(f"Test specific slot error: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})


if __name__ == "__main__":
    if init_database():
        logger.info("Starting Flask application...")
        app.run(debug=True, host="0.0.0.0", port=5001)
    else:
        logger.error(
            "Failed to initialize database. Please check your PostgreSQL connection."
        )
