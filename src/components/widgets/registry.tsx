import type { ComponentType } from "react";
import type { AdaptiveWidgetId, WidgetId } from "@/lib/engine/types";
import type { IconName } from "../ui";
import { AtmMapWidget, EsimWidget, FxAccountsWidget } from "./abroad";
import { DirectDebitsWidget, DuplicatePaymentWidget } from "./everyday";
import {
  AppointmentsWidget,
  HouseInsuranceWidget,
  HouseTimelineWidget,
} from "./house";
import { DividendsWidget, PerformersWidget } from "./invest";
import { HomeBuyingWidget, MovingWidget, TravelWidget } from "./life-events";
import {
  BudgetWidget,
  InvestmentsWidget,
  PensionWidget,
  TaxReserveWidget,
} from "./money";
import { BusinessWidget, CelebrateWidget } from "./prize";
import {
  AdvisorWidget,
  PaymentCheckWidget,
  TransactionsWidget,
} from "./support";
import type { WidgetProps } from "./types";
import { WindfallWidget } from "./windfall";

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
  windfall: { title: "What to do with your prize?", icon: "trophy" },
  duplicatePayment: { title: "Possible double payment", icon: "receipt" },
  directDebits: { title: "Direct debits", icon: "list" },
  fxAccounts: { title: "Currencies & exchange", icon: "arrows" },
  atmMap: { title: "ATMs nearby", icon: "map" },
  esim: { title: "Travel eSIM", icon: "signal" },
  appointments: { title: "Appointments", icon: "calendar" },
  houseTimeline: { title: "House-buying timeline", icon: "key" },
  houseInsurance: { title: "Insurance to arrange", icon: "umbrella" },
  performers: { title: "Doing well, doing less well", icon: "chart" },
  dividends: { title: "Dividends", icon: "piggy" },
  business: { title: "Start your business", icon: "doc" },
  celebrate: { title: "Split & celebrate", icon: "plane" },
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
  windfall: WindfallWidget,
  duplicatePayment: DuplicatePaymentWidget,
  directDebits: DirectDebitsWidget,
  fxAccounts: FxAccountsWidget,
  atmMap: AtmMapWidget,
  esim: EsimWidget,
  appointments: AppointmentsWidget,
  houseTimeline: HouseTimelineWidget,
  houseInsurance: HouseInsuranceWidget,
  performers: PerformersWidget,
  dividends: DividendsWidget,
  business: BusinessWidget,
  celebrate: CelebrateWidget,
};
