import type { Metadata } from "next";

import { InformationPage } from "../_components/information-page";

export const metadata: Metadata = { title: "Pickup & delivery" };
export default function PickupDeliveryPage() { return <InformationPage type="pickup" />; }
