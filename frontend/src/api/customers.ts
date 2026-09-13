import { api } from './api-client';
import type { Customer, CreateCustomerRequest } from '../types/customers';

export const customersApi = {
  /**
   * Fetches all customers. The backend returns them ordered by
   * creation date, newest first.
   *
   * Search and sorting are performed client-side for the current scale.
   * When the customer base grows past a few thousand entries, add a
   * server-side search endpoint and pass filters here.
   */
  list(): Promise<Customer[]> {
    return api.get<Customer[]>('/customers');
  },

  /**
   * Fetches a single customer by id.
   *
   * Throws ApiError with status 404 if the customer does not exist.
   */
  getById(id: string): Promise<Customer> {
    return api.get<Customer>(`/customers/${id}`);
  },

  /**
   * Creates a new customer.
   *
   * Throws ApiError with status 409 if the phone number already exists.
   */
  create(payload: CreateCustomerRequest): Promise<Customer> {
    return api.post<Customer>('/customers', payload);
  },
};
