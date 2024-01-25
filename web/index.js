import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import serveStatic from 'serve-static';

import shopify from './shopify.js';
import webhooks from './webhooks.js';
import { PrismaClient } from '@prisma/client';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const prisma = new PrismaClient();

const STATIC_PATH =
	process.env.NODE_ENV === 'production'
		? `${process.cwd()}/frontend/dist`
		: `${process.cwd()}/frontend/`;

const app = express();
const morgan = require('morgan');
// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);
app.post(
	shopify.config.webhooks.path,
	// @ts-ignore
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

// All endpoints after this point will require an active session
app.use('/api/*', shopify.validateAuthenticatedSession());

app.use(express.json());
app.use(morgan('dev'));

const prisma = require('./chemin/vers/prisma');

app.post('/saveCart', async (req, res) => {
  try {
    const { checkoutToken, selectedProductIds } = req.body;

    const token = JSON.stringify(checkoutToken);

    // Créez un nouveau SavedCart
    const savedCart = await prisma.savedCart.create({
      data: {
        checkoutToken: token,
        productIds: selectedProductIds,
      },
    });
    
    console.log('app.post ~ savedCart:', savedCart);

    res.json({ success: true, message: 'Cart saved successfully' });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target === 'SavedCart_checkoutToken_key') {
      // Gérez le cas de clé déjà existante
      console.error('Clé déjà existante dans la table SavedCart');
      res.status(409).json({ success: false, message: 'Clé déjà existante dans la table SavedCart' });
    } else {
      // Gérez d'autres erreurs
      console.error('Erreur inattendue lors de l\'ajout en base de données:', error);
      res.status(500).json({ success: false, message: 'Erreur inattendue lors de l\'ajout en base de données' });
    }
  }
  finally {
    await prisma.$disconnect();
  }
});


app.use(serveStatic(STATIC_PATH, { index: false }));

app.use('/*', shopify.ensureInstalledOnShop(), async (_req, res) => {
	return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
});

app.listen(PORT);
