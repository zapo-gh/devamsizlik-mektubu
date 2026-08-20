import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  role?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
