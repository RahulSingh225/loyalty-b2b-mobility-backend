export type User = {
  id: string;
  name: string;
};

export type Transaction = {
  id: string;
  amount: number;
};

export type UserType = 'CounterSales' | 'Electrician' | 'Retailer' | 'Counter Staff';
