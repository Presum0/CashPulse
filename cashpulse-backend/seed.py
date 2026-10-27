#!/usr/bin/env python3
"""CLI script to seed CashPulse database with realistic synthetic data."""
import argparse
import sys
from sqlmodel import Session

from app.database import engine, create_db_and_tables
from app.services.generator import seed_all


def main():
    parser = argparse.ArgumentParser(description="Seed CashPulse database with synthetic demo data.")
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for deterministic generation (default: 42)",
    )
    args = parser.parse_args()

    print(f"[*] Initializing database tables...")
    create_db_and_tables()

    print(f"[*] Seeding data with seed={args.seed}...")
    with Session(engine) as session:
        result = seed_all(session=session, seed_value=args.seed)

    print("\n[✓] Seeding completed successfully!")
    print(f"    - Organizations:       {result['organizations']}")
    print(f"    - Invoices:            {result['invoices']}")
    print(f"    - Bank Transactions:   {result['bank_transactions']}")
    print(f"    - Daily Cash Snapshots:{result['daily_snapshots']}")


if __name__ == "__main__":
    main()
