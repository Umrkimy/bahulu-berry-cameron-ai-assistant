import type { Metadata } from "next";

import { InformationPage } from "../_components/information-page";

export const metadata: Metadata = { title: "About" };
export default function AboutPage() { return <InformationPage type="about" />; }
