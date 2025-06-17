
# 🧠 AI Quizzer Backend

## 📘 Overview

**AI Quizzer** is a Node.js-based microservice backend designed to intelligently generate quizzes, evaluate answers, and track student performance. The system utilizes **Groq LLM** for generating quiz questions, hints, and suggestions, **MongoDB** for persistent storage, and **JWT** for secure user authentication.

This project was built as part of a backend development assessment and demonstrates proficiency in RESTful APIs, authentication, AI integration, and clean backend architecture.

---

## 🚀 Features

- 🔐 **Mock Authentication** with JWT
- 🤖 **AI-Powered Quiz Generator** (grade, subject, difficulty)
- 📝 **Answer Submission & Scoring**
- 🔁 **Retry Previous Quizzes** with tracking
- 📊 **Quiz History & Filtering** (date range, score, subject, etc.)
- 💡 **Hints Endpoint** using LLMs
- 📧 **Email Notifications** with improvement suggestions
- 🐳 **Dockerized** for containerized deployment
- ☁️ **Hosted on Render**

---

## 🛠️ Tech Stack

| Layer        | Technology                         |
|--------------|------------------------------------|
| Language     | Node.js (Express)                  |
| Database     | MongoDB Atlas (NoSQL)              |
| AI Engine    | Groq LLM (for quiz + hints)        |
| Auth         | JWT                                |
| Email        | SendGrid via Nodemailer            |
| Deployment   | Docker, Render                     |

---

## 🗃️ Data Models

### 🔸 User
| Field      | Type     | Description           |
|------------|----------|-----------------------|
| _id        | ObjectId | MongoDB ID            |
| username   | String   | Unique username       |
| password   | String   | Hashed password       |
| email      | String   | Registered email      |
| createdAt  | Date     | Created time          |
| updatedAt  | Date     | Last update           |

### 🔸 Quiz
| Field       | Type     | Description             |
|-------------|----------|--------------------------|
| _id         | ObjectId | MongoDB ID               |
| title       | String   | Quiz title               |
| grade_level | String   | Grade level (e.g., "6")  |
| subject     | String   | Subject (e.g., "Math")   |
| difficulty  | String   | Difficulty (easy/med/hard) |
| questions   | Array    | Questions with options   |
| created_at  | Date     | Creation time            |

### 🔸 Submission
| Field         | Type     | Description                        |
|---------------|----------|------------------------------------|
| _id           | ObjectId | MongoDB ID                         |
| user_id       | ObjectId | Reference to user                  |
| quiz_id       | ObjectId | Reference to quiz                  |
| answers       | Array    | User's answers                     |
| score         | Number   | Score received                     |
| submitted_at  | Date     | Submission time                    |
| is_retry      | Boolean  | True if it’s a retry               |
| original_submission_id | ObjectId | Refers to original quiz if retried |

### 🔸 Notification
| Field         | Type     | Description              |
|---------------|----------|--------------------------|
| _id           | ObjectId | MongoDB ID               |
| user_id       | ObjectId | Linked user              |
| submission_id | ObjectId | Associated submission    |
| email_sent    | Boolean  | Status of email delivery |
| sent_at       | Date     | When the email was sent  |
| error_message | String   | Error message (if any)   |

---

## 🔌 API Endpoints

### 📍 Authentication
- `POST /auth/register` – Register a user  
- `POST /auth/login` – Login and receive JWT  

### 📍 Quiz Management
- `POST /quiz/create` – Generate new AI quiz  
- `POST /quiz/submit` – Submit quiz answers and receive score  
- `GET /quiz/results` – Get quiz history with filters (grade, subject, date, score)  
- `POST /quiz/retry/:submissionId` – Retry previous quiz  
- `POST /quiz/hint` – Get AI-powered hint for a question  
- `GET /quiz/all` – Fetch all quizzes  

### 📍 Health Check
- `GET /health` – Check server and database connection  

> 🔐 All protected routes require JWT in the `Authorization` header.

---

## ⚙️ Local Setup

1. **Clone the Repository**
   ```bash
   git clone <your-private-repo-url>
   cd ai-quizzer-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env` and fill in all required values.

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Run via Docker**
   ```bash
   docker build -t aiquizzer-backend .
   docker run --env-file .env -p 5000:5000 aiquizzer-backend
   ```

---

## ☁️ Deployment (Render)

1. Push your code to a **private GitHub repo**.
2. Create a **Docker Web Service** on [Render](https://render.com).
3. Add all environment variables via the Render dashboard.
4. Deploy and test your endpoints.

---

## 📄 Example `.env` File

```
PORT=5000
JWT_SECRET=supersecret123
JWT_EXPIRES_IN=1h

NODE_ENV=production
APP_URL=https://ai-quizzer-backend.onrender.com

GROQ_API_KEY=your_groq_api_key

SENDGRID_USERNAME=apikey
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=your_verified_email@example.com
EMAIL_FROM_NAME="AI Quizzer"

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false

MONGODB_URI=your_mongodb_uri
```

---

## 📬 Contact

For any queries regarding this project:  
📧 **assessments@playpowerlabs.com**

---

## ✅ Submission Checklist

- [x] Code zipped (excluding `.env` and `node_modules`)
- [x] Hosted backend (Render, etc.)
- [x] Postman collection (optional)
- [x] README file (this one!)
- [x] (Optional) Screen recording or screenshots

---

## 🌟 Extra Points Earned

- ✅ Email notifications with suggestions
- ✅ AI-powered hint generator
- ✅ Retry mechanism
- ✅ Dockerized deployment

---

> ⚠️ This project does **not** use Redis for caching. All features are fully functional without it.

---

**Thank you! Looking forward to your review.**
