from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
from datetime import datetime, timedelta
import json
import uuid

app = Flask(__name__)
app.secret_key = "your-secret-key-here"  # Change this to a random secret key

# Create data directory if it doesn't exist
if not os.path.exists("data"):
    os.makedirs("data")

# Court mapping for multi-purpose courts
MULTI_PURPOSE_COURTS = {
    "cricket-2": "multi-130x60",  # Cricket Court 2 (130x60ft)
    "futsal-1": "multi-130x60",  # Futsal Court 1 (130x60ft)
}


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

        # Load existing bookings
        bookings_file = "data/bookings.json"
        bookings = []

        if os.path.exists(bookings_file):
            try:
                with open(bookings_file, "r") as f:
                    bookings = json.load(f)
            except json.JSONDecodeError:
                bookings = []

        # Get booked slots for the specific court and date
        booked_slots = []

        for booking in bookings:
            if booking.get("status") == "confirmed" and booking.get("date") == date:
                booking_court = booking.get("court")

                # Check for multi-purpose court conflicts
                if (
                    court in MULTI_PURPOSE_COURTS
                    and booking_court in MULTI_PURPOSE_COURTS
                ):
                    # Both courts use the same physical space
                    if (
                        MULTI_PURPOSE_COURTS[court]
                        == MULTI_PURPOSE_COURTS[booking_court]
                    ):
                        booked_slots.append(booking.get("time"))
                elif booking_court == court:
                    booked_slots.append(booking.get("time"))

        return jsonify(booked_slots)

    except Exception as e:
        print(f"Error getting booked slots: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/create-booking", methods=["POST"])
