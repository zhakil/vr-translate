# VR-Translate: Real-Time Translation for Virtual Reality

<p align="center">
  <img src="https://place-hold.it/400x150?text=VR-Translate&fontsize=40" alt="VR-Translate Banner">
</p>

<p align="center">
    <em>A comprehensive, real-time translation system designed for VR environments. It uses eye-tracking to know what you're looking at, OCR to read the text, and displays the translation seamlessly in your headset.</em>
</p>

---

## 📖 Table of Contents

- [How It Works](#-how-it-works)
- [✨ Core Features](#-core-features)
- [🛠️ System Architecture](#-system-architecture)
  - [Frontend (Unity Client)](#frontend-unity-client)
  - [Backend (Node.js Server)](#backend-nodejs-server)
  - [Communication Protocol](#communication-protocol)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Option 1: Docker (Recommended)](#option-1-docker-recommended)
  - [Option 2: Local Development](#option-2-local-development)
- [🔧 SDK Usage](#-sdk-usage)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 💡 How It Works

The translation process is designed to be fast and seamless, creating an immersive experience for the user.

1.  **Gaze Detection**: The `EyeTrackingManager` in the Unity frontend uses the VR headset's hardware to detect when the user's gaze lingers on a specific area.
2.  **Screen Capture**: A snapshot of the user's view, focused on the gaze point, is captured.
3.  **Data Transmission**: The `NetworkManager` sends this image data to the backend via a persistent WebSocket connection.
4.  **Text Extraction**: On the backend, the `OCRService` receives the image, processes it, and extracts any recognizable text.
5.  **Translation**: The extracted text is passed to the `TranslationService`, which calls an external API (like DeepL) to get the translation.
6.  **Display**: The backend sends the translated text back to the Unity client through the WebSocket, where the `UIManager` displays it as an overlay in the user's view.

## ✨ Core Features

- **👁️ Eye-Tracking Integration**: Pinpoints exactly what text the user is looking at for precise, intuitive translation.
- **🚀 Real-Time & Low-Latency**: Utilizes WebSockets for instant communication between the VR client and the server.
- **✍️ High-Accuracy OCR**: Extracts text from any source within the VR environment.
- **🌐 Multi-Engine Support**: Built with a flexible architecture to support various translation engines (currently implemented with DeepL).
- **🔧 Extensible SDK**: Provides SDKs for C#, JavaScript, and Python to easily integrate VR-Translate into other applications.
- **🐳 Dockerized Deployment**: Fully containerized with Docker and Nginx for easy, reproducible setup and deployment.

## 🛠️ System Architecture

The system follows a client-server model, with a clear separation of concerns between the frontend and backend.

### Frontend (Unity Client)

The VR application responsible for user interaction and rendering.

-   **`EyeTrackingManager.cs`**: Interfaces with the VR hardware to get real-time gaze data.
-   **`GazeDetector.cs`**: Analyzes gaze data to determine user intent (e.g., holding focus on text).
-   **`NetworkManager.cs`**: Manages WebSocket and HTTP communication with the backend.
-   **`TranslationManager.cs`**: Orchestrates the client-side translation workflow.
-   **`UIManager.cs`**: Renders the translated text in the VR space.

### Backend (Node.js Server)

The powerful backend server that handles all the heavy processing.

-   **`HttpServer.ts`**: A standard REST API server (Express.js) for configuration, status checks, etc.
-   **`TranslationServer.ts`**: The core WebSocket server for real-time, bidirectional communication with the client.
-   **`OCRService.ts`**: Performs Optical Character Recognition on images sent from the client.
-   **`TranslationService.ts`**: Manages requests to external translation APIs (e.g., DeepL).
-   **`GazeAnalyzer.ts`**: A pre-processing service that can use gaze coordinates to crop images, improving OCR performance.

### Communication Protocol

-   **WebSocket**: The primary method for real-time translation requests and responses. The message structure is strictly defined in `shared/protocols/websocket-protocol.ts` to ensure type safety and consistency.
-   **REST API**: Used for secondary, non-time-sensitive actions like fetching initial configuration.

## 📂 Project Structure

The repository is organized to keep concerns separated and maintain a clean codebase.

```
vr-translate/
├── backend/                # Node.js/TypeScript Backend
│   ├── src/
│   │   ├── api/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── gaze-analyzer/
│   │   ├── http/
│   │   ├── logging/
│   │   ├── middleware/
│   │   ├── ocr/
│   │   ├── routes/
│   │   ├── translation/
│   │   ├── utils/
│   │   └── websocket/
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Unity Frontend
│   ├── src/
│   │   ├── Config/
│   │   ├── EyeTracking/
│   │   ├── Network/
│   │   ├── Translation/
│   │   ├── UI/
│   │   └── Utils/
│   └── unity/              # Unity project files (scenes, assets)
├── shared/                 # Code shared between frontend and backend
│   ├── constants/
│   ├── protocols/
│   ├── types/
│   └── utils/
├── sdk/                    # SDKs for external integration
│   ├── csharp/
│   ├── javascript/
│   └── python/
├── examples/               # Example usage of the SDKs
│   ├── csharp-example/
│   ├── python-example/
│   └── web-app/
├── nginx/                  # Nginx reverse proxy configuration
└── docker-compose.yml      # Docker orchestration file
```

## 🚀 Getting Started

### Prerequisites

-   Docker & Docker Compose
-   Node.js >= 18.x, pnpm (or npm/yarn)
-   Unity Hub & Unity Editor (LTS version recommended)

### Option 1: Docker (Recommended)

This is the simplest way to get the entire system running.

1.  **Configure Backend**:
    -   Navigate to `backend/`.
    -   Create a `.env` file from the `.env.example` template: `cp .env.example .env`.
    -   Edit `.env` and add your API keys (e.g., `DEEPL_API_KEY`).

2.  **Launch Services**:
    -   From the project root, run:
        ```sh
        docker-compose up --build -d
        ```
    -   This command builds the images and starts the backend and Nginx services in the background.

3.  **Run Frontend**:
    -   Open the `frontend/` project in Unity.
    -   Open the `MainScene` and press ▶️ (Play).

### Option 2: Local Development

For more direct control, you can run each component locally.

1.  **Run Backend**:
    ```sh
    # Navigate to the backend directory
    cd backend

    # Install dependencies
    pnpm install

    # Create and configure your .env file as described above

    # Start the development server
    pnpm run dev
    ```

2.  **Run Frontend**:
    -   Open the `frontend/` project in Unity.
    -   Ensure the `ConfigManager` is pointing to your local backend server (`ws://localhost:PORT`).
    -   Open the `MainScene` and press ▶️ (Play).

## 🔧 SDK Usage

The `sdk/` directory contains packages that allow other applications to easily connect to the VR-Translate backend. This is useful for building custom clients or integrating the translation service into other tools. See the `examples/` directory for implementation details.

## 🤝 Contributing

Contributions are welcome! If you'd like to improve VR-Translate, please follow these steps:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/your-amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/your-amazing-feature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
