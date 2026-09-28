import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type { ApiExpense, ApiExpenseCategory } from './accountingMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ExpenseQuery = { start_date?: string; end_date?: string; status?: 'ACTIVE' | 'VOID'; per_page?: number };

export interface ExpenseResult {
  expense: ApiExpense;
  journals: ApiJournal[];
}

export const expenseApi = {
  categories: () => apiClient.get<Envelope<ApiExpenseCategory[]>>('/expense-categories').then((r) => r.data),
  list: (query: ExpenseQuery = { per_page: 500 }) =>
    apiClient.get<Envelope<{ items: ApiExpense[]; total: number }>>('/expenses', query).then((r) => r.data.items),
  create: (form: FormData) => apiClient.upload<Envelope<ExpenseResult>>('/expenses', form).then((r) => r.data),
  void: (id: string | number, reason: string) =>
    apiClient.post<Envelope<ExpenseResult>>(`/expenses/${id}/void`, { reason }).then((r) => r.data),
};
