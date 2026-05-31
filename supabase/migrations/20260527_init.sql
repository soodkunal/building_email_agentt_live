-- Enable pgvector extension
create extension if not exists vector;

-- Knowledge Base Table
create table if not exists knowledge_base (
    id uuid primary key default gen_random_uuid(),
    content text not null,
    metadata jsonb,
    embedding vector(768),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drafted Emails Table
create table if not exists drafted_emails (
    id uuid primary key default gen_random_uuid(),
    email_id text unique not null,
    thread_id text,
    recipient text not null,
    subject text,
    body text,
    original_draft text not null,
    final_sent text,
    status text default 'draft', -- 'draft', 'sent', 'discarded'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    sent_at timestamp with time zone
);

-- Feedback Table
create table if not exists feedback (
    id uuid primary key default gen_random_uuid(),
    draft_id uuid references drafted_emails(id) on delete cascade not null,
    rating integer check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User OAuth Tokens
create table if not exists user_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid, -- For single-user, can be null or standard UUID
    email text,
    access_token text,
    refresh_token text not null,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Similarity Search Function
create or replace function match_knowledge_base(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
returns table (
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
language sql stable
as $$
    select
        knowledge_base.id,
        knowledge_base.content,
        knowledge_base.metadata,
        1 - (knowledge_base.embedding <=> query_embedding) as similarity
    from knowledge_base
    where 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
    order by knowledge_base.embedding <=> query_embedding
    limit match_count;
$$;
