import { Router } from 'express';

/**
 * C5: the old public POST /task-complete is gone. It let any caller mark a hunter's
 * task done (PLAN #1). Task completion now comes only from approved photo proofs
 * (0G or vendor), and the reward is released by POST /api/reward/claim after every
 * task is approved. This router is intentionally empty, kept so the mount is harmless.
 */
const router = Router();

export default router;
