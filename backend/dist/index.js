"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const Job_1 = __importDefault(require("./models/Job"));
const automation_1 = require("./services/automation");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vtu-automate';
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.post('/api/automate', async (req, res) => {
    const { email, password, docUrl, preview = false, skills = [], hours = 6 } = req.body;
    if (!email || !password || !docUrl) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const job = new Job_1.default({
            email,
            docUrl,
            status: 'pending',
            logs: ['Job created and added to queue.']
        });
        await job.save();
        // Start background task
        (0, automation_1.runAutomation)(job.id, password, preview, skills, hours).catch(console.error);
        res.status(201).json({ jobId: job.id, message: 'Automation started in background' });
    }
    catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await Job_1.default.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Do not return sensitive info if any (though password isn't stored, email is)
        res.json({
            id: job.id,
            email: job.email,
            status: job.status,
            logs: job.logs,
            totalEntries: job.totalEntries,
            currentEntry: job.currentEntry,
            createdAt: job.createdAt
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/jobs/:id/cancel', async (req, res) => {
    try {
        const job = await Job_1.default.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        await (0, automation_1.cancelJob)(job.id);
        res.json({ message: 'Cancellation requested.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/jobs/:id/screenshot', async (req, res) => {
    try {
        const screenshot = await (0, automation_1.getJobScreenshot)(req.params.id);
        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not available' });
        }
        res.json({ screenshot });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Start Server
mongoose_1.default.connect(MONGO_URI)
    .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('Database connection failed', err);
});
//# sourceMappingURL=index.js.map