import { Router } from 'express';
import { companiesCol, branchesCol } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const companiesRouter = Router();

companiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const snapshot = await companiesCol.get();
    const rows = snapshot.docs
      .map((doc) => ({ id: doc.id, name: doc.data().name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    res.json(rows);
  })
);

companiesRouter.get(
  '/:companyId/branches',
  asyncHandler(async (req, res) => {
    const snapshot = await branchesCol.where('companyId', '==', req.params.companyId).get();
    const rows = snapshot.docs
      .map((doc) => ({ id: doc.id, name: doc.data().name, arEnabled: Boolean(doc.data().arEnabled) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    res.json(rows);
  })
);
