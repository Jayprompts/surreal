import { Router } from 'express';
import { getAccount, setAccountRole, setAccountStatus } from '../controllers/admin.controller.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { accountRoleSchema, accountStatusSchema } from '../validators/admin.schemas.js';

// Every admin route: signed in, a staff role, and a second factor (aal2) in this session.
// Support: view · Admin: + block/unblock · Owner: + manage staff roles.
const router = Router();

router.use(requireAuth, requireStaff('support'));

router.get('/accounts/:id', getAccount);
router.patch('/accounts/:id/status', requireStaff('admin'), validate(accountStatusSchema), setAccountStatus);
router.patch('/accounts/:id/role', requireStaff('owner'), validate(accountRoleSchema), setAccountRole);

export default router;
