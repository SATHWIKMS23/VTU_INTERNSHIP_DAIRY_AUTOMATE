import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  email: string;
  docUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  logs: string[];
  totalEntries: number;
  currentEntry: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema({
  email: { type: String, required: true },
  docUrl: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  logs: { type: [String], default: [] },
  totalEntries: { type: Number, default: 0 },
  currentEntry: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IJob>('Job', JobSchema);
