import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Admin Video Management & User-Specific Assignments Suite', () => {
  let adminToken: string;
  let userToken: string;
  let regularUserId: string;
  let assignedVideoId: string;
  let publicVideoId: string;

  beforeAll(async () => {
    // Authenticate Admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@vistarax.com',
      password: 'VistaraSecure2026!',
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // Authenticate User
    const userRes = await request(app).post('/api/v1/auth/login').send({
      email: 'user@vistarax.com',
      password: 'VistaraSecure2026!',
    });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.data.token;
    regularUserId = userRes.body.data.user.id;
  });

  it('admin creates a video with a YouTube link assigned specifically to a user', async () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=aum88UHF3wk&list=RDaum88UHF3wk&start_radio=1';
    const res = await request(app)
      .post('/api/v1/admin/videos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Custom VIP Quant Strategies',
        description: 'Exclusively assigned workshop from YouTube',
        videoUrl: youtubeUrl,
        category: 'Quantitative Finance & Ledgering',
        durationSeconds: 240,
        assignedUserId: regularUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.assignedUserId).toBe(regularUserId);
    expect(res.body.data.thumbnailUrl).toContain('aum88UHF3wk');
    assignedVideoId = res.body.data.id;
  });

  it('admin creates a public catalog video', async () => {
    const res = await request(app)
      .post('/api/v1/admin/videos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Public System Design 101',
        description: 'Open to everyone',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        category: 'Full-Stack Software Engineering',
        durationSeconds: 180,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    publicVideoId = res.body.data.id;
  });

  it('assigned user sees the assigned video and has instant access granted', async () => {
    const res = await request(app)
      .get('/api/v1/videos')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const assignedVid = res.body.data.find((v: any) => v.id === assignedVideoId);
    expect(assignedVid).toBeDefined();
    expect(assignedVid.hasAccess).toBe(true);
    expect(assignedVid.isAssignedToUser).toBe(true);
    expect(assignedVid.isYouTube).toBe(true);
  });

  it('public visitor does NOT see private assigned video', async () => {
    const res = await request(app).get('/api/v1/videos');
    expect(res.status).toBe(200);
    const assignedVid = res.body.data.find((v: any) => v.id === assignedVideoId);
    expect(assignedVid).toBeUndefined();
    // Public video is seen
    const publicVid = res.body.data.find((v: any) => v.id === publicVideoId);
    expect(publicVid).toBeDefined();
  });

  it('assigned user can start playback session for their assigned video', async () => {
    const res = await request(app)
      .post(`/api/v1/videos/${assignedVideoId}/session`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('sessionToken');
  });

  it('admin updates video details and re-fetches successfully', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/videos/${assignedVideoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Updated VIP Quant Strategies',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated VIP Quant Strategies');
  });

  it('admin deletes test videos cleanly', async () => {
    const res1 = await request(app)
      .delete(`/api/v1/admin/videos/${assignedVideoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .delete(`/api/v1/admin/videos/${publicVideoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(200);
  });
});
