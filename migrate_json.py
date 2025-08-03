# migration_script.py
import json
import psycopg2
from datetime import datetime


def migrate_json_to_postgres():
    # Load JSON data
    with open("data/bookings.json", "r") as f:
        bookings = json.load(f)

    # Connect to database
    conn = psycopg2.connect(
        host="localhost",
        database="noball_sports",
        user="postgres",
        password="admin@123",
    )

    cursor = conn.cursor()

    for booking in bookings:
        # Insert each booking
        cursor.execute(
            """
            INSERT INTO bookings (id, sport, court, court_name, ...)
            VALUES (%s, %s, %s, %s, ...)
        """,
            (...),
        )

    conn.commit()
    cursor.close()
    conn.close()
