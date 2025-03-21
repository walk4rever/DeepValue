# DeepValue Python Backend

This is the Python implementation of the DeepValue backend using FastAPI.

## Features

- FastAPI web framework for high performance
- Asynchronous API endpoints
- Server-Sent Events (SSE) for streaming responses
- AWS Bedrock integration for Claude AI
- DynamoDB for chat history storage

## Project Structure

```
python_backend/
├── app/
│   ├── __init__.py
│   ├── claude_client.py     # Claude API integration
│   ├── chat_history.py      # DynamoDB chat history service
│   └── dynamodb_client.py   # DynamoDB client configuration
├── static/                  # Static files (HTML, CSS, JS)
│   ├── index.html           # Main application page
│   ├── script.js            # Frontend JavaScript
│   ├── claude-styles.css    # CSS styles
│   └── test.html            # API testing page
├── main.py                  # FastAPI application
├── test_api.py              # API testing script
├── requirements.txt         # Python dependencies
├── run.sh                   # Startup script
└── README.md                # This file
```

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure AWS credentials:
Make sure you have a `.env.aws` file in the root directory with your AWS credentials:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-2
```

## Running the Server

Start the FastAPI server:
```bash
./run.sh
```

Or manually:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

The application will be available at http://localhost:3000

## Testing the API

There are two ways to test the API:

1. Using the test script:
```bash
./test_api.py
```

2. Using the browser-based test page:
```
http://localhost:3000/static/test.html
```

## API Endpoints

- `POST /api/chat` - Send a message and get a response
- `GET /api/chat` - Stream a message and get a response in chunks
- `GET /api/history` - Get chat history for a session
- `POST /api/history/clear` - Clear chat history for a session

## API Documentation

FastAPI automatically generates API documentation:
- Swagger UI: http://localhost:3000/docs
- ReDoc: http://localhost:3000/redoc
