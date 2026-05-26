I want to build an email reply agent for gmail.

Use gmail API to fetch eveything from primary inbox.

The agent should craft the reply using Gemini api.

There should be a supabase database where the knowledge is stored .

Basically we have varous scenarios whihc we will recieve emails.

So when the reply is crafted it should refer to the document mentioniin the scenario info. 

I need the ability to modify the email drafted by AI before sending ( if required)

In the supabase the original email drafted by AI and the one I sent should be stored.

The frontend should be deplyed on vercel. If backend fuctions are needed we can use railway.

You should never send an email automatically.

The user should approve with one button click.

Implement Authentication so that only the owner of the email has access.

The login can be via google login.

for every email reply there should be a star rating and textul feedback option that is stored on supabase.

The existing knowledge base in the csv file in the working directory should be converted to a vector database and stored in supabase.

You will have to perform RAG to fetch the relevant info from the vector database.

The implementation should happen in phases. So you should plan first the execute in phases. 