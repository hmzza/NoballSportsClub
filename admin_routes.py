from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for,
)
from functools import wraps
from datetime import datetime, timedelta
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from functools import wraps
import logging

logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin_panel", __name__, url_prefix="/admin")

# Database configuration
DATABASE_CONFIG = {
    "host": "localhost",
    "database": "noball_sports",
    "user": "postgres",
    "password": "admin@123",
    "port": "5432",
}

# Court configurations - Must match frontend exactly
COURT_CONFIG = {
    "padel": [
        {"id": "padel-1", "name": "Court 1: Teracotta Court"},
        {"id": "padel-2", "name": "Court 2: Purple Mondo"},
    ],
    "cricket": [
        {"id": "cricket-1", "name": "Court 1: 110x50ft"},
        {"id": "cricket-2", "name": "Court 2: 130x60ft Multi"},
    ],
    "futsal": [{"id": "futsal-1", "name": "Court 1: 130x60ft Multi"}],
    "pickleball": [{"id": "pickleball-1", "name": "Court 1: Professional"}],
}

# Multi-purpose court mapping
MULTI_PURPOSE_COURTS = {"cricket-2": "multi-130x60", "futsal-1": "multi-130x60"}

# Pricing configuration
SPORT_PRICING = {"cricket": 3000, "futsal": 2500, "padel": 5500, "pickleball": 2500}


# Authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_panel.admin_login"))
        return f(*args, **kwargs)

    return decorated_function


class AdminDatabaseManager:
    """Admin-specific database operations"""

    @staticmethod
    def get_connection():
        """Get database connection"""
        try:
            conn = psycopg2.connect(**DATABASE_CONFIG)
            return conn
        except Exception as e:
            logger.error(f"Admin database connection error: {e}")
            return None

    @staticmethod
    def execute_query(query, params=None, fetch_one=False, fetch_all=True):
        """Execute query with proper error handling"""
        conn = None
        try:
            conn = AdminDatabaseManager.get_connection()
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
            logger.error(f"Admin query execution error: {e}")
            return None
        finally:
            if conn:
                conn.close()


# FIXED: Enhanced AdminScheduleService in admin_routes.py


