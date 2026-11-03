import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('VistaraX Live Chat & Customer Support Bot Suite', () => {
  let userToken: string;
  let adminToken: string;
  let conversationId: string;

  beforeAll(async () => {
    // 1. Authenticate user
    const userRes = await request(app).post('/api/v1/auth/login').send({
      email: 'user@vistarax.com',
      password: 'VistaraSecure2026!',
    });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;

    // 2. Authenticate super admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@vistarax.com',
      password: 'VistaraSecure2026!',
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
  });

  it('fetches support FAQ knowledge base successfully', async () => {
    const res = await request(app).get('/api/v1/support/faqs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('question');
    expect(res.body.data[0]).toHaveProperty('answer');
  });

  it('initializes a support conversation with initial bot greeting', async () => {
    const res = await request(app)
      .post('/api/v1/support/conversations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('BOT');
    expect(res.body.data.messages.length).toBeGreaterThan(0);
    expect(res.body.data.messages[0].senderType).toBe('BOT');
    conversationId = res.body.data.id;
  });

  it('bot provides intelligent instant answer to deposit verification query', async () => {
    const res = await request(app)
      .post(`/api/v1/support/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        message: 'Deposit verification mein kitna time lagta hai?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('userMessage');
    expect(res.body.data).toHaveProperty('botMessage');
    expect(res.body.data.botMessage.message).toContain('Deposit Verification Time');
    expect(res.body.data.conversation.status).toBe('BOT');
  });

  it('allows user to send message with an image attachment', async () => {
    const res = await request(app)
      .post(`/api/v1/support/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        message: 'Ye mera payment slip hai, please check karein.',
        attachmentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        attachmentName: 'easypaisa_slip.png',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userMessage.attachmentUrl).toBeDefined();
    expect(res.body.data.userMessage.attachmentName).toBe('easypaisa_slip.png');
  });

  it('escalates to human support agent when requested', async () => {
    const res = await request(app)
      .post(`/api/v1/support/conversations/${conversationId}/escalate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversation.status).toBe('WAITING_FOR_AGENT');
    expect(res.body.data.botMessage.message).toContain('Human Support Requested');
  });

  it('admin views waiting ticket in admin support desk', async () => {
    const res = await request(app)
      .get('/api/v1/admin/support/conversations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.find((c: any) => c.id === conversationId);
    expect(found).toBeDefined();
    expect(found.status).toBe('WAITING_FOR_AGENT');
  });

  it('admin replies as support agent directly to user', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/support/conversations/${conversationId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Assalam o Alaikum! Maine aapka slip check kar liya hai, deposit approve ho chuka hai.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.senderType).toBe('AGENT');
    expect(res.body.data.conversation.status).toBe('AGENT_ACTIVE');
  });

  it('admin marks ticket as resolved', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/support/conversations/${conversationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
  });
});
