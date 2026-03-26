import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IJob, {}, {}, {}, mongoose.Document<unknown, {}, IJob, {}, mongoose.DefaultSchemaOptions> & IJob & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IJob>;
export default _default;
//# sourceMappingURL=Job.d.ts.map