import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getOrderRefundRequest } from './refundRequests';
import { server } from '../test/server';
import { getApiError } from './errors';

describe('getOrderRefundRequest', () => {
  it('returns the normal empty state when no refund request exists', async () => {
    server.use(http.get('http://localhost:8000/api/refund-requests/orders/12', () => HttpResponse.json(null)));
    await expect(getOrderRefundRequest(12)).resolves.toBeNull();
  });

  it('maps a permission failure to a safe staff-facing message', async () => {
    server.use(http.get('http://localhost:8000/api/refund-requests/orders/12', () => HttpResponse.json({ detail: 'private details' }, { status: 403 })));
    try {
      await getOrderRefundRequest(12);
    } catch (error) {
      expect(getApiError(error).message).toBe("You don't have permission to do this.");
      return;
    }
    throw new Error('Expected permission request to fail');
  });
});
