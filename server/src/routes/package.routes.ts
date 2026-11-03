import { Router } from 'express';
import { PackageController, purchaseSchema } from '../controllers/package.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get('/', PackageController.getPackages);
router.post('/purchase', authenticate, validateRequest(purchaseSchema), PackageController.purchase);
router.get('/my-purchases', authenticate, PackageController.getMyPurchases);
router.get('/active', authenticate, PackageController.getMyActivePackage);

export default router;
