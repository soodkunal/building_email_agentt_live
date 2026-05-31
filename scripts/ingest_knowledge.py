import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not GEMINI_API_KEY:
    print("Error: Please set SUPABASE_URL, SUPABASE_ANON_KEY, and GEMINI_API_KEY in .env")
    exit(1)

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
# Using google-genai SDK
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

def get_embedding(text: str) -> list[float]:
    """Get text embedding from Gemini."""
    try:
        response = gemini_client.models.embed_content(
            model='text-embedding-004',
            contents=text,
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return []

def main():
    csv_file = "dummy_data.csv"
    if not os.path.exists(csv_file):
        print(f"{csv_file} not found.")
        return

    print(f"Loading data from {csv_file}...")
    import csv
    rows = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader1 = csv.reader(f)
        for line_list in reader1:
            if not line_list:
                continue
            line_str = line_list[0]
            reader2 = csv.reader([line_str])
            row = next(reader2)
            rows.append(row)
    df = pd.DataFrame(rows[1:], columns=rows[0])
    
    # Process only non-empty bodies
    df = df.dropna(subset=['body'])
    
    records_to_insert = []
    
    print(f"Processing {len(df)} emails for embeddings...")
    for index, row in df.iterrows():
        subject = str(row.get('subject', ''))
        body = str(row.get('body', ''))
        
        # We combine subject and body to capture context
        content = f"Subject: {subject}\n\n{body}"
        
        print(f"Generating embedding for row {index + 1}/{len(df)}: {subject[:30]}...")
        
        embedding = get_embedding(content)
        if not embedding:
            print(f"Skipping row {index + 1} due to embedding error.")
            continue
            
        metadata = {
            "sender_name": str(row.get('sender_name', '')),
            "sender_email": str(row.get('sender_email', '')),
            "timestamp": str(row.get('timestamp', '')),
            "thread_id": str(row.get('thread_id', ''))
        }
        
        records_to_insert.append({
            "content": content,
            "metadata": metadata,
            "embedding": embedding
        })
        
        # Batch insert every 10 records
        if len(records_to_insert) >= 10:
            print(f"Inserting batch of {len(records_to_insert)} records to Supabase...")
            try:
                supabase.table("knowledge_base").insert(records_to_insert).execute()
                records_to_insert = []
            except Exception as e:
                print(f"Error inserting batch: {e}")

    # Insert remaining records
    if records_to_insert:
        print(f"Inserting final batch of {len(records_to_insert)} records to Supabase...")
        try:
            supabase.table("knowledge_base").insert(records_to_insert).execute()
        except Exception as e:
            print(f"Error inserting batch: {e}")

    print("Knowledge base ingestion complete!")

if __name__ == "__main__":
    main()
