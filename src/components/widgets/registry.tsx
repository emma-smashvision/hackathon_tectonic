import type { ComponentType } from "react";
import type { AdaptiveWidgetId, WidgetId } from "@/lib/engine/types";
import type { IconName } from "../ui";
import { HomeBuyingWidget, MovingWidget, TravelWidget } from "./life-events";
import {
  BudgetWidget,
  InvestmentsWidget,
  PensionWidget,
  TaxReserveWidget,
} from "./money";
import {
  AdvisorWidget,
  PaymentCheckWidget,
  TransactionsWidget,
} from "./support";
import type { WidgetProps } from "./types";

export interface WidgetMeta {
  title: string;
  icon: IconName;
}

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  balance: { title: "Balance", icon: "wallet" },
  quickPay: { title: "Pay & transfer", icon: "send" },
  homeBuying: { title: "Can we buy a house?", icon: "home" },
  moving: { title: "Moving checklist", icon: "box" },
  travel: { title: "Travel ready", icon: "plane" },
  investments: { title: "Investments", icon: "chart" },
  taxReserve: { title: "Tax reserve", icon: "receipt" },
  budget: { title: "Budget & fixed costs", icon: "wallet" },
  pension: { title: "Pension", icon: "calendar" },
  paymentCheck: { title: "Is this payment safe?", icon: "shield" },
  advisor: { title: "Call my advisor", icon: "phone" },
  transactions: { title: "Recent transactions", icon: "list" },
};

export const ADAPTIVE_COMPONENTS: Record<
  AdaptiveWidgetId,
  ComponentType<WidgetProps>
> = {
  homeBuying: HomeBuyingWidget,
  moving: MovingWidget,
  travel: TravelWidget,
  investments: InvestmentsWidget,
  taxReserve: TaxReserveWidget,
  budget: BudgetWidget,
  pension: PensionWidget,
  paymentCheck: PaymentCheckWidget,
  advisor: AdvisorWidget,
  transactions: TransactionsWidget,
};
