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
    question: 'Deposit verification mein kitna time lagta hai?',
    keywords: ['deposit', 'verify', 'verification', 'time', 'kitna time', 'pending', 'approval', 'approve', 'kitni der', 'kab hoga'],
    answer: `⏱️ **Deposit Verification Time**:
Aam tor par hamari Finance Audit Team **10 se 30 minutes** ke andar aapka deposit verify kar deti hai.

Agar aapne authentic Transaction ID (EasyPaisa 3737 SMS / JazzCash 8558 SMS ya USDT TRC-20 TxHash) aur clear screenshot attach kiya hai, toh balance verify hotay hi foran aapke **Available Balance** mein credit ho jata hai.

Agar 30 minutes se zyada ho gaye hain toh aap screenshot yahan attach karke **"Talk to Support Agent"** par click kar sakte hain.`,
    quickPrompts: ['Deposit kaise karna hai?', 'Withdrawal rules kya hain?', 'Talk to Support Agent'],
  },
  {
    id: 'how_to_deposit',
    category: 'Deposits & Payments',
    question: 'EasyPaisa, JazzCash ya USDT se payment / deposit kaise karein?',
    keywords: ['how to deposit', 'deposit kaise', 'easypaisa', 'jazzcash', 'usdt', 'bank', 'payment kaise', 'transfer', 'method'],
    answer: `💳 **Deposit Karne Ka Tareeqa**:
1. User Portal mein **"Deposit Funds"** page par jayein.
2. Apna preferred payment method select karein:
   • **EasyPaisa** (0345-8899123)
   • **JazzCash** (0300-7766554)
   • **USDT (TRC-20)** (TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)
   • **Bank Wire / IBFT**
3. Diye gaye account number ya address par exact amount send karein.
4. Transfer complete hone ke baad milne wala **Transaction ID / Reference Number** form mein enter karein aur receipt ka screenshot upload karein.
5. **Submit Deposit** par click karein. Hamari team foran verify karegi!`,
    quickPrompts: ['Deposit verification mein kitna time lagta hai?', 'Packages ki detail kya hai?', 'Talk to Support Agent'],
  },
  {
    id: 'withdrawal_process_limits',
    category: 'Withdrawals',
    question: 'Withdrawal ka tareeqa aur minimum limit kya hai?',
    keywords: ['withdrawal', 'withdraw', 'payout', 'nikalna', 'paise nikalna', 'min withdraw', 'limit', 'minimum limit'],
    answer: `💸 **Withdrawal Process & Minimum Limits**:
• **Minimum Limits**:
  - **USD**: Minimum **$10.00**
  - **PKR**: Minimum **Rs 1,000**

• **Kaise Withdraw Karein**:
1. **"Withdrawal"** tab par click karein.
2. Currency (USD ya PKR) aur apna payout account (EasyPaisa, JazzCash, USDT, ya Bank) select karein.
3. Apna exact Account Title aur Number / Wallet address daalein.
4. Request submit karte hi amount securely **Reserved** ho jati hai.
5. Finance team verify karke **1 se 2 hours** ke andar funds aapke account mein deliver kar deti hai.`,
    quickPrompts: ['Deposit kaise karna hai?', 'Reward kaise milta hai?', 'Talk to Support Agent'],
  },
  {
    id: 'packages_pricing',
    category: 'Packages & Tiers',
    question: 'Packages ki details, pricing aur benefits kya hain?',
    keywords: ['package', 'packages', 'tier', 'starter', 'basic', 'premium', 'vip', 'price', 'pricing', 'kharidna', 'buy package'],
    answer: `💎 **VistaraX Membership Packages**:
• **Starter Package ($20 / ~Rs 5,600)**:
  - 2 Curated HD Masterclasses
  - Eligible for video engagement cash rewards
  - Standard support

• **Basic Package ($50 / ~Rs 14,000)**:
  - 6 Specialized Masterclasses
  - Priority 1080p 60fps streaming
  - Standard referral commission tier

• **Premium Package ($100 / ~Rs 28,000)**:
  - 15 Advanced Curriculum Masterclasses
  - 4K Ultra HD streaming & Verified Completion Certificate
  - Dedicated priority account support

• **VIP Package ($500 / ~Rs 140,000)**:
  - Full 60-Video Masterclass catalog access
  - Exclusive architectural breakdowns & live Q&As
  - 24/7 VIP Concierge support

*Aap apne available wallet balance se 1-click mein upgrade kar sakte hain.*`,
    quickPrompts: ['Videos dekh kar reward kaise milta hai?', 'Referral commission kaise milti hai?', 'Talk to Support Agent'],
  },
  {
    id: 'video_rewards_claim',
    category: 'Masterclasses & Rewards',
    question: 'Videos dekh kar cash reward ($0.50) kaise claim hota hai?',
    keywords: ['reward', 'video', 'videos', 'watch', 'earn', 'claim', '0.50', 'dekh kar', 'paise', 'earning'],
    answer: `🎬 **Video Watching & Rewards Policy**:
1. Apne package tier ke mutabiq **"Masterclasses"** catalog se koi video play karein.
2. Video ko ghaur se dekhein — Anti-cheat telemetry system watch time track karta hai.
3. Jaise hi aap **80% ya minimum 60 seconds** watch time complete kar lein ge, **"Claim $0.50 Reward"** button green ho jayega.
4. Button par click karte hi reward foran aapke **Available Balance** mein credit ho jayega!
*(Note: Har video par exactly ek dafa reward claim kiya ja sakta hai).*`,
    quickPrompts: ['Packages ki details kya hain?', 'Withdrawal rules kya hain?', 'Talk to Support Agent'],
  },
  {
    id: 'referral_commission_rules',
    category: 'Referrals & Earnings',
    question: 'Referral link kahan milega aur 5% commission kaise milta hai?',
    keywords: ['referral', 'invite', 'refer', 'commission', '5%', 'link', 'dost', 'earning'],
    answer: `🤝 **Referral Commission System**:
• **Referrals** page par aapka personal referral link aur code mojood hota hai.
• Jab bhi koi member aapke link se sign up karke koi package purchase karta hai, toh package ki total value ka **5% Net Cash Commission** foran aapke wallet account mein jama ho jata hai.
• Is commission par koi lock nahi hota — aap foran withdraw kar sakte hain ya khud packages purchase kar sakte hain!`,
    quickPrompts: ['Withdrawal kaise karein?', 'Packages ki details kya hain?', 'Talk to Support Agent'],
  },
  {
    id: 'account_verification_kyc',
    category: 'Account & Security',
    question: 'Account verification ya password reset kaise karein?',
    keywords: ['account', 'verification', 'kyc', 'cnic', 'password', 'reset', 'login', 'security', 'profile'],
    answer: `🔒 **Account Security & Support**:
• Aapka account registration ke waqt se hi active hota hai.
• High-value withdrawals ke liye profile verification zaroori ho sakti hai.
• Agar aap password bhool gaye hain toh Login page par "Forgot Password" use karein ya hamare support agent se yahan chat karein.`,
    quickPrompts: ['Talk to Support Agent', 'Deposit verification time?'],
  },
];

