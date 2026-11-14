import {type DebtPaymentProjectionInput} from "./tools/types";
import {projectDebtPayment} from "./tools/debtProjection";

export const resolvers = {
  Query: {
    projectDebtPayment: (
      _parent: unknown,
      args: {
        input: DebtPaymentProjectionInput
      }
    ) => projectDebtPayment(args.input),
  },
}
