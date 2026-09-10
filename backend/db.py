from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    registration_date = Column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    work_code = Column(String, unique=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    category = Column(String)
    constituency_id = Column(String)
    house = Column(String)          # "Lok Sabha" or "Rajya Sabha" — from your two CSVs
    vendor_id = Column(Integer)
    sanctioned_amount = Column(Float, default=0.0)
    released_amount = Column(Float, default=0.0)
    utilized_amount = Column(Float, default=0.0)
    sanction_date = Column(DateTime)
    expected_completion_date = Column(DateTime)
    physical_progress_pct = Column(Float, default=0.0)
    latitude = Column(Float)
    longitude = Column(Float)
    district = Column(String)
    status = Column(String, default="ongoing")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()