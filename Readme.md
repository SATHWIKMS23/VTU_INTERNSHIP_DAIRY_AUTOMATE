# VTU Internship Diary Automator 🚀

An automated, user-friendly, and professional MERN-stack application designed to take the manual labor out of filling your VTU internship diary entries. Simply provide your Google Doc URL, select your skills, and let the automator do the rest!

---

## ✨ Key Features

- **📺 Premium In-App Live Preview**: Watch the automation happen in real-time through a live screenshot stream directly in your browser. No focus-stealing pop-up windows.
- **🛠️ Comprehensive Skill Selection**: Exhaustive list of **118 available internship skills**, including a searchable multi-select UI.
- **🕒 Flexible Hours Worked**: A tactical 24-hour selection grid to specify exactly how many hours to log for every entry (1-24).
- **📝 Intelligent Parsing**: Automatically extracts Work Summary, Learning Outcomes, **Reference Links**, and **Blockers / Risks** from your Google Doc.
- **📱 Responsive & Premium Design**: Elegant glassmorphism UI that works perfectly on desktop, tablet, and mobile devices.
- **🔒 Smart Locking**: Critical automation settings (Skills, Hours) are locked during active sessions to prevent data entry errors.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS (Vanilla CSS approach for maximum control), Lucide Icons, Axios.
- **Backend**: Node.js, Express, Puppeteer (Headless mode for automation), Mongoose.
- **Database**: MongoDB (Local or Atlas supported).

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or newer)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance running)

### 2. Backend Setup
1. Navigate to the `backend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on the example provided:
   ```env
   # .env Example
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/vtu-automate
   NODE_ENV=development
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `client` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the app at `http://localhost:5173`.

---

## 📖 Usage Instructions

1. **Format Your Google Doc**: 
   - Ensure your Google Doc has a clear structure with headers for `Date`, `Work Summary`, `Learning Outcomes`, and optionally `Reference Links` and `Blockers / Risks`.
   - **Important**: Publish your Google Doc to the web (**File -> Share -> Publish to web**) and copy the generated link.
2. **Setup Automation**:
   - Enter your VTU login credentials (Email and Password).
   - Paste the Published Google Doc URL.
   - Select the **Skills** you want to be logged for each day.
   - Choose the **Hours Worked** from the 24-pill grid.
3. **Run**:
   - Click "Start Automation". 
   - Toggle "Show Live Preview" to monitor progress visually without leaving the app!

---

## 🔒 Security & Privacy

This application uses Puppeteer to simulate a real user logging into the VTU portal. Your credentials are used **only** for the duration of the automation session and are **never stored** in the database. Only your email and document URL are saved as records for your automation history.

---

## 🤝 Contribution

Feel free to fork this project and submit pull requests for any features or bug fixes you'd like to see!

Happy Interning! 🎓
