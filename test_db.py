import psycopg2

# Test different configurations
test_configs = [
    {
        "host": "localhost",
        "database": "noball_sports",
        "user": "postgres",
        "password": "admin@123",
        "port": "5432",
    },
    {
        "host": "localhost",
        "database": "noball_sports",
        "user": "postgres",
        "password": "postgres",
        "port": "5432",
    },
    {
        "host": "localhost",
        "database": "noball_sports",
        "user": "hamza",
        "password": "",
        "port": "5432",
    },
]

print("Testing database connections...\n")

for i, config in enumerate(test_configs, 1):
    try:
        print(
            f"Test {i}: Trying user='{config['user']}', password={'(empty)' if not config['password'] else '(set)'}"
        )

        conn = psycopg2.connect(**config)
        cursor = conn.cursor()

        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()

        print(f"✅ SUCCESS! Connected to PostgreSQL")
        print(f"   Version: {version[0][:50]}...")

        cursor.close()
        conn.close()

        print(f"\n🎉 Use this configuration:")
        print(f"DATABASE_CONFIG = {config}")
        break

    except psycopg2.OperationalError as e:
        print(f"❌ Connection failed: {e}")
    except Exception as e:
        print(f"❌ Other error: {e}")

    print("-" * 50)

else:
    print("\n😞 All connection attempts failed.")
    print("Check if:")
    print("1. PostgreSQL is running")
    print("2. Database 'noball_sports' exists")
    print("3. User credentials are correct")