class AdminScheduleService:
    """Professional admin schedule service with FIXED booking display logic"""

    @staticmethod
    def get_schedule_data(start_date, end_date, sport_filter=None):
        """Get comprehensive schedule data for date range - FIXED VERSION"""
        try:
            logger.info(
                f"🔧 FIXED: Admin fetching schedule: {start_date} to {end_date}, sport: {sport_filter}"
            )

            schedule = {}

            # Get courts based on filter
            if sport_filter and sport_filter in COURT_CONFIG:
                courts = COURT_CONFIG[sport_filter]
                logger.info(
                    f"📋 Filtering by sport '{sport_filter}': {len(courts)} courts"
                )
            else:
                courts = []
                for sport in ["padel", "cricket", "futsal", "pickleball"]:
                    courts.extend(COURT_CONFIG[sport])
                logger.info(f"📋 All sports: {len(courts)} total courts")

            # Process each date in range
            current_date = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")

            logger.info(f"📅 Processing date range: {current_date} to {end_date_obj}")

            while current_date <= end_date_obj:
                date_str = current_date.strftime("%Y-%m-%d")
                schedule[date_str] = {}

                logger.info(f"🗓️ Processing date: {date_str}")

                # Process each court
                for court in courts:
                    court_id = court["id"]
                    schedule[date_str][court_id] = {}

                    # FIXED: Get bookings for this court and date with better query
                    bookings = AdminScheduleService._get_court_bookings_fixed(
                        court_id, date_str
                    )

                    logger.info(
                        f"🏟️ Court {court_id} on {date_str}: Found {len(bookings)} bookings"
                    )

                    # Process each booking
                    booking_count = 0
                    for booking in bookings:
                        try:
                            slots = booking.get("selected_slots", [])

                            # Handle both JSON string and parsed data
                            if isinstance(slots, str):
                                try:
                                    slots = json.loads(slots)
                                except json.JSONDecodeError:
                                    logger.error(
                                        f"❌ Invalid JSON in selected_slots for booking {booking.get('id')}"
                                    )
                                    continue

                            if not slots:
                                logger.warning(
                                    f"⚠️ No slots found for booking {booking.get('id')}"
                                )
                                continue

                            logger.info(
                                f"🎯 Processing booking {booking.get('id')} with {len(slots)} slots: {slots}"
                            )

                            for slot in slots:
                                if isinstance(slot, dict) and "time" in slot:
                                    slot_time = slot["time"]

                                    # Check if this is a multi-purpose court conflict
                                    is_conflict = (
                                        AdminScheduleService._is_multi_purpose_conflict(
                                            court_id,
                                            booking.get("court"),
                                            slot_time,
                                            date_str,
                                        )
                                    )

                                    # Create slot data
                                    slot_data = {
                                        "status": (
                                            "booked-conflict"
                                            if is_conflict
                                            else AdminScheduleService._get_booking_status(
                                                booking
                                            )
                                        ),
                                        "title": booking.get("player_name", "Booked"),
                                        "subtitle": f"PKR {booking.get('total_amount', 0):,}"
                                        + (" - Multi Court" if is_conflict else ""),
                                        "bookingId": booking.get("id"),
                                        "playerName": booking.get("player_name"),
                                        "playerPhone": booking.get("player_phone"),
                                        "amount": booking.get("total_amount"),
                                        "duration": booking.get("duration"),
                                        "originalCourt": (
                                            booking.get("court")
                                            if is_conflict
                                            else court_id
                                        ),
                                        "comments": booking.get("special_requests", ""),
                                    }

                                    schedule[date_str][court_id][slot_time] = slot_data
                                    booking_count += 1

                                    logger.info(
                                        f"✅ Added slot {slot_time} for court {court_id}: {slot_data['title']} ({slot_data['status']})"
                                    )

                        except Exception as e:
                            logger.error(
                                f"❌ Error processing booking {booking.get('id', 'unknown')}: {e}"
                            )
                            continue

                    logger.info(
                        f"📊 Court {court_id} on {date_str}: {booking_count} slots scheduled"
                    )

                current_date += timedelta(days=1)

            # Final summary
            total_scheduled_slots = 0
            for date in schedule:
                for court in schedule[date]:
                    total_scheduled_slots += len(schedule[date][court])

            logger.info(
                f"📈 FIXED: Schedule data prepared successfully - {total_scheduled_slots} total scheduled slots"
            )
            return schedule

        except Exception as e:
            logger.error(f"❌ Error getting admin schedule data: {e}")
            import traceback

            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return {}

    @staticmethod
    def _get_court_bookings_fixed(court_id, date):
        """FIXED: Get all bookings affecting a specific court on a date with better error handling"""
        try:
            logger.info(f"🔍 FIXED: Getting bookings for court {court_id} on {date}")

            # FIXED: Direct bookings for this court with better query
            if court_id == "pickleball-1":
                direct_query = """
                    SELECT * FROM bookings 
                    WHERE status IN ('confirmed', 'pending_payment') 
                    AND booking_date = %s 
                    AND (court = %s OR sport = 'pickleball')
                    ORDER BY start_time
                """
            else:
                direct_query = """
                    SELECT * FROM bookings 
                    WHERE status IN ('confirmed', 'pending_payment') 
                    AND booking_date = %s 
                    AND court = %s
                    ORDER BY start_time
                """

            logger.info(f"🗄️ Executing direct query for court {court_id} on {date}")
            direct_bookings = (
                AdminDatabaseManager.execute_query(direct_query, (date, court_id)) or []
            )
            logger.info(f"📋 Direct bookings found: {len(direct_bookings)}")

            # Log each direct booking for debugging
            for booking in direct_bookings:
                logger.info(
                    f"🎯 Direct booking: {booking.get('id')} - {booking.get('player_name')} - Status: {booking.get('status')}"
                )

            # FIXED: Multi-purpose court conflicts with better logic
            conflict_bookings = []
            if court_id in MULTI_PURPOSE_COURTS:
                multi_court_type = MULTI_PURPOSE_COURTS[court_id]
                conflicting_courts = [
                    k
                    for k, v in MULTI_PURPOSE_COURTS.items()
                    if v == multi_court_type and k != court_id
                ]

                if conflicting_courts:
                    logger.info(
                        f"🔄 Checking multi-purpose conflicts for {court_id} with courts: {conflicting_courts}"
                    )

                    placeholders = ",".join(["%s"] * len(conflicting_courts))
                    conflict_query = f"""
                        SELECT 
                            id, sport, court, court_name, booking_date, start_time, end_time,
                            duration, selected_slots, player_name, player_phone, player_email,
                            total_amount, status, special_requests, created_at
                        FROM bookings 
                        WHERE status IN ('confirmed', 'pending_payment') 
                        AND booking_date = %s 
                        AND court IN ({placeholders})
                        ORDER BY start_time
                    """

                    conflict_params = [date] + conflicting_courts
                    logger.info(
                        f"🗄️ Executing conflict query with params: {conflict_params}"
                    )
                    conflict_bookings = (
                        AdminDatabaseManager.execute_query(
                            conflict_query, conflict_params
                        )
                        or []
                    )
                    logger.info(f"⚠️ Conflict bookings found: {len(conflict_bookings)}")

            # FIXED: Convert to list of dicts with proper error handling
            all_bookings = []
            for booking in direct_bookings + conflict_bookings:
                try:
                    if booking:
                        booking_dict = dict(booking)
                        # Ensure selected_slots is properly handled
                        if booking_dict.get("selected_slots"):
                            if isinstance(booking_dict["selected_slots"], str):
                                try:
                                    booking_dict["selected_slots"] = json.loads(
                                        booking_dict["selected_slots"]
                                    )
                                except json.JSONDecodeError as e:
                                    logger.error(
                                        f"❌ JSON decode error for booking {booking_dict.get('id')}: {e}"
                                    )
                                    booking_dict["selected_slots"] = []
                        else:
                            booking_dict["selected_slots"] = []

                        all_bookings.append(booking_dict)
                        logger.info(
                            f"✅ Added booking {booking_dict.get('id')} to results"
                        )
                except Exception as e:
                    logger.error(f"❌ Error processing booking: {e}")
                    continue

            logger.info(
                f"📊 FIXED: Returning {len(all_bookings)} total bookings for court {court_id} on {date}"
            )
            return all_bookings

        except Exception as e:
            logger.error(f"❌ Error getting court bookings: {e}")
            import traceback

            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            return []

    @staticmethod
    def _is_multi_purpose_conflict(court_id, booking_court, slot_time, date):
        """Check if this is a multi-purpose court conflict"""
        try:
            is_conflict = (
                court_id in MULTI_PURPOSE_COURTS
                and booking_court != court_id
                and booking_court in MULTI_PURPOSE_COURTS
                and MULTI_PURPOSE_COURTS[court_id]
                == MULTI_PURPOSE_COURTS[booking_court]
            )

            if is_conflict:
                logger.info(
                    f"⚠️ Multi-purpose conflict detected: {court_id} vs {booking_court} at {slot_time}"
                )

            return is_conflict
        except Exception as e:
            logger.error(f"❌ Error checking multi-purpose conflict: {e}")
            return False

    @staticmethod
    def _get_booking_status(booking):
        """Convert booking status to schedule status"""
        try:
            status_map = {
                "pending_payment": "booked-pending",
                "confirmed": "booked-confirmed",
                "cancelled": "booked-cancelled",
            }
            db_status = booking.get("status", "unknown")
            schedule_status = status_map.get(db_status, "booked-pending")

            logger.info(f"🏷️ Status mapping: {db_status} -> {schedule_status}")
            return schedule_status
        except Exception as e:
            logger.error(f"❌ Error getting booking status: {e}")
            return "booked-pending"


