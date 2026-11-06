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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', huntRoutes);
app.use('/api', scanRoutes);
app.use('/api', participantRoutes);
app.use('/api', taskRoutes);
app.use('/api', rewardRoutes);
app.use('/api', profileRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Tr!vvo API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🏹 Tr!vvo API running on port ${PORT}`);
});

export default app;
