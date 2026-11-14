export type DebtPaymentProjectionInput = {
  liabilityType: string;
  mortgageRateType?: "FIXED" | "VARIABLE" | null;
  amortization?: number | null;
  term?: number | null;
  principal: number;
  annualInterestRate: number;
  monthlyPayment: number;
  extraMonthlyPayment?: number | null;
  oneTimePayment?: number | null;
};

export type DebtPaymentScheduleEntry = {
  paymentNumber: number;
  startingBalance: number;
  payment: number;
  paymentAmount: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
};

export type DebtPaymentProjection = {
  originalPrincipal: number;
  annualInterestRate: number;
  regularMonthlyPayment: number;
  extraMonthlyPayment: number;
  oneTimePayment: number;
  numberOfPayments: number;
  totalPaid: number;
  totalInterestPaid: number;
  schedule: DebtPaymentScheduleEntry[];
};
