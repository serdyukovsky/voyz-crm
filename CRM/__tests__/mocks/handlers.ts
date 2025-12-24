import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const handlers = [
  // Import contacts
  http.post(`${API_BASE}/import/contacts`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mapping = JSON.parse(formData.get('mapping') as string);

    if (!file) {
      return HttpResponse.json(
        { message: 'CSV file is required' },
        { status: 400 }
      );
    }

    if (!mapping.fullName) {
      return HttpResponse.json(
        { message: 'Mapping must include fullName field' },
        { status: 400 }
      );
    }

    // Simulate successful import
    return HttpResponse.json({
      summary: {
        total: 3,
        created: 3,
        updated: 0,
        failed: 0,
        skipped: 0,
      },
      errors: [],
    });
  }),

  // Import deals
  http.post(`${API_BASE}/import/deals`, async ({ request }) => {
    // CRITICAL: Backend now expects JSON with rows, not FormData with file
    // CSV parsing is done on frontend, backend receives parsed rows
    const contentType = request.headers.get('content-type');
    
    let body: any;
    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else {
      // Fallback for old FormData format (for backward compatibility in tests)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const mapping = JSON.parse(formData.get('mapping') as string || '{}');

      if (!file) {
        return HttpResponse.json(
          { message: 'CSV file is required' },
          { status: 400 }
        );
      }
      // Convert to new format for testing
      body = {
        rows: [], // Mock rows - in real scenario, CSV would be parsed on frontend
        mapping: mapping,
        pipelineId: formData.get('pipelineId') as string || '',
      };
    }

    if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return HttpResponse.json(
        { message: 'Rows are required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!body.mapping || !body.mapping.title) {
      return HttpResponse.json(
        { message: 'Mapping must include title field' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      summary: {
        total: body.rows.length,
        created: body.rows.length,
        updated: 0,
        failed: 0,
        skipped: 0,
      },
      errors: [],
    });
  }),

  // Error response
  http.post(`${API_BASE}/import/contacts`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('error') === 'true') {
      return HttpResponse.json(
        {
          summary: {
            total: 3,
            created: 1,
            updated: 0,
            failed: 2,
            skipped: 0,
          },
          errors: [
            { row: 2, field: 'email', error: 'Invalid email format' },
            { row: 3, field: 'fullName', error: 'Full name is required' },
          ],
        },
        { status: 200 }
      );
    }
  }),
];

