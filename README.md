# Yama_UM_Hackathon_2026
UM hackathon 2026

## Setup Instructions

### Environment Variables (.env)
To run the backend properly, you must configure your environment variables. Create a `.env` file in the root directory with the following keys:

```ini
# AI Orchestrator Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash  # Optional, defaults to gemini-2.5-flash

# Email Integration (IMAP/SMTP for reading and sending real emails)
IMAP_SERVER=imap.gmail.com          # Your email provider's IMAP server
IMAP_PORT=993                       # IMAP Port (usually 993 for SSL)
IMAP_EMAIL=your_email@gmail.com     # Your email address
IMAP_PASSWORD=your_app_password     # The app password generated for the account
```

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the necessary Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will run on `http://127.0.0.1:8000`. 

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will typically run on `http://localhost:5173`.

## Testing the AI Orchestrator (For Judges)

To quickly test the AI's orchestrating capabilities without having to configure a real IMAP/SMTP server to send live emails, you can inject test scenarios directly into the system:

1. **Clear the Logs:** Open `backend/data/audit_log.json` and clear its contents (reset it to an empty array `[]`). You should also clear the contents of `backend/data/outbox.csv` (leaving only the header row `id,to_email,subject,body,status,sent_at`) so you can track new outgoing messages cleanly.
2. **Inject a Custom Email:** Open `backend/data/emails.csv` and add your custom scenario as a new row (following the CSV format: `id,sender,subject,date,body`).
3. **Trigger the Orchestrator:** As long as the backend server is running, the background loop checks the `emails.csv` file every 10 minutes. Any email present in the CSV that is *not* recorded in the `audit_log.json` will be automatically picked up and processed by the AI orchestrator. 
4. **Observe the Magic:** Once the AI processes the email, you can observe real-time changes across the database files! Check `inventory.csv`, `finance.csv`, and `sales.csv` to see how the AI dynamically updated the company's state. Additionally, check `outbox.csv` to see the actual emails the AI drafted to communicate and negotiate with external suppliers or customers.

This allows you to easily simulate supply chain disruptions, VIP customer requests, or material shortages and instantly see how the AI coordinates a solution!