def create_booking():
    """Create a new booking"""
    try:
        booking_data = request.json

        # Validate required fields
        required_fields = [
            "sport",
            "court",
            "date",
            "time",
            "playerName",
            "playerPhone",
        ]
        for field in required_fields:
            if not booking_data.get(field):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Missing required field: {field}",
                        }
                    ),
                    400,
                )

        # Generate booking ID
        booking_id = generate_booking_id()

        # Create booking record
        booking = {
            "id": booking_id,
            "sport": booking_data["sport"],
            "court": booking_data["court"],
            "courtName": booking_data["courtName"],
            "date": booking_data["date"],
            "time": booking_data["time"],
            "playerName": booking_data["playerName"],
            "playerPhone": booking_data["playerPhone"],
            "playerEmail": booking_data.get("playerEmail", ""),
            "playerCount": booking_data.get("playerCount", "2"),
            "specialRequests": booking_data.get("specialRequests", ""),
            "paymentType": booking_data.get("paymentType", "advance"),
            "totalAmount": booking_data.get("totalAmount", 2500),
            "status": "pending_payment",  # pending_payment, confirmed, cancelled
            "createdAt": datetime.now().isoformat(),
            "paymentVerified": False,
        }

        # Check for conflicts before saving
        if is_slot_available(booking["court"], booking["date"], booking["time"]):
            # Save booking
            bookings_file = "data/bookings.json"
            bookings = []

            # Load existing bookings
            if os.path.exists(bookings_file):
                try:
                    with open(bookings_file, "r") as f:
                        bookings = json.load(f)
                except json.JSONDecodeError:
                    bookings = []

            # Add new booking
            bookings.append(booking)

            # Save updated bookings
            with open(bookings_file, "w") as f:
                json.dump(bookings, f, indent=2)

            return jsonify({"success": True, "bookingId": booking_id})
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Selected time slot is no longer available",
                    }
                ),
                409,
            )

    except Exception as e:
        print(f"Error creating booking: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


def is_slot_available(court, date, time):
    """Check if a time slot is available for booking"""
    bookings_file = "data/bookings.json"

    if not os.path.exists(bookings_file):
        return True

    try:
        with open(bookings_file, "r") as f:
            bookings = json.load(f)
    except json.JSONDecodeError:
        return True

    for booking in bookings:
        if (
            booking.get("status") in ["confirmed", "pending_payment"]
            and booking.get("date") == date
            and booking.get("time") == time
        ):

            booking_court = booking.get("court")

            # Check for multi-purpose court conflicts
            if court in MULTI_PURPOSE_COURTS and booking_court in MULTI_PURPOSE_COURTS:
                if MULTI_PURPOSE_COURTS[court] == MULTI_PURPOSE_COURTS[booking_court]:
                    return False
            elif booking_court == court:
                return False

    return True


def generate_booking_id():
    """Generate a unique booking ID"""
    date = datetime.now()
    date_str = date.strftime("%Y%m%d")
    random_str = str(uuid.uuid4())[:8].upper()
    return f"NB{date_str}{random_str}"


@app.route("/admin/bookings")
def admin_bookings():
    """Admin route to view all bookings"""
    try:
        bookings_file = "data/bookings.json"
        bookings = []

        if os.path.exists(bookings_file):
            with open(bookings_file, "r") as f:
                bookings = json.load(f)

        # Sort by creation date (newest first)
        bookings.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return render_template("admin_bookings.html", bookings=bookings)

    except Exception as e:
        print(f"Error loading bookings: {e}")
        return "Error loading bookings", 500


@app.route("/admin/confirm-booking/<booking_id>")
def confirm_booking(booking_id):
    """Admin route to confirm a booking"""
    try:
        bookings_file = "data/bookings.json"
        bookings = []

        if os.path.exists(bookings_file):
            with open(bookings_file, "r") as f:
                bookings = json.load(f)

        # Find and update booking
        for booking in bookings:
            if booking["id"] == booking_id:
                booking["status"] = "confirmed"
                booking["paymentVerified"] = True
                booking["confirmedAt"] = datetime.now().isoformat()
                break

        # Save updated bookings
        with open(bookings_file, "w") as f:
            json.dump(bookings, f, indent=2)

        return redirect(url_for("admin_bookings"))

    except Exception as e:
        print(f"Error confirming booking: {e}")
        return "Error confirming booking", 500


@app.route("/admin/decline-booking/<booking_id>")
def decline_booking(booking_id):
    """Admin route to decline a booking"""
    try:
        bookings_file = "data/bookings.json"
        bookings = []

        if os.path.exists(bookings_file):
            with open(bookings_file, "r") as f:
                bookings = json.load(f)

        # Find and update booking
        for booking in bookings:
            if booking["id"] == booking_id:
                booking["status"] = "cancelled"
                booking["cancelledAt"] = datetime.now().isoformat()
                break

        # Save updated bookings
        with open(bookings_file, "w") as f:
            json.dump(bookings, f, indent=2)

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

        # Create contact entry
        contact_data = {
            "timestamp": datetime.now().isoformat(),
            "name": name,
            "email": email,
            "phone": phone,
            "sport": sport,
            "message": message,
        }

        # Save to file (in production, use a proper database)
        contacts_file = "data/contacts.json"
        contacts = []

        # Load existing contacts
        if os.path.exists(contacts_file):
            try:
                with open(contacts_file, "r") as f:
                    contacts = json.load(f)
            except json.JSONDecodeError:
                contacts = []

        # Add new contact
        contacts.append(contact_data)

        # Save updated contacts
        with open(contacts_file, "w") as f:
            json.dump(contacts, f, indent=2)

        # Here you could also send an email notification
        # send_email_notification(contact_data)

        return jsonify(
            {"success": True, "message": "Contact form submitted successfully"}
        )

    except Exception as e:
        print(f"Error processing contact form: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@app.route("/admin/contacts")
def admin_contacts():
    """Admin route to view contact submissions (add authentication in production)"""
    try:
        contacts_file = "data/contacts.json"
        contacts = []

        if os.path.exists(contacts_file):
            with open(contacts_file, "r") as f:
                contacts = json.load(f)

        # Sort by timestamp (newest first)
        contacts.sort(key=lambda x: x["timestamp"], reverse=True)

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


# Optional: Email notification function
def send_email_notification(contact_data):
    """
    Send email notification when a new contact form is submitted
    Configure with your email service (Gmail, SendGrid, etc.)
    """
    # Example using Flask-Mail:
    # from flask_mail import Mail, Message
    #
    # msg = Message(
    #     subject=f"New Contact Form Submission from {contact_data['name']}",
    #     recipients=['info@noballsports.com'],
    #     body=f"""
    #     New contact form submission:
    #
    #     Name: {contact_data['name']}
    #     Email: {contact_data['email']}
    #     Phone: {contact_data['phone']}
    #     Sport Interest: {contact_data['sport']}
    #     Message: {contact_data['message']}
    #
    #     Submitted at: {contact_data['timestamp']}
    #     """
    # )
    # mail.send(msg)
    pass


if __name__ == "__main__":
    # Development server
    app.run(debug=True, host="0.0.0.0", port=5001)

    # For production, use:
    # app.run(debug=False, host='0.0.0.0', port=80)
