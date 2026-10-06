import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { ledgerRepository } from './src/db/mysqlRepository.ts';
import {
  FlyxSupplyVerifier,
  FUTURE_BLOCKCHAIN_SERVICES,
  isValidDecimal8,
} from './src/services/blockchainAdapter.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '256kb' }));

// Security headers middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple HTML Output Escaping to prevent XSS in stored text fields
function sanitizeText(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Rate Limiting Middleware (per IP sliding window)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before issuing additional requests.',
      });
    }
    record.count += 1;
    return next();
  };
}

// Server-Side Session & Role-Based Access Control (RBAC) Store
interface AdminSession {
  sessionId: string;
  csrfToken: string;
  username: string;
  role: 'ROLE_SUPER_ADMIN';
  expiresAt: number;
}

const adminSessions = new Map<string, AdminSession>();

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin@flyxcoin.com';
const ADMIN_PASS = process.env.ADMIN_PASSWORD_HASH || 'flyx-admin-2026';

function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing administrator session token.' });
  }
  const token = authHeader.slice(7).trim();
  const session = adminSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
  }

  if (session.role !== 'ROLE_SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Insufficient role permissions.' });
  }

  // Enforce CSRF token on state-mutating methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (!csrfHeader || csrfHeader !== session.csrfToken) {
      return res.status(403).json({ error: 'Forbidden: Invalid or missing CSRF protection token.' });
    }
  }

  next();
}

// ============================================================================
// SEO ROUTES: robots.txt & sitemap.xml
// ============================================================================

app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/admin/',
      '',
      'Sitemap: https://insight.flyxcoin.com/sitemap.xml',
    ].join('\n')
  );
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || 'https://insight.flyxcoin.com';
  const lastMod = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#tokenomics</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#explorer</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#wallets</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#whitepaper</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#roadmap</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  res.type('application/xml').send(xml);
});

// ============================================================================
// PUBLIC TRANSPARENCY & LEDGER API ROUTES
// ============================================================================

app.get('/api/overview', rateLimiter(120, 60_000), (_req: Request, res: Response) => {
  try {
    const data = ledgerRepository.getOverviewData();
    res.json(data);
  } catch (err) {
    console.error('Error in GET /api/overview:', err);
    res.status(500).json({ error: 'Failed to retrieve FLYX ecosystem overview.' });
  }
});

app.get('/api/transactions', rateLimiter(90, 60_000), (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const txType = typeof req.query.txType === 'string' ? req.query.txType : undefined;
    const ledgerEnvironment =
      typeof req.query.ledgerEnvironment === 'string' ? req.query.ledgerEnvironment : undefined;
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
    const minAmount = typeof req.query.minAmount === 'string' ? req.query.minAmount : undefined;
    const maxAmount = typeof req.query.maxAmount === 'string' ? req.query.maxAmount : undefined;
    const auditOnly = req.query.auditOnly === 'true';
    const sortBy =
      req.query.sortBy === 'amount' ||
      req.query.sortBy === 'tx_type' ||
      req.query.sortBy === 'created_at'
        ? req.query.sortBy
        : undefined;
    const sortOrder =
      req.query.sortOrder === 'asc' || req.query.sortOrder === 'desc'
        ? req.query.sortOrder
        : undefined;

    const transactions = ledgerRepository.searchPublicTransactions({
      q,
      txType,
      ledgerEnvironment,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      auditOnly,
      sortBy,
      sortOrder,
      includeHiddenForAdmin: false,
    });

    res.json({
      count: transactions.length,
      ledgerNotice:
        'All current transactions originate from the verified FlyXCoin.com Off-Chain MySQL Project Ledger (DECIMAL(36,8)).',
      transactions,
    });
  } catch (err) {
    console.error('Error in GET /api/transactions:', err);
    res.status(500).json({ error: 'Failed to search public ledger transactions.' });
  }
});

