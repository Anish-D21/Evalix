import { test, mock } from 'node:test';
import assert from 'node:assert';

/**
 * Found via code review (no real MongoDB reachable from this sandbox to
 * discover it live): a malformed `:id` passed straight to a Mongoose
 * query throws an uncaught CastError with no `statusCode`, which the
 * global error handler reports as a generic 500. validateObjectId
 * middleware (routes/*.routes.js) now catches this before it reaches
 * any controller/query — these tests confirm the clean 400 across
 * every affected resource, and confirm the existing 404 (valid but
 * nonexistent id) and 503 (DB unavailable) behaviors are untouched.
 */

const MALFORMED_ID = 'not-a-valid-id';
const VALID_BUT_NONEXISTENT_ID = '000000000000000000000000'; // well-formed 24-hex ObjectId

test('malformed id returns 400 INVALID_ID for every affected :id route', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1; // simulate connected DB so requireDb lets requests through to validateObjectId

  const cases = [
    ['get', `/api/syllabi/${MALFORMED_ID}`],
    ['put', `/api/syllabi/${MALFORMED_ID}`],
    ['delete', `/api/syllabi/${MALFORMED_ID}`],
    ['get', `/api/blueprints/${MALFORMED_ID}`],
    ['put', `/api/blueprints/${MALFORMED_ID}`],
    ['get', `/api/questions/${MALFORMED_ID}`],
    ['put', `/api/questions/${MALFORMED_ID}`],
    ['delete', `/api/questions/${MALFORMED_ID}`],
    ['post', `/api/questions/${MALFORMED_ID}/approve`],
    ['get', `/api/rubrics/${MALFORMED_ID}`],
    ['put', `/api/rubrics/${MALFORMED_ID}`],
    ['delete', `/api/rubrics/${MALFORMED_ID}`],
    ['post', `/api/rubrics/${MALFORMED_ID}/approve`],
  ];

  for (const [method, path] of cases) {
    const res = await request(app)[method](path);
    assert.strictEqual(res.status, 400, `${method.toUpperCase()} ${path} expected 400, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.data, null);
    assert.strictEqual(res.body.error.code, 'INVALID_ID', `${method.toUpperCase()} ${path}`);
  }

  mongoose.connection.readyState = originalReadyState;
});

test('the 12-character ObjectId.isValid false-positive gotcha is correctly rejected', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: mongoose } = await import('mongoose');

  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  // Exactly 12 characters -- mongoose.Types.ObjectId.isValid() alone
  // would accept this (it's castable to a 12-byte ObjectId), but it is
  // not the well-formed 24-hex-char id format the API expects.
  const res = await request(app).get('/api/syllabi/abcdefabcdef');

  mongoose.connection.readyState = originalReadyState;

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error.code, 'INVALID_ID');
});

test('a well-formed but nonexistent id still returns the existing 404 behavior, unaffected', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Syllabus } = await import('../models/Syllabus.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Syllabus, 'findById', async () => null);
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).get(`/api/syllabi/${VALID_BUT_NONEXISTENT_ID}`);

  mongoose.connection.readyState = originalReadyState;
  mock.restoreAll();

  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'SYLLABUS_NOT_FOUND');
});

test('a well-formed id still resolves successfully when the document exists', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');
  const { default: Syllabus } = await import('../models/Syllabus.js');
  const { default: mongoose } = await import('mongoose');

  mock.method(Syllabus, 'findById', async () => ({ _id: VALID_BUT_NONEXISTENT_ID, title: 'Found It' }));
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  const res = await request(app).get(`/api/syllabi/${VALID_BUT_NONEXISTENT_ID}`);

  mongoose.connection.readyState = originalReadyState;
  mock.restoreAll();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.title, 'Found It');
});

test('DATABASE_UNAVAILABLE still takes precedence over id validation when the DB is disconnected', async () => {
  const { default: app } = await import('../server.js');
  const { default: request } = await import('supertest');

  // No readyState stub here -- DB genuinely disconnected in this test run.
  const res = await request(app).get(`/api/syllabi/${MALFORMED_ID}`);

  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.body.error.code, 'DATABASE_UNAVAILABLE');
});