export class SupportBotService {
  /**
   * Evaluates if user message indicates escalation to human agent
   */
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

  /**
   * Finds matching FAQ or returns intelligent fallback
   */
  public static matchFaq(query: string): {
    answer: string;
    matchedFaqId?: string;
    quickPrompts: string[];
    suggestEscalation: boolean;
  } {
    const lower = query.toLowerCase().trim();

    // Check direct escalation intent first
    if (this.isEscalationRequest(lower)) {
      return {
        answer: `👨‍💼 **Support Team Alerted**:
Aapki request hamari Live Support Team ko forward kardi gayi hai. Ek support agent foran aapse yahan connect karega aur reply karega.

Aap apna exact masla, transaction ID, ya screenshot yahan attach karke bhej dein taake agent aate hi issue hal kar sake.`,
        quickPrompts: ['Deposit slip attach karni hai', 'Withdrawal issue hai', 'Account query hai'],
        suggestEscalation: true,
      };
    }

    // Score all FAQs based on keyword occurrences
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
        quickPrompts: bestFaq.quickPrompts || ['Talk to Support Agent'],
        suggestEscalation: false,
      };
    }

    // Fallback if no specific question matched
    return {
      answer: `👋 Assalam o Alaikum! Main **Vistara AI Support Assistant** hoon.

Aap mujh se platform ke bare mein kuch bhi pooch sakte hain:
• **Deposits**: EasyPaisa, JazzCash, USDT verification
• **Withdrawals**: Payout timeline & limits
• **Packages**: Starter, Basic, Premium, VIP
• **Rewards**: Masterclasses watch rewards ($0.50)
• **Referrals**: 5% direct commission

Neeche diye gaye buttons par click karein ya agar kisi human support agent se baat karni hai toh **"Talk to Support Agent"** par click karein!`,
      quickPrompts: [
        'Deposit verification mein kitna time lagta hai?',
        'Withdrawal ka tareeqa aur limit?',
        'Packages ki details kya hain?',
        'Talk to Support Agent',
      ],
      suggestEscalation: false,
    };
  }
}
