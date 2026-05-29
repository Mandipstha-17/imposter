import { Router } from 'express';
import { PlayerStats } from '../models/PlayerStats';

const router = Router();

router.get('/leaderboard', async (req, res) => {
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
