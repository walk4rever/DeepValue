# DeepValue - Value Investment Research Platform

DeepValue is a comprehensive web application designed for value investors to research, analyze, and track investment opportunities. The platform combines financial data analysis with AI-powered insights to help investors make informed decisions.

## Features

- **LLM-based Conversation Interface**: Ask questions about companies, industries, and investment strategies
- **Company Watchlist**: Track and organize companies of interest
- **Financial Analysis**: View detailed financial metrics and historical data
- **Research Notes**: Save and organize your investment research
- **News Aggregation**: Stay updated with relevant news about your investments

## Tech Stack

- **Frontend**: Vue.js 3, Vuex, Vue Router, Chart.js
- **Backend**: Python, FastAPI, SQLAlchemy
- **Data Sources**: Financial APIs, News APIs
- **AI/ML**: Transformer-based language models for analysis and insights

## Getting Started

### Prerequisites

- Node.js (v14+)
- Python 3.8+
- tmux (for running the application with the run script)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd deepvalue-app
   ```

2. Set up the backend:
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```
   cd ../frontend
   npm install
   ```

### Running the Application

You can start both the frontend and backend services with a single command:

```
./run.sh
```

This script uses tmux to run both services in separate windows. You can:
- Switch between windows with `Ctrl+b n` (next) or `Ctrl+b p` (previous)
- Detach from the session with `Ctrl+b d`
- Reattach to the session with `tmux attach-session -t deepvalue`
- Kill the session when done with `tmux kill-session -t deepvalue`

Alternatively, you can start the services manually:

1. Start the backend:
   ```
   cd backend
   source venv/bin/activate
   python main.py
   ```

2. Start the frontend (in a new terminal):
   ```
   cd frontend
   npm run serve
   ```

The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000

## API Documentation

Once the backend is running, you can access the API documentation at:
- http://localhost:8000/docs

## Project Structure

```
deepvalue-app/
├── backend/
│   ├── api/
│   │   └── routes/       # API endpoints
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── main.py           # Application entry point
├── frontend/
│   ├── public/           # Static assets
│   └── src/
│       ├── assets/       # Images, fonts, etc.
│       ├── components/   # Vue components
│       ├── router/       # Vue Router configuration
│       ├── store/        # Vuex store
│       ├── views/        # Page components
│       └── App.vue       # Root component
└── run.sh                # Script to start both services
```

## License

[MIT License](LICENSE)
