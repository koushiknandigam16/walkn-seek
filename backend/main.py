from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date
import sqlite3

app = FastAPI(title="Walk'n Seek API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "walkins.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS walkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL,
            role TEXT NOT NULL,
            location TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            eligibility TEXT NOT NULL,
            skills TEXT NOT NULL,
            venue TEXT NOT NULL,
            contact_info TEXT,
            posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class WalkInCreate(BaseModel):
    company: str
    role: str
    location: str
    date: str
    time: str
    eligibility: str
    skills: str
    venue: str
    contact_info: Optional[str] = "N/A"

def cleanup_expired_walkins():
    """Automatically purge drives where drive date is strictly before today."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    cursor.execute("DELETE FROM walkins WHERE date < ?", (today_str,))
    conn.commit()
    conn.close()

@app.get("/api/walkins")
def get_walkins(
    location: Optional[str] = None,
    role: Optional[str] = None,
    eligibility: Optional[str] = None,
    search: Optional[str] = None
):
    cleanup_expired_walkins()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM walkins WHERE 1=1"
    params = []

    if location and location != "All":
        query += " AND LOWER(location) LIKE LOWER(?)"
        params.append(f"%{location}%")
    if role and role != "All":
        query += " AND LOWER(role) LIKE LOWER(?)"
        params.append(f"%{role}%")
    if eligibility and eligibility != "All":
        query += " AND LOWER(eligibility) LIKE LOWER(?)"
        params.append(f"%{eligibility}%")
    if search:
        query += " AND (LOWER(company) LIKE LOWER(?) OR LOWER(skills) LIKE LOWER(?) OR LOWER(role) LIKE LOWER(?))"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    query += " ORDER BY date ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]

@app.post("/api/walkins")
def create_walkin(walkin: WalkInCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO walkins (company, role, location, date, time, eligibility, skills, venue, contact_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        walkin.company, walkin.role, walkin.location, walkin.date,
        walkin.time, walkin.eligibility, walkin.skills, walkin.venue, walkin.contact_info
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"message": "Walk-in posted successfully!", "id": new_id}

@app.put("/api/walkins/{walkin_id}")
def update_walkin(walkin_id: int, walkin: WalkInCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE walkins
        SET company=?, role=?, location=?, date=?, time=?, eligibility=?, skills=?, venue=?, contact_info=?
        WHERE id=?
    ''', (
        walkin.company, walkin.role, walkin.location, walkin.date,
        walkin.time, walkin.eligibility, walkin.skills, walkin.venue, walkin.contact_info,
        walkin_id
    ))
    conn.commit()
    rows = cursor.rowcount
    conn.close()
    if rows == 0:
        raise HTTPException(status_code=404, detail="Walk-in not found")
    return {"message": "Walk-in drive updated successfully!"}

@app.delete("/api/walkins/{walkin_id}")
def delete_walkin(walkin_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM walkins WHERE id = ?", (walkin_id,))
    conn.commit()
    rows = cursor.rowcount
    conn.close()
    if rows == 0:
        raise HTTPException(status_code=404, detail="Walk-in not found")
    return {"message": "Walk-in drive deleted successfully!"}