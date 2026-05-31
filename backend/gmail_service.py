import os
from typing import List, Dict, Any
from google.oauth2.credentials import Credentials
import googleapiclient.discovery
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
CLIENT_SECRETS_FILE = "client_secret_1094612824316-lpcv82f88m8e84gnnho5q0hsp00quhv2.apps.googleusercontent.com.json"

class GmailService:
    def __init__(self, email: str):
        self.email = email
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.creds = self._get_credentials()
        self.service = googleapiclient.discovery.build('gmail', 'v1', credentials=self.creds)

    def _get_credentials(self) -> Credentials:
        response = self.supabase.table("user_tokens").select("*").eq("email", self.email).execute()
        if not response.data:
            raise Exception("No tokens found for user")
            
        token_data = response.data[0]
        
        # Load client secret data to get client_id and client_secret
        import json
        with open(CLIENT_SECRETS_FILE, 'r') as f:
            secrets = json.load(f)["web"]
            
        return Credentials(
            token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=secrets.get("token_uri"),
            client_id=secrets.get("client_id"),
            client_secret=secrets.get("client_secret"),
            scopes=['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']
        )

    def fetch_unread_primary_emails(self, max_results=10) -> List[Dict[str, Any]]:
        """Fetches unread emails from the Primary category."""
        query = "is:unread category:primary"
        
        try:
            results = self.service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            parsed_emails = []
            for msg in messages:
                msg_id = msg['id']
                thread_id = msg['threadId']
                
                # Fetch full message
                full_msg = self.service.users().messages().get(userId='me', id=msg_id, format='full').execute()
                
                # Parse headers
                headers = full_msg.get('payload', {}).get('headers', [])
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown Sender')
                date = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')
                message_id_header = next((h['value'] for h in headers if h['name'].lower() == 'message-id'), '')
                
                # Parse body (simplified for plain text)
                body = ""
                parts = full_msg.get('payload', {}).get('parts', [])
                if parts:
                    for part in parts:
                        if part['mimeType'] == 'text/plain':
                            import base64
                            data = part.get('body', {}).get('data', '')
                            if data:
                                body = base64.urlsafe_b64decode(data).decode('utf-8')
                            break
                else:
                    data = full_msg.get('payload', {}).get('body', {}).get('data', '')
                    if data:
                        import base64
                        body = base64.urlsafe_b64decode(data).decode('utf-8')
                        
                parsed_emails.append({
                    "id": msg_id,
                    "thread_id": thread_id,
                    "subject": subject,
                    "sender": sender,
                    "date": date,
                    "body": body,
                    "message_id_header": message_id_header
                })
                
            return parsed_emails
            
        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []

    def send_reply(self, to_email: str, subject: str, body: str, thread_id: str, message_id_header: str) -> dict:
        """Sends an email reply to a thread."""
        import base64
        from email.mime.text import MIMEText
        
        # Construct MIME message
        message = MIMEText(body)
        message['to'] = to_email
        message['subject'] = subject
        
        # Thread headers for proper grouping
        if message_id_header:
            message['In-Reply-To'] = message_id_header
            message['References'] = message_id_header
            
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        body_payload = {
            'raw': raw_message,
            'threadId': thread_id
        }
        
        try:
            send_response = self.service.users().messages().send(userId='me', body=body_payload).execute()
            return send_response
        except Exception as e:
            print(f"Error sending email reply: {e}")
            raise e
