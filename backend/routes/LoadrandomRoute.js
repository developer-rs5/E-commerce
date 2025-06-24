
import express from 'express'
import { getRandomProducts } from '../controllers/productController.js'
const router = express.Router();

router.get('/random', getRandomProducts);

export default router;