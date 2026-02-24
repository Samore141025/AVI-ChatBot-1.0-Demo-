# AVI - SkyLink Aviation Assistant

AVI is a professional, real-time customer support chatbot designed for SkyLink Airways. It leverages the power of Google's Gemini AI to provide passengers with accurate information regarding flight status, baggage policies, check-in procedures, and more.

## Features

- **Real-time Streaming**: Responses are streamed to the user as they are generated, providing a smooth and interactive experience.
- **Aviation Expertise**: Pre-configured with professional aviation protocols and standard airline information.
- **Session Persistence**: Chat history is persisted using SQLite, allowing users to maintain context across sessions.
- **Professional UI**: A clean, modern interface built with React, Tailwind CSS, and Framer Motion.
- **Quick Actions**: One-tap access to common inquiries like flight status and baggage policy.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Framer Motion.
- **Backend**: Node.js, Express, Socket.io.
- **AI**: Google Gemini AI (@google/genai).
- **Database**: SQLite (better-sqlite3).

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/avi-aviation-assistant.git
   cd avi-aviation-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## Deployment

To build the application for production:

```bash
npm run build
npm start
```

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with Google Gemini AI.
- Icons by Lucide React.
- Animations by Framer Motion.
