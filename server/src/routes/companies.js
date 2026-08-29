import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const companiesRouter = Router();

companiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query('SELECT id, name FROM companies ORDER BY name');
    res.json(rows);
  })
);

companiesRouter.get(
  '/:companyId/branches',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, name, ar_enabled AS "arEnabled" FROM branches WHERE company_id = $1 ORDER BY name',
      [req.params.companyId]
    );
    res.json(rows);
  })
);
