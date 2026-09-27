import { Router } from 'express';
import { getAccount, setAccountRole, setAccountStatus } from '../controllers/admin.controller.js';
import { grantKey } from '../controllers/adminKeys.controller.js';
import { createTier, getRules, patchNewAccountRule, patchTier } from '../controllers/rules.controller.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { accountRoleSchema, accountStatusSchema } from '../validators/admin.schemas.js';
import { keyGrantSchema } from '../validators/keys.schemas.js';
import { newAccountRulePatchSchema, tierCreateSchema, tierPatchSchema } from '../validators/rules.schemas.js';

// Every admin route: signed in, a staff role, and a second factor (aal2) in this session.
// Support: view, grant 1-go-live keys · Admin: + block/unblock, edit rules and tiers, grant any key
// · Owner: + manage staff roles.
const router = Router();

router.use(requireAuth, requireStaff('support'));

router.get('/accounts/:id', getAccount);
router.patch('/accounts/:id/status', requireStaff('admin'), validate(accountStatusSchema), setAccountStatus);
router.patch('/accounts/:id/role', requireStaff('owner'), validate(accountRoleSchema), setAccountRole);

router.post('/keys', validate(keyGrantSchema), grantKey);

router.get('/rules', getRules);
router.patch('/rules/new-account', requireStaff('admin'), validate(newAccountRulePatchSchema), patchNewAccountRule);
router.post('/tiers', requireStaff('admin'), validate(tierCreateSchema), createTier);
router.patch('/tiers/:id', requireStaff('admin'), validate(tierPatchSchema), patchTier);

export default router;
