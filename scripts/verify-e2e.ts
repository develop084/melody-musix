import { createApp } from '../backend/src/app';
import { prisma } from '../backend/src/db/prisma';
import http from 'http';

async function runTests() {
  console.log('🧪 Starting End-to-End Verification Suite for SpecCore...\n');

  const app = createApp();
  const PORT = 4055;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`✅ Test server running on http://localhost:${PORT}`);

  const baseUrl = `http://localhost:${PORT}/api/v1`;

  const assert = (condition: boolean, testName: string, detail?: any) => {
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`, detail || '');
      process.exit(1);
    }
    console.log(`✅ PASSED: ${testName}`);
  };

  try {
    // 1. Health check
    console.log('\n--- 1. Health Check ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'ok', 'GET /api/v1/health returns 200 OK and status ok');

    // 2. Auth: Register
    console.log('\n--- 2. Auth: Register ---');
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test User',
        email: testEmail,
        password: 'TestPassword123!',
        role: 'USER',
      }),
    });
    const regJson = await regRes.json();
    assert(regRes.status === 201, 'POST /api/v1/auth/register returns 201 Created');
    assert(!!regJson.accessToken && !!regJson.refreshToken, 'Register returns access and refresh tokens');
    assert(regJson.user.role === 'USER', 'Registered user has role USER');
    const userTokens = { access: regJson.accessToken, refresh: regJson.refreshToken, id: regJson.user.id };

    // 3. Auth: Login with bad credentials
    console.log('\n--- 3. Auth: Bad Credentials ---');
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(badLoginRes.status === 401, 'POST /api/v1/auth/login with wrong password returns 401 Unauthorized');

    // 4. RBAC: Standard USER attempts admin endpoint
    console.log('\n--- 4. RBAC: User Forbidden Access ---');
    const forbiddenRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${userTokens.access}` },
    });
    assert(forbiddenRes.status === 403, 'GET /api/v1/users blocked for role USER (403 Forbidden)');

    // 5. Auth: Login as Admin
    console.log('\n--- 5. Auth: Login as Admin ---');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'AdminPass123!',
      }),
    });
    const adminJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminJson.user.role === 'ADMIN', 'Admin user has role ADMIN');
    const adminToken = adminJson.accessToken;

    // 6. RBAC: Admin accesses user roster
    console.log('\n--- 6. RBAC: Admin Access to Users ---');
    const usersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersJson = await usersRes.json();
    assert(usersRes.status === 200 && Array.isArray(usersJson), 'Admin can list all users (200 OK)');
    assert(usersJson.length >= 3, 'User roster contains all seeded users');

    // 7. RBAC: Admin promotes USER to MANAGER
    console.log('\n--- 7. RBAC: Promote Role ---');
    const promoteRes = await fetch(`${baseUrl}/users/${userTokens.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'MANAGER' }),
    });
    const promoteJson = await promoteRes.json();
    assert(promoteRes.status === 200 && promoteJson.role === 'MANAGER', 'Admin successfully updated role to MANAGER');

    // 8. Auth: Refresh Token Rotation
    console.log('\n--- 8. Auth: Token Refresh & Rotation ---');
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: userTokens.refresh }),
    });
    const refreshJson = await refreshRes.json();
    assert(refreshRes.status === 200, 'POST /api/v1/auth/refresh returns 200 OK');
    assert(
      !!refreshJson.accessToken && !!refreshJson.refreshToken && refreshJson.refreshToken !== userTokens.refresh,
      'Refresh returns new accessToken and rotated refreshToken'
    );

    // 9. Auth: Revoked Token Replay Protection
    console.log('\n--- 9. Security: Revoked Token Rejection ---');
    const replayRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: userTokens.refresh }),
    });
    assert(replayRes.status === 401, 'Replaying old rotated refresh token returns 401 Unauthorized');

    // 10. Dashboard Stats
    console.log('\n--- 10. Dashboard Analytics ---');
    const statsRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${refreshJson.accessToken}` },
    });
    const statsJson = await statsRes.json();
    assert(statsRes.status === 200, 'GET /api/v1/dashboard/stats returns 200 OK');
    assert(typeof statsJson.totalUsers === 'number', 'Stats returns totalUsers count');
    assert(statsJson.systemStatus === 'OPTIMAL', 'Stats returns systemStatus OPTIMAL');

    // 11. Media Samples
    console.log('\n--- 11. Media: Royalty-Free Samples ---');
    const samplesRes = await fetch(`${baseUrl}/media/samples`);
    const samplesJson = await samplesRes.json();
    assert(samplesRes.status === 200 && Array.isArray(samplesJson), 'GET /api/v1/media/samples returns 200 OK array');
    assert(samplesJson.length >= 5, 'Built-in sample presets contain at least 5 studio tracks');

    // 12. Media Stream: Audio Streaming with Range support
    console.log('\n--- 12. Media: Audio Streaming ---');
    const streamRes = await fetch(`${baseUrl}/media/stream?videoId=sample-synth-lead`);
    assert(streamRes.status === 200, 'GET /api/v1/media/stream returns 200 OK');
    assert(streamRes.headers.get('content-type')?.includes('audio'), 'Stream returns audio content-type header');
    assert(streamRes.headers.get('access-control-allow-origin') === '*', 'Stream has Access-Control-Allow-Origin: * for Web Audio');

    // 13. Projects: Create Medley Project
    console.log('\n--- 13. Projects: Create Medley Project ---');
    const newProjectPayload = {
      title: 'E2E Sunset Medley',
      bpm: 128,
      durationMs: 30000,
      tracks: [
        {
          id: 'trk_01',
          name: 'Lead Synth',
          volume: 1.0,
          muted: false,
          solo: false,
          clips: [
            {
              id: 'clip_01',
              sourceUrl: '/api/v1/media/stream?videoId=sample-synth-lead',
              sourceTitle: 'Neon Dream - Synth Lead',
              startOffsetMs: 0,
              durationMs: 6000,
              timelineStartMs: 0,
              fadeInMs: 150,
              fadeOutMs: 150,
              volume: 1.0,
            },
          ],
        },
      ],
    };
    const createProjRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshJson.accessToken}`,
      },
      body: JSON.stringify(newProjectPayload),
    });
    const createProjJson = await createProjRes.json();
    assert(createProjRes.status === 201, 'POST /api/v1/projects returns 201 Created');
    assert(createProjJson.title === 'E2E Sunset Medley', 'Saved project retains correct title');
    assert(createProjJson.tracks.length === 1, 'Saved project contains 1 track');
    const savedProjectId = createProjJson.id;

    // 14. Projects: List and Get By ID
    console.log('\n--- 14. Projects: List and Read ---');
    const listProjRes = await fetch(`${baseUrl}/projects`, {
      headers: { Authorization: `Bearer ${refreshJson.accessToken}` },
    });
    const listProjJson = await listProjRes.json();
    assert(listProjRes.status === 200 && Array.isArray(listProjJson), 'GET /api/v1/projects returns 200 OK array');
    assert(listProjJson.some((p: any) => p.id === savedProjectId), 'Project list contains newly created project');

    const getProjRes = await fetch(`${baseUrl}/projects/${savedProjectId}`, {
      headers: { Authorization: `Bearer ${refreshJson.accessToken}` },
    });
    const getProjJson = await getProjRes.json();
    assert(getProjRes.status === 200 && getProjJson.id === savedProjectId, 'GET /api/v1/projects/:id returns project details');

    // 15. Projects: Delete
    console.log('\n--- 15. Projects: Delete ---');
    const delProjRes = await fetch(`${baseUrl}/projects/${savedProjectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${refreshJson.accessToken}` },
    });
    assert(delProjRes.status === 204, 'DELETE /api/v1/projects/:id returns 204 No Content');

    console.log('\n🎉 ALL 15 END-TO-END SPEC, MEDIA, AND RBAC TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