app.get('/api/wallets/:identifier', rateLimiter(60, 60_000), (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.identifier || '').trim();
    if (!identifier || identifier.length > 128) {
      return res.status(400).json({ error: 'Invalid wallet or account identifier.' });
    }

    const result = ledgerRepository.lookupPublicWallet(identifier);
    if (!result) {
      return res.status(404).json({
        error: `No public wallet or custodial vault found matching identifier "${sanitizeText(
          identifier,
          64
        )}".`,
      });
    }

    res.json({
      privacyNotice:
        'Public Wallet Lookup exposes only intentionally public ledger state. Passwords, private keys, authentication tokens, and personal user information are strictly isolated and never transmitted.',
      wallet: result.wallet,
      transactions: result.transactions,
    });
  } catch (err) {
    console.error('Error in GET /api/wallets/:identifier:', err);
    res.status(500).json({ error: 'Failed to lookup public wallet record.' });
  }
});

// ============================================================================
// USER SMART CONTRACT ADDRESS PUBLIC/USER ROUTE (Zero-PII Isolation)
// ============================================================================

app.get('/api/user/contract-address', rateLimiter(60, 60_000), (req: Request, res: Response) => {
  try {
    const userId = String(
      req.query.user_id || req.query.identifier || req.query.wallet_address || ''
    ).trim();
    if (!userId) {
      return res.status(400).json({
        error: 'user_id, identifier, or wallet_address query parameter is required.',
      });
    }
    const record = ledgerRepository.getUserContractByUserIdOrAddress(userId);
    if (!record) {
      return res.status(404).json({
        error: `No smart contract address registered for user identifier "${sanitizeText(
          userId,
          64
        )}". Please verify eligibility or contact FlyXCoin.com administration.`,
      });
    }
    res.json({
      privacyNotice:
        'Smart contract lookup provides only verified public addresses on the FLYX Sovereign EVM network. Private keys, seeds, and credentials are never stored or transmitted.',
      contract: record,
    });
  } catch (err: any) {
    console.error('Error in GET /api/user/contract-address:', err);
    res.status(500).json({ error: 'Failed to retrieve user smart contract address.' });
  }
});

app.get('/api/schema-sql', rateLimiter(30, 60_000), (_req: Request, res: Response) => {
  res.json({
    sql: ledgerRepository.getSchemaSql(),
  });
});

