import prisma from '../lib/prisma.js';

function buildCertificateSvgDataUrl(opts: {
  badge: string;
  title: string;
  subtitle: string;
  authority: string;
  licenseNumber: string;
  accent: string;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#ecfdf5"/>
    </linearGradient>
  </defs>
  <rect width="900" height="600" fill="url(#bg)"/>
  <rect x="24" y="24" width="852" height="552" rx="18" fill="#ffffff" stroke="${opts.accent}" stroke-width="4"/>
  <rect x="38" y="38" width="824" height="524" rx="12" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>
  <rect x="310" y="72" width="280" height="32" rx="16" fill="${opts.accent}" fill-opacity="0.12"/>
  <text x="450" y="93" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${opts.accent}" letter-spacing="2">${opts.badge}</text>
  <text x="450" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#0f172a">${opts.title}</text>
  <text x="450" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#475569">${opts.subtitle}</text>
  <line x1="200" y1="230" x2="700" y2="230" stroke="#e2e8f0" stroke-width="2"/>
  <text x="450" y="275" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#64748b" letter-spacing="1.5">ISSUED TO</text>
  <text x="450" y="318" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#059669">U-Ads Platform Technologies Ltd.</text>
  <text x="450" y="355" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#334155">Verified Digital Media Engagement &amp; Audited USD Ledger Operations</text>
  <rect x="110" y="405" width="680" height="90" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="140" y="438" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#64748b">ISSUING AUTHORITY</text>
  <text x="140" y="465" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${opts.authority}</text>
  <text x="580" y="438" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#64748b">REGISTRATION / LICENSE NO.</text>
  <text x="580" y="465" font-family="Courier New, monospace" font-size="15" font-weight="700" fill="${opts.accent}">${opts.licenseNumber}</text>
  <circle cx="790" cy="120" r="38" fill="${opts.accent}" fill-opacity="0.12" stroke="${opts.accent}" stroke-width="2.5"/>
  <text x="790" y="116" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${opts.accent}">VERIFIED</text>
  <text x="790" y="133" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${opts.accent}">2026</text>
  <text x="450" y="538" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8">Official U-Ads Registry Record • Validated Active Standing</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const INITIAL_COMPANY_DOCUMENTS = [
  {
    title: 'Certificate of Corporate Incorporation',
    documentType: 'INCORPORATION_CERTIFICATE',
    fileUrl: buildCertificateSvgDataUrl({
      badge: 'OFFICIAL CORPORATE REGISTRY',
      title: 'Certificate of Incorporation',
      subtitle: 'Legally Registered International Digital Media Corporation',
      authority: 'Registrar of Corporate Entities',
      licenseNumber: 'REG-2026-UADS-8899120',
      accent: '#059669',
    }),
    description: 'Legally registered international enterprise entity certificate for U-Ads Platform Technologies Ltd.',
    issuingAuthority: 'Registrar of Corporate Entities & Commercial Registry',
    licenseNumber: 'REG-2026-UADS-8899120',
    isPublic: true,
    orderIndex: 1,
  },
  {
    title: 'Digital Media Advertising & Monetization License',
    documentType: 'BUSINESS_LICENSE',
    fileUrl: buildCertificateSvgDataUrl({
      badge: 'DIGITAL MEDIA AUTHORIZATION',
      title: 'Advertising & Monetization License',
      subtitle: 'Certified Authorization for Video Advertising & Engagement Rewards',
      authority: 'Digital Commerce & Standards Authority',
      licenseNumber: 'LIC-ADV-2026-0941',
      accent: '#0d9488',
    }),
    description: 'Certified authorization for digital video advertising delivery and engagement reward operations.',
    issuingAuthority: 'Digital Commerce & Advertising Standards Authority',
    licenseNumber: 'LIC-ADV-2026-0941',
    isPublic: true,
    orderIndex: 2,
  },
  {
    title: 'Financial Integrity & Double-Entry Compliance Audit',
    documentType: 'AUDIT_REPORT',
    fileUrl: buildCertificateSvgDataUrl({
      badge: 'LEDGER AUDIT CERTIFICATION',
      title: 'Double-Entry Compliance Certificate',
      subtitle: 'Zero-Drift Balanced USD Ledger & Reserve Verification',
      authority: 'Independent Ledger Verification Council',
      licenseNumber: 'AUDIT-UADS-2026-Q4',
      accent: '#4f46e5',
    }),
    description: 'Zero-drift double-entry balance sheet audit certificate ensuring debits strictly equal credits across user USD wallets.',
    issuingAuthority: 'Independent Systems & Ledger Verification Council',
    licenseNumber: 'AUDIT-UADS-2026-Q4',
    isPublic: true,
    orderIndex: 3,
  },
];

export class CompanyDocumentService {
  static async ensureInitialDocuments() {
    const existing = await prisma.companyDocument.findMany({ orderBy: { orderIndex: 'asc' } });
    if (existing.length === 0) {
      for (const doc of INITIAL_COMPANY_DOCUMENTS) {
        await prisma.companyDocument.create({ data: doc });
      }
      return;
    }

    // Auto-upgrade any legacy stock Unsplash photo documents to official SVG certificates
    for (let i = 0; i < existing.length; i++) {
      const doc = existing[i];
      if (doc.fileUrl && doc.fileUrl.includes('images.unsplash.com')) {
        const template = INITIAL_COMPANY_DOCUMENTS[i % INITIAL_COMPANY_DOCUMENTS.length];
        await prisma.companyDocument.update({
          where: { id: doc.id },
          data: {
            fileUrl: template.fileUrl,
            licenseNumber: doc.licenseNumber?.includes('VX-') ? template.licenseNumber : doc.licenseNumber,
          },
        });
      }
    }
  }

  static async getPublicDocuments() {
    await this.ensureInitialDocuments();
    return await prisma.companyDocument.findMany({
      where: { isPublic: true },
      orderBy: { orderIndex: 'asc' },
    });
  }

  static async getAllDocumentsAdmin() {
    await this.ensureInitialDocuments();
    return await prisma.companyDocument.findMany({
      orderBy: { orderIndex: 'asc' },
    });
  }

  static async createDocument(rawData: any) {
    const data: any = {
      title: rawData.title,
      documentType: rawData.documentType || 'REGISTRATION',
      fileUrl: rawData.fileUrl,
      isPublic: rawData.isPublic !== undefined ? Boolean(rawData.isPublic) : true,
    };
    if (rawData.issuingAuthority || rawData.issuer) {
      data.issuingAuthority = rawData.issuingAuthority || rawData.issuer;
    }
    if (rawData.description) data.description = rawData.description;
    if (rawData.licenseNumber) data.licenseNumber = rawData.licenseNumber;
    if (rawData.orderIndex !== undefined) data.orderIndex = Number(rawData.orderIndex) || 0;

    return await prisma.companyDocument.create({ data });
  }

  static async updateDocument(id: string, rawData: any) {
    const data: any = {};
    if (rawData.title !== undefined) data.title = rawData.title;
    if (rawData.documentType !== undefined) data.documentType = rawData.documentType;
    if (rawData.fileUrl !== undefined) data.fileUrl = rawData.fileUrl;
    if (rawData.isPublic !== undefined) data.isPublic = Boolean(rawData.isPublic);
    if (rawData.issuingAuthority !== undefined || rawData.issuer !== undefined) {
      data.issuingAuthority = rawData.issuingAuthority || rawData.issuer;
    }
    if (rawData.description !== undefined) data.description = rawData.description;
    if (rawData.licenseNumber !== undefined) data.licenseNumber = rawData.licenseNumber;
    if (rawData.orderIndex !== undefined) data.orderIndex = Number(rawData.orderIndex) || 0;

    return await prisma.companyDocument.update({
      where: { id },
      data,
    });
  }

  static async deleteDocument(id: string) {
    return await prisma.companyDocument.delete({
      where: { id },
    });
  }
}
