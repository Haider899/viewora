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
    answer: `⏱️ **Deposit Verification Time**:
Our Finance Audit Team typically verifies manual USD deposits within **10 to 30 minutes**.

Once you submit an authentic Transaction ID / TxHash and upload your clear payment receipt, your USD balance is credited to your **Main Account** immediately after admin verification.

If more than 30 minutes have passed, attach your receipt here and click **"Talk to Agent"** for immediate assistance.`,
    quickPrompts: ['How do I deposit USD?', 'What are the withdrawal rules?', 'Talk to Agent'],
  },
  {
    id: 'how_to_deposit',
    category: 'Deposits & Payments',
    question: 'How do I deposit USD into my U-Ads wallet?',
    keywords: ['how to deposit', 'deposit kaise', 'usdt', 'bank', 'wire', 'payment kaise', 'transfer', 'method', 'channel'],
    answer: `💳 **How to Submit a USD Deposit**:
1. Open **"Deposit Funds"** inside your User Dashboard.
2. Select an active **USD Payment Channel** (such as USDT TRC-20 or USD Bank Wire).
3. Send the exact USD amount to the listed treasury account/wallet.
4. Enter the exact **Transaction ID / TxHash** and attach your receipt screenshot.
5. Click **Submit Deposit for Verification** — verified by Admin within **10–30 minutes**.`,
    quickPrompts: ['How long does deposit verification take?', 'Package details?', 'Talk to Agent'],
  },
  {
    id: 'withdrawal_process_limits',
    category: 'Withdrawals',
    question: 'What is the withdrawal process and minimum limit?',
    keywords: ['withdrawal', 'withdraw', 'payout', 'nikalna', 'paise nikalna', 'min withdraw', 'limit', 'minimum limit'],
    answer: `💸 **USD Withdrawal Process & Limits**:
• **Currency:** USD Only
• **Minimum Limit:** **$10.00 USD**
• **How to Withdraw:**
1. Open the **"Withdrawal Payout"** tab.
2. Choose your payout channel and source wallet (Main Account, Video Rewards, or Referral Wallet).
3. Enter your receiving account details and confirm.
4. Funds move securely into **Reserved Hold** while Finance Admin reviews, approves, and completes payout with proof reference.`,
    quickPrompts: ['How do I deposit USD?', 'How do video rewards work?', 'Talk to Agent'],
  },
  {
    id: 'packages_pricing',
    category: 'Packages & Tiers',
    question: 'What are the U-Ads access packages and limits?',
    keywords: ['package', 'packages', 'tier', 'starter', 'basic', 'premium', 'vip', 'price', 'pricing', 'kharidna', 'buy package', 'plans'],
    answer: `💎 **U-Ads Membership Plans (USD Only)**:
• **Starter ($20 USD):** Unlocks 2 video campaigns + Video Rewards eligibility.
• **Basic ($50 USD):** Unlocks 6 video campaigns + full referral rank eligibility.
• **Premium ($100 USD):** Unlocks 15 video campaigns + priority support.
• **VIP ($500 USD):** Unlocks up to 60 video campaigns + priority settlement review.

*Upgrade anytime using your Main Account USD balance.*`,
    quickPrompts: ['How do video rewards work?', 'How do referral commissions work?', 'Talk to Agent'],
  },
  {
    id: 'video_rewards_claim',
    category: 'Videos & Rewards',
    question: 'How do video watch rewards get credited?',
    keywords: ['reward', 'video', 'videos', 'watch', 'earn', 'claim', '0.50', 'dekh kar', 'paise', 'earning'],
    answer: `🎬 **Automatic Video Reward Verification**:
1. Open an unlocked video from your **Video Catalog** (based on your Account Level / Package).
2. Watch the **full actual video duration** from start to finish (pause and seeking forward are disabled).
3. As soon as the full playback finishes, the server verifies the session and **automatically credits** the USD reward directly to your **Video Rewards Wallet**!
*(Each video can only generate a reward once).*`,
    quickPrompts: ['Package details?', 'What is the withdrawal process and minimum limit?', 'Talk to Agent'],
  },
  {
    id: 'referral_commission_rules',
    category: 'Referrals & Ranks',
    question: 'How do referral commissions and ranks work?',
    keywords: ['referral', 'invite', 'refer', 'commission', '5%', 'link', 'dost', 'earning', 'rank', 'milestone'],
    answer: `🤝 **U-Ads Referral & Rank Program**:
• Share your personal invitation link from the **Referrals & Ranks** tab.
• Commissions apply strictly to your referred member's **first qualifying transaction**, credited into your separate **Referral Wallet**.
• **Position Rates:** 1st: 5%, 2nd: 7%, 3rd: 10%, 4th: 12%, 5th+: 15%.
• **Ranks & Milestones:** Gold (1–5, +$20 at 5), Platinum (6–10, +$100 at 10), Diamond (11–100), Rank 4 (101–500), Rank 5 (501–10,000).`,
    quickPrompts: ['What is the withdrawal process and minimum limit?', 'Package details?', 'Talk to Agent'],
  },
];

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

  public static matchFaq(query: string): {
    answer: string;
    matchedFaqId?: string;
    quickPrompts: string[];
    suggestEscalation: boolean;
  } {
    const lower = query.toLowerCase().trim();

    if (this.isEscalationRequest(lower)) {
      return {
        answer: `👨‍💼 **Support Team Alerted**:
Your request has been forwarded to an available **U-Ads Support Agent**. A live agent will respond directly in this chat shortly.

Feel free to share your transaction reference or attach a screenshot while waiting.`,
        quickPrompts: ['Deposit verification issue', 'Withdrawal status check', 'Account level query'],
        suggestEscalation: true,
      };
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
      answer: `👋 Welcome! I am the **U-Ads AI Support Assistant**.

Ask me anything about:
• **USD Deposits:** Payment channels & 10–30 minute audit verification
• **USD Withdrawals:** Payout lifecycle & minimum $10.00 limit
• **Access Plans:** Starter, Basic, Premium, VIP tiers
• **Video Rewards:** Automatic USD credits on full completion
• **Referrals & Ranks:** Tiered commissions & milestone bonuses

Click a topic below or select **"Talk to Agent"** to connect with live support!`,
      quickPrompts: [
        'How long does deposit verification take?',
        'What is the withdrawal process and minimum limit?',
        'How do video watch rewards get credited?',
        'Talk to Agent',
      ],
      suggestEscalation: false,
    };
  }
}
