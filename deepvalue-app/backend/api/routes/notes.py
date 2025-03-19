from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from models.database import get_db
from models.schemas import NoteCreate, NoteResponse, NoteUpdate
from models.models import Note
from services.auth_service import get_current_user

router = APIRouter()

@router.post("/notes", response_model=NoteResponse)
def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new note
    """
    db_note = Note(
        title=note.title,
        content=note.content,
        company_symbol=note.company_symbol,
        user_id=current_user.id
    )
    
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@router.get("/notes", response_model=List[NoteResponse])
def get_user_notes(
    company_symbol: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all notes for the current user, optionally filtered by company symbol
    """
    query = db.query(Note).filter(Note.user_id == current_user.id)
    
    if company_symbol:
        query = query.filter(Note.company_symbol == company_symbol)
    
    notes = query.order_by(Note.created_at.desc()).all()
    return notes

@router.get("/notes/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get a specific note by ID
    """
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    return note

@router.put("/notes/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    note_update: NoteUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update a note
    """
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not db_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    for key, value in note_update.dict(exclude_unset=True).items():
        setattr(db_note, key, value)
    
    db_note.updated_at = datetime.now()
    db.commit()
    db.refresh(db_note)
    return db_note

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete a note
    """
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not db_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    db.delete(db_note)
    db.commit()
    return None
