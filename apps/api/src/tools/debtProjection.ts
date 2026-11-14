import {DebtPaymentProjection, DebtPaymentProjectionInput, DebtPaymentScheduleEntry} from "./types";

export class DebtPaymentProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DebtPaymentProjectionError";
  }
}

const MAX_PAYMENT_MONTHS = 1_200;
const MONEY_PRECISION = 100;
const MORTGAGE_LIABILITY_TYPE = "0";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * MONEY_PRECISION) / MONEY_PRECISION;
}

function requireFinite(name: string, value: number) {
  if (!Number.isFinite(value)) {
    throw new DebtPaymentProjectionError(`${name} must be a finite number`);
  }
}

export function projectDebtPayment(
  input: DebtPaymentProjectionInput
): DebtPaymentProjection {
  const extraMonthlyPayment = input.extraMonthlyPayment ?? 0;
  const oneTimePayment = input.oneTimePayment ?? 0;

  if (input.liabilityType.trim().length === 0) {
    throw new DebtPaymentProjectionError("liabilityType is required");
  }

  const isMortgage = input.liabilityType === MORTGAGE_LIABILITY_TYPE;
  if (isMortgage) {
    if (input.mortgageRateType == null) {
      throw new DebtPaymentProjectionError("mortgageRateType is required for a mortgage");
    }
    if (input.amortization == null || !Number.isFinite(input.amortization) || input.amortization <= 0) {
      throw new DebtPaymentProjectionError("amortization must be greater than 0 for a mortgage");
    }
    if (input.term == null || !Number.isFinite(input.term) || input.term <= 0) {
      throw new DebtPaymentProjectionError("term must be greater than 0 for a mortgage");
    }
    if (input.term > input.amortization) {
      throw new DebtPaymentProjectionError("term cannot exceed amortization");
    }
  }

  requireFinite("principal", input.principal);
  requireFinite("annualInterestRate", input.annualInterestRate);
  requireFinite("monthlyPayment", input.monthlyPayment);
  requireFinite("extraMonthlyPayment", extraMonthlyPayment);
  requireFinite("oneTimePayment", oneTimePayment);

  if (input.principal <= 0) {
    throw new DebtPaymentProjectionError("principal must be greater than 0");
  }
  if (input.annualInterestRate < 0) {
    throw new DebtPaymentProjectionError(
      "annualInterestRate must be greater than or equal to 0"
    );
  }
  if (input.monthlyPayment <= 0) {
    throw new DebtPaymentProjectionError("monthlyPayment must be greater than 0");
  }
  if (extraMonthlyPayment < 0) {
    throw new DebtPaymentProjectionError(
      "extraMonthlyPayment must be greater than or equal to 0"
    );
  }
  if (oneTimePayment < 0 || oneTimePayment > input.principal) {
    throw new DebtPaymentProjectionError(
      "oneTimePayment must be between 0 and principal"
    );
  }

  const plannedPayment = input.monthlyPayment + extraMonthlyPayment;
  const annualRate = input.annualInterestRate / 100;
  const monthlyRate = isMortgage
    ? Math.pow(1 + annualRate / 2, 1 / 6) - 1
    : annualRate / 12;
  const projectedPrincipal = input.principal - oneTimePayment;
  const firstMonthInterest = projectedPrincipal * monthlyRate;

  if (plannedPayment <= firstMonthInterest) {
    throw new DebtPaymentProjectionError(
      "The total monthly payment must be greater than the first month's interest"
    );
  }

  const schedule: DebtPaymentScheduleEntry[] = [];
  let balance = projectedPrincipal;
  let totalPaid = oneTimePayment;
  let totalInterestPaid = 0;

  while (balance > 0 && schedule.length < MAX_PAYMENT_MONTHS) {
    const startingBalance = balance;
    const interestPaid = startingBalance * monthlyRate;
    const payment = Math.min(plannedPayment, startingBalance + interestPaid);
    const principalPaid = payment - interestPaid;
    balance = Math.max(0, startingBalance - principalPaid);

    totalPaid += payment;
    totalInterestPaid += interestPaid;
    schedule.push({
      paymentNumber: schedule.length + 1,
      startingBalance: roundMoney(startingBalance),
      payment: roundMoney(payment),
      paymentAmount: roundMoney(payment),
      principalPaid: roundMoney(principalPaid),
      interestPaid: roundMoney(interestPaid),
      endingBalance: roundMoney(balance),
    });
  }

  if (balance > 0) {
    throw new DebtPaymentProjectionError(
      `The debt would take more than ${MAX_PAYMENT_MONTHS} monthly payments to repay`
    );
  }

  return {
    originalPrincipal: roundMoney(input.principal),
    annualInterestRate: input.annualInterestRate,
    regularMonthlyPayment: roundMoney(input.monthlyPayment),
    extraMonthlyPayment: roundMoney(extraMonthlyPayment),
    oneTimePayment: roundMoney(oneTimePayment),
    numberOfPayments: schedule.length,
    totalPaid: roundMoney(totalPaid),
    totalInterestPaid: roundMoney(totalInterestPaid),
    schedule,
  };
}