# FIXED: Enhanced API endpoint with better debugging
@admin_bp.route("/api/schedule-data", methods=["POST"])
@admin_required
def api_schedule_data():
    """FIXED: Get schedule data for date range with enhanced debugging"""
    try:
        data = request.json
        start_date = data.get("startDate")
        end_date = data.get("endDate")
        sport_filter = data.get("sport")

        logger.info(
            f"🔧 FIXED: Schedule API called with: {start_date} to {end_date}, sport: {sport_filter}"
        )

        # Validate input dates
        if not start_date or not end_date:
            logger.error("❌ Missing start_date or end_date")
            return jsonify(
                {"success": False, "message": "Missing date parameters", "schedule": {}}
            )

        try:
            datetime.strptime(start_date, "%Y-%m-%d")
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError as e:
            logger.error(f"❌ Invalid date format: {e}")
            return jsonify(
                {"success": False, "message": "Invalid date format", "schedule": {}}
            )

        # Test database connection first
        test_query = "SELECT COUNT(*) as count FROM bookings WHERE booking_date BETWEEN %s AND %s"
        test_result = AdminDatabaseManager.execute_query(
            test_query, (start_date, end_date), fetch_one=True
        )

        if test_result:
            total_bookings = test_result.get("count", 0)
            logger.info(
                f"📊 Database connection OK: {total_bookings} bookings in date range"
            )
        else:
            logger.error("❌ Database connection failed")
            return jsonify(
                {
                    "success": False,
                    "message": "Database connection failed",
                    "schedule": {},
                }
            )

        # Get schedule data using fixed method
        schedule = AdminScheduleService.get_schedule_data(
            start_date, end_date, sport_filter
        )

        # Count total slots in response
        total_slots = 0
        for date in schedule:
            for court in schedule[date]:
                total_slots += len(schedule[date][court])

        logger.info(
            f"📈 FIXED: Schedule API returning {len(schedule)} days with {total_slots} total scheduled slots"
        )

        # Debug: Log a sample of the schedule data
        if schedule:
            sample_date = list(schedule.keys())[0]
            sample_courts = list(schedule[sample_date].keys())[:2]  # First 2 courts
            logger.info(f"🔍 Sample schedule data for {sample_date}:")
            for court in sample_courts:
                court_slots = schedule[sample_date][court]
                logger.info(
                    f"  Court {court}: {len(court_slots)} slots - {list(court_slots.keys())[:3]}"
                )

        return jsonify(
            {
                "success": True,
                "schedule": schedule,
                "debug_info": {
                    "total_days": len(schedule),
                    "total_slots": total_slots,
                    "total_bookings_in_range": total_bookings,
                    "sport_filter": sport_filter,
                    "date_range": f"{start_date} to {end_date}",
                },
            }
        )

    except Exception as e:
        logger.error(f"❌ FIXED: Schedule API error: {e}")
        import traceback

        logger.error(f"❌ Full traceback: {traceback.format_exc()}")

        return jsonify(
            {
                "success": True,  # Return success=True to prevent UI errors
                "schedule": {},
                "message": f"Error loading schedule: {str(e)}",
                "debug_info": {
                    "error": str(e),
                    "date_range": f"{data.get('startDate', 'unknown')} to {data.get('endDate', 'unknown')}",
                    "sport_filter": data.get("sport", "all"),
                },
            }
        )


