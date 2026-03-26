import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Job from './models/Job';
import { runAutomation, cancelJob, getJobScreenshot } from './services/automation';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vtu-automate';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/automate', async (req: Request, res: Response) => {
  const { email, password, docUrl, preview = false, skills = [], hours = 6 } = req.body;

  if (!email || !password || !docUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const job = new Job({
      email,
      docUrl,
      status: 'pending',
      logs: ['Job created and added to queue.']
    });

    await job.save();

    // Start background task
    runAutomation(job.id, password, preview, skills, hours).catch(console.error);

    res.status(201).json({ jobId: job.id, message: 'Automation started in background' });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id as string);
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
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/jobs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id as string);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    await cancelJob(job.id);
    res.json({ message: 'Cancellation requested.' });
  } catch(error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/jobs/:id/screenshot', async (req: Request, res: Response) => {
  try {
    const screenshot = await getJobScreenshot(req.params.id as string);
    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not available' });
    }
    res.json({ screenshot });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('Database connection failed', err);
  });
