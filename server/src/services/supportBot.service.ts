export interface BotFaqItem {
  id: string;
  category: string;
  question: string;
  keywords: string[];
  answer: string;
  quickPrompts?: string[];
}

export const SUPPORT_FAQS: BotFaqItem[] = [
  {
    id: 'deposit_verification_time',
    category: 'Deposits & Payments',
    question: 'How long does deposit verification take?',
    keywords: ['deposit', 'verify', 'verification', 'time', 'kitna time', 'pending', 'approval', 'approve', 'kitni der', 'kab hoga'],
    answer: `**Deposit Verification Time**
Our finance team typically verifies USD deposits within **10 to 30 minutes**.

Once you submit your Transaction ID / TxHash and upload a clear payment receipt, your USD balance is credited to your **Main Account** immediately after review.

If more than 30 minutes have passed, attach your receipt here and select **Talk to a human** for direct help.`,
    quickPrompts: ['How do I deposit USD?', 'What are the withdrawal rules?', 'Talk to a human'],
  },
  {
    id: 'how_to_deposit',
    category: 'Deposits & Payments',
    question: 'How do I deposit USD into my U-Ads wallet?',
    keywords: ['how to deposit', 'deposit kaise', 'usdt', 'bank', 'wire', 'payment kaise', 'transfer', 'method', 'channel'],
    answer: `**How to Submit a USD Deposit**
1. Open **Deposit** from the left menu.
2. Select an active **USD payment channel** (USDT TRC-20 or USD Bank Wire).
3. Send the exact USD amount to the listed recipient details.
4. Enter your **Transaction ID / TxHash** and attach your receipt screenshot.
5. Submit — deposits are normally verified within **10–30 minutes**.`,
    quickPrompts: ['How long does deposit verification take?', 'What are the plans?', 'Talk to a human'],
  },
  {
    id: 'withdrawal_process_limits',
    category: 'Withdrawals',
    question: 'What is the withdrawal process and minimum limit?',
    keywords: ['withdrawal', 'withdraw', 'payout', 'nikalna', 'paise nikalna', 'min withdraw', 'limit', 'minimum limit'],
    answer: `**USD Withdrawal Process & Limits**
• **Currency:** USD only
• **Minimum withdrawal:** **$10.00 USD**
• **How to withdraw:**
1. Open **Withdraw** from the left menu.
2. Choose your source wallet (Main Account, Video Rewards, or Referral Wallet) and payout method.
3. Enter your receiving details and confirm.
4. The amount is held safely while our team reviews and sends your payout with a confirmation reference.`,
    quickPrompts: ['How do I deposit USD?', 'How do video rewards work?', 'Talk to a human'],
  },
  {
    id: 'packages_pricing',
    category: 'Packages & Tiers',
    question: 'What are the U-Ads access packages and limits?',
    keywords: ['package', 'packages', 'tier', 'starter', 'basic', 'premium', 'vip', 'price', 'pricing', 'kharidna', 'buy package', 'plans'],
    answer: `**U-Ads Membership Plans (USD)**
• **Starter ($20):** Unlocks 2 video campaigns and Video Rewards eligibility.
• **Basic ($50):** Unlocks 6 video campaigns and full referral rank eligibility.
• **Premium ($100):** Unlocks 15 video campaigns and priority support.
• **VIP ($500):** Unlocks up to 60 video campaigns and priority payout review.

Upgrade anytime using your Main Account balance.`,
    quickPrompts: ['How do video rewards work?', 'How do referral commissions work?', 'Talk to a human'],
  },
  {
    id: 'video_rewards_claim',
    category: 'Videos & Rewards',
    question: 'How do video watch rewards get credited?',
    keywords: ['reward', 'video', 'videos', 'watch', 'earn', 'claim', '0.50', 'dekh kar', 'paise', 'earning'],
    answer: `**Automatic Video Reward Credits**
1. Open an unlocked campaign from **Videos**.
2. Watch the **full video** from start to finish (seeking forward is disabled during verification).
3. As soon as playback finishes, your USD reward is **credited automatically** to your **Video Rewards** wallet.
Each campaign awards its credit once.`,
    quickPrompts: ['What are the plans?', 'What is the withdrawal process and minimum limit?', 'Talk to a human'],
  },
  {
    id: 'referral_commission_rules',
    category: 'Referrals & Ranks',
    question: 'How do referral commissions and ranks work?',
    keywords: ['referral', 'invite', 'refer', 'commission', '5%', 'link', 'dost', 'earning', 'rank', 'milestone'],
    answer: `**U-Ads Referral & Rank Program**
• Share your personal invitation link from **Referrals**.
• Commissions apply to each referred member's **first qualifying package**, credited to your **Referral Wallet**.
• **Position Rates:** 1st: 5%, 2nd: 7%, 3rd: 10%, 4th: 12%, 5th+: 15%.
• **Ranks & Milestones:** Gold (1–5, +$20 at 5), Platinum (6–10, +$100 at 10), Diamond (11–100), Rank 4 (101–500), Rank 5 (501–10,000).`,
    quickPrompts: ['What is the withdrawal process and minimum limit?', 'What are the plans?', 'Talk to a human'],
  },
];