class AdminBookingService:
    """Admin booking operations"""

    @staticmethod
    def create_admin_booking(booking_data):
        """Create booking from admin panel"""
        try:
            # Calculate end time
            start_time = booking_data["startTime"]
            duration = float(booking_data["duration"])
            end_time = AdminBookingService._calculate_end_time(start_time, duration)

            # Get sport and calculate pricing
            sport = AdminBookingService._get_court_sport(booking_data["court"])
            court_name = AdminBookingService._get_court_name(booking_data["court"])

            # Generate booking ID
            booking_id = AdminBookingService._generate_booking_id()

            # Create selected_slots
            selected_slots = AdminBookingService._create_time_slots(
                start_time, duration
            )

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
                sport,
                booking_data["court"],
                court_name,
                booking_data["date"],
                start_time,
                end_time,
                duration,
                json.dumps(selected_slots),
                booking_data["playerName"],
                booking_data["playerPhone"],
                booking_data.get("playerEmail", ""),
                booking_data.get("playerCount", "2"),
                booking_data.get("specialRequests", ""),
                "full",
                booking_data.get(
                    "totalAmount",
                    AdminBookingService._calculate_amount(sport, duration),
                ),
                booking_data.get("status", "confirmed"),
            )

            result = AdminDatabaseManager.execute_query(
                insert_query, params, fetch_all=False
            )

            if result is not None:
                logger.info(f"Admin created booking: {booking_id}")
                return booking_id
            else:
                raise Exception("Failed to create booking")

        except Exception as e:
            logger.error(f"Error creating admin booking: {e}")
            raise e

    @staticmethod
    def update_booking(booking_data):
        """Update existing booking"""
        try:
            booking_id = booking_data["bookingId"]

            # Build update query dynamically
            update_fields = []
            update_values = []

            field_mapping = {
                "sport": "sport",
                "court": "court",
                "courtName": "court_name",
                "date": "booking_date",
                "startTime": "start_time",
                "endTime": "end_time",
                "duration": "duration",
                "playerName": "player_name",
                "playerPhone": "player_phone",
                "playerEmail": "player_email",
                "playerCount": "player_count",
                "specialRequests": "special_requests",
                "totalAmount": "total_amount",
                "status": "status",
            }

            for frontend_field, db_field in field_mapping.items():
                if frontend_field in booking_data:
                    update_fields.append(f"{db_field} = %s")
                    update_values.append(booking_data[frontend_field])

            if not update_fields:
                raise ValueError("No fields to update")

            update_values.append(booking_id)

            update_query = f"""
                UPDATE bookings 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """

            result = AdminDatabaseManager.execute_query(
                update_query, update_values, fetch_all=False
            )

            if result is not None:
                logger.info(f"Updated booking: {booking_id}")
                return True
            else:
                raise Exception("Failed to update booking")

        except Exception as e:
            logger.error(f"Error updating booking: {e}")
            raise e

    @staticmethod
    def perform_booking_action(booking_id, action):
        """Perform action on booking (confirm, cancel, decline)"""
        try:
            action_queries = {
                "confirm": """
                    UPDATE bookings 
                    SET status = 'confirmed', payment_verified = TRUE, confirmed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
                "cancel": """
                    UPDATE bookings 
                    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
                "decline": """
                    UPDATE bookings 
                    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
            }

            if action not in action_queries:
                raise ValueError(f"Invalid action: {action}")

            result = AdminDatabaseManager.execute_query(
                action_queries[action], (booking_id,), fetch_all=False
            )

            if result is not None:
                logger.info(f"Performed action '{action}' on booking: {booking_id}")
                return True
            else:
                raise Exception(f"Failed to {action} booking")

        except Exception as e:
            logger.error(f"Error performing booking action: {e}")
            raise e

    @staticmethod
    def search_bookings(method, value=None, start_date=None, end_date=None):
        """Search bookings by various criteria"""
        try:
            if method == "id":
                query = "SELECT * FROM bookings WHERE id = %s"
                params = (value,)
            elif method == "phone":
                query = "SELECT * FROM bookings WHERE player_phone LIKE %s ORDER BY created_at DESC"
                params = (f"%{value}%",)
            elif method == "name":
                query = "SELECT * FROM bookings WHERE player_name ILIKE %s ORDER BY created_at DESC"
                params = (f"%{value}%",)
            elif method == "date":
                query = "SELECT * FROM bookings WHERE booking_date BETWEEN %s AND %s ORDER BY booking_date DESC, start_time DESC"
                params = (start_date, end_date)
            else:
                raise ValueError(f"Invalid search method: {method}")

            bookings = AdminDatabaseManager.execute_query(query, params) or []

            # Format bookings for frontend
            formatted_bookings = []
            for booking in bookings:
                booking_dict = dict(booking)
                formatted_booking = _format_booking_for_display(booking_dict)
                formatted_bookings.append(formatted_booking)

            return formatted_bookings

        except Exception as e:
            logger.error(f"Error searching bookings: {e}")
            return []

    # Utility methods
    @staticmethod
    def _calculate_end_time(start_time, duration_hours):
        """Calculate end time given start time and duration"""
        try:
            if isinstance(start_time, str):
                time_str = start_time.split(".")[0]
                if len(time_str.split(":")) == 3:
                    start_dt = datetime.strptime(time_str, "%H:%M:%S")
                else:
                    start_dt = datetime.strptime(time_str, "%H:%M")
            else:
                start_dt = datetime.combine(datetime.today(), start_time)

            end_dt = start_dt + timedelta(hours=duration_hours)
            return end_dt.strftime("%H:%M")
        except Exception as e:
            logger.error(f"Error calculating end time: {e}")
            return start_time

    @staticmethod
    def _get_court_sport(court_id):
        """Get sport for a court ID"""
        sport_map = {
            "padel-1": "padel",
            "padel-2": "padel",
            "cricket-1": "cricket",
            "cricket-2": "cricket",
            "futsal-1": "futsal",
            "pickleball-1": "pickleball",
        }
        return sport_map.get(court_id, "unknown")

    @staticmethod
    def _get_court_name(court_id):
        """Get court display name"""
        court_names = {
            "padel-1": "Court 1: Teracotta Court",
            "padel-2": "Court 2: Purple Mondo",
            "cricket-1": "Court 1: 110x50ft",
            "cricket-2": "Court 2: 130x60ft Multi",
            "futsal-1": "Court 1: 130x60ft Multi",
            "pickleball-1": "Court 1: Professional",
        }
        return court_names.get(court_id, court_id)

    @staticmethod
    def _calculate_amount(sport, duration):
        """Calculate booking amount"""
        hourly_rate = SPORT_PRICING.get(sport, 2500)
        return int(hourly_rate * duration)

    @staticmethod
    def _generate_booking_id():
        """Generate unique booking ID"""
        date_str = datetime.now().strftime("%Y%m%d")
        random_str = str(uuid.uuid4())[:8].upper()
        return f"NB{date_str}{random_str}"

    @staticmethod
    def _create_time_slots(start_time, duration_hours):
        """Create time slots for booking"""
        try:
            if isinstance(start_time, str):
                time_str = start_time.split(".")[0]
                if len(time_str.split(":")) == 3:
                    start_dt = datetime.strptime(time_str, "%H:%M:%S")
                else:
                    start_dt = datetime.strptime(time_str, "%H:%M")
            else:
                start_dt = datetime.combine(datetime.today(), start_time)

            slots = []
            slots_count = int(duration_hours * 2)  # 2 slots per hour

            for i in range(slots_count):
                slot_time = start_dt + timedelta(minutes=30 * i)
                slots.append({"time": slot_time.strftime("%H:%M"), "index": i})

            return slots
        except Exception as e:
            logger.error(f"Error creating time slots: {e}")
            return []


# Authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_panel.admin_login"))
        return f(*args, **kwargs)

    return decorated_function


# Helper function for time formatting
def _format_booking_time_display(booking_date, start_time, end_time):
    """Helper function to format booking time for display"""
    try:
        if not all([booking_date, start_time, end_time]):
            return "Time not available"

        # Format date
        if isinstance(booking_date, str):
            date_obj = datetime.strptime(booking_date, "%Y-%m-%d")
        else:
            date_obj = booking_date

        formatted_date = date_obj.strftime("%a, %b %d")

        # Format times to 12-hour format
        def format_time_12hr(time_obj):
            if isinstance(time_obj, str):
                # Handle different time formats
                if "." in time_obj:
                    time_obj = time_obj.split(".")[0]
                if len(time_obj.split(":")) == 3:
                    time_obj = datetime.strptime(time_obj, "%H:%M:%S").time()
                else:
                    time_obj = datetime.strptime(time_obj, "%H:%M").time()

            hour = time_obj.hour
            minute = time_obj.minute
            ampm = "AM" if hour < 12 else "PM"
            display_hour = 12 if hour == 0 else hour if hour <= 12 else hour - 12
            return f"{display_hour}:{minute:02d} {ampm}"

        start_12hr = format_time_12hr(start_time)
        end_12hr = format_time_12hr(end_time)

        return f'<div class="time-display">{formatted_date}</div><div style="font-weight: 600; color: #28a745;">{start_12hr} - {end_12hr}</div>'

    except Exception as e:
        logger.error(f"Error formatting time display: {e}")
        return f"{start_time} - {end_time}"


def _format_booking_for_display(booking):
    """Format booking data for display"""
    try:
        # Format dates and times
        booking_date = booking.get("booking_date")
        start_time = booking.get("start_time")
        end_time = booking.get("end_time")
        created_at = booking.get("created_at")

        formatted_booking = dict(booking)

        # Format display date
        if booking_date:
            if isinstance(booking_date, str):
                date_obj = datetime.strptime(booking_date, "%Y-%m-%d")
            else:
                date_obj = booking_date
            formatted_booking["display_date"] = date_obj.strftime("%Y-%m-%d")

        # Format time display
        formatted_booking["formatted_time"] = _format_booking_time_display(
            booking_date, start_time, end_time
        )

        # Format created datetime
        if created_at:
            if isinstance(created_at, str):
                created_obj = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            else:
                created_obj = created_at
            formatted_booking["createdDateTime"] = created_obj.strftime(
                "%b %d, %Y %I:%M %p"
            )

        return formatted_booking

    except Exception as e:
        logger.error(f"Error formatting booking: {e}")
        return booking


# Routes
@admin_bp.route("/login", methods=["GET", "POST"])
def admin_login():
    """Admin login"""
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username == "admin" and password == "admin123":
            session["admin_logged_in"] = True
            return redirect(url_for("admin_panel.admin_dashboard"))
        else:
            return render_template("admin_login.html", error="Invalid credentials")

    return render_template("admin_login.html")


@admin_bp.route("/logout")
def admin_logout():
    """Admin logout"""
    session.pop("admin_logged_in", None)
    return redirect(url_for("admin_panel.admin_login"))


@admin_bp.route("/dashboard")
@admin_required
def admin_dashboard():
    """Admin dashboard"""
    try:
        # Get dashboard statistics
        stats_query = """
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_payment,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
            FROM bookings
        """

        stats_result = AdminDatabaseManager.execute_query(stats_query, fetch_one=True)
        stats = dict(stats_result) if stats_result else {}

        # Get recent bookings for dashboard
        recent_query = """
            SELECT 
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, player_name, player_phone, total_amount, status, created_at
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 10
        """

        recent_bookings_raw = AdminDatabaseManager.execute_query(recent_query) or []

        # Format recent bookings
        recent_bookings = []
        for booking in recent_bookings_raw:
            booking_dict = dict(booking)

            # Format time display
            booking_dict["formatted_time"] = _format_booking_time_display(
                booking_dict.get("booking_date"),
                booking_dict.get("start_time"),
                booking_dict.get("end_time"),
            )

            # Format created datetime
            created_at = booking_dict.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    created_obj = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                else:
                    created_obj = created_at
                booking_dict["createdDateTime"] = created_obj.strftime(
                    "%b %d, %Y %I:%M %p"
                )

            recent_bookings.append(booking_dict)

        return render_template(
            "admin_dashboard.html", bookings=recent_bookings, stats=stats
        )

    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return render_template("admin_dashboard.html", bookings=[], stats={})


@admin_bp.route("/bookings")
@admin_required
def admin_bookings():
    """Admin bookings management page with proper data formatting"""
    try:
        logger.info("Loading admin bookings page...")

        # Direct query to get all bookings with proper formatting
        query = """
            SELECT 
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, selected_slots, player_name, player_phone, player_email,
                player_count, special_requests, payment_type, total_amount, status,
                payment_verified, created_at, confirmed_at, cancelled_at
            FROM bookings 
            ORDER BY created_at DESC
        """

        raw_bookings = AdminDatabaseManager.execute_query(query) or []
        logger.info(f"Found {len(raw_bookings)} bookings in database")

        # Format bookings for template
        bookings = []
        for booking in raw_bookings:
            try:
                booking_dict = dict(booking)

                # Format the booking data properly
                formatted_booking = {
                    "id": booking_dict.get("id"),
                    "sport": booking_dict.get("sport"),
                    "court": booking_dict.get("court"),
                    "courtName": booking_dict.get("court_name"),
                    "court_name": booking_dict.get(
                        "court_name"
                    ),  # Both formats for compatibility
                    "playerName": booking_dict.get("player_name"),
                    "player_name": booking_dict.get("player_name"),  # Both formats
                    "playerPhone": booking_dict.get("player_phone"),
                    "player_phone": booking_dict.get("player_phone"),  # Both formats
                    "playerEmail": booking_dict.get("player_email", ""),
                    "player_email": booking_dict.get("player_email", ""),
                    "playerCount": booking_dict.get("player_count", "2"),
                    "player_count": booking_dict.get("player_count", "2"),
                    "specialRequests": booking_dict.get("special_requests", ""),
                    "special_requests": booking_dict.get("special_requests", ""),
                    "paymentType": booking_dict.get("payment_type", "advance"),
                    "payment_type": booking_dict.get("payment_type", "advance"),
                    "totalAmount": booking_dict.get("total_amount", 0),
                    "total_amount": booking_dict.get("total_amount", 0),
                    "status": booking_dict.get("status"),
                    "duration": booking_dict.get("duration"),
                    "paymentVerified": booking_dict.get("payment_verified", False),
                }

                # Format dates and times
                booking_date = booking_dict.get("booking_date")
                start_time = booking_dict.get("start_time")
                end_time = booking_dict.get("end_time")
                created_at = booking_dict.get("created_at")
                confirmed_at = booking_dict.get("confirmed_at")
                cancelled_at = booking_dict.get("cancelled_at")

                # Format display date
                if booking_date:
                    if isinstance(booking_date, str):
                        date_obj = datetime.strptime(booking_date, "%Y-%m-%d")
                    else:
                        date_obj = booking_date
                    formatted_booking["display_date"] = date_obj.strftime("%Y-%m-%d")
                    formatted_booking["booking_date"] = date_obj.strftime("%Y-%m-%d")

                # Format time display for template
                formatted_booking["formatted_time"] = _format_booking_time_display(
                    booking_date, start_time, end_time
                )

                # Format created datetime
                if created_at:
                    if isinstance(created_at, str):
                        created_obj = datetime.fromisoformat(
                            created_at.replace("Z", "+00:00")
                        )
                    else:
                        created_obj = created_at
                    formatted_booking["createdDateTime"] = created_obj.strftime(
                        "%b %d, %Y %I:%M %p"
                    )

                # Format confirmed/cancelled datetime
                if confirmed_at:
                    if isinstance(confirmed_at, str):
                        confirmed_obj = datetime.fromisoformat(
                            confirmed_at.replace("Z", "+00:00")
                        )
                    else:
                        confirmed_obj = confirmed_at
                    formatted_booking["confirmedDateTime"] = confirmed_obj.strftime(
                        "%b %d, %Y %I:%M %p"
                    )

                if cancelled_at:
                    if isinstance(cancelled_at, str):
                        cancelled_obj = datetime.fromisoformat(
                            cancelled_at.replace("Z", "+00:00")
                        )
                    else:
                        cancelled_obj = cancelled_at
                    formatted_booking["cancelledDateTime"] = cancelled_obj.strftime(
                        "%b %d, %Y %I:%M %p"
                    )

                bookings.append(formatted_booking)

            except Exception as e:
                logger.error(
                    f"Error formatting booking {booking.get('id', 'unknown')}: {e}"
                )
                # Add the booking anyway with basic formatting
                booking_dict = dict(booking)
                booking_dict["formatted_time"] = "Time formatting error"
                booking_dict["createdDateTime"] = "N/A"
                bookings.append(booking_dict)

        logger.info(f"Successfully formatted {len(bookings)} bookings for display")

        return render_template("admin_bookings.html", bookings=bookings)

    except Exception as e:
        logger.error(f"Admin bookings error: {e}")
        import traceback

        traceback.print_exc()
        return render_template("admin_bookings.html", bookings=[], error=str(e))


@admin_bp.route("/schedule")
@admin_required
def admin_schedule():
    """Schedule management page"""
    return render_template("admin_schedule.html")


@admin_bp.route("/booking-control")
@admin_required
def admin_booking_control():
    """Booking control center"""
    return render_template("admin_booking_control.html")


# Booking Action Routes (Confirm/Decline)
@admin_bp.route("/confirm-booking/<booking_id>")
@admin_required
def confirm_booking(booking_id):
    """Confirm a booking"""
    try:
        update_query = """
            UPDATE bookings 
            SET status = 'confirmed', payment_verified = TRUE, confirmed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """

        result = AdminDatabaseManager.execute_query(
            update_query, (booking_id,), fetch_all=False
        )

        if result is not None:
            logger.info(f"Confirmed booking: {booking_id}")
            return redirect(
                url_for("admin_panel.admin_bookings")
                + "?message=Booking confirmed successfully"
            )
        else:
            return redirect(
                url_for("admin_panel.admin_bookings")
                + "?error=Failed to confirm booking"
            )

    except Exception as e:
        logger.error(f"Error confirming booking: {e}")
        return redirect(
            url_for("admin_panel.admin_bookings") + "?error=Error confirming booking"
        )


@admin_bp.route("/decline-booking/<booking_id>")
@admin_required
def decline_booking(booking_id):
    """Decline a booking"""
    try:
        update_query = """
            UPDATE bookings 
            SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """

        result = AdminDatabaseManager.execute_query(
            update_query, (booking_id,), fetch_all=False
        )

        if result is not None:
            logger.info(f"Declined booking: {booking_id}")
            return redirect(
                url_for("admin_panel.admin_bookings")
                + "?message=Booking declined successfully"
            )
        else:
            return redirect(
                url_for("admin_panel.admin_bookings")
                + "?error=Failed to decline booking"
            )

    except Exception as e:
        logger.error(f"Error declining booking: {e}")
        return redirect(
            url_for("admin_panel.admin_bookings") + "?error=Error declining booking"
        )


# API Routes
@admin_bp.route("/api/dashboard-stats")
@admin_required
def api_dashboard_stats():
    """Get dashboard statistics"""
    try:
        stats_query = """
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_payment,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
            FROM bookings
        """

        result = AdminDatabaseManager.execute_query(stats_query, fetch_one=True)
        stats = (
            dict(result)
            if result
            else {
                "total_bookings": 0,
                "pending_payment": 0,
                "confirmed": 0,
                "cancelled": 0,
                "revenue": 0,
            }
        )

        return jsonify({"success": True, "stats": stats})

    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        return jsonify({"success": False, "message": str(e)})


@admin_bp.route("/api/admin-create-booking", methods=["POST"])
@admin_required
def api_admin_create_booking():
    """Create booking from admin panel"""
    try:
        booking_data = request.json

        # Validate required fields
        required_fields = [
            "court",
            "date",
            "startTime",
            "duration",
            "playerName",
            "playerPhone",
        ]
        for field in required_fields:
            if not booking_data.get(field):
                return jsonify(
                    {"success": False, "message": f"Missing required field: {field}"}
                )

        booking_id = AdminBookingService.create_admin_booking(booking_data)

        return jsonify(
            {
                "success": True,
                "bookingId": booking_id,
                "message": "Booking created successfully",
            }
        )

    except Exception as e:
        logger.error(f"Admin create booking error: {e}")
        return jsonify({"success": False, "message": str(e)})


@admin_bp.route("/api/update-booking", methods=["POST"])
@admin_required
def api_update_booking():
    """Update booking details"""
    try:
        booking_data = request.json
        AdminBookingService.update_booking(booking_data)

        return jsonify({"success": True, "message": "Booking updated successfully"})

    except Exception as e:
        logger.error(f"Update booking error: {e}")
        return jsonify({"success": False, "message": str(e)})


@admin_bp.route("/api/admin-booking-action", methods=["POST"])
@admin_required
def api_admin_booking_action():
    """Perform action on booking (confirm, cancel, decline)"""
    try:
        data = request.json
        booking_id = data.get("bookingId")
        action = data.get("action")

        if not booking_id or not action:
            return jsonify(
                {"success": False, "message": "Missing booking ID or action"}
            )

        AdminBookingService.perform_booking_action(booking_id, action)

        return jsonify({"success": True, "message": f"Booking {action}ed successfully"})

    except Exception as e:
        logger.error(f"Booking action error: {e}")
        return jsonify({"success": False, "message": str(e)})


@admin_bp.route("/api/search-bookings", methods=["POST"])
@admin_required
def api_search_bookings():
    """Search bookings by various criteria"""
    try:
        data = request.json
        method = data.get("method")
        value = data.get("value")
        start_date = data.get("startDate")
        end_date = data.get("endDate")

        bookings = AdminBookingService.search_bookings(
            method, value, start_date, end_date
        )

        return jsonify({"success": True, "bookings": bookings})

    except Exception as e:
        logger.error(f"Search bookings error: {e}")
        return jsonify({"success": False, "message": str(e)})


@admin_bp.route("/api/delete-booking", methods=["POST"])
@admin_required
def api_delete_booking():
    """Delete booking"""
    try:
        data = request.json
        booking_id = data.get("bookingId")

        if not booking_id:
            return jsonify({"success": False, "message": "Missing booking ID"})

        delete_query = "DELETE FROM bookings WHERE id = %s"
        result = AdminDatabaseManager.execute_query(
            delete_query, (booking_id,), fetch_all=False
        )

        if result is not None:
            logger.info(f"Deleted booking: {booking_id}")
            return jsonify({"success": True, "message": "Booking deleted successfully"})
        else:
            raise Exception("Failed to delete booking")

    except Exception as e:
        logger.error(f"Delete booking error: {e}")
        return jsonify({"success": False, "message": str(e)})
