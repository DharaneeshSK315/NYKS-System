# NYKS Secure Authentication System

This project provides a full-stack secure authentication system for the **NYKS Nationwide Digital Attendance & Monitoring System**.

## 🚀 Tech Stack
- **Frontend**: Flutter (Modern UI, Provider state management)
- **Backend**: Node.js (Express), JWT for sessions, Bcrypt for security
- **Database**: MongoDB (Mongoose ODM)

---

## 🛠️ Setup Instructions

### 1. Backend Setup (Node.js)
1. Navigate to the `backend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the `.env` file (already created with defaults):
   - `MONGO_URI`: Your MongoDB connection string.
   - `JWT_SECRET`: A strong secret key for token signing.
4. Start the server:
   ```bash
   npm start
   ```

### 2. Frontend Setup (Flutter)
1. Navigate to the `frontend` folder.
2. Install Flutter packages:
   ```bash
   flutter pub get
   ```
3. Update `lib/services/auth_service.dart`:
   - If using **Android Emulator**, use `http://10.0.2.2:5000`.
   - If using **Physical Device**, use your computer's IP address.
4. Run the app:
   ```bash
   flutter run
   ```

---

## 🔒 Security Features Implemented

| Feature | Implementation | Purpose |
| :--- | :--- | :--- |
| **Password Hashing** | `bcryptjs` | Protects passwords even if DB is leaked. |
| **Session Management** | `JWT` (JSON Web Tokens) | Stateless, secure authentication. |
| **Input Validation** | Mongoose Schema & Regex | Prevents malicious data entry and XSS. |
| **Secure API** | CORS & Dotenv | Restricts unauthorized access to resources. |

---

## 🌐 Google Sign-In Integration
To enable Google Sign-In:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and set up **OAuth 2.0 Client IDs** for Android/iOS.
3. Add the `google_sign_in` package to `pubspec.yaml`.
4. In `lib/screens/login_screen.dart`, update the `_buildGoogleButton` to use the `google_sign_in` package methods.