export interface BotAccountContext {
  fullName?: string;
  memberCode?: string;
  accountLevel?: string;
  mainUSD: number;
  videoRewardsUSD: number;
  referralUSD: number;
  reservedUSD: number;
  totalReferrals: number;
  qualifiedReferrals: number;
  referralRank: string;
  latestDeposits: Array<{ amountUSD: number; status: string; transactionRef: string; rejectionReason?: string | null; createdAt: string }>;
  latestWithdrawals: Array<{ amountUSD: number; status: string; payoutRef?: string | null; rejectionReason?: string | null; createdAt: string }>;
}

export class SupportBotService {
  public static isEscalationRequest(text: string): boolean {
    const lower = text.toLowerCase().trim();
    const escalationTriggers = [
      'agent',
      'human',
      'admin',
      'support agent',
      'support team',
      'representative',
      'staff',
      'insan',
      'baat karni hai',
      'talk to human',
      'talk to agent',
      'real person',
      'live person',
      'operator',
      'help desk',
      'call me',
      'rabta',
      'human support',
      'connect agent',
    ];

    return escalationTriggers.some((trigger) => lower.includes(trigger));
  }

  public static matchFaq(
    query: string,
    ctx?: BotAccountContext | null
  ): {
    answer: string;
    matchedFaqId?: string;
    quickPrompts: string[];
    suggestEscalation: boolean;
  } {
    const lower = query.toLowerCase().trim();

    if (this.isEscalationRequest(lower)) {
      return {
        answer: `**Support Team Notified**
Your conversation has been routed to an available **U-Ads Support** specialist. A team member will reply here shortly.

You can share your transaction reference or attach a screenshot while you wait.`,
        quickPrompts: ['Deposit verification issue', 'Withdrawal status check', 'Account level question'],
        suggestEscalation: true,
      };
    }

    // Account-aware read-only responses (Documentation §12.3)
    if (ctx) {
      const asksPersonal =
        lower.includes('my ') ||
        lower.includes('mera') ||
        lower.includes('meri') ||
        lower.includes('status') ||
        lower.includes('balance') ||
        lower.includes('progress') ||
        lower.includes('how many');

      if (asksPersonal && (lower.includes('deposit') || lower.includes('payment'))) {
        if (ctx.latestDeposits.length === 0) {
          return {
            answer: `**Your Deposit Status (${ctx.memberCode || ctx.fullName})**
You have not submitted any USD deposit requests yet.
• **Main Account Balance:** $${ctx.mainUSD.toFixed(2)}
You can submit a deposit anytime from the **Deposit** page (verified in 10–30 minutes).`,
            matchedFaqId: 'account_deposit_status',
            quickPrompts: ['How do I deposit USD?', 'Check my wallet balance', 'Talk to a human'],
            suggestEscalation: false,
          };
        }
        const lines = ctx.latestDeposits.slice(0, 3).map(
          (d) =>
            `• **$${d.amountUSD.toFixed(2)}** — **${d.status}** (Ref: \`${d.transactionRef}\`)${
              d.rejectionReason ? ` — Reason: ${d.rejectionReason}` : ''
            }`
        );
        return {
          answer: `**Your Recent USD Deposits (${ctx.memberCode || ctx.fullName})**
${lines.join('\n')}

• **Current Main Account Balance:** $${ctx.mainUSD.toFixed(2)}
Pending deposits are normally verified within 10–30 minutes.`,
          matchedFaqId: 'account_deposit_status',
          quickPrompts: ['Check my withdrawal status', 'Check my referral progress', 'Talk to a human'],
          suggestEscalation: false,
        };
      }

      if (asksPersonal && (lower.includes('withdraw') || lower.includes('payout'))) {
        if (ctx.latestWithdrawals.length === 0) {
          return {
            answer: `**Your Withdrawal Status**
You have no withdrawal requests on record yet.
• **Main Account:** $${ctx.mainUSD.toFixed(2)} | **Video Rewards:** $${ctx.videoRewardsUSD.toFixed(2)} | **Referral:** $${ctx.referralUSD.toFixed(2)}
• **In Hold:** $${ctx.reservedUSD.toFixed(2)}`,
            matchedFaqId: 'account_withdrawal_status',
            quickPrompts: ['What is the withdrawal process and minimum limit?', 'Check my deposit status', 'Talk to a human'],
            suggestEscalation: false,
          };
        }
        const lines = ctx.latestWithdrawals.slice(0, 3).map(
          (w) =>
            `• **$${w.amountUSD.toFixed(2)}** — **${w.status}**${
              w.payoutRef ? ` (Ref: \`${w.payoutRef}\`)` : ''
            }${w.rejectionReason ? ` — Reason: ${w.rejectionReason}` : ''}`
        );
        return {
          answer: `**Your Recent Withdrawals**
${lines.join('\n')}

• **Currently Held for Payout:** $${ctx.reservedUSD.toFixed(2)}`,
          matchedFaqId: 'account_withdrawal_status',
          quickPrompts: ['Check my wallet balance', 'Check my deposit status', 'Talk to a human'],
          suggestEscalation: false,
        };
      }

      if (asksPersonal && (lower.includes('referral') || lower.includes('rank') || lower.includes('milestone') || lower.includes('invite'))) {
        const nextTarget = ctx.qualifiedReferrals < 5 ? 5 : ctx.qualifiedReferrals < 10 ? 10 : ctx.qualifiedReferrals < 100 ? 100 : 500;
        const remaining = Math.max(0, nextTarget - ctx.qualifiedReferrals);
        return {
          answer: `**Your Referral Progress (${ctx.memberCode || ctx.fullName})**
• **Current Rank:** ${ctx.referralRank}
• **Total Direct Referrals:** ${ctx.totalReferrals}
• **Qualified Referrals:** ${ctx.qualifiedReferrals}
• **Next Milestone Target:** ${nextTarget} qualified (${remaining} more needed)
• **Referral Wallet Balance:** $${ctx.referralUSD.toFixed(2)}`,
          matchedFaqId: 'account_referral_progress',
          quickPrompts: ['Check my wallet balance', 'Check my deposit status', 'Talk to a human'],
          suggestEscalation: false,
        };
      }

      if (asksPersonal && (lower.includes('balance') || lower.includes('wallet') || lower.includes('level') || lower.includes('account'))) {
        const prettyLevel =
          !ctx.accountLevel || ctx.accountLevel === 'NEW_USER' || ctx.accountLevel === 'LEVEL_0'
            ? 'New User'
            : ctx.accountLevel.replace('_', ' ');
        return {
          answer: `**Your U-Ads Account Summary (${ctx.memberCode || ctx.fullName})**
• **Account Level:** ${prettyLevel}
• **Main Account:** $${ctx.mainUSD.toFixed(2)}
• **Video Rewards:** $${ctx.videoRewardsUSD.toFixed(2)}
• **Referral Wallet:** $${ctx.referralUSD.toFixed(2)}
• **Pending Withdrawal Hold:** $${ctx.reservedUSD.toFixed(2)}
• **Referral Rank:** ${ctx.referralRank} (${ctx.qualifiedReferrals} qualified / ${ctx.totalReferrals} total)`,
          matchedFaqId: 'account_summary',
          quickPrompts: ['Check my deposit status', 'Check my referral progress', 'Talk to a human'],
          suggestEscalation: false,
        };
      }
    }

    let bestFaq: BotFaqItem | null = null;
    let highestScore = 0;

    for (const faq of SUPPORT_FAQS) {
      let score = 0;
      for (const kw of faq.keywords) {
        if (lower.includes(kw)) {
          score += kw.length > 4 ? 3 : 2;
        }
      }
      if (lower.includes(faq.question.toLowerCase())) {
        score += 10;
      }
      if (score > highestScore) {
        highestScore = score;
        bestFaq = faq;
      }
    }

    if (bestFaq && highestScore >= 2) {
      return {
        answer: bestFaq.answer,
        matchedFaqId: bestFaq.id,
        quickPrompts: bestFaq.quickPrompts || ['Talk to Agent'],
        suggestEscalation: false,
      };
    }

    return {
      answer: `Welcome to **U-Ads Support**.

Ask me anything about:
• **Deposits:** Payment channels and 10–30 minute verification
• **Withdrawals:** Payout process and $10.00 minimum
• **Plans:** Starter, Basic, Premium, and VIP tiers
• **Video Rewards:** Automatic USD credits on completion
• **Referrals & Ranks:** Commission tiers and milestones

Pick a quick question below or select **Talk to a human** to connect with a support specialist.`,
      quickPrompts: [
        'How long does deposit verification take?',
        'What is the withdrawal process and minimum limit?',
        'How do video watch rewards get credited?',
        'Talk to a human',
      ],
      suggestEscalation: false,
    };
  }
}
