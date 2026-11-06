import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import huntRoutes from './routes/hunts';
import scanRoutes from './routes/scan';
import participantRoutes from './routes/participants';
import taskRoutes from './routes/tasks';
import rewardRoutes from './routes/rewards';
import profileRoutes from './routes/profile';
import verifyRoutes from './routes/verify';
import photoRoutes from './routes/photo';
import reviewRoutes from './routes/review';
import receiptRoutes from './routes/receipts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
// Photo proofs arrive as data URLs (downscaled in the browser to ~200-400 KB); 6 MB leaves room for a raw fallback.
app.use(express.json({ limit: '6mb' }));

// Routes
app.use('/api', authRoutes);
app.use('/api', huntRoutes);
app.use('/api', scanRoutes);
app.use('/api', participantRoutes);
app.use('/api', taskRoutes);
app.use('/api', rewardRoutes);
app.use('/api', profileRoutes);
app.use('/api', verifyRoutes);
app.use('/api', photoRoutes);
app.use('/api', reviewRoutes);
app.use('/api', receiptRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Tr!vvo API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🏹 Tr!vvo API running on port ${PORT}`);
});

export default app;
