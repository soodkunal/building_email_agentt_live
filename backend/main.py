import os
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
import googleapiclient.discovery
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    gemini_client = None

load_dotenv()

app = FastAPI(title="Email Reply Agent API")

# Allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
else:
    supabase = None

# OAuth 2.0 configuration
CLIENT_SECRETS_FILE = "client_secret_1094612824316-lpcv82f88m8e84gnnho5q0hsp00quhv2.apps.googleusercontent.com.json"
SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

class AuthCallback(BaseModel):
    code: str
    code_verifier: str

@app.get("/api/auth/url")
def get_auth_url():
    """Generates the Google OAuth consent URL."""
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise HTTPException(status_code=500, detail="Client secrets file not found.")
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri='http://localhost:3000/api/auth/callback/google'
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return {"url": authorization_url, "code_verifier": flow.code_verifier}

@app.post("/api/auth/callback")
def auth_callback(payload: AuthCallback):
    """Exchanges the authorization code for tokens and saves to Supabase."""
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri='http://localhost:3000/api/auth/callback/google'
        )
        flow.fetch_token(code=payload.code, code_verifier=payload.code_verifier)
        credentials = flow.credentials
        
        # Get user email
        user_info_service = googleapiclient.discovery.build('oauth2', 'v2', credentials=credentials)
        user_info = user_info_service.userinfo().get().execute()
        email = user_info.get('email')
        
        # Store in Supabase
        if supabase:
            token_data = {
                "email": email,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "expires_at": credentials.expiry.isoformat() if credentials.expiry else None
            }
            # Upsert token (we assume single user for now or handle via email match)
            # Find if user exists
            response = supabase.table("user_tokens").select("*").eq("email", email).execute()
            if response.data:
                supabase.table("user_tokens").update(token_data).eq("email", email).execute()
            else:
                supabase.table("user_tokens").insert(token_data).execute()
        
        return {"success": True, "email": email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/emails")
def get_emails(email: str):
    """Fetches unread emails for the given authenticated user email."""
    import traceback
    try:
        from backend.gmail_service import GmailService
        service = GmailService(email)
        emails = service.fetch_unread_primary_emails()
        return {"success": True, "emails": emails}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class EmailDraftRequest(BaseModel):
    id: str
    thread_id: str
    subject: str
    sender: str
    body: str

@app.post("/api/emails/draft")
def generate_draft(payload: EmailDraftRequest):
    """Generates a context-aware draft reply using RAG and Gemini."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured.")
        
    try:
        # Generate embedding for the incoming email body
        if not gemini_client:
            raise Exception("Gemini client not initialized. Check GEMINI_API_KEY in .env")
            
        embed_response = gemini_client.models.embed_content(
            model='gemini-embedding-2',
            contents=payload.body,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        query_embedding = embed_response.embeddings[0].values
        
        # Search match_knowledge_base in Supabase
        match_response = supabase.rpc("match_knowledge_base", {
            "query_embedding": query_embedding,
            "match_threshold": 0.3,
            "match_count": 2
        }).execute()
        
        contexts = match_response.data or []

        # Check if draft already exists
        response = supabase.table("drafted_emails").select("*").eq("email_id", payload.id).execute()
        if response.data:
            return {"success": True, "draft": response.data[0], "contexts": contexts}
            
        context_str = ""
        for item in contexts:
            context_str += f"- Content: {item.get('content')}\n"
            
        # Build prompt
        prompt = f"""You are a professional assistant drafting an email reply.
Below is the content of an incoming email, and some context from our company's knowledge base containing relevant handling guidelines and past examples.

INCOMING EMAIL:
From: {payload.sender}
Subject: {payload.subject}
Body: {payload.body}

KNOWLEDGE BASE CONTEXT:
{context_str}

Task:
Draft a polite, professional, and helpful reply to the email.
- Ensure the tone matches the context.
- Keep the reply concise and professional.
- Do not invent facts not supported by the context or email.
- Provide ONLY the body of the reply. Do not include subject line or placeholders like "[Your Name]". Sign off as "Support Team".
"""
        
        # Generate draft
        gen_response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        draft_text = gen_response.text or "Could not generate reply draft."
        
        # Save to database
        draft_data = {
            "email_id": payload.id,
            "thread_id": payload.thread_id,
            "recipient": payload.sender,
            "subject": f"Re: {payload.subject}" if not payload.subject.lower().startswith("re:") else payload.subject,
            "body": payload.body,
            "original_draft": draft_text,
            "status": "draft"
        }
        
        insert_response = supabase.table("drafted_emails").insert(draft_data).execute()
        db_draft = insert_response.data[0] if insert_response.data else draft_data
        
        return {"success": True, "draft": db_draft, "contexts": contexts}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SendEmailRequest(BaseModel):
    user_email: str
    email_id: str
    thread_id: str
    recipient: str
    subject: str
    body: str
    message_id_header: str

@app.post("/api/emails/send")
def send_email(payload: SendEmailRequest):
    """Sends the approved email reply via the Gmail API."""
    from backend.gmail_service import GmailService
    try:
        service = GmailService(payload.user_email)
        send_response = service.send_reply(
            to_email=payload.recipient,
            subject=payload.subject,
            body=payload.body,
            thread_id=payload.thread_id,
            message_id_header=payload.message_id_header
        )
        
        # Update draft status in Supabase to 'sent'
        if supabase:
            supabase.table("drafted_emails").update({
                "status": "sent",
                "final_sent": payload.body,
                "sent_at": "now()"
            }).eq("email_id", payload.email_id).execute()
            
        return {"success": True, "send_response": send_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FeedbackRequest(BaseModel):
    draft_id: str
    rating: int
    comment: str = ""

@app.post("/api/emails/feedback")
def submit_feedback(payload: FeedbackRequest):
    """Saves user feedback/rating for a draft reply."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured.")
    try:
        feedback_data = {
            "draft_id": payload.draft_id,
            "rating": payload.rating,
            "comment": payload.comment
        }
        response = supabase.table("feedback").insert(feedback_data).execute()
        return {"success": True, "feedback": response.data[0] if response.data else feedback_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