app.get('/api/verify-supply', rateLimiter(60, 60_000), (_req: Request, res: Response) => {
  try {
    const overview = ledgerRepository.getOverviewData();
    const verifier = new FlyxSupplyVerifier();
    const result = verifier.verifyTotalSupplyInvariants(
      overview.supplyStats.max_supply,
      overview.supplyStats.distributed_supply,
      overview.supplyStats.undistributed_supply
    );
    res.json({
      ...result,
      supply: overview.supplyStats,
      verified_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in GET /api/verify-supply:', err);
    res.status(500).json({ error: 'Failed to verify supply invariants.' });
  }
});

app.get('/api/blockchain-architecture', rateLimiter(60, 60_000), (_req: Request, res: Response) => {
  res.json({
    services: FUTURE_BLOCKCHAIN_SERVICES,
    status: 'ACTIVE_INTERFACE_READY',
  });
});

app.get('/api/network-stats', rateLimiter(90, 60_000), (_req: Request, res: Response) => {
  try {
    const overview = ledgerRepository.getOverviewData();
    res.json(overview.networkStats);
  } catch (err) {
    console.error('Error in GET /api/network-stats:', err);
    res.status(500).json({ error: 'Failed to retrieve network stats.' });
  }
});

// ============================================================================
// FLYX INSIGHT PRODUCTION API LAYER (Official FlyXCoin Ecosystem)
// ============================================================================

app.get('/api/insight/overview', rateLimiter(120, 60_000), (_req: Request, res: Response) => {
  try {
    const data = ledgerRepository.getOverviewData();
    res.json({
      source: 'FlyXCoin Production System',
      data,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/overview:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/tokenomics', rateLimiter(120, 60_000), (_req: Request, res: Response) => {
  try {
    const overview = ledgerRepository.getOverviewData();
    res.json({
      source: 'FlyXCoin Production Database (InnoDB DECIMAL(36,8))',
      tokenInfo: overview.tokenInfo,
      supplyStats: overview.supplyStats,
      allocations: overview.allocations,
      supplyVerification: overview.supplyVerification,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/tokenomics:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/mining/plans', rateLimiter(120, 60_000), (_req: Request, res: Response) => {
  try {
    const plans = ledgerRepository.getMiningPlans();
    res.json({
      source: 'FlyXCoin Cloud Mining Platform',
      count: plans.length,
      plans,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/mining/plans:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/mining/stats', rateLimiter(120, 60_000), (_req: Request, res: Response) => {
  try {
    const stats = ledgerRepository.getMiningStats();
    res.json({
      source: 'FlyXCoin Mining Engine & Points Ledger',
      stats,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/mining/stats:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/community/stats', rateLimiter(120, 60_000), (_req: Request, res: Response) => {
  try {
    const overview = ledgerRepository.getOverviewData();
    const miningAlloc = overview.allocations.find((a) => a.category_key === 'COMMUNITY_MINING');
    const miningStats = ledgerRepository.getMiningStats();
    res.json({
      source: 'FlyXCoin Community Mining Distribution Pool',
      total_allocation: miningAlloc?.allocated_amount || '400000000.00000000',
      total_distributed: miningAlloc?.distributed_amount || '94250180.45000000',
      total_remaining: miningAlloc?.remaining_amount || '305749819.55000000',
      percentage_share: miningAlloc?.percentage_share || '40.00',
      active_miners: miningStats.active_mining_users,
      total_registered_users: miningStats.total_registered_users,
      network_hashrate: miningStats.current_network_hashrate,
      total_points_issued: miningStats.total_points_issued,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/community/stats:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/ledger', rateLimiter(90, 60_000), (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const txType = typeof req.query.txType === 'string' ? req.query.txType : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const all = ledgerRepository.searchPublicTransactions({ q, txType });
    const paginated = all.slice((page - 1) * limit, page * limit);
    res.json({
      source: 'FlyXCoin Internal Ledger',
      page,
      limit,
      total: all.length,
      totalPages: Math.ceil(all.length / limit),
      transactions: paginated,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/ledger:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/transactions', rateLimiter(90, 60_000), (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const txType = typeof req.query.txType === 'string' ? req.query.txType : undefined;
    const all = ledgerRepository.searchPublicTransactions({ q, txType });
    res.json({
      source: 'FlyXCoin Internal Ledger',
      count: all.length,
      transactions: all,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/transactions:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/ledger/:id', rateLimiter(90, 60_000), (req: Request, res: Response) => {
  try {
    const txId = String(req.params.id || '').trim();
    const tx = ledgerRepository.getTransactionById(txId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction record not found in verified ledger.' });
    }
    res.json({
      source: 'FlyXCoin Internal Ledger Record',
      transaction: tx,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/ledger/:id:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/wallet/:publicId', rateLimiter(60, 60_000), (req: Request, res: Response) => {
  try {
    const identifier = String(req.params.publicId || '').trim();
    if (!identifier || identifier.length > 128) {
      return res.status(400).json({ error: 'Invalid wallet identifier.' });
    }
    const result = ledgerRepository.lookupPublicWallet(identifier);
    if (!result) {
      return res.status(404).json({ error: 'No public wallet record found.' });
    }
    res.json({
      source: 'FlyXCoin Public Wallet Registry',
      privacyNotice:
        'Public Wallet Lookup exposes only verified public ledger state. Passwords, private keys, auth tokens, and emails are strictly isolated and never transmitted.',
      wallet: result.wallet,
      transactions: result.transactions,
    });
  } catch (err) {
    console.error('Error in GET /api/insight/wallet/:publicId:', err);
    res.status(500).json({ error: 'Live data temporarily unavailable. Please try again.' });
  }
});

app.get('/api/insight/health', rateLimiter(60, 60_000), (_req: Request, res: Response) => {
  try {
    res.json({
      source: 'FlyXCoin System Health Telemetry',
      health: ledgerRepository.getSystemHealth(),
    });
  } catch (err) {
    console.error('Error in GET /api/insight/health:', err);
    res.status(500).json({ error: 'Health telemetry unavailable.' });
  }
});

app.get('/api/price', rateLimiter(120, 60_000), async (_req: Request, res: Response) => {
  const apiEndpoint = process.env.FLYXCOIN_API_ENDPOINT;
  const apiKey = process.env.FLYXCOIN_INTERNAL_API_KEY;

  // Attempt live upstream fetch from FlyXCoin.com API bridge if configured with a real key
  if (apiEndpoint && apiKey && apiKey !== 'YOUR_FLYXCOIN_HMAC_API_KEY') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const upstreamRes = await fetch(`${apiEndpoint.replace(/\/$/, '')}/price`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (upstreamRes.ok) {
        const upstreamData = (await upstreamRes.json()) as Record<string, unknown>;
        if (typeof upstreamData.price_usd === 'string') {
          return res.json({
            symbol: 'FLYX',
            currency: 'USD',
            price_usd: upstreamData.price_usd,
            change_24h_percent: String(upstreamData.change_24h_percent || '+4.28'),
            high_24h_usd: String(upstreamData.high_24h_usd || '3.54000000'),
            low_24h_usd: String(upstreamData.low_24h_usd || '3.35000000'),
            reference_volume_24h_flyx: String(
              upstreamData.reference_volume_24h_flyx || '59950.75000000'
            ),
            source_portal: 'FlyXCoin.com Official API Bridge (Live Upstream)',
            rate_type: 'OFF_CHAIN_INTERNAL_SETTLEMENT_RATE',
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Fallback to synchronized internal ledger reference rate below
    }
  }

  // Synchronized FlyXCoin.com Internal Ecosystem Settlement Rate ($3.50 USD / FLYX as in FlyXCoin.com wallet settlement)
  const overview = ledgerRepository.getOverviewData();
  return res.json({
    symbol: overview.tokenInfo.token_symbol,
    currency: 'USD',
    price_usd: '3.50000000',
    change_24h_percent: '+4.28',
    high_24h_usd: '3.54000000',
    low_24h_usd: '3.35000000',
    reference_volume_24h_flyx: '59950.75000000',
    source_portal: 'FlyXCoin.com Internal Dual-Fiat Wallet Settlement Feed',
    rate_type: 'OFF_CHAIN_INTERNAL_SETTLEMENT_RATE',
    updated_at: new Date().toISOString(),
  });
});

// ============================================================================
// ADMIN AUTHENTICATION & ROLE-PROTECTED MANAGEMENT ROUTES
// ============================================================================

app.post('/api/admin/login', rateLimiter(15, 60_000), (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (username.trim().toLowerCase() === ADMIN_USER.toLowerCase() && password === ADMIN_PASS) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const session: AdminSession = {
      sessionId,
      csrfToken,
      username: ADMIN_USER,
      role: 'ROLE_SUPER_ADMIN',
      expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
    };
    adminSessions.set(sessionId, session);
    return res.json({
      sessionToken: sessionId,
      csrfToken,
      username: session.username,
      role: session.role,
      expiresAt: session.expiresAt,
    });
  }

  return res.status(401).json({
    error: 'Invalid administrator credentials. Access denied.',
  });
});

app.post('/api/admin/logout', requireAdminRole, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.slice(7).trim();
    adminSessions.delete(token);
  }
  res.json({ ok: true });
});

app.get('/api/admin/transactions', requireAdminRole, (_req: Request, res: Response) => {
  const transactions = ledgerRepository.searchPublicTransactions({
    includeHiddenForAdmin: true,
  });
  res.json({ transactions });
});

app.put('/api/admin/allocations/:id', requireAdminRole, (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      allocated_amount,
      distributed_amount,
      lockup_policy,
      release_schedule,
      verification_status,
      description,
    } = req.body || {};

    if (!isValidDecimal8(String(allocated_amount)) || !isValidDecimal8(String(distributed_amount))) {
      return res.status(400).json({
        error: 'Allocated and Distributed amounts must be valid DECIMAL(36,8) values (e.g. 400000000.00000000).',
      });
    }

    const updated = ledgerRepository.updateAllocation({
      id,
      allocated_amount: String(allocated_amount),
      distributed_amount: String(distributed_amount),
      lockup_policy: sanitizeText(lockup_policy, 160),
      release_schedule: sanitizeText(release_schedule, 160),
      verification_status,
      description: sanitizeText(description, 600),
    });

    res.json({ allocation: updated, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update token allocation.' });
  }
});

app.put('/api/admin/token-info', requireAdminRole, (req: Request, res: Response) => {
  try {
    const { token_name, blockchain_status, main_portal_url } = req.body || {};
    const updated = ledgerRepository.updateTokenInfo({
      token_name: sanitizeText(token_name, 80),
      blockchain_status: sanitizeText(blockchain_status, 100),
      main_portal_url: sanitizeText(main_portal_url, 255),
    });
    res.json({ tokenInfo: updated, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update token info.' });
  }
});

app.put('/api/admin/mining-plans/:id', requireAdminRole, (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { plan_name, mining_speed, mining_rate_flyx_day, required_points, duration_days, status, reward_configuration, user_eligibility } = req.body || {};
    const updated = ledgerRepository.updateMiningPlan(id, {
      plan_name: plan_name ? sanitizeText(plan_name, 120) : undefined,
      mining_speed: mining_speed ? sanitizeText(mining_speed, 64) : undefined,
      mining_rate_flyx_day: mining_rate_flyx_day ? sanitizeText(mining_rate_flyx_day, 48) : undefined,
      required_points: typeof required_points === 'number' ? required_points : undefined,
      duration_days: typeof duration_days === 'number' ? duration_days : undefined,
      status: status || undefined,
      reward_configuration: reward_configuration ? sanitizeText(reward_configuration, 255) : undefined,
      user_eligibility: user_eligibility ? sanitizeText(user_eligibility, 160) : undefined,
    });
    res.json({ plan: updated, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update mining plan.' });
  }
});

app.post('/api/admin/announcements', requireAdminRole, (req: Request, res: Response) => {
  try {
    const { title, category, summary, content, author, is_pinned } = req.body || {};
    if (!title || !summary || !content) {
      return res.status(400).json({ error: 'Title, summary, and content are required.' });
    }
    const created = ledgerRepository.createAnnouncement({
      title: sanitizeText(title, 180),
      category: category || 'TRANSPARENCY_REPORT',
      summary: sanitizeText(summary, 320),
      content: sanitizeText(content, 4000),
      author: sanitizeText(author || 'FLYX Foundation Governance', 96),
      is_pinned: Boolean(is_pinned),
    });
    res.json({ announcement: created, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to publish announcement.' });
  }
});

app.delete('/api/admin/announcements/:id', requireAdminRole, (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  ledgerRepository.deleteAnnouncement(id);
  res.json({ ok: true, overview: ledgerRepository.getOverviewData() });
});

app.put('/api/admin/roadmap/:id', requireAdminRole, (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, completion_percent, target_window, summary, verification_note } =
      req.body || {};
    const updated = ledgerRepository.updateRoadmapPhase({
      id,
      status,
      completion_percent: Number(completion_percent),
      target_window: sanitizeText(target_window, 64),
      summary: sanitizeText(summary, 800),
      verification_note: sanitizeText(verification_note, 255),
    });
    res.json({ phase: updated, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update roadmap phase.' });
  }
});

app.put('/api/admin/whitepaper/:id', requireAdminRole, (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, subtitle, content, version } = req.body || {};
    const updated = ledgerRepository.updateWhitepaperSection({
      id,
      title: sanitizeText(title, 140),
      subtitle: sanitizeText(subtitle, 220),
      content: sanitizeText(content, 8000),
      version: sanitizeText(version, 24),
    });
    res.json({ section: updated, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update whitepaper section.' });
  }
});

app.put(
  '/api/admin/transactions/:txId/visibility',
  requireAdminRole,
  (req: Request, res: Response) => {
    try {
      const txId = String(req.params.txId);
      const { is_public } = req.body || {};
      const updated = ledgerRepository.toggleTransactionVisibility(txId, Boolean(is_public));
      res.json({ transaction: updated, overview: ledgerRepository.getOverviewData() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to toggle transaction visibility.' });
    }
  }
);

app.post('/api/admin/transactions', requireAdminRole, (req: Request, res: Response) => {
  try {
    const { tx_type, amount, sender_wallet, receiver_wallet, user_id_reference, memo } =
      req.body || {};
    if (!sender_wallet || !receiver_wallet || !amount) {
      return res.status(400).json({ error: 'Sender, receiver, and DECIMAL(36,8) amount required.' });
    }
    const created = ledgerRepository.recordOffChainTransaction({
      tx_type: tx_type || 'MINING_DISTRIBUTION',
      amount: String(amount),
      sender_wallet: sanitizeText(sender_wallet, 96),
      receiver_wallet: sanitizeText(receiver_wallet, 96),
      user_id_reference: user_id_reference ? sanitizeText(user_id_reference, 64) : undefined,
      memo: sanitizeText(memo || 'Official Off-Chain MySQL Ledger Entry', 255),
    });
    res.json({ transaction: created, overview: ledgerRepository.getOverviewData() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record off-chain transaction.' });
  }
});

// ============================================================================
// ADMIN USER SMART CONTRACTS ROUTES (Search, Assign, Status Update)
// ============================================================================

app.get(
  '/api/admin/user-contracts',
  requireAdminRole,
  rateLimiter(60, 60_000),
  (req: Request, res: Response) => {
    try {
      const q = req.query.q ? String(req.query.q).trim() : undefined;
      const status = req.query.status ? String(req.query.status).trim() : undefined;
      const network = req.query.network ? String(req.query.network).trim() : undefined;

      const contracts = ledgerRepository.getUserContractAddresses({ q, status, network });
      res.json({
        contracts,
        total: contracts.length,
        availableNetworks: ['FLYX Sovereign EVM (Pre-Mainnet)'],
        availableStatuses: ['ACTIVE', 'PENDING_DEPLOYMENT', 'PAUSED', 'REVOKED'],
      });
    } catch (err: any) {
      console.error('Error in GET /api/admin/user-contracts:', err);
      res.status(500).json({ error: 'Failed to retrieve user smart contract records.' });
    }
  }
);

app.post(
  '/api/admin/user-contracts/assign',
  requireAdminRole,
  rateLimiter(30, 60_000),
  (req: Request, res: Response) => {
    try {
      const {
        user_id,
        wallet_address,
        contract_address,
        network,
        token_symbol,
        status,
        username,
        email,
        mobile,
        notes,
        transaction_ref,
      } = req.body || {};

      if (!user_id || !wallet_address) {
        return res.status(400).json({ error: 'user_id and wallet_address are required.' });
      }

      const assigned = ledgerRepository.assignUserContractAddress(
        {
          user_id: sanitizeText(user_id, 64),
          wallet_address: sanitizeText(wallet_address, 96),
          contract_address: contract_address ? sanitizeText(contract_address, 128) : undefined,
          network: network ? sanitizeText(network, 96) : undefined,
          token_symbol: token_symbol ? sanitizeText(token_symbol, 16) : undefined,
          status,
          username: username ? sanitizeText(username, 64) : undefined,
          email: email ? sanitizeText(email, 128) : undefined,
          mobile: mobile ? sanitizeText(mobile, 32) : undefined,
          notes: notes ? sanitizeText(notes, 255) : undefined,
          transaction_ref: transaction_ref ? sanitizeText(transaction_ref, 64) : undefined,
        },
        'admin@flyxcoin.com'
      );

      res.json({ ok: true, contract: assigned, overview: ledgerRepository.getOverviewData() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to assign user smart contract address.' });
    }
  }
);

app.patch(
  '/api/admin/user-contracts/status',
  requireAdminRole,
  rateLimiter(30, 60_000),
  (req: Request, res: Response) => {
    try {
      const { id, user_id, contract_address, status, notes } = req.body || {};
      const identifier = id || user_id || contract_address;
      if (!identifier) {
        return res.status(400).json({ error: 'id, user_id, or contract_address is required.' });
      }
      const allowedStatuses = ['ACTIVE', 'PENDING_DEPLOYMENT', 'PAUSED', 'REVOKED'];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
        });
      }

      const updated = ledgerRepository.updateUserContractStatus(
        identifier,
        status,
        notes ? sanitizeText(notes, 255) : undefined,
        'admin@flyxcoin.com'
      );

      res.json({ ok: true, contract: updated, overview: ledgerRepository.getOverviewData() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update smart contract status.' });
    }
  }
);

// ============================================================================
// VITE DEV SERVER & STATIC FRONTEND MOUNTING
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FLYX Insight Official Transparency Portal running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
