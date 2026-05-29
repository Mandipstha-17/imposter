import { Router, type Request, type Response } from 'express';
import { PlayerStats } from '../models/PlayerStats';

const router = Router();

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const topPlayers = await PlayerStats.find()
      .sort({ wins: -1, highestWinStreak: -1 })
      .limit(100)
      .select('-__v -_id')
      .lean();
    
    res.json({ success: true, leaderboard: topPlayers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

export default router;
