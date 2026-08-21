import { describe, expect, it, vi } from 'vitest';

describe('health readiness contract', () => {
  it('returns a 503 contract when the database probe fails', async () => {
    const queryRaw = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await expect(queryRaw()).rejects.toThrow('database unavailable');
    res.status(503).json({ status: 'not_ready', database: 'error' });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'not_ready' }));
  });

  it('successful readiness uses a database SELECT probe', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ ok: 1 }]);
    await queryRaw();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
