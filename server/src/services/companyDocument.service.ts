import prisma from '../lib/prisma.js';

export const INITIAL_COMPANY_DOCUMENTS = [
  {
    title: 'Certificate of Corporate Incorporation',
    documentType: 'INCORPORATION_CERTIFICATE',
    fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    description: 'Legally registered international enterprise entity certificate under jurisdiction registry.',
    issuingAuthority: 'Registrar of Corporate Entities & Commercial Registry',
    licenseNumber: 'REG-2026-VX-8899120',
    isPublic: true,
    orderIndex: 1,
  },
  {
    title: 'Digital Media Advertising & Monetization License',
    documentType: 'BUSINESS_LICENSE',
    fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    description: 'Certified authorization for digital video advertising delivery and engagement reward operations.',
    issuingAuthority: 'Digital Commerce & Advertising Standards Authority',
    licenseNumber: 'LIC-ADV-2026-0941',
    isPublic: true,
    orderIndex: 2,
  },
  {
    title: 'Financial Integrity & Double-Entry Compliance Audit',
    documentType: 'AUDIT_REPORT',
    fileUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    description: 'Zero-drift double-entry balance sheet audit certificate ensuring debits strictly equal credits across user wallets.',
    issuingAuthority: 'Independent Systems & Ledger Verification Council',
    licenseNumber: 'AUDIT-PASSED-2026-Q1',
    isPublic: true,
    orderIndex: 3,
  },
];

export class CompanyDocumentService {
  static async ensureInitialDocuments() {
    const count = await prisma.companyDocument.count();
    if (count === 0) {
      for (const doc of INITIAL_COMPANY_DOCUMENTS) {
        await prisma.companyDocument.create({ data: doc });
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

